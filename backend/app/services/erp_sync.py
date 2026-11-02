from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.accounts import Account, LifecycleStage, SubStatus
from app.models.erp import ErpOrderCache, ErpOrderStatus
from app.models.interactions import Interaction, InteractionType
from app.schemas.erp import ErpOrderCreate


def process_erp_order(
    db: Session,
    payload: ErpOrderCreate,
) -> Tuple[ErpOrderCache, bool, Optional[Account]]:
    """
    Core ERP Rule:
    Ingests an order into `erp_orders_cache`.
    If matched account is in LEAD, PROSPECTO or POTENCIAL and order is CONFIRMADO or FACTURADO:
    Promotes account AUTOMATICALLY to CLIENTE, assigns `first_order_date` and links `erp_customer_id`.
    Also maintains traceability linking Cliente Pedido (Cliente Final) to Cliente Factura (Distribuidor).
    """
    clean_tax_id = (
        payload.tax_id.upper().replace("-", "").replace(" ", "") if payload.tax_id else None
    )
    clean_customer_id = payload.erp_customer_id.strip() if payload.erp_customer_id else None

    # 1. Match account by erp_customer_id or tax_id
    account = None
    if clean_customer_id:
        account = db.query(Account).filter(Account.erp_customer_id == clean_customer_id).first()
    if not account and clean_tax_id:
        account = db.query(Account).filter(Account.tax_id == clean_tax_id).first()

    # Determine billing account (distributor)
    billing_acc = None
    if payload.billing_account_id:
        billing_acc = db.query(Account).filter(Account.id == payload.billing_account_id).first()
    elif payload.billing_tax_id:
        clean_b_tax = payload.billing_tax_id.upper().replace("-", "").replace(" ", "")
        billing_acc = db.query(Account).filter(Account.tax_id == clean_b_tax).first()
    elif account and account.billing_account_id:
        billing_acc = db.query(Account).filter(Account.id == account.billing_account_id).first()

    now = datetime.utcnow()
    promoted_to_cliente = False

    # 2. State Machine Rule: LEAD, PROSPECTO or POTENCIAL -> CLIENTE on confirmed/invoiced order
    if account and payload.status in (ErpOrderStatus.CONFIRMADO, ErpOrderStatus.FACTURADO):
        if account.lifecycle_stage in (LifecycleStage.LEAD, LifecycleStage.PROSPECTO, LifecycleStage.POTENCIAL):
            old_stage = account.lifecycle_stage
            account.lifecycle_stage = LifecycleStage.CLIENTE
            account.sub_status = SubStatus.CONTACTADO_CUALIFICANDO
            promoted_to_cliente = True

            if not account.first_order_date:
                account.first_order_date = payload.order_date or now

            if clean_customer_id and not account.erp_customer_id:
                account.erp_customer_id = clean_customer_id

            # Audit note
            note = Interaction(
                account_id=account.id,
                user_id=account.owner_id or 1,
                type=InteractionType.NOTE,
                summary=(
                    f"¡Conversión a CLIENTE validada por ERP! Pedido #{payload.order_id} "
                    f"confirmado por importe de {payload.total_amount:,.2f} €. "
                    f"Promovido automáticamente desde {old_stage.value}."
                ),
                created_at=now,
            )
            db.add(note)
            account.last_activity_at = now

    # Also promote distributor if it was earlier in funnel and is paying the invoice
    if billing_acc and payload.status in (ErpOrderStatus.CONFIRMADO, ErpOrderStatus.FACTURADO):
        if billing_acc.lifecycle_stage in (LifecycleStage.LEAD, LifecycleStage.PROSPECTO, LifecycleStage.POTENCIAL):
            billing_acc.lifecycle_stage = LifecycleStage.CLIENTE
            billing_acc.sub_status = SubStatus.CONTACTADO_CUALIFICANDO
            if not billing_acc.first_order_date:
                billing_acc.first_order_date = payload.order_date or now
            billing_acc.last_activity_at = now

    # 3. Create or update ErpOrderCache
    existing_order = db.query(ErpOrderCache).filter(ErpOrderCache.order_id == payload.order_id).first()
    lines_dicts = [line.model_dump() if hasattr(line, "model_dump") else dict(line) for line in payload.order_lines]

    effective_billing_id = billing_acc.id if billing_acc else (account.billing_account_id if account else None)

    if existing_order:
        existing_order.total_amount = payload.total_amount
        existing_order.status = payload.status
        existing_order.top_products = payload.top_products
        existing_order.order_lines = lines_dicts
        if account:
            existing_order.account_id = account.id
        if effective_billing_id:
            existing_order.billing_account_id = effective_billing_id
        db.commit()
        db.refresh(existing_order)
        return existing_order, promoted_to_cliente, account

    order_record = ErpOrderCache(
        order_id=payload.order_id,
        erp_customer_id=clean_customer_id or (account.erp_customer_id if account else None),
        tax_id=clean_tax_id or (account.tax_id if account else None),
        account_id=account.id if account else None,
        billing_account_id=effective_billing_id,
        order_date=payload.order_date or now,
        total_amount=payload.total_amount,
        status=payload.status,
        top_products=payload.top_products,
        order_lines=lines_dicts,
        created_at=now,
    )
    db.add(order_record)
    db.commit()
    db.refresh(order_record)
    if account:
        db.refresh(account)

    return order_record, promoted_to_cliente, account


def push_account_to_erp(db: Session, account_id: int) -> Tuple[bool, str, Optional[str]]:
    """
    Validates account tax_id and generates official ERP customer ID (ERP-2026-XXXX).
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        return False, "Cuenta no encontrada", None

    if not account.tax_id:
        return False, "Para sincronizar con el ERP la cuenta debe tener NIF/CIF válido", None

    if account.erp_customer_id:
        return True, f"La cuenta ya está sincronizada con el ERP (Código: {account.erp_customer_id})", account.erp_customer_id

    # Generate ERP Code
    generated_code = f"ERP-2026-{account.id:04d}"
    account.erp_customer_id = generated_code
    account.last_activity_at = datetime.utcnow()

    note = Interaction(
        account_id=account.id,
        user_id=account.owner_id or 1,
        type=InteractionType.NOTE,
        summary=f"Cuenta dada de alta con éxito en el ERP maestro con código de cliente {generated_code}.",
        created_at=datetime.utcnow(),
    )
    db.add(note)
    db.commit()
    db.refresh(account)

    return True, f"Cuenta sincronizada con éxito en el ERP con código {generated_code}", generated_code


def get_account_erp_summary(db: Session, account_id: int) -> Optional[Dict[str, Any]]:
    """
    Aggregates financial KPIs, average ticket, top purchased products and orders history for 360 viewer.
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        return None

    # Query all orders linked by account_id, billing_account_id (if distributor), or matching tax_id / erp_customer_id
    from sqlalchemy import or_
    conditions = [ErpOrderCache.account_id == account.id]
    if account.client_type and getattr(account.client_type, "value", str(account.client_type)) == "DISTRIBUIDOR":
        conditions.append(ErpOrderCache.billing_account_id == account.id)
    if account.tax_id:
        conditions.append(ErpOrderCache.tax_id == account.tax_id)
    if account.erp_customer_id:
        conditions.append(ErpOrderCache.erp_customer_id == account.erp_customer_id)

    orders = (
        db.query(ErpOrderCache)
        .filter(or_(*conditions))
        .order_by(ErpOrderCache.order_date.desc())
        .all()
    )

    total_orders = len(orders)
    total_revenue = sum(o.total_amount for o in orders)
    avg_ticket = (total_revenue / total_orders) if total_orders > 0 else 0.0

    # Aggregate top products
    product_counts: Dict[str, Dict[str, Any]] = {}
    for o in orders:
        for line in o.order_lines or []:
            desc = line.get("description") or line.get("sku") or "Artículo"
            qty = float(line.get("quantity") or 1)
            subtotal = float(line.get("subtotal") or 0.0)
            if desc not in product_counts:
                product_counts[desc] = {"product": desc, "units": 0, "total_spent": 0.0}
            product_counts[desc]["units"] += qty
            product_counts[desc]["total_spent"] += subtotal

    top_products_list = sorted(product_counts.values(), key=lambda x: x["total_spent"], reverse=True)[:5]

    first_order = min((o.order_date for o in orders), default=account.first_order_date)
    last_order = max((o.order_date for o in orders), default=None)

    serialized_orders = [
        {
            "id": o.id,
            "order_id": o.order_id,
            "erp_customer_id": o.erp_customer_id,
            "tax_id": o.tax_id,
            "account_id": o.account_id,
            "account_company_name": o.account.company_name if o.account else account.company_name,
            "billing_account_id": o.billing_account_id,
            "billing_account_name": o.billing_account.company_name if o.billing_account else None,
            "order_date": o.order_date,
            "total_amount": o.total_amount,
            "status": o.status,
            "top_products": o.top_products,
            "order_lines": o.order_lines,
            "created_at": o.created_at,
        }
        for o in orders
    ]

    return {
        "account_id": account.id,
        "company_name": account.company_name,
        "lifecycle_stage": account.lifecycle_stage.value,
        "client_type": account.client_type.value if account.client_type else None,
        "billing_account_id": account.billing_account_id,
        "billing_account_name": account.billing_account.company_name if account.billing_account else None,
        "erp_customer_id": account.erp_customer_id,
        "tax_id": account.tax_id,
        "total_orders_count": total_orders,
        "total_revenue_ytd": round(total_revenue, 2),
        "average_ticket": round(avg_ticket, 2),
        "first_order_date": first_order,
        "last_order_date": last_order,
        "top_purchased_products": top_products_list,
        "recent_orders": serialized_orders,
    }

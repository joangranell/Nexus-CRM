from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.users import User, UserRole
from app.models.accounts import Account
from app.models.erp import ErpOrderCache, ErpOrderStatus
from app.schemas.erp import (
    ErpOrderCreate,
    ErpOrderResponse,
    ErpAccountSummary,
    ErpPushResponse,
    SandboxSimulateOrderIn,
    ErpOrderLine,
)
from app.services.auth import get_current_user, require_role
from app.services.erp_sync import (
    process_erp_order,
    push_account_to_erp,
    get_account_erp_summary,
)

router = APIRouter(prefix="/erp", tags=["Integración ERP y Sandbox"])


@router.get("/accounts/{account_id}/summary", response_model=ErpAccountSummary)
def get_account_erp_view(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns 360 ERP Viewer metrics: YTD revenue, average ticket, top purchased products,
    and historical orders list.
    """
    summary = get_account_erp_summary(db, account_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    return summary


@router.post("/accounts/{account_id}/push-to-erp", response_model=ErpPushResponse)
def push_potencial_to_erp(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Simulates sending a POTENCIAL with valid tax_id to the ERP master database,
    assigning a generated official ERP code (ERP-2026-XXXX).
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    ok, msg, erp_code = push_account_to_erp(db, account_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    return {
        "success": True,
        "account_id": account.id,
        "company_name": account.company_name,
        "erp_customer_id": erp_code or account.erp_customer_id,
        "message": msg,
    }


@router.post("/sandbox/simulate-order")
def simulate_erp_order_sandbox(
    payload: SandboxSimulateOrderIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sandbox endpoint: Simulates an ERP order for any account/NIF to test live conversion
    from LEAD/POTENCIAL to CLIENTE with full financial telemetry.
    """
    account = None
    if payload.account_id:
        account = db.query(Account).filter(Account.id == payload.account_id).first()
    elif payload.tax_id:
        clean_tax = payload.tax_id.upper().replace("-", "").replace(" ", "")
        account = db.query(Account).filter(Account.tax_id == clean_tax).first()

    if not account and not payload.tax_id:
        raise HTTPException(status_code=400, detail="Debe especificar una cuenta o un NIF/CIF")

    import random
    from datetime import datetime
    order_num = f"PED-2026-{random.randint(1000, 9999)}"

    # Generate synthetic order lines
    lines = []
    unit_p = payload.order_amount / max(1, len(payload.products))
    for prod in payload.products:
        lines.append(
            ErpOrderLine(
                sku=f"SKU-{abs(hash(prod)) % 10000:04d}",
                description=prod,
                quantity=1.0,
                unit_price=round(unit_p, 2),
                subtotal=round(unit_p, 2),
            )
        )

    order_in = ErpOrderCreate(
        order_id=order_num,
        tax_id=account.tax_id if account else payload.tax_id,
        erp_customer_id=account.erp_customer_id if account else None,
        total_amount=payload.order_amount,
        status=payload.status,
        order_date=datetime.utcnow(),
        top_products=payload.products,
        order_lines=lines,
    )

    order, promoted, acc = process_erp_order(db, order_in)

    return {
        "success": True,
        "order_id": order.order_id,
        "promoted_to_cliente": promoted,
        "account_id": acc.id if acc else None,
        "account_company_name": acc.company_name if acc else None,
        "new_lifecycle_stage": acc.lifecycle_stage.value if acc else None,
        "total_amount": order.total_amount,
        "status": order.status.value,
        "message": (
            f"¡Pedido {order.order_id} procesado con éxito! "
            + (f"La cuenta '{acc.company_name}' ha sido promovida a CLIENTE." if promoted else "Caché de pedidos actualizada.")
        ),
    }


@router.get("/orders", response_model=List[ErpOrderResponse])
def list_erp_orders(
    account_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists cached ERP orders."""
    query = db.query(ErpOrderCache)
    if account_id:
        query = query.filter(ErpOrderCache.account_id == account_id)
    orders = query.order_by(ErpOrderCache.order_date.desc()).limit(limit).all()

    res = []
    for o in orders:
        res.append(
            ErpOrderResponse(
                id=o.id,
                order_id=o.order_id,
                erp_customer_id=o.erp_customer_id,
                tax_id=o.tax_id,
                account_id=o.account_id,
                account_company_name=o.account.company_name if o.account else None,
                order_date=o.order_date,
                total_amount=o.total_amount,
                status=o.status,
                top_products=o.top_products or [],
                order_lines=o.order_lines or [],
                created_at=o.created_at,
            )
        )
    return res

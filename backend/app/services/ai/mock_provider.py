import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.services.ai.provider_base import BaseAIProvider


class MockAIProvider(BaseAIProvider):
    """
    Mock AI Provider for local zero-cost testing, CI/CD, and offline demos.
    Generates rich, realistic B2B sales outputs.
    """

    def test_connection(self) -> Dict[str, Any]:
        return {
            "success": True,
            "message": "Conexión simulada con éxito (Modo Simulación / Mock Local activo). Latencia ultrabaja sin consumo de tokens.",
            "latency_ms": 28,
            "provider": "MOCK",
        }

    def enrich_lead(
        self,
        company_name: str,
        email: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> Dict[str, Any]:
        name_lower = company_name.lower()

        # Inferred sector & sizing
        if any(w in name_lower for w in ["dental", "clinica", "salud", "med"]):
            sector = "Salud y Odontología"
            size = "10-50 empleados (Clínica Privada)"
            prop = "Optimización en gestión de fungibles clínicos y reposición recurrente."
            step = "Contactar al responsable de compras clínicas para presentar catálogo de reposición ágil."
        elif any(w in name_lower for w in ["const", "obra", "reforma", "ferre", "suminist"]):
            sector = "Construcción y Suministros Industriales"
            size = "25-100 empleados (Contratista / Distribuidor)"
            prop = "Condiciones mayoristas con tarifa escalonada y entregas directas a obra en 24h."
            step = "Agendar videollamada para revisar volumen anual y tarifas por volumen."
        elif any(w in name_lower for w in ["tech", "soft", "digital", "soluc"]):
            sector = "Tecnología y Servicios B2B"
            size = "15-60 empleados (Pyme Tecnológica)"
            prop = "Integración directa de aprovisionamiento vía API y facturación centralizada."
            step = "Enviar ficha técnica y credenciales de portal corporativo."
        else:
            sector = "Comercio Mayorista y Distribución"
            size = "20-80 empleados (Distribuidor Regional)"
            prop = "Amplio catálogo homologado Nexus con soporte técnico dedicado y márgenes competitivos."
            step = "Presentar portafolio de productos destacados con muestra comercial."

        dom_info = f" ({domain})" if domain else ""
        ai_summary = (
            f"Empresa del sector {sector}{dom_info}. Perfil estimado: {size}. "
            f"Oportunidad detectada para posicionar nuestra oferta de distribución: {prop}"
        )

        return {
            "ai_summary": ai_summary,
            "estimated_sector": sector,
            "estimated_size": size,
            "key_value_prop": prop,
            "suggested_next_step": step,
        }

    def parse_voice_interaction(
        self,
        transcript: str,
        company_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        text_lower = transcript.lower()

        # 1. Determine interaction type
        if any(w in text_lower for w in ["reunión", "visita", "visité", "reuní", "presencial"]):
            interaction_type = "MEETING_VISIT"
        elif any(w in text_lower for w in ["email", "correo", "escribí"]):
            interaction_type = "EMAIL_1TO1"
        else:
            interaction_type = "CALL_EFFECTIVE"

        # 2. Extract financial opportunity (€)
        detected_amount = None
        amount_match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:€|euros|mil|k)", text_lower)
        if not amount_match:
            amount_match = re.search(r"(?:presupuesto|pedido|importe|cierre|oportunidad|valor)\s*(?:de)?\s*(\d+(?:[.,]\d+)?)", text_lower)

        if amount_match:
            raw_num = amount_match.group(1).replace(".", "").replace(",", ".")
            try:
                detected_amount = float(raw_num)
                if "mil" in text_lower and detected_amount < 1000:
                    detected_amount *= 1000
                elif "k" in text_lower and detected_amount < 1000:
                    detected_amount *= 1000
            except ValueError:
                detected_amount = None

        # 3. Extract close date if mentioned
        detected_close_date = None
        now = datetime.utcnow()
        if "fin de mes" in text_lower:
            # End of current month
            next_month = now.replace(day=28) + timedelta(days=4)
            end_of_month = next_month - timedelta(days=next_month.day)
            detected_close_date = end_of_month.strftime("%Y-%m-%d")
        elif "próxima semana" in text_lower or "semana que viene" in text_lower:
            detected_close_date = (now + timedelta(days=7)).strftime("%Y-%m-%d")
        elif "15 días" in text_lower:
            detected_close_date = (now + timedelta(days=15)).strftime("%Y-%m-%d")
        elif detected_amount:
            # Default close date in 30 days if amount detected
            detected_close_date = (now + timedelta(days=30)).strftime("%Y-%m-%d")

        # 4. Next follow-up
        if "mañana" in text_lower:
            followup_days = 1
        elif "3 días" in text_lower:
            followup_days = 3
        elif "15 días" in text_lower:
            followup_days = 15
        elif "mes" in text_lower:
            followup_days = 30
        else:
            followup_days = 7

        # Opportunity title
        opp_title = None
        if detected_amount:
            opp_title = f"Oportunidad Dictada: {company_name or 'Cuenta'} ({int(detected_amount)} €)"

        return {
            "summary": f"Dictado comercial procesado: {transcript.strip()}",
            "interaction_type": interaction_type,
            "detected_amount": detected_amount,
            "detected_close_date": detected_close_date,
            "next_followup_days": followup_days,
            "opportunity_title": opp_title,
        }

    def detect_email_intent(
        self,
        email_body: str,
    ) -> Dict[str, Any]:
        text_lower = email_body.lower()

        if any(w in text_lower for w in ["tarifa", "precios", "precio", "catálogo", "presupuesto", "cotiz"]):
            intent = "TARIFAS"
            sentiment = "POSITIVO"
            urgency = "ALTA"
            suggested_action = "Enviar catálogo oficial actualizado con escala de descuentos y confirmar recepción."
            followup_days = 2
            summary = "El cliente solicita información de tarifas y precios de productos."
        elif any(w in text_lower for w in ["reunir", "reunión", "llamada", "visita", "agendar", "demo"]):
            intent = "REUNION"
            sentiment = "POSITIVO"
            urgency = "ALTA"
            suggested_action = "Proponer 2 franjas horarias concretas para una llamada de 20 minutos."
            followup_days = 1
            summary = "Interés explícito en mantener una reunión comercial o demostración."
        elif any(w in text_lower for w in ["no nos interesa", "baja", "descartar", "no molestar", "cancelar"]):
            intent = "DESCARTE"
            sentiment = "NEGATIVO"
            urgency = "BAJA"
            suggested_action = "Respetar la negativa con educación y registrar sub-estado DESCARTADO."
            followup_days = 90
            summary = "El contacto indica no tener interés en la propuesta en este momento."
        elif any(w in text_lower for w in ["técnico", "especificación", "ficha técnica", "homologación", "garantía"]):
            intent = "CONSULTA_TECNICA"
            sentiment = "NEUTRO"
            urgency = "NORMAL"
            suggested_action = "Consultar con el departamento técnico y remitir las hojas de datos oficiales."
            followup_days = 3
            summary = "Consulta sobre especificaciones técnicas y homologaciones de producto."
        elif any(w in text_lower for w in ["pedido", "factura", "entrega", "albarán"]):
            intent = "PEDIDO"
            sentiment = "POSITIVO"
            urgency = "ALTA"
            suggested_action = "Gestionar pedido o tramitar con el ERP de facturación inmediatamente."
            followup_days = 1
            summary = "Gestión operativa o solicitud vinculada a pedido o facturación."
        else:
            intent = "GENERAL"
            sentiment = "NEUTRO"
            urgency = "NORMAL"
            suggested_action = "Responder con mensaje de cortesía manteniendo el canal abierto."
            followup_days = 5
            summary = "Mensaje de consulta general sin solicitud específica de compra."

        return {
            "intent": intent,
            "sentiment": sentiment,
            "summary": summary,
            "suggested_action": suggested_action,
            "urgency": urgency,
            "extracted_next_followup_days": followup_days,
        }

    def predict_churn_risk(
        self,
        company_name: str,
        client_type: Optional[str],
        total_orders: int,
        days_since_last: int,
        avg_interval: float,
        multiplier: float,
    ) -> Dict[str, Any]:
        if multiplier >= 3.0:
            risk_level = "CRITICO"
        elif multiplier >= 2.0:
            risk_level = "ALTO"
        else:
            risk_level = "MEDIO"

        subject = f"¿Cómo marcha todo en {company_name}? Novedades y reposición preferente Nexus"
        message = (
            f"Estimado/a cliente de {company_name},\n\n"
            f"Hemos detectado que hace {days_since_last} días desde su último pedido "
            f"(su frecuencia habitual estimada era de unos {int(avg_interval)} días). "
            f"Queremos verificar si tienen necesidad de reposición de stock en su catálogo habitual "
            f"o si ha habido alguna incidencia con sus suministros.\n\n"
            f"Tenemos activa una condición especial de transporte prioritario y tarifa blindada para "
            f"pedidos de reactivación antes de fin de mes.\n\n"
            f"¿Podemos conversar 5 minutos esta semana para revisar sus necesidades?\n\n"
            f"Atentamente,\nEquipo Comercial Nexus CRM"
        )

        return {
            "risk_level": risk_level,
            "suggested_reactivation_subject": subject,
            "suggested_reactivation_message": message,
        }

    def generate_campaign_copy(
        self,
        prompt: str,
        tone: str = "profesional y persuasivo",
        target_stage: Optional[str] = None,
    ) -> Dict[str, Any]:
        p_lower = prompt.lower()

        # Subject formulation
        if "reactiv" in p_lower or "inactiv" in p_lower or "fuga" in p_lower:
            subject = "Condiciones preferentes de reposición para {{empresa}}"
            preview = "Le ofrecemos reactivar su suministro habitual con condiciones exclusivas este mes."
            segment = "CLIENTES_INACTIVOS_60D"
        elif "oferta" in p_lower or "descuento" in p_lower or "campaña" in p_lower:
            subject = "Campaña exclusiva Nexus para {{empresa}}: tarifas especiales"
            preview = "Descuentos por volumen por tiempo limitado en nuestro catálogo líder."
            segment = "TODOS_POTENCIALES_Y_CLIENTES"
        elif "lead" in p_lower or "nuevo" in p_lower or "presentac" in p_lower:
            subject = "Catálogo corporativo Nexus para optimizar los suministros de {{empresa}}"
            preview = "Descubra por qué distribuidores líderes confían en Nexus para sus aprovisionamientos."
            segment = "LEADS_SIN_CONTACTAR"
        else:
            subject = "Actualización estratégica y catálogo de soluciones para {{empresa}}"
            preview = "Propuesta de valor y condiciones adaptadas para su negocio."
            segment = "SEGMENTO_PERSONALIZADO"

        html_content = f"""<div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; color: #181818;">
  <div style="background-color: #0176d3; padding: 24px 32px; color: #ffffff;">
    <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Nexus Suministros & Soluciones</h1>
    <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Calidad certificada y distribución ágil</p>
  </div>
  
  <div style="padding: 32px; line-height: 1.6; font-size: 15px;">
    <p style="margin-top: 0;">Estimado/a <strong>{{{{nombre}}}}</strong>,</p>
    
    <p>Nos ponemos en contacto desde Nexus CRM para presentarle a <strong>{{{{empresa}}}}</strong> nuestra nueva propuesta diseñada para optimizar los costes de aprovisionamiento y garantizar entregas en 24/48 horas.</p>
    
    <div style="background-color: #f4f6f9; border-left: 4px solid #0176d3; padding: 16px; margin: 24px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 14px; color: #0b213f;">
        <strong>Ventajas clave para {{{{empresa}}}}:</strong><br/>
        • Portafolio completo con trazabilidad integral de lotes y certificados oficiales.<br/>
        • Tarifas escalonadas adaptadas a su consumo anual estimado.<br/>
        • Gestor comercial dedicado y soporte preventa especializado.
      </p>
    </div>
    
    <p>Para conocer en detalle las tarifas y disponibilidad inmediata para su empresa, puede solicitar el catálogo directamente a través del siguiente enlace:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://nexus.com/solicitar-tarifa" style="background-color: #0176d3; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-weight: bold; font-size: 15px; display: inline-block;">Solicitar Catálogo y Tarifas</a>
    </div>
    
    <p style="font-size: 13px; color: #706e6b; margin-bottom: 0;">
      Quedamos a su entera disposición para cualquier consulta.<br/>
      Un cordial saludo,<br/>
      <strong>Equipo Comercial Nexus</strong>
    </p>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 16px 32px; text-align: center; font-size: 11px; color: #706e6b; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">Recibe este correo porque su empresa {{{{empresa}}}} está registrada en nuestra base de datos profesional B2B. <a href="https://nexus.com/unsubscribe" style="color: #0176d3;">Darse de baja</a></p>
  </div>
</div>"""

        tips = [
            "El botón 'Solicitar Catálogo y Tarifas' activará automáticamente la detección de Alta Intención si el destinatario pulsa en él.",
            "Recuerda que las variables {{nombre}} y {{empresa}} se reemplazarán automáticamente con los datos de cada destinatario al disparar la campaña.",
            f"Tono seleccionado: '{tone}'. Estilo estructurado con visualización responsive.",
        ]

        return {
            "subject": subject,
            "preview_text": preview,
            "html_content": html_content,
            "suggested_segment": segment,
            "tips": tips,
        }

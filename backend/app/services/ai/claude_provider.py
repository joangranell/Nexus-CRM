import json
import time
from typing import Dict, Any, List, Optional
import requests
from app.services.ai.provider_base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider


class ClaudeProvider(BaseAIProvider):
    """
    Anthropic Claude Provider (claude-3-5-sonnet).
    Uses the Anthropic Messages API.
    """

    def _call_claude(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        if not self.api_key:
            return None

        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        model = self.model_name or "claude-3-5-sonnet-20241022"
        payload = {
            "model": model,
            "system": system_prompt + "\nIMPORTANTE: Responde ÚNICAMENTE con un JSON válido sin bloques markdown ni texto adicional.",
            "messages": [{"role": "user", "content": user_prompt}],
            "max_tokens": 1200,
            "temperature": self.temperature,
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                content = data["content"][0]["text"]
                # Strip markdown code blocks if any
                if content.startswith("```"):
                    lines = content.split("\n")
                    content = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
                return content.strip()
            else:
                return None
        except Exception:
            return None

    def test_connection(self) -> Dict[str, Any]:
        t0 = time.time()
        if not self.api_key:
            return {
                "success": False,
                "message": "Falta la clave de API de Anthropic Claude (formato: sk-ant-...).",
                "latency_ms": 0,
                "provider": "CLAUDE",
            }

        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        model = self.model_name or "claude-3-5-sonnet-20241022"
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 5,
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=8)
            latency = int((time.time() - t0) * 1000)
            if resp.status_code == 200:
                return {
                    "success": True,
                    "message": f"Conectado exitosamente con Anthropic Claude ({model}).",
                    "latency_ms": latency,
                    "provider": "CLAUDE",
                }
            else:
                return {
                    "success": False,
                    "message": f"Error de autenticación Anthropic Claude ({resp.status_code}): {resp.text[:150]}",
                    "latency_ms": latency,
                    "provider": "CLAUDE",
                }
        except Exception as e:
            latency = int((time.time() - t0) * 1000)
            return {
                "success": False,
                "message": f"Fallo al conectar con Anthropic Claude: {str(e)[:150]}",
                "latency_ms": latency,
                "provider": "CLAUDE",
            }

    def enrich_lead(
        self,
        company_name: str,
        email: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> Dict[str, Any]:
        system_prompt = (
            "Eres un analista B2B en Nexus CRM. Devuelve un JSON válido con: "
            "ai_summary, estimated_sector, estimated_size, key_value_prop, suggested_next_step."
        )
        user_prompt = f"Empresa: {company_name}, Email: {email or 'N/A'}, Dominio: {domain or 'N/A'}"
        res = self._call_claude(system_prompt, user_prompt)
        if res:
            try:
                return json.loads(res)
            except Exception:
                pass
        return MockAIProvider().enrich_lead(company_name, email, domain)

    def parse_voice_interaction(
        self,
        transcript: str,
        company_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        system_prompt = (
            "Procesa este dictado de visita comercial para CRM B2B. Devuelve un JSON válido con: "
            "summary, interaction_type ('CALL_EFFECTIVE' o 'MEETING_VISIT'), detected_amount (float o null), "
            "detected_close_date (YYYY-MM-DD o null), next_followup_days (int), opportunity_title (string o null)."
        )
        user_prompt = f"Empresa: {company_name or 'N/A'}. Transcripción: {transcript}"
        res = self._call_claude(system_prompt, user_prompt)
        if res:
            try:
                return json.loads(res)
            except Exception:
                pass
        return MockAIProvider().parse_voice_interaction(transcript, company_name)

    def detect_email_intent(
        self,
        email_body: str,
    ) -> Dict[str, Any]:
        system_prompt = (
            "Analiza el correo entrante para CRM B2B. Devuelve un JSON con: "
            "intent ('TARIFAS', 'REUNION', 'DESCARTE', 'CONSULTA_TECNICA', 'PEDIDO', 'GENERAL'), "
            "sentiment ('POSITIVO', 'NEUTRO', 'NEGATIVO'), summary, suggested_action, urgency ('ALTA', 'NORMAL', 'BAJA'), "
            "extracted_next_followup_days (int)."
        )
        res = self._call_claude(system_prompt, email_body)
        if res:
            try:
                return json.loads(res)
            except Exception:
                pass
        return MockAIProvider().detect_email_intent(email_body)

    def predict_churn_risk(
        self,
        company_name: str,
        client_type: Optional[str],
        total_orders: int,
        days_since_last: int,
        avg_interval: float,
        multiplier: float,
    ) -> Dict[str, Any]:
        system_prompt = (
            "Especialista en reactivación B2B y prevención de churn. Devuelve un JSON con: "
            "risk_level ('CRITICO', 'ALTO', 'MEDIO'), suggested_reactivation_subject, suggested_reactivation_message."
        )
        user_prompt = (
            f"Cliente: {company_name}, Tipo: {client_type}, Pedidos: {total_orders}, "
            f"Días inactivo: {days_since_last}, Frecuencia habitual: {avg_interval} días."
        )
        res = self._call_claude(system_prompt, user_prompt)
        if res:
            try:
                return json.loads(res)
            except Exception:
                pass
        return MockAIProvider().predict_churn_risk(company_name, client_type, total_orders, days_since_last, avg_interval, multiplier)

    def generate_campaign_copy(
        self,
        prompt: str,
        tone: str = "profesional y persuasivo",
        target_stage: Optional[str] = None,
    ) -> Dict[str, Any]:
        system_prompt = (
            "Redactor de email marketing B2B. Devuelve un JSON con: "
            "subject, preview_text, html_content (con variables {{nombre}} y {{empresa}}), suggested_segment, tips."
        )
        user_prompt = f"Instrucción: {prompt}. Tono: {tone}. Etapa: {target_stage or 'GENERAL'}."
        res = self._call_claude(system_prompt, user_prompt)
        if res:
            try:
                return json.loads(res)
            except Exception:
                pass
        return MockAIProvider().generate_campaign_copy(prompt, tone, target_stage)

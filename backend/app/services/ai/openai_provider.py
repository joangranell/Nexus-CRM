import json
import time
from typing import Dict, Any, List, Optional
import requests
from app.services.ai.provider_base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider


class OpenAIProvider(BaseAIProvider):
    """
    Official OpenAI Provider (gpt-4o, gpt-4o-mini).
    """

    def _call_openai(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        if not self.api_key:
            return None

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        model = self.model_name or "gpt-4o-mini"
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": self.temperature,
            "response_format": {"type": "json_object"},
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                return None
        except Exception:
            return None

    def test_connection(self) -> Dict[str, Any]:
        t0 = time.time()
        if not self.api_key:
            return {
                "success": False,
                "message": "Falta la clave de API oficial de OpenAI (formato: sk-...).",
                "latency_ms": 0,
                "provider": "OPENAI",
            }

        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        model = self.model_name or "gpt-4o-mini"
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
                    "message": f"Conectado exitosamente con OpenAI ({model}).",
                    "latency_ms": latency,
                    "provider": "OPENAI",
                }
            else:
                return {
                    "success": False,
                    "message": f"Error de autenticación OpenAI ({resp.status_code}): {resp.text[:150]}",
                    "latency_ms": latency,
                    "provider": "OPENAI",
                }
        except Exception as e:
            latency = int((time.time() - t0) * 1000)
            return {
                "success": False,
                "message": f"Fallo al conectar con OpenAI: {str(e)[:150]}",
                "latency_ms": latency,
                "provider": "OPENAI",
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
        res = self._call_openai(system_prompt, user_prompt)
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
            "Procesa este dictado comercial para CRM B2B. Devuelve un JSON válido con: "
            "summary, interaction_type ('CALL_EFFECTIVE' o 'MEETING_VISIT'), detected_amount (float o null), "
            "detected_close_date (YYYY-MM-DD o null), next_followup_days (int), opportunity_title (string o null)."
        )
        user_prompt = f"Empresa: {company_name or 'N/A'}. Transcripción: {transcript}"
        res = self._call_openai(system_prompt, user_prompt)
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
            "Analiza el correo para CRM B2B. Devuelve JSON con: "
            "intent ('TARIFAS', 'REUNION', 'DESCARTE', 'CONSULTA_TECNICA', 'PEDIDO', 'GENERAL'), "
            "sentiment ('POSITIVO', 'NEUTRO', 'NEGATIVO'), summary, suggested_action, urgency ('ALTA', 'NORMAL', 'BAJA'), "
            "extracted_next_followup_days (int)."
        )
        res = self._call_openai(system_prompt, email_body)
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
            "Especialista en reactivación B2B. Devuelve JSON con: "
            "risk_level ('CRITICO', 'ALTO', 'MEDIO'), suggested_reactivation_subject, suggested_reactivation_message."
        )
        user_prompt = (
            f"Cliente: {company_name}, Tipo: {client_type}, Pedidos: {total_orders}, "
            f"Días inactivo: {days_since_last}, Frecuencia habitual: {avg_interval} días."
        )
        res = self._call_openai(system_prompt, user_prompt)
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
            "Redactor de email marketing B2B. Devuelve JSON con: "
            "subject, preview_text, html_content (con {{nombre}} y {{empresa}}), suggested_segment, tips."
        )
        user_prompt = f"Instrucción: {prompt}. Tono: {tone}. Etapa: {target_stage or 'GENERAL'}."
        res = self._call_openai(system_prompt, user_prompt)
        if res:
            try:
                return json.loads(res)
            except Exception:
                pass
        return MockAIProvider().generate_campaign_copy(prompt, tone, target_stage)

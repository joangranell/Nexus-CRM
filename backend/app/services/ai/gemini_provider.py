import json
import time
from typing import Dict, Any, List, Optional
import requests
from app.services.ai.provider_base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider


class GeminiProvider(BaseAIProvider):
    """
    Google Gemini Provider (gemini-2.5-flash / gemini-1.5-pro).
    Uses the Google Gemini REST API with JSON response schema.
    """

    def _call_gemini(self, prompt: str) -> Optional[str]:
        if not self.api_key:
            return None

        model = self.model_name or "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": self.temperature,
                "response_mime_type": "application/json",
            },
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            else:
                return None
        except Exception:
            return None

    def test_connection(self) -> Dict[str, Any]:
        t0 = time.time()
        if not self.api_key:
            return {
                "success": False,
                "message": "Falta la clave de API de Google Gemini (formato: AIza...).",
                "latency_ms": 0,
                "provider": "GEMINI",
            }

        model = self.model_name or "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {"contents": [{"parts": [{"text": "ping"}]}]}
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=8)
            latency = int((time.time() - t0) * 1000)
            if resp.status_code == 200:
                return {
                    "success": True,
                    "message": f"Conectado exitosamente con Google Gemini ({model}).",
                    "latency_ms": latency,
                    "provider": "GEMINI",
                }
            else:
                return {
                    "success": False,
                    "message": f"Error de autenticación Google Gemini ({resp.status_code}): {resp.text[:150]}",
                    "latency_ms": latency,
                    "provider": "GEMINI",
                }
        except Exception as e:
            latency = int((time.time() - t0) * 1000)
            return {
                "success": False,
                "message": f"Fallo al conectar con Google Gemini: {str(e)[:150]}",
                "latency_ms": latency,
                "provider": "GEMINI",
            }

    def enrich_lead(
        self,
        company_name: str,
        email: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> Dict[str, Any]:
        prompt = (
            f"Analiza esta empresa para Nexus CRM y devuelve un JSON válido con: "
            f"ai_summary, estimated_sector, estimated_size, key_value_prop, suggested_next_step.\n"
            f"Empresa: {company_name}, Email: {email}, Dominio: {domain}"
        )
        res = self._call_gemini(prompt)
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
        prompt = (
            f"Procesa este dictado comercial para CRM B2B. Devuelve un JSON válido con: "
            f"summary, interaction_type ('CALL_EFFECTIVE' o 'MEETING_VISIT'), detected_amount (float o null), "
            f"detected_close_date (YYYY-MM-DD o null), next_followup_days (int), opportunity_title (string o null).\n"
            f"Empresa: {company_name}. Transcripción: {transcript}"
        )
        res = self._call_gemini(prompt)
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
        prompt = (
            f"Analiza este correo para CRM B2B. Devuelve un JSON con: "
            f"intent ('TARIFAS', 'REUNION', 'DESCARTE', 'CONSULTA_TECNICA', 'PEDIDO', 'GENERAL'), "
            f"sentiment ('POSITIVO', 'NEUTRO', 'NEGATIVO'), summary, suggested_action, urgency ('ALTA', 'NORMAL', 'BAJA'), "
            f"extracted_next_followup_days (int).\nCorreo: {email_body}"
        )
        res = self._call_gemini(prompt)
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
        prompt = (
            f"Especialista en reactivación B2B de clientes con riesgo de churn. Devuelve un JSON con: "
            f"risk_level ('CRITICO', 'ALTO', 'MEDIO'), suggested_reactivation_subject, suggested_reactivation_message.\n"
            f"Cliente: {company_name}, Tipo: {client_type}, Pedidos: {total_orders}, "
            f"Días inactivo: {days_since_last}, Frecuencia habitual: {avg_interval} días."
        )
        res = self._call_gemini(prompt)
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
        full_prompt = (
            f"Redacta un mailing B2B para Nexus CRM. Devuelve un JSON con: "
            f"subject, preview_text, html_content (HTML con diseño y variables {{{{nombre}}}} y {{{{empresa}}}}), "
            f"suggested_segment, tips.\nInstrucción: {prompt}. Tono: {tone}. Etapa: {target_stage}"
        )
        res = self._call_gemini(full_prompt)
        if res:
            try:
                return json.loads(res)
            except Exception:
                pass
        return MockAIProvider().generate_campaign_copy(prompt, tone, target_stage)

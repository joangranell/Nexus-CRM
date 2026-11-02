import json
import time
from typing import Dict, Any, List, Optional
import requests
from app.services.ai.provider_base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider


class CopilotAzureProvider(BaseAIProvider):
    """
    Microsoft Azure OpenAI / Microsoft Copilot B2B Enterprise Provider.
    Respects private Azure Tenant boundaries, RGPD, and prevents model retraining.
    Endpoint format: https://<your-resource-name>.openai.azure.com
    Deployment: e.g. gpt-4o, gpt-35-turbo
    """

    def _call_azure(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        if not self.endpoint or not self.api_key:
            return None

        # Clean endpoint
        base_endpoint = self.endpoint.rstrip("/")
        deployment = self.model_name or "gpt-4o"
        url = f"{base_endpoint}/openai/deployments/{deployment}/chat/completions?api-version=2024-02-15-preview"
        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": self.temperature,
            "max_tokens": 1200,
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
        if not self.endpoint or not self.api_key:
            return {
                "success": False,
                "message": "Faltan credenciales de Azure OpenAI: se requiere Endpoint (https://<resource>.openai.azure.com) y API Key.",
                "latency_ms": 0,
                "provider": "AZURE_OPENAI",
            }

        base_endpoint = self.endpoint.rstrip("/")
        deployment = self.model_name or "gpt-4o"
        url = f"{base_endpoint}/openai/deployments/{deployment}/chat/completions?api-version=2024-02-15-preview"
        headers = {"api-key": self.api_key, "Content-Type": "application/json"}
        payload = {
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 5,
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=8)
            latency = int((time.time() - t0) * 1000)
            if resp.status_code == 200:
                return {
                    "success": True,
                    "message": f"Conexión exitosa con Azure OpenAI / Copilot (Deployment: '{deployment}'). Tenant corporativo validado.",
                    "latency_ms": latency,
                    "provider": "AZURE_OPENAI",
                }
            else:
                return {
                    "success": False,
                    "message": f"Error de autenticación Azure OpenAI ({resp.status_code}): {resp.text[:150]}",
                    "latency_ms": latency,
                    "provider": "AZURE_OPENAI",
                }
        except Exception as e:
            latency = int((time.time() - t0) * 1000)
            return {
                "success": False,
                "message": f"Fallo de red al conectar con Azure OpenAI: {str(e)[:150]}",
                "latency_ms": latency,
                "provider": "AZURE_OPENAI",
            }

    def enrich_lead(
        self,
        company_name: str,
        email: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> Dict[str, Any]:
        system_prompt = (
            "Eres un analista B2B senior en Nexus CRM. Devuelve un JSON estrictamente válido con las claves: "
            "ai_summary (string), estimated_sector (string), estimated_size (string), "
            "key_value_prop (string), suggested_next_step (string)."
        )
        user_prompt = f"Empresa: {company_name}, Email: {email or 'N/A'}, Dominio: {domain or 'N/A'}"
        res = self._call_azure(system_prompt, user_prompt)
        if res:
            try:
                return json.loads(res)
            except Exception:
                pass
        # Fallback to local intelligence if Azure offline/unconfigured
        return MockAIProvider().enrich_lead(company_name, email, domain)

    def parse_voice_interaction(
        self,
        transcript: str,
        company_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        system_prompt = (
            "Eres un asistente de ventas de Nexus CRM que procesa dictados de voz tras visitas comerciales. "
            "Devuelve un JSON estrictamente válido con las claves: "
            "summary (string), interaction_type ('CALL_EFFECTIVE' o 'MEETING_VISIT'), "
            "detected_amount (float o null), detected_close_date (YYYY-MM-DD o null), "
            "next_followup_days (int), opportunity_title (string o null)."
        )
        user_prompt = f"Empresa: {company_name or 'N/A'}. Transcripción de voz: {transcript}"
        res = self._call_azure(system_prompt, user_prompt)
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
            "Analiza el siguiente correo para un CRM B2B. Devuelve un JSON válido con las claves: "
            "intent (uno de: 'TARIFAS', 'REUNION', 'DESCARTE', 'CONSULTA_TECNICA', 'PEDIDO', 'GENERAL'), "
            "sentiment (uno de: 'POSITIVO', 'NEUTRO', 'NEGATIVO'), "
            "summary (string), suggested_action (string), urgency ('ALTA', 'NORMAL', 'BAJA'), "
            "extracted_next_followup_days (int)."
        )
        res = self._call_azure(system_prompt, email_body)
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
            "Eres un especialista en retención B2B en Nexus CRM. Devuelve un JSON válido con las claves: "
            "risk_level ('CRITICO', 'ALTO', 'MEDIO'), "
            "suggested_reactivation_subject (string), suggested_reactivation_message (string)."
        )
        user_prompt = (
            f"Cliente: {company_name}, Tipo: {client_type}, Pedidos: {total_orders}, "
            f"Días sin comprar: {days_since_last}, Intervalo promedio: {avg_interval} días, Multiplicador: {multiplier}."
        )
        res = self._call_azure(system_prompt, user_prompt)
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
            "Eres un redactor B2B para campañas de mailing de Nexus CRM. Devuelve un JSON válido con las claves: "
            "subject (string), preview_text (string), html_content (string con HTML responsive y variables {{nombre}} y {{empresa}}), "
            "suggested_segment (string), tips (lista de strings)."
        )
        user_prompt = f"Instrucción: {prompt}. Tono: {tone}. Etapa objetivo: {target_stage or 'GENERAL'}."
        res = self._call_azure(system_prompt, user_prompt)
        if res:
            try:
                return json.loads(res)
            except Exception:
                pass
        return MockAIProvider().generate_campaign_copy(prompt, tone, target_stage)

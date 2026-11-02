from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class BaseAIProvider(ABC):
    """
    Abstract base class for all AI providers in Nexus CRM.
    Ensures unified contract for the 5 business modules:
      a) Lead Enrichment
      b) Voice-to-CRM transcription & extraction
      c) Email Intent Detection
      d) Churn & ERP Risk Analysis
      e) Campaign Copy Generation
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        endpoint: Optional[str] = None,
        model_name: Optional[str] = None,
        temperature: float = 0.3,
    ):
        self.api_key = api_key or ""
        self.endpoint = endpoint or ""
        self.model_name = model_name or ""
        self.temperature = temperature

    @abstractmethod
    def test_connection(self) -> Dict[str, Any]:
        """
        Tests connectivity and credential validity.
        Returns: {"success": bool, "message": str, "latency_ms": int, "provider": str}
        """
        pass

    @abstractmethod
    def enrich_lead(
        self,
        company_name: str,
        email: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Case A: AI Lead Enricher.
        Returns: {
            "ai_summary": str,
            "estimated_sector": str,
            "estimated_size": str,
            "key_value_prop": str,
            "suggested_next_step": str
        }
        """
        pass

    @abstractmethod
    def parse_voice_interaction(
        self,
        transcript: str,
        company_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Case B: Voice-to-CRM.
        Returns: {
            "summary": str,
            "interaction_type": str, # CALL_EFFECTIVE, MEETING_VISIT, etc.
            "detected_amount": Optional[float],
            "detected_close_date": Optional[str], # YYYY-MM-DD
            "next_followup_days": int,
            "opportunity_title": Optional[str]
        }
        """
        pass

    @abstractmethod
    def detect_email_intent(
        self,
        email_body: str,
    ) -> Dict[str, Any]:
        """
        Case C: Detector de Intención de Correo.
        Returns: {
            "intent": str, # TARIFAS, REUNION, DESCARTE, CONSULTA_TECNICA, PEDIDO, GENERAL
            "sentiment": str, # POSITIVO, NEUTRO, NEGATIVO
            "summary": str,
            "suggested_action": str,
            "urgency": str, # ALTA, NORMAL, BAJA
            "extracted_next_followup_days": int
        }
        """
        pass

    @abstractmethod
    def predict_churn_risk(
        self,
        company_name: str,
        client_type: Optional[str],
        total_orders: int,
        days_since_last: int,
        avg_interval: float,
        multiplier: float,
    ) -> Dict[str, Any]:
        """
        Case D: Predictor de Fuga & Churn ERP.
        Returns: {
            "risk_level": str, # CRITICO, ALTO, MEDIO
            "suggested_reactivation_subject": str,
            "suggested_reactivation_message": str
        }
        """
        pass

    @abstractmethod
    def generate_campaign_copy(
        self,
        prompt: str,
        tone: str = "profesional y persuasivo",
        target_stage: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Case E: Generador de Copys de Mailing.
        Returns: {
            "subject": str,
            "preview_text": str,
            "html_content": str,
            "suggested_segment": str,
            "tips": List[str]
        }
        """
        pass

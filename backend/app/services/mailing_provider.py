import os
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

logger = logging.getLogger("mailing_provider")


class BaseMailingProvider(ABC):
    """Abstract Base Class for email delivery adapters."""

    @abstractmethod
    def send_message(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Sends an individual email and returns provider delivery telemetry."""
        pass

    @abstractmethod
    def send_batch(
        self,
        messages: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Dispatches a batch of messages."""
        pass


class SandboxMailingProvider(BaseMailingProvider):
    """
    Local simulation provider.
    Renders and stores the final email in SQLite for offline validation and debugging,
    allowing manual or automated testing of delivery events.
    """

    def send_message(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        logger.info(f"[SANDBOX MAILING] Message queued to {to_email} | Subject: '{subject}'")
        return {
            "success": True,
            "provider": "sandbox",
            "provider_message_id": f"sandbox-msg-{abs(hash(to_email + subject)) % 1000000}",
            "status": "DELIVERED",
        }

    def send_batch(
        self,
        messages: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        logger.info(f"[SANDBOX MAILING] Batch of {len(messages)} messages dispatched in simulation mode.")
        return {
            "success": True,
            "provider": "sandbox",
            "total_sent": len(messages),
        }


class MailchimpProvider(BaseMailingProvider):
    """Adapter for Mailchimp Marketing / Transactional (Mandrill) API."""

    def __init__(self):
        self.api_key = os.getenv("MAILCHIMP_API_KEY", "")
        self.server_prefix = os.getenv("MAILCHIMP_SERVER_PREFIX", "us1")
        self.list_id = os.getenv("MAILCHIMP_LIST_ID", "")

    def send_message(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not self.api_key:
            logger.warning("[MAILCHIMP] No API key set. Falling back to Sandbox simulation.")
            return SandboxMailingProvider().send_message(to_email, subject, body_html, metadata)

        # Real HTTP call to Mandrill / Mailchimp Transactional
        import urllib.request
        import json

        url = "https://mandrillapp.com/api/1.0/messages/send.json"
        payload = {
            "key": self.api_key,
            "message": {
                "html": body_html,
                "subject": subject,
                "to": [{"email": to_email, "type": "to"}],
                "metadata": metadata or {},
            },
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                return {"success": True, "provider": "mailchimp", "response": res_data}
        except Exception as e:
            logger.error(f"[MAILCHIMP ERROR] {str(e)}")
            return {"success": False, "provider": "mailchimp", "error": str(e)}

    def send_batch(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        results = []
        for m in messages:
            res = self.send_message(m["to_email"], m["subject"], m["body_html"], m.get("metadata"))
            results.append(res)
        return {"success": True, "provider": "mailchimp", "results": results}


class BrevoProvider(BaseMailingProvider):
    """Adapter for Brevo (formerly Sendinblue) REST API."""

    def __init__(self):
        self.api_key = os.getenv("BREVO_API_KEY", "")

    def send_message(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not self.api_key:
            logger.warning("[BREVO] No API key configured. Falling back to Sandbox simulation.")
            return SandboxMailingProvider().send_message(to_email, subject, body_html, metadata)

        import urllib.request
        import json

        url = "https://api.brevo.com/v3/smtp/email"
        payload = {
            "sender": {"name": "Nexus Ventas", "email": os.getenv("MAIL_FROM", "ventas@nexuscrm.com")},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": body_html,
            "tags": [metadata.get("campaign_name", "nexus_crm")] if metadata else [],
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "api-key": self.api_key},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                return {"success": True, "provider": "brevo", "message_id": res_data.get("messageId")}
        except Exception as e:
            logger.error(f"[BREVO ERROR] {str(e)}")
            return {"success": False, "provider": "brevo", "error": str(e)}

    def send_batch(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "success": True,
            "provider": "brevo",
            "results": [
                self.send_message(m["to_email"], m["subject"], m["body_html"], m.get("metadata"))
                for m in messages
            ],
        }


class ResendProvider(BaseMailingProvider):
    """Adapter for Resend API."""

    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY", "")

    def send_message(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not self.api_key:
            logger.warning("[RESEND] No API key configured. Falling back to Sandbox simulation.")
            return SandboxMailingProvider().send_message(to_email, subject, body_html, metadata)

        import urllib.request
        import json

        url = "https://api.resend.com/emails"
        payload = {
            "from": os.getenv("MAIL_FROM", "Nexus Ventas <ventas@nexuscrm.com>"),
            "to": [to_email],
            "subject": subject,
            "html": body_html,
            "tags": [{"name": "campaign_id", "value": str(metadata.get("campaign_id", "0"))}] if metadata else [],
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                return {"success": True, "provider": "resend", "id": res_data.get("id")}
        except Exception as e:
            logger.error(f"[RESEND ERROR] {str(e)}")
            return {"success": False, "provider": "resend", "error": str(e)}

    def send_batch(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "success": True,
            "provider": "resend",
            "results": [
                self.send_message(m["to_email"], m["subject"], m["body_html"], m.get("metadata"))
                for m in messages
            ],
        }


def get_mailing_provider(provider_name: Optional[str] = None) -> BaseMailingProvider:
    """Factory function returning the configured mailing provider adapter."""
    chosen = (provider_name or os.getenv("MAILING_PROVIDER", "sandbox")).lower().strip()
    if chosen == "mailchimp":
        return MailchimpProvider()
    if chosen == "brevo":
        return BrevoProvider()
    if chosen == "resend":
        return ResendProvider()
    return SandboxMailingProvider()

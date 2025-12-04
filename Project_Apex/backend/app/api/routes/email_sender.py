from __future__ import annotations

import smtplib

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.services.email_sender import EmailPayload, send_email


class SendEmailPayload(BaseModel):
    to: EmailStr
    subject: str
    message: str | None = None
    title: str | None = None
    html: str | None = None
    cta_text: str | None = None
    cta_url: str | None = None
    preheader: str | None = None
    status: str | None = None
    footer_ref: str | None = None
    help_url: str | None = None
    support_url: str | None = None
    unsubscribe_url: str | None = None
    reference_id: str | None = None
    timestamp: str | None = None

    def to_email_payload(self) -> EmailPayload:
        return EmailPayload(**self.model_dump())


router = APIRouter(prefix="/email", tags=["email"])


@router.post("/send-email")
async def send_email_endpoint(payload: SendEmailPayload) -> dict[str, str]:
    """Send an email using Hostinger SMTP credentials from .env."""
    try:
        send_email(payload.to_email_payload())
        return {"status": "ok", "detail": "Email sent"}
    except smtplib.SMTPAuthenticationError as exc:
        raise HTTPException(status_code=401, detail="SMTP authentication failed") from exc
    except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected) as exc:
        raise HTTPException(status_code=502, detail="SMTP connection failed") from exc
    except Exception as exc:  # pragma: no cover - safeguard for unexpected errors
        raise HTTPException(status_code=500, detail="Failed to send email") from exc

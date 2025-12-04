import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from anyio.to_thread import run_sync
import emails  # type: ignore
import jwt
from jinja2 import Template
from jwt.exceptions import InvalidTokenError

from app.core import security
from app.core.config import settings

# Optional MailerSend support
try:
    from mailersend import MailerSendClient, EmailBuilder  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    MailerSendClient = None  # type: ignore
    EmailBuilder = None  # type: ignore

# Optional requests for future providers (already available in dependencies)
try:
    import requests
except ImportError:  # pragma: no cover
    requests = None  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class EmailData:
    html_content: str
    subject: str




def render_email_template(*, template_name: str, context: dict[str, Any]) -> str:
    template_str = (
        Path(__file__).parent / "email-templates" / "build" / template_name
    ).read_text()
    html_content = Template(template_str).render(context)
    return html_content


async def send_email(
    *,
    email_to: str,
    subject: str = "",
    html_content: str = "",
) -> None:
    # Check if any email provider is configured
    mailersend_enabled = bool(settings.MAILERSEND_API_KEY and settings.MAILERSEND_FROM_EMAIL)
    smtp_enabled = bool(settings.SMTP_HOST and settings.EMAILS_FROM_EMAIL)
    
    # If no providers are configured, log warning and return
    if not settings.emails_enabled:
        logger.warning(
            "emails_disabled_placeholder",
            extra={"email_to": email_to, "subject": subject},
        )
        return None

    # Try providers in configured priority order
    for provider in settings.email_provider_priority:
        if provider == "mailersend" and mailersend_enabled:
            if MailerSendClient is not None and EmailBuilder is not None:
                # Use only the environment variable for API key
                api_key = settings.MAILERSEND_API_KEY
                from_email = str(settings.MAILERSEND_FROM_EMAIL or "pagi@test-pzkmgq769qyl059v.mlsender.net")
                from_name = settings.MAILERSEND_FROM_NAME or "Coookietest"

                def _send_ms(client_cls: type, builder_cls: type) -> Any:
                    client = client_cls(api_key=api_key)
                    email = (
                        builder_cls()
                        .from_email(from_email, from_name)
                        .to_many([{"email": email_to}])
                        .subject(subject)
                        .html(html_content)
                        .build()
                    )
                    return client.emails.send(email)

                try:
                    resp = await run_sync(_send_ms, MailerSendClient, EmailBuilder)
                    ok = bool(getattr(resp, "success", False))
                    status = getattr(resp, "status_code", None)
                    if not ok:
                        logger.error("mailersend_send_failed", extra={"status": status, "to": email_to, "provider": "mailersend"})
                        continue  # Fall through to next provider
                    else:
                        logger.info("mailersend_email_dispatched", extra={"to": email_to, "status": status})
                        return None
                except Exception:
                    logger.exception("mailersend_exception")
                    continue  # Fall through to next provider
                    
        elif provider == "smtp" and smtp_enabled:
            def _send_smtp() -> Any:
                message = emails.Message(
                    subject=subject,
                    html=html_content,
                    mail_from=(settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL),
                )
                smtp_options = {"host": settings.SMTP_HOST, "port": settings.SMTP_PORT}
                if settings.SMTP_TLS:
                    smtp_options["tls"] = True
                elif settings.SMTP_SSL:
                    smtp_options["ssl"] = True
                if settings.SMTP_USER:
                    smtp_options["user"] = settings.SMTP_USER
                if settings.SMTP_PASSWORD:
                    smtp_options["password"] = settings.SMTP_PASSWORD
                return message.send(to=email_to, smtp=smtp_options)

            try:
                response = await run_sync(_send_smtp)
                logger.info("smtp_email_dispatched", extra={"to": email_to, "response": str(response)})
                return None
            except Exception:
                logger.exception("smtp_exception")
                continue  # Fall through (though this is the last provider)

    # If we get here, all configured providers failed
    logger.error("all_email_providers_failed", extra={"to": email_to, "subject": subject})


def generate_test_email(email_to: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Test email"
    html_content = render_email_template(
        template_name="test_email.html",
        context={"project_name": settings.PROJECT_NAME, "email": email_to},
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_reset_password_email(email_to: str, email: str, token: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Password recovery for user {email}"
    link = f"{settings.FRONTEND_HOST}/reset-password?token={token}"
    html_content = render_email_template(
        template_name="reset_password.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": email,
            "email": email_to,
            "valid_hours": settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS,
            "link": link,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_new_account_email(
    email_to: str, username: str, password: str
) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - New account for user {username}"
    html_content = render_email_template(
        template_name="new_account.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": username,
            "password": password,
            "email": email_to,
            "link": settings.FRONTEND_HOST,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_password_reset_token(email: str) -> str:
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email},
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> str | None:
    try:
        decoded_token = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        return str(decoded_token["sub"])
    except InvalidTokenError:
        return None


def generate_email_verification_token(email: str) -> str:
    """Create a short‑lived JWT used for email verification."""
    delta = timedelta(hours=24)
    now = datetime.now(timezone.utc)
    exp = (now + delta).timestamp()
    return jwt.encode(
        {"exp": exp, "nbf": now, "sub": email, "purpose": "email_verification"},
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )


def verify_email_verification_token(token: str) -> str | None:
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        if decoded.get("purpose") != "email_verification":
            return None
        return str(decoded.get("sub"))
    except InvalidTokenError:
        return None


def generate_email_verification_email(email_to: str, token: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Verify your email"
    link = f"{settings.FRONTEND_HOST}/verify-email?token={token}"
    try:
        html_content = render_email_template(
            template_name="verify_email.html",
            context={
                "project_name": settings.PROJECT_NAME,
                "email": email_to,
                "link": link,
            },
        )
    except Exception:
        html_content = f"""
        <h2>Verify your email</h2>
        <p>Hello, please confirm your email for {settings.PROJECT_NAME}.</p>
        <p><a href='{link}'>Click here to verify</a></p>
        <p>If you did not request this, you can ignore this email.</p>
        """
    return EmailData(html_content=html_content, subject=subject)

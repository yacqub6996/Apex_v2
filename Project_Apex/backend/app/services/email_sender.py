from __future__ import annotations

import os
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from project root
load_dotenv(Path(__file__).resolve().parents[3] / ".env")


@dataclass
class EmailPayload:
    to: str
    subject: str
    message: str | None = None
    title: str | None = None
    html: str | None = None
    cta_text: str | None = None
    cta_url: str | None = None
    preheader: str | None = None
    status: str | None = None  # "success" | "error" | "info"
    footer_ref: str | None = None
    logo_url: str | None = None
    dark_logo_url: str | None = None
    help_url: str | None = None
    support_url: str | None = None
    unsubscribe_url: str | None = None
    reference_id: str | None = None
    timestamp: str | None = None


def get_frontend_base() -> str:
    return (os.getenv("FRONTEND_URL") or os.getenv("FRONTEND_HOST") or "").rstrip("/")


def build_verification_link(token: str) -> str:
    frontend = get_frontend_base()
    if frontend:
        return f"{frontend}/verify-email?token={token}"
    return f"https://example.com/verify-email?token={token}"


def _smtp_config() -> dict[str, str | int | bool]:
    return {
        "host": os.getenv("SMTP_HOST", ""),
        "port": int(os.getenv("SMTP_PORT", "465")),
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD") or "",
        "use_ssl": os.getenv("SMTP_USE_SSL", "true").lower() in {"true", "1", "yes"},
        "from_name": os.getenv("SMTP_FROM_NAME") or os.getenv("EMAILS_FROM_NAME") or "Apex Trading",
    }


def render_branded_html(
    *,
    title: str,
    body: str,
    cta_text: str | None = None,
    cta_url: str | None = None,
    preheader: str | None = None,
    status: str | None = None,
    footer_ref: str | None = None,
    logo_url: str | None = None,
    dark_logo_url: str | None = None,
    help_url: str | None = None,
    support_url: str | None = None,
    unsubscribe_url: str | None = None,
    reference_id: str | None = None,
    timestamp: str | None = None,
) -> str:
    brand = "#00BCD4"
    brand_mid = "#0097A7"
    brand_dark = "#00838F"
    text_primary = "#1a1a1a"
    text_secondary = "#6b7280"
    text_tertiary = "#9ca3af"
    divider = "#e5e7eb"

    status_styles = {
        "success": {
            "bg_start": "#E8F5E9",
            "bg_end": "#C8E6C9",
            "text": "#2E7D32",
            "shadow": "rgba(46, 125, 50, 0.15)",
            "border": "rgba(46, 125, 50, 0.12)",
            "icon": "&#10003;",
        },
        "error": {
            "bg_start": "#FDECEC",
            "bg_end": "#FAD4D4",
            "text": "#C62828",
            "shadow": "rgba(198, 40, 40, 0.15)",
            "border": "rgba(198, 40, 40, 0.12)",
            "icon": "!",
        },
        "info": {
            "bg_start": "#E0F7FA",
            "bg_end": "#B2EBF2",
            "text": brand_dark,
            "shadow": "rgba(0, 131, 143, 0.15)",
            "border": "rgba(0, 131, 143, 0.12)",
            "icon": "i",
        },
    }

    status_label = (status or "Update").title()
    badge_theme = status_styles.get((status or "info").lower(), status_styles["info"])
    badge_bg_start = badge_theme["bg_start"]
    badge_bg_end = badge_theme["bg_end"]
    badge_text = badge_theme["text"]
    badge_shadow = badge_theme["shadow"]
    badge_border = badge_theme["border"]
    status_icon = badge_theme["icon"]
    body_html = "<br>".join(body.splitlines()) if body else ""

    cta_block = ""
    if cta_text and cta_url:
        cta_block = f"""
                <tr>
                  <td align="center" style="padding-bottom: 40px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-radius: 8px; background: linear-gradient(135deg, {brand} 0%, {brand_mid} 100%); box-shadow: 0 4px 16px rgba(0, 188, 212, 0.35), 0 2px 8px rgba(0, 188, 212, 0.2);">
                          <a href="{cta_url}" style="display: inline-block; padding: 18px 56px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;" class="button-td">
                            {cta_text}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
        """

    details_block = ""
    if reference_id or timestamp:
        details_block = f"""
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius: 12px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); overflow: hidden;" class="info-box-bg accent-border">
                      <tr>
                        <td style="padding: 28px 32px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-bottom: 16px;">
                                <p style="margin: 0; font-size: 15px; font-weight: 700; letter-spacing: 0.3px;" class="text-primary">
                                  📊 Event Details
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                  {f'''
                                  <tr>
                                    <td style="padding: 8px 0; border-bottom: 1px solid rgba(0, 0, 0, 0.05);">
                                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                          <td style="font-size: 14px; font-weight: 600; width: 40%;" class="text-secondary">Reference ID</td>
                                          <td style="font-size: 14px; font-weight: 500; text-align: right;" class="text-primary">{reference_id}</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                  ''' if reference_id else ''}
                                  {f'''
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                          <td style="font-size: 14px; font-weight: 600; width: 40%;" class="text-secondary">Timestamp</td>
                                          <td style="font-size: 14px; font-weight: 500; text-align: right;" class="text-primary">{timestamp}</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                  ''' if timestamp else ''}
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
        """

    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>{title}</title>
  <style>
    body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    img {{ -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; display: block; }}
    body {{ margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    :root {{ color-scheme: light dark; supported-color-schemes: light dark; }}
    .email-bg {{ background: linear-gradient(135deg, #e8f4f8 0%, #f4f7fa 100%); }}
    .container-bg {{ background-color: #ffffff; }}
    .text-primary {{ color: {text_primary}; }}
    .text-secondary {{ color: {text_secondary}; }}
    .text-tertiary {{ color: {text_tertiary}; }}
    .footer-bg {{ background: linear-gradient(180deg, #fafbfc 0%, #f4f7fa 100%); }}
    .info-box-bg {{ background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); }}
    .accent-border {{ border-left: 4px solid {brand}; }}
    @media (prefers-color-scheme: dark) {{
      .email-bg {{ background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%) !important; }}
      .container-bg {{ background-color: #1a1a1a !important; box-shadow: 0 8px 32px rgba(0, 188, 212, 0.15) !important; }}
      .text-primary {{ color: #ffffff !important; }}
      .text-secondary {{ color: #d1d5db !important; }}
      .text-tertiary {{ color: #94a3b8 !important; }}
      .footer-bg {{ background: linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%) !important; }}
      .info-box-bg {{ background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%) !important; }}
      .divider {{ background: linear-gradient(90deg, transparent 0%, #2a2a2a 50%, transparent 100%) !important; }}
      .accent-border {{ border-left: 4px solid {brand} !important; box-shadow: -2px 0 8px rgba(0, 188, 212, 0.3) !important; }}
    }}
    @media only screen and (max-width: 600px) {{
      .mobile-padding {{ padding: 20px !important; }}
      .mobile-text {{ font-size: 14px !important; line-height: 1.5 !important; }}
      .mobile-heading {{ font-size: 24px !important; }}
      .button-td {{ padding: 16px 32px !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0;" class="email-bg">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f4f7fa;">{preheader or ""}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg">
    <tr>
      <td align="center" style="padding: 48px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04); overflow: hidden;" class="container-bg">
          <tr>
            <td style="height: 3px; background: linear-gradient(90deg, {brand} 0%, {brand_mid} 50%, {brand_dark} 100%);"></td>
          </tr>
          <tr>
            <td style="padding: 48px 48px 40px 48px;" class="mobile-padding">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background: linear-gradient(135deg, {badge_bg_start} 0%, {badge_bg_end} 100%); border-radius: 24px; padding: 10px 20px; box-shadow: 0 2px 8px {badge_shadow}; border: 1px solid {badge_border};">
                          <span style="color: {badge_text}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">{status_icon} {status_label}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 36px; font-weight: 700; line-height: 1.2; text-align: center; letter-spacing: -0.5px;" class="mobile-heading text-primary">{title}</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="width: 48px; height: 3px; background: linear-gradient(90deg, transparent 0%, {brand} 50%, transparent 100%); border-radius: 2px;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 36px;">
                    <p style="margin: 0; font-size: 17px; line-height: 1.7; text-align: center; max-width: 480px; margin: 0 auto;" class="mobile-text text-secondary">
                      {body_html}
                    </p>
                  </td>
                </tr>
                {cta_block}
                <tr>
                  <td style="padding: 32px 0;">
                    <div class="divider" style="height: 2px; background: linear-gradient(90deg, transparent 0%, {divider} 20%, {divider} 80%, transparent 100%); border-radius: 2px;"></div>
                  </td>
                </tr>
                {details_block}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 48px; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;" class="mobile-padding footer-bg">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 0 12px;">
                          <a href="{help_url or '#'}" style="color: {brand}; text-decoration: none; font-size: 14px; font-weight: 600;">Help Center</a>
                        </td>
                        <td style="padding: 0 4px;">
                          <span style="color: #d1d5db; font-weight: 300;">|</span>
                        </td>
                        <td style="padding: 0 12px;">
                          <a href="{support_url or '#'}" style="color: {brand}; text-decoration: none; font-size: 14px; font-weight: 600;">Contact Support</a>
                        </td>
                        <td style="padding: 0 4px;">
                          <span style="color: #d1d5db; font-weight: 300;">|</span>
                        </td>
                        <td style="padding: 0 12px;">
                          <a href="{unsubscribe_url or '#'}" style="color: #9ca3af; text-decoration: none; font-size: 14px; font-weight: 500;">Unsubscribe</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0;">
                    <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, {divider} 50%, transparent 100%);"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px; text-align: center;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #9ca3af; max-width: 480px; margin: 0 auto;">
                      You're receiving this email because of an update to your Apex Trading account. If this wasn't you, please secure your account or contact support.
                    </p>
                  </td>
                </tr>
                {f'''
                <tr>
                  <td style="padding-bottom: 8px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">Reference: {footer_ref}</p>
                  </td>
                </tr>
                ''' if footer_ref else ''}
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; font-size: 13px; color: #9ca3af; font-weight: 500;">
                      &copy; 2024 Apex Trading. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _build_message(payload: EmailPayload) -> EmailMessage:
    cfg = _smtp_config()
    msg = EmailMessage()
    from_email = cfg["user"] or "no-reply@example.com"
    from_name = cfg["from_name"]
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = payload.to
    msg["Subject"] = payload.subject
    msg.set_content(payload.message or "")

    html_body = payload.html or render_branded_html(
        title=payload.title or payload.subject,
        body=payload.message or "",
        cta_text=payload.cta_text,
        cta_url=payload.cta_url,
        preheader=payload.preheader,
        status=payload.status,
        footer_ref=payload.footer_ref,
        help_url=payload.help_url,
        support_url=payload.support_url,
        unsubscribe_url=payload.unsubscribe_url,
        reference_id=payload.reference_id,
        timestamp=payload.timestamp,
    )
    msg.add_alternative(html_body, subtype="html")
    return msg


def send_email(payload: EmailPayload) -> None:
    cfg = _smtp_config()
    if not cfg["host"]:
        raise RuntimeError("SMTP_HOST is not configured")

    msg = _build_message(payload)
    context = ssl.create_default_context()

    if cfg["use_ssl"]:
        with smtplib.SMTP_SSL(cfg["host"], cfg["port"], context=context) as server:
            if cfg["user"]:
                server.login(cfg["user"], cfg["password"])
            server.send_message(msg)
    else:
        with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
            server.starttls(context=context)
            if cfg["user"]:
                server.login(cfg["user"], cfg["password"])
            server.send_message(msg)


def send_welcome_email(email: str, name: str | None = None) -> None:
    greeting = name or "there"
    base_url = get_frontend_base()
    message_lines = [
        f"Hi {greeting},",
        "Welcome to Apex Trading. Your account is ready—complete your profile and KYC to unlock deposits and trading.",
        "If you did not sign up, please contact support immediately.",
    ]
    message = "\n\n".join(message_lines)
    send_email(
        EmailPayload(
            to=email,
            subject="Welcome to Apex Trading",
            title="Welcome to Apex Trading",
            message=message,
            html=render_branded_html(
                title="Welcome to Apex Trading",
                body=message,
                cta_text="Complete your profile",
                cta_url=f"{base_url}/dashboard" if base_url else None,
                preheader="Finish onboarding to start depositing and trading.",
                status="success",
            ),
        )
    )


def send_verification_email(email: str, token: str) -> None:
    link = build_verification_link(token)
    # Keep plaintext fallback with link, but avoid exposing the raw link in HTML body
    message = (
        "Verify your email to secure your account.\n\n"
        f"Verification link: {link}\n\n"
        "If you did not request this, you can ignore this email."
    )
    body_html = (
        "Verify your email to secure your account.<br>"
        "Tap the button below to confirm. If it doesn’t work, copy/paste the link from the plain text portion of this email."
    )
    send_email(
        EmailPayload(
            to=email,
            subject="Verify your email",
            title="Verify your email",
            message=message,
            html=render_branded_html(
                title="Verify your email",
                body=body_html,
                cta_text="Verify email",
                cta_url=link,
                preheader="Confirm your email to secure your Apex account.",
                status="info",
            ),
        )
    )

from datetime import timedelta
from typing import Annotated, Any
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlmodel import SQLModel, func, select, update

from app import crud
from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core import security
from app.core.config import settings
from app.core.hashing import hmac_to_advisory_lock_key, keyed_hmac_sha256, sha256_hex
from app.core.security import get_password_hash, verify_password
from app.core.time import utc_now
from app.models import (
    EmailVerificationAttempt,
    EmailVerificationAttemptOutcome,
    EmailVerificationHandoff,
    ExchangeVerificationRequest,
    Message,
    NewPassword,
    ResendEmailVerification,
    Token,
    User,
    UserPublic,
    UserCreate,
    UserRole,
    VerificationHandoffStatus,
    VerifyEmailResponse,
)
from app.services.long_term import mature_due_investments
from app.utils import (
    generate_password_reset_token,
    generate_reset_password_email,
    send_email,
    verify_password_reset_token,
    generate_email_verification_token,
    generate_email_verification_email,
    verify_email_verification_token,
)
import secrets
from app.services.notification_service import email_new_device_login
from app.services.email_sender import send_welcome_email

# Optional Google ID token verification
try:
    from google.oauth2 import id_token as google_id_token  # type: ignore
    from google.auth.transport import requests as google_requests  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    google_id_token = None
    google_requests = None

router = APIRouter(tags=["login"])
logger = logging.getLogger(__name__)


def _ensure_static_superuser(session: SessionDep, password: str) -> User | None:
    """Return a superuser record matching the static credentials (create if missing)."""

    if (
        not settings.FIRST_SUPERUSER
        or not settings.FIRST_SUPERUSER_PASSWORD
        or password != settings.FIRST_SUPERUSER_PASSWORD
    ):
        return None

    user = crud.get_user_by_email(session=session, email=settings.FIRST_SUPERUSER)
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=password,
            full_name="System Superuser",
            role=UserRole.ADMIN,
            is_superuser=True,
        )
        created = crud.create_user(session=session, user_create=user_in)
        created.email_verified = True
        created.email_verified_at = utc_now()
        session.add(created)
        session.commit()
        session.refresh(created)
        return created

    needs_commit = False
    if not user.is_superuser:
        user.is_superuser = True
        needs_commit = True
    if user.role != UserRole.ADMIN:
        user.role = UserRole.ADMIN
        needs_commit = True
    if not user.is_active:
        user.is_active = True
        needs_commit = True
    if not user.email_verified:
        user.email_verified = True
        user.email_verified_at = utc_now()
        needs_commit = True
    if not verify_password(password, user.hashed_password):
        user.hashed_password = get_password_hash(password)
        needs_commit = True
    if needs_commit:
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


def _auth_error(status_code: int, code: str, message: str) -> HTTPException:
    """Build a structured, machine-readable authentication error."""
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message},
    )


def _issue_access_token_for_user(user: User) -> str:
    """Issue the standard application access token for ``user``."""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return security.create_access_token(
        user.id,
        expires_delta=access_token_expires,
        extra_claims={"role": user.role.value},
    )


@router.post("/login/access-token", response_model=Token, status_code=200)
def login_access_token(
    session: SessionDep, request: Request, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = _ensure_static_superuser(session, form_data.password) if form_data.username == settings.FIRST_SUPERUSER else None
    if user is None:
        user = crud.authenticate(
            session=session, email=form_data.username, password=form_data.password
        )
    if not user:
        raise _auth_error(400, "INVALID_CREDENTIALS", "Incorrect email or password")
    if not user.is_active:
        raise _auth_error(400, "INACTIVE_ACCOUNT", "Inactive user")
    # Only enforce email verification when an email provider is configured.
    # In environments without outbound email, allow login without verification.
    if settings.emails_enabled and not user.email_verified:
        raise _auth_error(
            403,
            "EMAIL_NOT_VERIFIED",
            "Email not verified. Please check your inbox for the verification link.",
        )
    previous_login = user.last_login_at
    token = _issue_access_token_for_user(user)
    user.last_login_at = utc_now()
    session.add(user)
    try:
        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Failed to update last_login_at during login", extra={"user_id": str(user.id)})
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")
    try:
        # Mature any long-term investments that have reached their due date
        mature_due_investments(session, user=user)
    except Exception:
        # Do not block login on maturity processing
        pass
    try:
        should_alert = previous_login is None or (utc_now() - previous_login).total_seconds() > 24 * 3600
        if should_alert:
            ua = request.headers.get("user-agent", "Unknown device")
            ip = request.client.host if request.client else "unknown"
            email_new_device_login(session=session, user_id=user.id, device=ua, location=ip)
    except Exception:
        pass
    return Token(access_token=token, role=user.role)


@router.post("/login/google", response_model=Token, status_code=200)
def login_with_google(session: SessionDep, request: Request, body: dict[str, str]) -> Token:
    """Exchange a Google ID token for an application access token.

    Expects JSON body: {"id_token": "..."}
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google login not configured")

    if google_id_token is None or google_requests is None:
        raise HTTPException(status_code=500, detail="google-auth dependency not installed on server")

    id_token_value = body.get("id_token")
    if not id_token_value:
        raise HTTPException(status_code=400, detail="Missing id_token")

    try:
        request = google_requests.Request()
        info = google_id_token.verify_oauth2_token(id_token_value, request, settings.GOOGLE_CLIENT_ID)
        # Expected fields: sub, email, email_verified, name
        email = info.get("email")
        sub = info.get("sub")
        email_verified = bool(info.get("email_verified", False))
        if not email or not sub:
            raise HTTPException(status_code=400, detail="Invalid Google token: missing email or sub")
    except Exception:
        logger.exception("google_id_token_verification_failed")
        raise HTTPException(status_code=400, detail="Invalid Google token")

    user = crud.get_user_by_email(session=session, email=email)
    if not user:
        # Create a new user with a random password; they will login via Google
        random_password = secrets.token_urlsafe(16)
        new_user = UserCreate(email=email, password=random_password)
        user = crud.create_user(session=session, user_create=new_user)
    # Update oauth fields and verification flag
    user.oauth_provider = "google"
    user.oauth_provider_id = sub
    user.oauth_account_email = email
    if email_verified:
        user.email_verified = True
        user.email_verified_at = utc_now()
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please confirm your Google account email and try again.")
    previous_login = user.last_login_at
    user.last_login_at = utc_now()
    session.add(user)
    try:
        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Failed to update user during Google login", extra={"user_id": str(user.id)})
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        user.id,
        expires_delta=access_token_expires,
        extra_claims={"role": user.role.value},
    )
    try:
        should_alert = previous_login is None or (utc_now() - previous_login).total_seconds() > 24 * 3600
        if should_alert:
            ua = request.headers.get("user-agent", "Unknown device")
            ip = request.client.host if request.client else "unknown"
            email_new_device_login(session=session, user_id=user.id, device=ua, location=ip)
    except Exception:
        pass
    return Token(access_token=token, role=user.role)


@router.post("/login/test-token", response_model=UserPublic)
def test_token(current_user: CurrentUser) -> Any:
    """
    Test access token
    """
    return current_user


@router.post("/password-recovery/{email}", response_model=Message, status_code=200)
async def recover_password(email: str, session: SessionDep) -> Message:
    """
    Password Recovery
    """
    user = crud.get_user_by_email(session=session, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this email does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )
    await send_email(
        email_to=user.email,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Password recovery email sent")


@router.post("/password-reset-request", response_model=Message, status_code=200)
async def request_password_reset(email: str, session: SessionDep) -> Message:
    """
    Password reset entrypoint used by the frontend.

    Behaviour:
    - When email sending is configured, dispatch a standard reset email with a tokenised link.
    - Otherwise, log the request for manual processing.
    - Always return a generic success message to avoid user enumeration.
    """
    user = crud.get_user_by_email(session=session, email=email)

    # When email is configured and the user exists, send a reset email.
    if user and settings.emails_enabled:
        try:
            password_reset_token = generate_password_reset_token(email=email)
            email_data = generate_reset_password_email(
                email_to=user.email, email=email, token=password_reset_token
            )
            await send_email(
                email_to=user.email,
                subject=email_data.subject,
                html_content=email_data.html_content,
            )
            logger.info(
                "password_reset_email_dispatched",
                extra={"user_id": str(user.id), "email": email},
            )
        except Exception:
            # Do not leak details to the client; log for operators.
            logger.exception(
                "password_reset_email_failed",
                extra={"user_id": str(user.id), "email": email},
            )

    # Log the request for observability, regardless of email configuration.
    if user:
        logger.info(
            "password_reset_request_received",
            extra={
                "user_id": str(user.id),
                "email": email,
                "timestamp": utc_now().isoformat(),
            },
        )
    else:
        logger.warning(
            "password_reset_request_for_unknown_email",
            extra={"email": email, "timestamp": utc_now().isoformat()},
        )

    return Message(
        message=(
            "If an account with that email exists, "
            "we've sent password reset instructions to the registered address."
        )
    )


@router.post("/login/password-reset-request", response_model=Message, status_code=200)
async def legacy_password_reset_request(email: str, session: SessionDep) -> Message:
    """
    Backwards-compatible alias for older frontend builds that still call
    `/login/password-reset-request`. New clients should use `/password-reset-request`.
    """
    return await request_password_reset(email=email, session=session)


@router.post("/reset-password/", response_model=Message, status_code=200)
def reset_password(session: SessionDep, body: NewPassword) -> Message:
    """
    Reset password
    """
    email = verify_password_reset_token(token=body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = crud.get_user_by_email(session=session, email=email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this email does not exist in the system.",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    hashed_password = get_password_hash(password=body.new_password)
    user.hashed_password = hashed_password
    # If the user can complete a password reset via email,
    # we can safely treat their email as verified.
    if not user.email_verified:
        user.email_verified = True
        user.email_verified_at = utc_now()
    session.add(user)
    try:
        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Failed to reset password", extra={"user_id": str(user.id)})
        raise HTTPException(status_code=500, detail="Password update failed. Please try again.")
    return Message(message="Password updated successfully")


@router.post(
    "/password-recovery-html-content/{email}",
    dependencies=[Depends(get_current_active_superuser)],
    response_class=HTMLResponse,
)
def recover_password_html_content(email: str, session: SessionDep) -> Any:
    """
    HTML Content for Password Recovery
    """
    user = crud.get_user_by_email(session=session, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )

    return HTMLResponse(
        content=email_data.html_content, headers={"subject:": email_data.subject}
    )


class EmailVerificationToken(SQLModel):
    token: str


@router.post("/request-email-verification", response_model=Message, status_code=200)
async def request_email_verification(current_user: CurrentUser) -> Message:
    """Send (or log) an email verification link for the current user."""
    token = generate_email_verification_token(current_user.email)
    email_data = generate_email_verification_email(current_user.email, token)
    try:
        await send_email(email_to=current_user.email, subject=email_data.subject, html_content=email_data.html_content)
        return Message(message="Verification email sent")
    except Exception:
        # Placeholder mode: email disabled. Log the link but return success for dev.
        logger.warning(
            "verification_email_not_sent_placeholder",
            extra={"email_to": current_user.email},
        )
        return Message(message="Email not configured; verification link has been logged on the server")


@router.post("/resend-email-verification", response_model=Message, status_code=200)
async def resend_email_verification(
    session: SessionDep, request: Request, body: ResendEmailVerification
) -> Message:
    """Request a new verification email without holding an access token.

    The response is identical for unknown, already-verified, and unverified
    addresses so callers cannot enumerate accounts. Abuse protection is
    enforced server-side with PostgreSQL advisory locks plus a persisted
    attempt ledger keyed by HMAC digests.
    """
    submitted_email = str(body.email).strip()
    normalized_email = submitted_email.lower()
    client_ip = request.client.host if request.client else "unknown"

    email_hmac = keyed_hmac_sha256(
        normalized_email, purpose="email_verification_resend_email"
    )
    ip_hmac = keyed_hmac_sha256(client_ip, purpose="email_verification_resend_ip")

    # Serialize concurrent requests for the same email and the same IP at the
    # database level so two simultaneous requests cannot both pass a
    # SELECT-then-INSERT cooldown check and produce duplicate emails.
    session.exec(
        text("SELECT pg_advisory_xact_lock(:key)").bindparams(
            key=hmac_to_advisory_lock_key(email_hmac)
        )
    )
    session.exec(
        text("SELECT pg_advisory_xact_lock(:key)").bindparams(
            key=hmac_to_advisory_lock_key(ip_hmac)
        )
    )

    now = utc_now()
    cooldown_cutoff = now - timedelta(seconds=settings.VERIFICATION_RESEND_COOLDOWN_SECONDS)
    recent_email_attempts = session.exec(
        select(func.count())
        .select_from(EmailVerificationAttempt)
        .where(
            EmailVerificationAttempt.email_hmac == email_hmac,
            EmailVerificationAttempt.requested_at >= cooldown_cutoff,
        )
    ).one()
    if recent_email_attempts > 0:
        raise HTTPException(
            status_code=429,
            detail="Please wait before requesting another verification email.",
            headers={"Retry-After": str(settings.VERIFICATION_RESEND_COOLDOWN_SECONDS)},
        )

    ip_window_cutoff = now - timedelta(
        seconds=settings.VERIFICATION_RESEND_IP_WINDOW_SECONDS
    )
    recent_ip_attempts = session.exec(
        select(func.count())
        .select_from(EmailVerificationAttempt)
        .where(
            EmailVerificationAttempt.ip_hmac == ip_hmac,
            EmailVerificationAttempt.requested_at >= ip_window_cutoff,
        )
    ).one()
    if recent_ip_attempts >= settings.VERIFICATION_RESEND_IP_MAX:
        raise HTTPException(
            status_code=429,
            detail="Too many verification email requests. Please try again later.",
            headers={"Retry-After": str(settings.VERIFICATION_RESEND_IP_WINDOW_SECONDS)},
        )

    user = crud.get_user_by_email(session=session, email=submitted_email)
    should_send = bool(user and not user.email_verified)
    if should_send:
        outcome = EmailVerificationAttemptOutcome.SENT
    elif not user:
        outcome = EmailVerificationAttemptOutcome.SKIPPED_UNKNOWN
    else:
        outcome = EmailVerificationAttemptOutcome.SKIPPED_ALREADY_VERIFIED

    session.add(
        EmailVerificationAttempt(
            email_hmac=email_hmac,
            ip_hmac=ip_hmac,
            outcome=outcome,
        )
    )
    session.commit()
    # The advisory locks are released by the commit above.

    if should_send:
        token = generate_email_verification_token(normalized_email)
        email_data = generate_email_verification_email(normalized_email, token)
        try:
            await send_email(
                email_to=normalized_email,
                subject=email_data.subject,
                html_content=email_data.html_content,
            )
        except Exception:
            logger.warning(
                "resend_verification_email_failed",
                extra={"email_hmac": email_hmac},
                exc_info=True,
            )

    logger.info(
        "resend_email_verification_request",
        extra={"email_hmac": email_hmac, "outcome": outcome.value},
    )
    return Message(
        message=(
            "If an account with that email exists and is not verified, "
            "a verification email has been sent."
        )
    )


@router.post("/verify-email", response_model=VerifyEmailResponse, status_code=200)
def verify_email(session: SessionDep, body: EmailVerificationToken) -> VerifyEmailResponse:
    """Accept a verification token and mark the user as verified if valid.

    On success a short-lived, single-use handoff token is returned so the
    frontend can exchange it for a normal access token. The access token
    itself is never returned directly from this endpoint.
    """
    email = verify_email_verification_token(body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")
    user = crud.get_user_by_email(session=session, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.email_verified = True
    user.email_verified_at = utc_now()
    handoff_token = secrets.token_urlsafe(32)
    handoff = EmailVerificationHandoff(
        user_id=user.id,
        token_hash=sha256_hex(handoff_token),
        status=VerificationHandoffStatus.PENDING,
        expires_at=utc_now()
        + timedelta(seconds=settings.POST_VERIFICATION_HANDOFF_TTL_SECONDS),
    )
    session.add(user)
    session.add(handoff)
    try:
        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Failed to verify email", extra={"user_id": str(user.id)})
        raise HTTPException(status_code=500, detail="Verification failed. Please try again.")
    # Send a one-time welcome email after successful verification.
    try:
        send_welcome_email(email=user.email, name=user.full_name)
    except Exception:
        logger.warning(
            "welcome_email_failed",
            exc_info=True,
            extra={"user_id": str(user.id)},
        )
    return VerifyEmailResponse(
        message="Email verified successfully",
        handoff_token=handoff_token,
        handoff_expires_in=settings.POST_VERIFICATION_HANDOFF_TTL_SECONDS,
    )


@router.post("/login/exchange-verification", response_model=Token, status_code=200)
def exchange_verification(
    session: SessionDep, body: ExchangeVerificationRequest
) -> Token:
    """Exchange a single-use post-verification handoff for an access token."""
    token_hash = sha256_hex(body.handoff_token)
    now = utc_now()
    handoff = session.exec(
        select(EmailVerificationHandoff).where(
            EmailVerificationHandoff.token_hash == token_hash
        )
    ).first()
    if not handoff:
        raise HTTPException(
            status_code=400, detail="Verification session expired. Please log in again."
        )
    if handoff.status != VerificationHandoffStatus.PENDING or handoff.expires_at <= now:
        raise HTTPException(
            status_code=400, detail="Verification session expired. Please log in again."
        )

    # Atomic single-use claim; a concurrent exchange of the same handoff will
    # observe rowcount == 0 and fail.
    claim = session.exec(
        update(EmailVerificationHandoff)
        .where(
            EmailVerificationHandoff.id == handoff.id,
            EmailVerificationHandoff.status == VerificationHandoffStatus.PENDING,
            EmailVerificationHandoff.expires_at > now,
        )
        .values(status=VerificationHandoffStatus.USED, used_at=now)
    )
    if claim.rowcount != 1:
        raise HTTPException(
            status_code=400, detail="Verification session expired. Please log in again."
        )

    user = session.get(User, handoff.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise _auth_error(400, "INACTIVE_ACCOUNT", "Inactive user")
    if not user.email_verified:
        raise _auth_error(
            403,
            "EMAIL_NOT_VERIFIED",
            "Email not verified. Please check your inbox for the verification link.",
        )
    token = _issue_access_token_for_user(user)
    user.last_login_at = now
    session.add(user)
    try:
        session.commit()
    except Exception:
        session.rollback()
        logger.exception(
            "Failed to complete verification exchange", extra={"user_id": str(user.id)}
        )
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")
    return Token(access_token=token, role=user.role)

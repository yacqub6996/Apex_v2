"""
Notification API routes
"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.models import (
    NotificationPublic,
    NotificationsPublic,
    NotificationUpdate,
    UserNotificationPreferencesPublic,
    UserNotificationPreferencesUpdate,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=NotificationsPublic)
def get_notifications(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> Any:
    """
    Get current user's notifications (newest first, safely paginated).

    - **unread_only**: If True, only return unread notifications
    - **limit**: Maximum number of notifications to return (default: 50, max: 100)
    - **offset**: Number of notifications to skip (default: 0)
    """
    notifications = NotificationService.get_user_notifications(
        session=session,
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )
    total = NotificationService.count_user_notifications(
        session=session,
        user_id=current_user.id,
        unread_only=unread_only,
    )

    return NotificationsPublic(
        data=notifications,
        count=total,
    )


@router.get("/unread-count", response_model=dict)
def get_unread_count(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> Any:
    """
    Get count of unread notifications for current user.
    """
    count = NotificationService.get_unread_count(
        session=session,
        user_id=current_user.id,
    )
    
    return {"count": count}


@router.get("/preferences", response_model=UserNotificationPreferencesPublic)
def get_notification_preferences(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> Any:
    """Get the current user's persisted notification preferences."""
    return NotificationService.get_or_create_preferences(
        session=session,
        user_id=current_user.id,
    )


@router.put("/preferences", response_model=UserNotificationPreferencesPublic)
def update_notification_preferences(
    current_user: CurrentUser,
    preferences_update: UserNotificationPreferencesUpdate,
    session: Session = Depends(get_db),
) -> Any:
    """Update the current user's persisted notification preferences."""
    updates = preferences_update.model_dump(exclude_unset=True)
    return NotificationService.update_preferences(
        session=session,
        user_id=current_user.id,
        updates=updates,
    )


@router.patch("/{notification_id}", response_model=NotificationPublic)
def update_notification(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    notification_update: NotificationUpdate,
    session: Session = Depends(get_db),
) -> Any:
    """
    Update a notification's read state.

    - **is_read**: True marks the notification as read; False marks it unread.
    """
    is_read = (
        notification_update.is_read
        if notification_update.is_read is not None
        else True
    )
    notification = NotificationService.set_read_state(
        session=session,
        notification_id=notification_id,
        user_id=current_user.id,
        is_read=is_read,
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found or you don't have permission to update it",
        )

    return notification


@router.post("/mark-all-read", response_model=dict)
def mark_all_read(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> Any:
    """
    Mark all notifications as read for current user.
    """
    count = NotificationService.mark_all_as_read(
        session=session,
        user_id=current_user.id,
    )
    
    return {"marked_read": count}


@router.delete("/{notification_id}", response_model=dict)
def delete_notification(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> Any:
    """
    Delete a notification.
    """
    success = NotificationService.delete_notification(
        session=session,
        notification_id=notification_id,
        user_id=current_user.id,
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Notification not found or you don't have permission to delete it",
        )
    
    return {"success": True}

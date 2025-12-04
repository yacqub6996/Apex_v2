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
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=NotificationsPublic)
def get_notifications(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    unread_only: bool = False,
    limit: int = 50,
) -> Any:
    """
    Get current user's notifications.
    
    - **unread_only**: If True, only return unread notifications
    - **limit**: Maximum number of notifications to return (default: 50)
    """
    notifications = NotificationService.get_user_notifications(
        session=session,
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
    )
    
    return NotificationsPublic(
        data=notifications,
        count=len(notifications),
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


@router.patch("/{notification_id}", response_model=NotificationPublic)
def update_notification(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    notification_update: NotificationUpdate,
    session: Session = Depends(get_db),
) -> Any:
    """
    Update a notification (mark as read/unread).
    """
    notification = NotificationService.mark_as_read(
        session=session,
        notification_id=notification_id,
        user_id=current_user.id,
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

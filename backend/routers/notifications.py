from fastapi import APIRouter, Depends, HTTPException, status, Query
from database import get_db
from auth import get_current_active_user
from typing import List, Optional
import logging
from datetime import datetime, timedelta

router = APIRouter(prefix="/notifications", tags=["Notifications"])

logger = logging.getLogger(__name__)

@router.get("/")
async def get_notifications(
    user_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get notifications for the current user"""
    try:
        notifications = []
        unread_count = 0
        
        # Get user's role to determine what notifications to show
        user_role = current_user.get('role')
        user_id = current_user.get('id')
        
        # Get database notifications
        db_notifications = db.execute_query("""
            SELECT id, title, message, type, is_read, created_at
            FROM notifications 
            WHERE user_id = %s 
            ORDER BY created_at DESC 
            LIMIT 10
        """, (user_id,))
        
        for notif in db_notifications:
            notifications.append({
                "id": notif['id'],
                "title": notif['title'],
                "message": notif['message'],
                "type": notif['type'],
                "read": notif['is_read'],
                "created_at": notif['created_at'].isoformat()
            })
            if not notif['is_read']:
                unread_count += 1
        
        # For admins, add pending vendor approval notifications
        if user_role == 'admin':
            pending_vendors = db.execute_query("""
                SELECT COUNT(*) as count FROM vendors 
                WHERE approved_status = FALSE
            """)
            
            if pending_vendors and pending_vendors[0]['count'] > 0:
                pending_count = pending_vendors[0]['count']
                notifications.insert(0, {
                    "id": f"pending_vendors_{datetime.now().timestamp()}",
                    "title": "Pending Vendor Approvals",
                    "message": f"{pending_count} vendor(s) waiting for approval",
                    "type": "warning",
                    "read": False,
                    "created_at": datetime.now().isoformat()
                })
                unread_count += 1
        
        # For all users, add unread message notifications
        unread_messages = db.execute_query("""
            SELECT COUNT(*) as count FROM messages 
            WHERE target_user_id = %s AND status = 'open'
        """, (user_id,))
        
        if unread_messages and unread_messages[0]['count'] > 0:
            message_count = unread_messages[0]['count']
            notifications.insert(0, {
                "id": f"unread_messages_{datetime.now().timestamp()}",
                "title": "Unread Messages",
                "message": f"You have {message_count} unread message(s)",
                "type": "info",
                "read": False,
                "created_at": datetime.now().isoformat()
            })
            unread_count += 1
        
        # For vendors, add new order notifications
        if user_role == 'vendor':
            # Get vendor's pending orders
            vendor_id = db.execute_query("""
                SELECT id FROM vendors WHERE user_id = %s
            """, (user_id,))
            
            if vendor_id:
                pending_orders = db.execute_query("""
                    SELECT COUNT(*) as count FROM orders 
                    WHERE vendor_id = %s AND status = 'pending'
                """, (vendor_id[0]['id'],))
                
                if pending_orders and pending_orders[0]['count'] > 0:
                    order_count = pending_orders[0]['count']
                    notifications.insert(0, {
                        "id": f"pending_orders_{datetime.now().timestamp()}",
                        "title": "New Orders",
                        "message": f"{order_count} new order(s) waiting for your response",
                        "type": "success",
                        "read": False,
                        "created_at": datetime.now().isoformat()
                    })
                    unread_count += 1
        
        return {
            "notifications": notifications,
            "total": len(notifications),
            "unread_count": unread_count
        }
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notifications"
        )

@router.post("/mark-read/{notification_id}")
async def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Mark a notification as read"""
    try:
        # Check if it's a database notification
        if isinstance(notification_id, int):
            db.execute_update("""
                UPDATE notifications 
                SET is_read = TRUE 
                WHERE id = %s AND user_id = %s
            """, (notification_id, current_user.get('id')))
        
        return {"message": "Notification marked as read"}
        
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )

@router.post("/create")
async def create_notification(
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "system",
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Create a new notification (admin only)"""
    try:
        # Only admins can create notifications
        if current_user.get('role') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can create notifications"
            )
        
        db.execute_update("""
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (%s, %s, %s, %s, FALSE)
        """, (user_id, title, message, notification_type))
        
        return {"message": "Notification created successfully"}
        
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create notification"
        )

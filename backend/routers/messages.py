from fastapi import APIRouter, Depends, HTTPException, status, Query
from database import get_db
from auth import get_current_active_user
from typing import List, Optional
import logging
from datetime import datetime
import mysql.connector

router = APIRouter(prefix="/messages", tags=["Messages"])

logger = logging.getLogger(__name__)

# Message types
MESSAGE_TYPES = ['complaint', 'suggestion', 'inquiry', 'reply']

# Message status
MESSAGE_STATUS = ['open', 'in_progress', 'resolved', 'closed']

def create_message_notification(db, target_user_id: int, sender_name: str, subject: str):
    """Helper function to create notification for new message"""
    try:
        notification_query = """
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (%s, %s, %s, %s, FALSE)
        """
        db.execute_update(notification_query, (
            target_user_id,
            f"New Message from {sender_name}",
            f"Subject: {subject}",
            "info"
        ))
    except Exception as e:
        logger.error(f"Error creating message notification: {e}")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_message(
    message_data: dict,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Create a new message (complaint, suggestion, inquiry)"""
    try:
        # Validate message type
        message_type = message_data.get('type')
        if message_type not in MESSAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid message type. Must be one of: complaint, suggestion, inquiry, reply"
            )

        # Validate required fields
        subject = message_data.get('subject')
        content = message_data.get('content')
        if not subject or not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subject and content are required"
            )

        # Get target user if specified (for complaints about specific users)
        target_user_id = message_data.get('target_user_id')
        
        # Handle vendor-specific targeting
        send_to_all_admins = message_data.get('send_to_all_admins', False)
        selected_customer_ids = message_data.get('selected_customer_ids', [])
        selected_vendor_ids = message_data.get('selected_vendor_ids', [])
        selected_admin_ids = message_data.get('selected_admin_ids', [])
        send_to_all_customers = message_data.get('send_to_all_customers', False)
        send_to_all_vendors = message_data.get('send_to_all_vendors', False)
        
        # If vendor is sending to all admins or selected customers, we need to create multiple messages
        if current_user['role'] == 'vendor' and (send_to_all_admins or selected_customer_ids):
            created_messages = []
            
            if send_to_all_admins:
                # Get all admin users
                target_users = db.execute_query("SELECT id FROM users WHERE role = 'admin'")
                
                # Create a message for each admin
                for target_user in target_users:
                    query = """
                    INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    message_id = db.execute_insert(query, (
                        current_user['id'],
                        current_user['role'],
                        subject,
                        content,
                        message_type,
                        target_user['id'],
                        'open',
                        datetime.now()
                    ))
                    created_messages.append(message_id)
            
            elif selected_customer_ids:
                # Create a message for each selected customer
                for customer_id in selected_customer_ids:
                    query = """
                    INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    message_id = db.execute_insert(query, (
                        current_user['id'],
                        current_user['role'],
                        subject,
                        content,
                        message_type,
                        customer_id,
                        'open',
                        datetime.now()
                    ))
                    created_messages.append(message_id)
            
            return {
                "message": f"Message sent successfully to {len(created_messages)} recipients",
                "data": {"message_ids": created_messages}
            }
        
        # Handle customer-specific targeting
        elif current_user['role'] == 'customer' and (send_to_all_admins or selected_vendor_ids):
            created_messages = []
            
            if send_to_all_admins:
                # Get all admin users
                target_users = db.execute_query("SELECT id FROM users WHERE role = 'admin'")
                
                # Create a message for each admin
                for target_user in target_users:
                    query = """
                    INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    message_id = db.execute_insert(query, (
                        current_user['id'],
                        current_user['role'],
                        subject,
                        content,
                        message_type,
                        target_user['id'],
                        'open',
                        datetime.now()
                    ))
                    created_messages.append(message_id)
            
            elif selected_vendor_ids:
                # Create a message for each selected vendor
                for vendor_id in selected_vendor_ids:
                    query = """
                    INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    message_id = db.execute_insert(query, (
                        current_user['id'],
                        current_user['role'],
                        subject,
                        content,
                        message_type,
                        vendor_id,
                        'open',
                        datetime.now()
                    ))
                    created_messages.append(message_id)
            
            return {
                "message": f"Message sent successfully to {len(created_messages)} recipients",
                "data": {"message_ids": created_messages}
            }
        
        # Handle admin-specific targeting
        elif current_user['role'] == 'admin' and (send_to_all_customers or send_to_all_vendors or selected_customer_ids or selected_vendor_ids or selected_admin_ids):
            created_messages = []
            
            if send_to_all_customers:
                # Get all customer users
                target_users = db.execute_query("SELECT id FROM users WHERE role = 'customer'")
                
                # Create a message for each customer
                for target_user in target_users:
                    query = """
                    INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    message_id = db.execute_insert(query, (
                        current_user['id'],
                        current_user['role'],
                        subject,
                        content,
                        message_type,
                        target_user['id'],
                        'open',
                        datetime.now()
                    ))
                    created_messages.append(message_id)
            
            elif send_to_all_vendors:
                # Get all vendor users
                target_users = db.execute_query("SELECT id FROM users WHERE role = 'vendor'")
                
                # Create a message for each vendor
                for target_user in target_users:
                    query = """
                    INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    message_id = db.execute_insert(query, (
                        current_user['id'],
                        current_user['role'],
                        subject,
                        content,
                        message_type,
                        target_user['id'],
                        'open',
                        datetime.now()
                    ))
                    created_messages.append(message_id)
            
            elif selected_customer_ids:
                # Create a message for each selected customer
                for customer_id in selected_customer_ids:
                    query = """
                    INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    message_id = db.execute_insert(query, (
                        current_user['id'],
                        current_user['role'],
                        subject,
                        content,
                        message_type,
                        customer_id,
                        'open',
                        datetime.now()
                    ))
                    created_messages.append(message_id)
            
            elif selected_vendor_ids:
                # Create a message for each selected vendor
                for vendor_id in selected_vendor_ids:
                    query = """
                    INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    message_id = db.execute_insert(query, (
                        current_user['id'],
                        current_user['role'],
                        subject,
                        content,
                        message_type,
                        vendor_id,
                        'open',
                        datetime.now()
                    ))
                    created_messages.append(message_id)
            
            elif selected_admin_ids:
                # Create a message for each selected admin
                for admin_id in selected_admin_ids:
                    query = """
                    INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    message_id = db.execute_insert(query, (
                        current_user['id'],
                        current_user['role'],
                        subject,
                        content,
                        message_type,
                        admin_id,
                        'open',
                        datetime.now()
                    ))
                    created_messages.append(message_id)
            
            return {
                "message": f"Message sent successfully to {len(created_messages)} recipients",
                "data": {"message_ids": created_messages}
            }
        else:
            # Regular single message creation
            query = """
            INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            message_id = db.execute_insert(query, (
                current_user['id'],
                current_user['role'],
                subject,
                content,
                message_type,
                target_user_id,
                'open',
                datetime.now()
            ))
            
            # Create notification for the target user if specified
            if target_user_id:
                create_message_notification(db, target_user_id, current_user['name'], subject)
        
        # Fetch the created message
        fetch_query = """
            SELECT m.*, u.name as sender_name, u.email as sender_email
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = %s
        """
        
        message = db.execute_query(fetch_query, (message_id,))
        
        return {
            "message": "Message created successfully",
            "data": message[0] if message else None
        }
        
    except Exception as e:
        logger.error(f"Error creating message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create message"
        )

@router.get("/", response_model=List[dict])
async def get_messages(
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db),
    status_filter: Optional[str] = Query(None),
    type_filter: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100)
):
    """Get messages for the current user"""
    try:
        # Build query based on user role
        if current_user['role'] == 'admin':
            # Admin can see all messages
            query = """
                SELECT m.*, 
                       u.name as sender_name, 
                       u.email as sender_email,
                       u.role as sender_role,
                       tu.name as target_user_name,
                       tu.email as target_user_email,
                       tu.role as target_user_role
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                LEFT JOIN users tu ON m.target_user_id = tu.id
                WHERE 1=1
            """
            params = []
        else:
            # Regular users can see messages they sent or received
            query = """
                SELECT m.*, 
                       u.name as sender_name, 
                       u.email as sender_email,
                       u.role as sender_role,
                       tu.name as target_user_name,
                       tu.email as target_user_email,
                       tu.role as target_user_role
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                LEFT JOIN users tu ON m.target_user_id = tu.id
                WHERE m.sender_id = %s OR m.target_user_id = %s
            """
            params = [current_user['id'], current_user['id']]
        
        # Add filters
        if status_filter:
            query += " AND m.status = %s"
            params.append(status_filter)
        
        if type_filter:
            query += " AND m.message_type = %s"
            params.append(type_filter)
        
        query += " ORDER BY m.created_at DESC LIMIT %s"
        params.append(limit)
        
        messages = db.execute_query(query, tuple(params))
        return messages
        
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch messages"
        )

@router.get("/{message_id}", response_model=dict)
async def get_message(
    message_id: int,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get a specific message by ID"""
    try:
        # Check if user has access to this message
        if current_user['role'] == 'admin':
            query = """
                SELECT m.*, 
                       u.name as sender_name, 
                       u.email as sender_email,
                       u.role as sender_role,
                       tu.name as target_user_name,
                       tu.email as target_user_email,
                       tu.role as target_user_role
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                LEFT JOIN users tu ON m.target_user_id = tu.id
                WHERE m.id = %s
            """
            params = [message_id]
        else:
            query = """
                SELECT m.*, 
                       u.name as sender_name, 
                       u.email as sender_email,
                       u.role as sender_role,
                       tu.name as target_user_name,
                       tu.email as target_user_email,
                       tu.role as target_user_role
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                LEFT JOIN users tu ON m.target_user_id = tu.id
                WHERE m.id = %s AND (m.sender_id = %s OR m.target_user_id = %s)
            """
            params = [message_id, current_user['id'], current_user['id']]
        
        messages = db.execute_query(query, tuple(params))
        
        if not messages:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or access denied"
            )
        
        return messages[0]
        
    except Exception as e:
        logger.error(f"Error fetching message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch message"
        )

@router.post("/{message_id}/reply", status_code=status.HTTP_201_CREATED)
async def reply_to_message(
    message_id: int,
    reply_data: dict,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Reply to a message (admin or target user)"""
    try:
        # Get the original message to check permissions
        original_messages = db.execute_query("SELECT * FROM messages WHERE id = %s", (message_id,))
        
        if not original_messages:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Original message not found"
            )
        
        original_message = original_messages[0]
        
        # Check if user can reply: admin or target user
        can_reply = (
            current_user['role'] == 'admin' or 
            original_message['target_user_id'] == current_user['id']
        )
        
        if not can_reply:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only reply to messages sent to you or if you are an admin"
            )
        
        content = reply_data.get('content')
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reply content is required"
            )
        
        # Create reply message
        reply_query = """
        INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status, parent_message_id, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        subject = f"Re: {original_message['subject']}"
        
        reply_id = db.execute_insert(reply_query, (
            current_user['id'],
            current_user['role'],
            subject,
            content,
            'reply',
            original_message['sender_id'],
            'open',
            message_id,
            datetime.now()
        ))
        
        # Update original message status to in_progress
        db.execute_update("UPDATE messages SET status = 'in_progress' WHERE id = %s", (message_id,))
        
        return {
            "message": "Reply sent successfully",
            "reply_id": reply_id
        }
        
    except Exception as e:
        logger.error(f"Error replying to message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send reply"
        )

@router.put("/{message_id}/status")
async def update_message_status(
    message_id: int,
    status_data: dict,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Update message status (admin only)"""
    try:
        # Only admins can update status
        if current_user['role'] != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update message status"
            )
        
        new_status = status_data.get('status')
        if new_status not in MESSAGE_STATUS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be one of: open, in_progress, resolved, closed"
            )
        
        # Check if message exists
        existing_messages = db.execute_query("SELECT id FROM messages WHERE id = %s", (message_id,))
        if not existing_messages:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        # Update status
        db.execute_update("UPDATE messages SET status = %s WHERE id = %s", (new_status, message_id))
        
        return {"message": "Message status updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating message status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update message status"
        )

@router.get("/stats/summary")
async def get_message_stats(
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get message statistics (admin only)"""
    try:
        if current_user['role'] != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can view message statistics"
            )
        
        # Get counts by status
        status_counts = db.execute_query("""
            SELECT status, COUNT(*) as count
            FROM messages
            GROUP BY status
        """)
        
        # Get counts by type
        type_counts = db.execute_query("""
            SELECT message_type, COUNT(*) as count
            FROM messages
            GROUP BY message_type
        """)
        
        # Get recent activity
        recent_activity = db.execute_query("""
            SELECT COUNT(*) as recent_count
            FROM messages
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """)
        
        return {
            "status_counts": status_counts,
            "type_counts": type_counts,
            "recent_activity": recent_activity[0]['recent_count'] if recent_activity else 0
        }
        
    except Exception as e:
        logger.error(f"Error fetching message stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch message statistics"
        )

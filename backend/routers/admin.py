from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from database import get_db
from auth import require_admin, get_current_active_user
import logging

router = APIRouter(prefix="/admin", tags=["Admin"])

logger = logging.getLogger(__name__)

# Commission rate (5% of order total)
COMMISSION_RATE = 0.05

@router.get("/analytics/overview")
async def get_admin_analytics_overview(
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Get comprehensive admin analytics overview"""
    try:
        # Total users by role
        users_query = """
            SELECT role, COUNT(*) as count
            FROM users
            WHERE role IN ('customer', 'vendor', 'admin')
            GROUP BY role
        """
        users_stats = db.execute_query(users_query)
        
        # Total orders and revenue
        orders_query = """
            SELECT 
                COUNT(*) as total_orders,
                SUM(total_amount) as total_revenue,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
            FROM orders
        """
        orders_stats = db.execute_query(orders_query)
        
        # Total meals
        meals_query = "SELECT COUNT(*) as total_meals FROM meals"
        meals_stats = db.execute_query(meals_query)
        
        # Total vendors (approved and pending)
        vendors_query = """
            SELECT 
                COUNT(*) as total_vendors,
                COUNT(CASE WHEN approved_status = TRUE THEN 1 END) as approved_vendors,
                COUNT(CASE WHEN approved_status = FALSE THEN 1 END) as pending_vendors
            FROM vendors
        """
        vendors_stats = db.execute_query(vendors_query)
        
        # Calculate commission
        total_revenue = float(orders_stats[0]['total_revenue']) if orders_stats and orders_stats[0]['total_revenue'] else 0.0
        total_commission = total_revenue * COMMISSION_RATE
        
        # Recent activity (last 7 days)
        recent_orders_query = """
            SELECT COUNT(*) as recent_orders
            FROM orders
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """
        recent_orders = db.execute_query(recent_orders_query)
        
        recent_users_query = """
            SELECT COUNT(*) as recent_users
            FROM users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """
        recent_users = db.execute_query(recent_users_query)
        
        return {
            "users": {
                "total_customers": next((item['count'] for item in users_stats if item['role'] == 'customer'), 0),
                "total_vendors": next((item['count'] for item in users_stats if item['role'] == 'vendor'), 0),
                "total_admins": next((item['count'] for item in users_stats if item['role'] == 'admin'), 0),
                "recent_users": recent_users[0]['recent_users'] if recent_users else 0
            },
            "orders": {
                "total_orders": orders_stats[0]['total_orders'] if orders_stats else 0,
                "completed_orders": orders_stats[0]['completed_orders'] if orders_stats else 0,
                "pending_orders": orders_stats[0]['pending_orders'] if orders_stats else 0,
                "recent_orders": recent_orders[0]['recent_orders'] if recent_orders else 0
            },
            "revenue": {
                "total_revenue": total_revenue,
                "total_commission": total_commission,
                "commission_rate": COMMISSION_RATE * 100
            },
            "vendors": {
                "total_vendors": vendors_stats[0]['total_vendors'] if vendors_stats else 0,
                "approved_vendors": vendors_stats[0]['approved_vendors'] if vendors_stats else 0,
                "pending_vendors": vendors_stats[0]['pending_vendors'] if vendors_stats else 0
            },
            "meals": {
                "total_meals": meals_stats[0]['total_meals'] if meals_stats else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Database error in get_admin_analytics_overview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

@router.get("/analytics/top-vendors")
async def get_top_vendors(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Get top performing vendors by revenue and orders"""
    try:
        query = """
            SELECT 
                v.id,
                v.description,
                v.address,
                v.approved_status,
                u.name as vendor_name,
                u.email as vendor_email,
                COUNT(o.id) as total_orders,
                SUM(o.total_amount) as total_revenue,
                AVG(r.rating) as average_rating,
                COUNT(r.id) as total_reviews,
                COUNT(m.id) as total_meals
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            LEFT JOIN orders o ON v.id = o.vendor_id
            LEFT JOIN reviews r ON v.id = r.vendor_id
            LEFT JOIN meals m ON v.id = m.vendor_id
            WHERE v.approved_status = TRUE
            GROUP BY v.id, v.description, v.address, v.approved_status, u.name, u.email
            ORDER BY total_revenue DESC, total_orders DESC
            LIMIT %s
        """
        
        vendors = db.execute_query(query, (limit,))
        
        return {
            "top_vendors": [
                {
                    "id": vendor['id'],
                    "name": vendor['vendor_name'],
                    "email": vendor['vendor_email'],
                    "description": vendor['description'],
                    "address": vendor['address'],
                    "total_orders": vendor['total_orders'] or 0,
                    "total_revenue": float(vendor['total_revenue'] or 0),
                    "average_rating": float(vendor['average_rating'] or 0),
                    "total_reviews": vendor['total_reviews'] or 0,
                    "total_meals": vendor['total_meals'] or 0,
                    "commission_earned": float(vendor['total_revenue'] or 0) * COMMISSION_RATE
                }
                for vendor in vendors
            ]
        }
        
    except Exception as e:
        logger.error(f"Database error in get_top_vendors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

@router.get("/analytics/top-customers")
async def get_top_customers(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Get top customers by order count and spending"""
    try:
        query = """
            SELECT 
                u.id,
                u.name,
                u.email,
                u.phone,
                COUNT(o.id) as total_orders,
                SUM(o.total_amount) as total_spent,
                AVG(o.total_amount) as average_order_value,
                MAX(o.created_at) as last_order_date
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            WHERE u.role = 'customer'
            GROUP BY u.id, u.name, u.email, u.phone
            HAVING total_orders > 0
            ORDER BY total_spent DESC, total_orders DESC
            LIMIT %s
        """
        
        customers = db.execute_query(query, (limit,))
        
        return {
            "top_customers": [
                {
                    "id": customer['id'],
                    "name": customer['name'],
                    "email": customer['email'],
                    "phone": customer['phone'],
                    "total_orders": customer['total_orders'] or 0,
                    "total_spent": float(customer['total_spent'] or 0),
                    "average_order_value": float(customer['average_order_value'] or 0),
                    "last_order_date": customer['last_order_date'].isoformat() if customer['last_order_date'] else None
                }
                for customer in customers
            ]
        }
        
    except Exception as e:
        logger.error(f"Database error in get_top_customers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

@router.get("/analytics/revenue-chart")
async def get_revenue_chart(
    days: int = Query(30, ge=7, le=365),
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Get revenue data for chart visualization"""
    try:
        query = """
            SELECT 
                DATE(o.created_at) as date,
                COUNT(o.id) as orders_count,
                SUM(o.total_amount) as daily_revenue,
                SUM(o.total_amount * %s) as daily_commission
            FROM orders o
            WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
            GROUP BY DATE(o.created_at)
            ORDER BY date ASC
        """
        
        revenue_data = db.execute_query(query, (COMMISSION_RATE, days))
        
        return {
            "revenue_chart": [
                {
                    "date": str(item['date']),
                    "orders_count": item['orders_count'],
                    "daily_revenue": float(item['daily_revenue'] or 0),
                    "daily_commission": float(item['daily_commission'] or 0)
                }
                for item in revenue_data
            ]
        }
        
    except Exception as e:
        logger.error(f"Database error in get_revenue_chart: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

@router.get("/vendors")
async def get_all_vendors(
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Get all vendors with their status"""
    try:
        query = """
            SELECT 
                v.id,
                v.description,
                v.address,
                v.approved_status,
                v.created_at,
                u.name as vendor_name,
                u.email as vendor_email,
                u.phone as vendor_phone,
                COUNT(o.id) as total_orders,
                SUM(o.total_amount) as total_revenue,
                COUNT(m.id) as total_meals,
                AVG(r.rating) as average_rating
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            LEFT JOIN orders o ON v.id = o.vendor_id
            LEFT JOIN meals m ON v.id = m.vendor_id
            LEFT JOIN reviews r ON v.id = r.vendor_id
            GROUP BY v.id, v.description, v.address, v.approved_status, v.created_at, u.name, u.email, u.phone
            ORDER BY v.created_at DESC
        """
        
        vendors = db.execute_query(query)
        
        return {
            "vendors": [
                {
                    "id": vendor['id'],
                    "name": vendor['vendor_name'],
                    "email": vendor['vendor_email'],
                    "phone": vendor['vendor_phone'],
                    "description": vendor['description'],
                    "address": vendor['address'],
                    "approved_status": vendor['approved_status'],
                    "created_at": vendor['created_at'].isoformat(),
                    "total_orders": vendor['total_orders'] or 0,
                    "total_revenue": float(vendor['total_revenue'] or 0),
                    "total_meals": vendor['total_meals'] or 0,
                    "average_rating": float(vendor['average_rating'] or 0)
                }
                for vendor in vendors
            ]
        }
        
    except Exception as e:
        logger.error(f"Database error in get_all_vendors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

@router.get("/analytics/pending-vendors")
async def get_pending_vendors(
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Get vendors pending approval"""
    try:
        query = """
            SELECT 
                v.id,
                v.description,
                v.address,
                v.created_at,
                u.name as vendor_name,
                u.email as vendor_email,
                u.phone as vendor_phone
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.approved_status = FALSE
            ORDER BY v.created_at ASC
        """
        
        pending_vendors = db.execute_query(query)
        
        return {
            "pending_vendors": [
                {
                    "id": vendor['id'],
                    "name": vendor['vendor_name'],
                    "email": vendor['vendor_email'],
                    "phone": vendor['vendor_phone'],
                    "description": vendor['description'],
                    "address": vendor['address'],
                    "created_at": vendor['created_at'].isoformat()
                }
                for vendor in pending_vendors
            ]
        }
        
    except Exception as e:
        logger.error(f"Database error in get_pending_vendors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

@router.post("/vendors/{vendor_id}/approve")
async def approve_vendor(
    vendor_id: int,
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Approve a vendor"""
    try:
        # Check if vendor exists and is pending
        vendor_query = """
            SELECT v.*, u.name, u.email 
            FROM vendors v 
            JOIN users u ON v.user_id = u.id 
            WHERE v.id = %s AND v.approved_status = FALSE
        """
        vendor = db.execute_query(vendor_query, (vendor_id,))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found or already approved"
            )
        
        vendor_data = vendor[0]
        
        # Approve vendor
        update_query = "UPDATE vendors SET approved_status = TRUE WHERE id = %s"
        db.execute_update(update_query, (vendor_id,))
        
        # Create notification for the vendor
        notification_query = """
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (%s, %s, %s, %s, FALSE)
        """
        db.execute_update(notification_query, (
            vendor_data['user_id'],
            "Vendor Profile Approved! 🎉",
            f"Congratulations {vendor_data['name']}! Your vendor profile has been approved. You can now start accepting orders.",
            "success"
        ))
        
        return {"message": "Vendor approved successfully"}
        
    except Exception as e:
        logger.error(f"Database error in approve_vendor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

@router.post("/vendors/{vendor_id}/reject")
async def reject_vendor(
    vendor_id: int,
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Reject a pending vendor (delete their profile)"""
    try:
        # Check if vendor exists and is pending
        vendor_query = """
            SELECT v.*, u.name, u.email 
            FROM vendors v 
            JOIN users u ON v.user_id = u.id 
            WHERE v.id = %s AND v.approved_status = FALSE
        """
        vendor = db.execute_query(vendor_query, (vendor_id,))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found or already approved"
            )
        
        vendor_data = vendor[0]
        
        # Create notification for the vendor before deleting
        notification_query = """
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (%s, %s, %s, %s, FALSE)
        """
        db.execute_update(notification_query, (
            vendor_data['user_id'],
            "Vendor Profile Rejected",
            f"Dear {vendor_data['name']}, your vendor profile has been rejected. Please contact support for more information.",
            "error"
        ))
        
        # Delete vendor profile
        delete_query = "DELETE FROM vendors WHERE id = %s"
        db.execute_delete(delete_query, (vendor_id,))
        
        return {"message": "Vendor rejected and profile deleted"}
        
    except Exception as e:
        logger.error(f"Database error in reject_vendor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

@router.post("/vendors/{vendor_id}/revoke")
async def revoke_vendor(
    vendor_id: int,
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Revoke approval from an approved vendor"""
    try:
        # Check if vendor exists and is approved
        vendor_query = """
            SELECT v.*, u.name, u.email 
            FROM vendors v 
            JOIN users u ON v.user_id = u.id 
            WHERE v.id = %s AND v.approved_status = TRUE
        """
        vendor = db.execute_query(vendor_query, (vendor_id,))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found or not approved"
            )
        
        vendor_data = vendor[0]
        
        # Update vendor status to not approved
        update_query = "UPDATE vendors SET approved_status = FALSE WHERE id = %s"
        db.execute_update(update_query, (vendor_id,))
        
        # Create notification for the vendor
        notification_query = """
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (%s, %s, %s, %s, FALSE)
        """
        db.execute_update(notification_query, (
            vendor_data['user_id'],
            "Vendor Approval Revoked",
            f"Dear {vendor_data['name']}, your vendor approval has been revoked. You can no longer receive new orders until re-approved.",
            "warning"
        ))
        
        return {"message": "Vendor approval revoked successfully"}
        
    except Exception as e:
        logger.error(f"Database error in revoke_vendor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

@router.get("/users")
async def get_all_users(
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Get all users for admin management"""
    try:
        query = """
            SELECT 
                id,
                name,
                email,
                phone,
                role,
                is_active,
                created_at
            FROM users
            ORDER BY created_at DESC
        """
        
        users = db.execute_query(query)
        
        return [
            {
                "id": user['id'],
                "name": user['name'],
                "email": user['email'],
                "phone": user['phone'],
                "role": user['role'],
                "is_active": user['is_active'],
                "created_at": user['created_at'].isoformat()
            }
            for user in users
        ]
        
    except Exception as e:
        logger.error(f"Database error in get_all_users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

@router.post("/users")
async def create_user(
    user_data: dict,
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Create a new user (admin only)"""
    try:
        import bcrypt
        
        # Hash the password
        password_hash = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Insert new user
        query = """
            INSERT INTO users (name, email, phone, password_hash, role, is_active)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        db.execute_update(query, (
            user_data['name'],
            user_data['email'],
            user_data['phone'],
            password_hash,
            user_data['role'],
            True  # is_active
        ))
        
        return {"message": "User created successfully"}
        
    except Exception as e:
        logger.error(f"Database error in create_user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(require_admin),
    db=Depends(get_db)
):
    """Delete a user (admin only)"""
    try:
        # Check if user exists
        user_query = "SELECT * FROM users WHERE id = %s"
        user = db.execute_query(user_query, (user_id,))
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent deleting self
        if user_id == current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        # Delete user
        delete_query = "DELETE FROM users WHERE id = %s"
        db.execute_delete(delete_query, (user_id,))
        
        return {"message": "User deleted successfully"}
        
    except Exception as e:
        logger.error(f"Database error in delete_user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )
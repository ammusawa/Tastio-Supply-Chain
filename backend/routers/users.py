from fastapi import APIRouter, Depends, HTTPException, status, Query
from database import get_db
from auth import get_current_active_user
from typing import List, Optional
import logging
import mysql.connector

router = APIRouter(prefix="/users", tags=["Users"])

logger = logging.getLogger(__name__)

@router.get("/search")
async def search_users(
    q: str = Query("", description="Search query"),
    role: Optional[str] = Query(None, description="Filter by role"),
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Search users by name or email"""
    try:
        # Build query with optional role filter
        if q.strip():
            # If search term provided, search by name or email
            query = """
                SELECT id, name, email, role
                FROM users
                WHERE (name LIKE %s OR email LIKE %s)
                AND id != %s
            """
            params = [f"%{q}%", f"%{q}%", current_user['id']]
        else:
            # If no search term, get all users (excluding current user)
            query = """
                SELECT id, name, email, role
                FROM users
                WHERE id != %s
            """
            params = [current_user['id']]
        
        if role:
            query += " AND role = %s"
            params.append(role)
        
        query += " ORDER BY name LIMIT 50"  # Increased limit for all customers
        
        users = db.execute_query(query, tuple(params))
        
        return {
            "users": users,
            "total": len(users)
        }
        
    except Exception as e:
        logger.error(f"Error searching users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search users"
        )

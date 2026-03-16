from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from database import get_db
from schemas import VendorCreate, VendorResponse, VendorUpdate, VendorWithMeals, VendorList
from auth import get_current_active_user
import logging

router = APIRouter(prefix="/vendors", tags=["Vendors"])

logger = logging.getLogger(__name__)


@router.post("/", response_model=VendorResponse)
def create_vendor(
    vendor_data: VendorCreate,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Create a new vendor profile"""
    try:
        # Check if user is already a vendor
        existing_vendor_query = "SELECT * FROM vendors WHERE user_id = %s"
        existing_vendor = db.execute_query(existing_vendor_query, (current_user['id'],))
        
        if existing_vendor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has a vendor profile"
            )
        
        # Check if user is trying to create vendor for someone else (only admins can do this)
        if vendor_data.user_id != current_user['id'] and current_user['role'] != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to create vendor profile for another user"
            )
        
        # Create vendor profile
        insert_query = """
            INSERT INTO vendors (user_id, description, address, approved_status, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """
        vendor_id = db.execute_insert(insert_query, (
            vendor_data.user_id,
            vendor_data.description,
            vendor_data.address,
            False  # Default to not approved
        ))
        
        # Get the created vendor
        vendor_query = """
            SELECT v.*, u.name as user_name, u.email as user_email
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = %s
        """
        vendor = db.execute_query(vendor_query, (vendor_id,))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create vendor profile"
            )
        
        return VendorResponse(
            id=vendor[0]['id'],
            user_id=vendor[0]['user_id'],
            description=vendor[0]['description'],
            address=vendor[0]['address'],
            approved_status=vendor[0]['approved_status'],
            created_at=vendor[0]['created_at'],
            user={
                'id': vendor[0]['user_id'],
                'name': vendor[0]['user_name'],
                'email': vendor[0]['user_email']
            }
        )
        
    except Exception as e:
        logger.error(f"Database error in create_vendor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/", response_model=VendorList)
def get_vendors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    approved_only: bool = Query(True),
    db=Depends(get_db)
):
    """Get list of vendors"""
    try:
        # Build query based on filters
        where_clause = "WHERE v.approved_status = %s" if approved_only else ""
        params = [True] if approved_only else []
        
        # Get total count
        count_query = f"""
            SELECT COUNT(*) as total 
            FROM vendors v 
            {where_clause}
        """
        count_result = db.execute_query(count_query, tuple(params))
        total = count_result[0]['total'] if count_result else 0
        
        # Get vendors with user info
        vendors_query = f"""
            SELECT v.*, u.name as user_name, u.email as user_email
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            {where_clause}
            ORDER BY v.created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, skip])
        vendors = db.execute_query(vendors_query, tuple(params))
        
        vendor_responses = []
        for vendor in vendors:
            vendor_responses.append(VendorResponse(
                id=vendor['id'],
                user_id=vendor['user_id'],
                description=vendor['description'],
                address=vendor['address'],
                approved_status=vendor['approved_status'],
                created_at=vendor['created_at'],
                user={
                    'id': vendor['user_id'],
                    'name': vendor['user_name'],
                    'email': vendor['user_email']
                }
            ))
        
        return VendorList(vendors=vendor_responses, total=total)
        
    except Exception as e:
        logger.error(f"Database error in get_vendors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


# Profile routes must come BEFORE the {vendor_id} routes to avoid conflicts
@router.get("/profile", response_model=dict)
def get_vendor_profile(
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get current vendor's profile with statistics"""
    try:
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can access this endpoint"
            )
        
        # Get vendor profile with user info
        vendor_query = """
            SELECT v.*, u.name, u.email, u.phone
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.user_id = %s
        """
        vendor = db.execute_query(vendor_query, (current_user['id'],))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor profile not found"
            )
        
        vendor_data = vendor[0]
        
        # Get vendor statistics
        # Total meals
        meals_count_query = "SELECT COUNT(*) as total FROM meals WHERE vendor_id = %s"
        meals_result = db.execute_query(meals_count_query, (vendor_data['id'],))
        total_meals = meals_result[0]['total'] if meals_result else 0
        
        # Total orders
        orders_count_query = "SELECT COUNT(*) as total FROM orders WHERE vendor_id = %s"
        orders_result = db.execute_query(orders_count_query, (vendor_data['id'],))
        total_orders = orders_result[0]['total'] if orders_result else 0
        
        # Average rating (from reviews)
        rating_query = """
            SELECT AVG(r.rating) as avg_rating
            FROM reviews r
            JOIN meals m ON r.meal_id = m.id
            WHERE m.vendor_id = %s
        """
        rating_result = db.execute_query(rating_query, (vendor_data['id'],))
        average_rating = float(rating_result[0]['avg_rating']) if rating_result and rating_result[0]['avg_rating'] else 0.0
        
        return {
            'id': vendor_data['id'],
            'name': vendor_data['name'],
            'email': vendor_data['email'],
            'phone': vendor_data.get('phone'),
            'address': vendor_data['address'],
            'description': vendor_data['description'],
            'approved_status': vendor_data['approved_status'],
            'created_at': vendor_data['created_at'],
            'total_meals': total_meals,
            'total_orders': total_orders,
            'average_rating': average_rating
        }
        
    except Exception as e:
        logger.error(f"Database error in get_vendor_profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.post("/profile", response_model=dict)
def create_vendor_profile(
    profile_data: dict,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Create current vendor's profile"""
    try:
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can access this endpoint"
            )
        
        # Check if vendor profile already exists
        existing_vendor_query = "SELECT * FROM vendors WHERE user_id = %s"
        existing_vendor = db.execute_query(existing_vendor_query, (current_user['id'],))
        
        if existing_vendor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vendor profile already exists"
            )
        
        # Create vendor profile
        insert_query = """
            INSERT INTO vendors (user_id, description, address, approved_status, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """
        vendor_id = db.execute_insert(insert_query, (
            current_user['id'],
            profile_data.get('description', ''),
            profile_data.get('address', ''),
            False  # Default to not approved
        ))
        
        # Get the created vendor
        vendor_query = """
            SELECT v.*, u.name, u.email, u.phone
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = %s
        """
        vendor = db.execute_query(vendor_query, (vendor_id,))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create vendor profile"
            )
        
        vendor_data = vendor[0]
        
        return {
            'id': vendor_data['id'],
            'name': vendor_data['name'],
            'email': vendor_data['email'],
            'phone': vendor_data.get('phone'),
            'address': vendor_data['address'],
            'description': vendor_data['description'],
            'approved_status': vendor_data['approved_status'],
            'created_at': vendor_data['created_at']
        }
        
    except Exception as e:
        logger.error(f"Database error in create_vendor_profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.put("/profile", response_model=dict)
def update_vendor_profile(
    profile_data: dict,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Update current vendor's profile"""
    try:
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can access this endpoint"
            )
        
        # Get vendor profile
        vendor_query = "SELECT * FROM vendors WHERE user_id = %s"
        vendor = db.execute_query(vendor_query, (current_user['id'],))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor profile not found"
            )
        
        vendor_data = vendor[0]
        
        # Update vendor profile
        update_query = """
            UPDATE vendors 
            SET description = %s, address = %s
            WHERE user_id = %s
        """
        db.execute_update(update_query, (
            profile_data.get('description', vendor_data['description']),
            profile_data.get('address', vendor_data['address']),
            current_user['id']
        ))
        
        # Get updated vendor data
        updated_vendor_query = """
            SELECT v.*, u.name, u.email, u.phone
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.user_id = %s
        """
        updated_vendor = db.execute_query(updated_vendor_query, (current_user['id'],))
        
        if not updated_vendor:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated vendor profile"
            )
        
        updated_data = updated_vendor[0]
        
        return {
            'id': updated_data['id'],
            'name': updated_data['name'],
            'email': updated_data['email'],
            'phone': updated_data.get('phone'),
            'address': updated_data['address'],
            'description': updated_data['description'],
            'approved_status': updated_data['approved_status'],
            'created_at': updated_data['created_at']
        }
        
    except Exception as e:
        logger.error(f"Database error in update_vendor_profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/stats", response_model=dict)
def get_vendor_stats(
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get current vendor's statistics"""
    try:
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can access this endpoint"
            )
        
        # Get vendor profile
        vendor_query = "SELECT * FROM vendors WHERE user_id = %s"
        vendor = db.execute_query(vendor_query, (current_user['id'],))
        
        if not vendor:
            # Auto-create vendor profile if missing
            try:
                insert_query = """
                    INSERT INTO vendors (user_id, description, address, approved_status, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                """
                vendor_id = db.execute_insert(insert_query, (
                    current_user['id'],
                    'Vendor profile pending completion',
                    'Address pending completion',
                    False
                ))
                logger.info(f"Auto-created vendor profile for user {current_user['id']}")
            except Exception as e:
                logger.error(f"Failed to auto-create vendor profile: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vendor profile not found. Please complete your profile first."
                )
        
        vendor_data = vendor[0] if vendor else None
        vendor_id = vendor_data['id'] if vendor_data else vendor_id
        
        # Get vendor statistics
        try:
            # Total meals
            meals_count_query = "SELECT COUNT(*) as total FROM meals WHERE vendor_id = %s"
            meals_result = db.execute_query(meals_count_query, (vendor_id,))
            total_meals = meals_result[0]['total'] if meals_result else 0
            
            # Total orders
            orders_count_query = "SELECT COUNT(*) as total FROM orders WHERE vendor_id = %s"
            orders_result = db.execute_query(orders_count_query, (vendor_id,))
            total_orders = orders_result[0]['total'] if orders_result else 0
            
            # Total revenue
            revenue_query = """
                SELECT SUM(total_amount) as total_revenue
                FROM orders 
                WHERE vendor_id = %s AND payment_status = 'paid'
            """
            revenue_result = db.execute_query(revenue_query, (vendor_id,))
            total_revenue = float(revenue_result[0]['total_revenue']) if revenue_result and revenue_result[0]['total_revenue'] else 0.0
            
            # Average rating (from reviews)
            rating_query = """
                SELECT AVG(r.rating) as avg_rating
                FROM reviews r
                JOIN meals m ON r.meal_id = m.id
                WHERE m.vendor_id = %s
            """
            rating_result = db.execute_query(rating_query, (vendor_id,))
            average_rating = float(rating_result[0]['avg_rating']) if rating_result and rating_result[0]['avg_rating'] else 0.0
            
            return {
                'total_meals': total_meals,
                'total_orders': total_orders,
                'total_revenue': total_revenue,
                'average_rating': average_rating
            }
            
        except Exception as e:
            logger.error(f"Error calculating vendor stats: {str(e)}")
            return {
                'total_meals': 0,
                'total_orders': 0,
                'total_revenue': 0.0,
                'average_rating': 0.0
            }
        
    except Exception as e:
        logger.error(f"Database error in get_vendor_stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


# Now the {vendor_id} routes can be defined
@router.get("/{vendor_id}", response_model=VendorWithMeals)
def get_vendor(vendor_id: int, db=Depends(get_db)):
    """Get vendor profile with meals"""
    try:
        # Get vendor with user info
        vendor_query = """
            SELECT v.*, u.name as user_name, u.email as user_email
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = %s
        """
        vendor = db.execute_query(vendor_query, (vendor_id,))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )
        
        vendor_data = vendor[0]
        
        # Get vendor's meals
        meals_query = """
            SELECT * FROM meals 
            WHERE vendor_id = %s AND availability = %s
            ORDER BY created_at DESC
        """
        meals = db.execute_query(meals_query, (vendor_id, True))
        
        # Convert meals to response format
        meal_responses = []
        for meal in meals:
            meal_responses.append({
                'id': meal['id'],
                'name': meal['name'],
                'description': meal['description'],
                'price': meal['price'],
                'availability': meal['availability'],
                'image_url': meal.get('image_url'),
                'created_at': meal['created_at']
            })
        
        return VendorWithMeals(
            id=vendor_data['id'],
            user_id=vendor_data['user_id'],
            description=vendor_data['description'],
            address=vendor_data['address'],
            approved_status=vendor_data['approved_status'],
            created_at=vendor_data['created_at'],
            user={
                'id': vendor_data['user_id'],
                'name': vendor_data['user_name'],
                'email': vendor_data['user_email']
            },
            meals=meal_responses
        )
        
    except Exception as e:
        logger.error(f"Database error in get_vendor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.put("/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    vendor_data: VendorUpdate,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Update vendor profile"""
    try:
        # Check if vendor exists
        vendor_query = "SELECT * FROM vendors WHERE id = %s"
        vendor = db.execute_query(vendor_query, (vendor_id,))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )
        
        vendor_data_db = vendor[0]
        
        # Check if user can update this vendor
        if vendor_data_db['user_id'] != current_user['id'] and current_user['role'] != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this vendor profile"
            )
        
        # Update vendor
        update_query = """
            UPDATE vendors 
            SET description = %s, address = %s, approved_status = %s
            WHERE id = %s
        """
        db.execute_update(update_query, (
            vendor_data.description,
            vendor_data.address,
            vendor_data.approved_status,
            vendor_id
        ))
        
        # Get updated vendor
        updated_vendor_query = """
            SELECT v.*, u.name as user_name, u.email as user_email
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = %s
        """
        updated_vendor = db.execute_query(updated_vendor_query, (vendor_id,))
        
        if not updated_vendor:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated vendor"
            )
        
        return VendorResponse(
            id=updated_vendor[0]['id'],
            user_id=updated_vendor[0]['user_id'],
            description=updated_vendor[0]['description'],
            address=updated_vendor[0]['address'],
            approved_status=updated_vendor[0]['approved_status'],
            created_at=updated_vendor[0]['created_at'],
            user={
                'id': updated_vendor[0]['user_id'],
                'name': updated_vendor[0]['user_name'],
                'email': updated_vendor[0]['user_email']
            }
        )
        
    except Exception as e:
        logger.error(f"Database error in update_vendor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Delete vendor profile"""
    try:
        # Check if vendor exists
        vendor_query = "SELECT * FROM vendors WHERE id = %s"
        vendor = db.execute_query(vendor_query, (vendor_id,))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )
        
        vendor_data = vendor[0]
        
        # Check if user can delete this vendor
        if vendor_data['user_id'] != current_user['id'] and current_user['role'] != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this vendor profile"
            )
        
        # Delete vendor
        delete_query = "DELETE FROM vendors WHERE id = %s"
        db.execute_delete(delete_query, (vendor_id,))
        
        return {"message": "Vendor profile deleted successfully"}
        
    except Exception as e:
        logger.error(f"Database error in delete_vendor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from typing import List, Optional
from database import get_db
from schemas import VendorCreate, VendorResponse, VendorUpdate, VendorWithMeals, VendorList
from auth import get_current_active_user
import logging
import os
from config import settings
import time

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
            INSERT INTO vendors (user_id, description, address, bank_name, account_number, account_name, approved_status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        """
        vendor_id = db.execute_insert(insert_query, (
            vendor_data.user_id,
            vendor_data.description,
            vendor_data.address,
            vendor_data.bank_name,
            vendor_data.account_number,
            vendor_data.account_name,
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
            bank_name=vendor[0]['bank_name'],
            account_number=vendor[0]['account_number'],
            account_name=vendor[0]['account_name'],
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
        total_result = db.execute_query(count_query, params)
        total = total_result[0]['total'] if total_result else 0
        
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
        vendors = db.execute_query(vendors_query, params)
        
        # Convert to response format
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
            'bank_name': vendor_data.get('bank_name'),
            'account_number': vendor_data.get('account_number'),
            'account_name': vendor_data.get('account_name'),
            'profile_picture': vendor_data.get('profile_picture'),
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
    description: str = Form(...),
    address: str = Form(...),
    bank_name: Optional[str] = Form(None),
    account_number: Optional[str] = Form(None),
    account_name: Optional[str] = Form(None),
    profile_picture: Optional[UploadFile] = File(None),
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
        
        # Handle profile picture upload
        profile_picture_url = None
        if profile_picture:
            # Create uploads directory if it doesn't exist
            os.makedirs(settings.upload_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = os.path.splitext(profile_picture.filename)[1]
            filename = f"vendor_profile_{current_user['id']}_{int(time.time())}{file_extension}"
            file_path = os.path.join(settings.upload_dir, filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                content = profile_picture.file.read()
                buffer.write(content)
            
            profile_picture_url = f"/uploads/{filename}"
        
        # Create vendor profile
        insert_query = """
            INSERT INTO vendors (user_id, description, address, bank_name, account_number, account_name, profile_picture, approved_status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """
        vendor_id = db.execute_insert(insert_query, (
            current_user['id'],
            description,
            address,
            bank_name,
            account_number,
            account_name,
            profile_picture_url,
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
            'profile_picture': vendor_data.get('profile_picture'),
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
    description: str = Form(...),
    address: str = Form(...),
    bank_name: Optional[str] = Form(None),
    account_number: Optional[str] = Form(None),
    account_name: Optional[str] = Form(None),
    profile_picture: Optional[UploadFile] = File(None),
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
        
        # Handle profile picture upload
        profile_picture_url = vendor_data.get('profile_picture')
        if profile_picture:
            # Create uploads directory if it doesn't exist
            os.makedirs(settings.upload_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = os.path.splitext(profile_picture.filename)[1]
            filename = f"vendor_profile_{current_user['id']}_{int(time.time())}{file_extension}"
            file_path = os.path.join(settings.upload_dir, filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                content = profile_picture.file.read()
                buffer.write(content)
            
            profile_picture_url = f"/uploads/{filename}"
        
        # Update vendor profile
        update_query = """
            UPDATE vendors 
            SET description = %s, address = %s, bank_name = %s, account_number = %s, account_name = %s, profile_picture = %s
            WHERE user_id = %s
        """
        db.execute_update(update_query, (
            description,
            address,
            bank_name,
            account_number,
            account_name,
            profile_picture_url,
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
            'bank_name': updated_data.get('bank_name'),
            'account_number': updated_data.get('account_number'),
            'account_name': updated_data.get('account_name'),
            'profile_picture': updated_data.get('profile_picture'),
            'approved_status': updated_data['approved_status'],
            'created_at': updated_data['created_at']
        }
        
    except Exception as e:
        logger.error(f"Database error in update_vendor_profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


# Now the {vendor_id} routes can be defined

@router.get("/stats", response_model=dict)
def get_vendor_stats(
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get current vendor's statistics"""
    try:
        logger.info(f"Vendor stats requested by user: {current_user.get('id')} with role: {current_user.get('role')}")
        
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can access this endpoint"
            )
        
        # Get vendor ID
        vendor_query = "SELECT id, profile_picture FROM vendors WHERE user_id = %s"
        vendor = db.execute_query(vendor_query, (current_user['id'],))
        
        if not vendor:
            # Auto-create vendor profile if it doesn't exist
            try:
                vendor_insert_query = """
                    INSERT INTO vendors (user_id, description, address, approved_status, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                """
                default_description = f"Vendor profile for {current_user['name']}"
                default_address = "Kano, Nigeria"
                
                vendor_id = db.execute_insert(vendor_insert_query, (
                    current_user['id'],
                    default_description,
                    default_address,
                    False  # Not approved by default
                ))
                
                logger.info(f"Auto-created vendor profile for user {current_user['id']}")
                
            except Exception as create_error:
                logger.error(f"Failed to auto-create vendor profile: {str(create_error)}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Vendor profile not found and could not be auto-created. Please contact support."
                )
        else:
            vendor_id = vendor[0]['id']
            profile_picture = vendor[0].get('profile_picture')
        logger.info(f"Found vendor ID: {vendor_id}")
        
        # Get statistics
        # Total orders
        try:
            orders_count_query = "SELECT COUNT(*) as total FROM orders WHERE vendor_id = %s"
            orders_result = db.execute_query(orders_count_query, (vendor_id,))
            total_orders = orders_result[0]['total'] if orders_result else 0
            logger.info(f"Total orders: {total_orders}")
        except Exception as e:
            logger.warning(f"Error calculating total orders: {str(e)}")
            total_orders = 0
        
        # Total meals
        try:
            meals_count_query = "SELECT COUNT(*) as total FROM meals WHERE vendor_id = %s"
            meals_result = db.execute_query(meals_count_query, (vendor_id,))
            total_meals = meals_result[0]['total'] if meals_result else 0
        except Exception as e:
            logger.warning(f"Error calculating total meals: {str(e)}")
            total_meals = 0
        
        # Average rating
        try:
            rating_query = """
                SELECT AVG(r.rating) as avg_rating
                FROM reviews r
                WHERE r.vendor_id = %s
            """
            rating_result = db.execute_query(rating_query, (vendor_id,))
            average_rating = float(rating_result[0]['avg_rating']) if rating_result and rating_result[0]['avg_rating'] else 0.0
            logger.info(f"Average rating: {average_rating}")
        except Exception as e:
            logger.warning(f"Error calculating average rating: {str(e)}")
            average_rating = 0.0
        
        # Total revenue
        try:
            revenue_query = """
                SELECT SUM(o.total_amount) as total_revenue
                FROM orders o
                WHERE o.vendor_id = %s AND o.status = 'delivered'
            """
            revenue_result = db.execute_query(revenue_query, (vendor_id,))
            total_revenue = float(revenue_result[0]['total_revenue']) if revenue_result and revenue_result[0]['total_revenue'] else 0.0
            logger.info(f"Total revenue: {total_revenue}")
        except Exception as e:
            logger.warning(f"Error calculating total revenue: {str(e)}")
            total_revenue = 0.0
        
        # Pending orders
        try:
            pending_orders_query = "SELECT COUNT(*) as total FROM orders WHERE vendor_id = %s AND status = 'pending'"
            pending_result = db.execute_query(pending_orders_query, (vendor_id,))
            pending_orders = pending_result[0]['total'] if pending_result else 0
        except Exception as e:
            logger.warning(f"Error calculating pending orders: {str(e)}")
            pending_orders = 0
        
        # Completed orders
        try:
            completed_orders_query = "SELECT COUNT(*) as total FROM orders WHERE vendor_id = %s AND status = 'delivered'"
            completed_result = db.execute_query(completed_orders_query, (vendor_id,))
            completed_orders = completed_result[0]['total'] if completed_result else 0
        except Exception as e:
            logger.warning(f"Error calculating completed orders: {str(e)}")
            completed_orders = 0
        
        return {
            'total_orders': total_orders,
            'total_meals': total_meals,
            'average_rating': average_rating,
            'total_revenue': total_revenue,
            'pending_orders': pending_orders,
            'completed_orders': completed_orders,
            'profile_picture': profile_picture
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as they are
        raise
    except Exception as e:
        logger.error(f"Database error in get_vendor_stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

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
                'created_at': meal['created_at'],
                'vendor_id': vendor_id,
                'vendor': {
                    'id': vendor_data['id'],
                    'name': vendor_data['user_name'],
                    'email': vendor_data['user_email'],
                    'address': vendor_data['address']
                }
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
            SET description = %s, address = %s, updated_at = NOW()
            WHERE id = %s
        """
        db.execute_update(update_query, (
            vendor_data.description,
            vendor_data.address,
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
                detail="Failed to update vendor profile"
            )
        
        vendor_data_updated = updated_vendor[0]
        
        return VendorResponse(
            id=vendor_data_updated['id'],
            user_id=vendor_data_updated['user_id'],
            description=vendor_data_updated['description'],
            address=vendor_data_updated['address'],
            approved_status=vendor_data_updated['approved_status'],
            created_at=vendor_data_updated['created_at'],
            user={
                'id': vendor_data_updated['user_id'],
                'name': vendor_data_updated['user_name'],
                'email': vendor_data_updated['user_email']
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
    """Delete vendor profile (admin only)"""
    try:
        if current_user['role'] != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete vendor profiles"
            )
        
        # Check if vendor exists
        vendor_query = "SELECT * FROM vendors WHERE id = %s"
        vendor = db.execute_query(vendor_query, (vendor_id,))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )
        
        # Delete vendor (this will cascade to meals)
        delete_query = "DELETE FROM vendors WHERE id = %s"
        db.execute_delete(delete_query, (vendor_id,))
        
        return {"message": "Vendor profile deleted successfully"}
        
    except Exception as e:
        logger.error(f"Database error in delete_vendor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


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
            'profile_picture': vendor_data.get('profile_picture'),
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
            False  # Not approved by default
        ))
        
        # Get the created vendor profile
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
            'profile_picture': vendor_data.get('profile_picture'),
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
            SET description = %s, address = %s, updated_at = NOW()
            WHERE id = %s
        """
        db.execute_update(update_query, (
            profile_data.get('description', vendor_data['description']),
            profile_data.get('address', vendor_data['address']),
            vendor_data['id']
        ))
        
        # Update user info if provided
        if profile_data.get('name') or profile_data.get('email') or profile_data.get('phone'):
            user_update_query = """
                UPDATE users 
                SET name = %s, email = %s, phone = %s
                WHERE id = %s
            """
            db.execute_update(user_update_query, (
                profile_data.get('name', current_user['name']),
                profile_data.get('email', current_user['email']),
                profile_data.get('phone', current_user.get('phone')),
                current_user['id']
            ))
        
        # Get updated profile
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
                detail="Failed to update vendor profile"
            )
        
        updated_vendor_data = updated_vendor[0]
        
        # Get updated statistics
        meals_count_query = "SELECT COUNT(*) as total FROM meals WHERE vendor_id = %s"
        meals_result = db.execute_query(meals_count_query, (updated_vendor_data['id'],))
        total_meals = meals_result[0]['total'] if meals_result else 0
        
        orders_count_query = "SELECT COUNT(*) as total FROM orders WHERE vendor_id = %s"
        orders_result = db.execute_query(orders_count_query, (updated_vendor_data['id'],))
        total_orders = orders_result[0]['total'] if orders_result else 0
        
        rating_query = """
            SELECT AVG(r.rating) as avg_rating
            FROM reviews r
            JOIN meals m ON r.meal_id = m.id
            WHERE m.vendor_id = %s
        """
        rating_result = db.execute_query(rating_query, (updated_vendor_data['id'],))
        average_rating = float(rating_result[0]['avg_rating']) if rating_result and rating_result[0]['avg_rating'] else 0.0
        
        return {
            'id': updated_vendor_data['id'],
            'name': updated_vendor_data['name'],
            'email': updated_vendor_data['email'],
            'phone': updated_vendor_data.get('phone'),
            'address': updated_vendor_data['address'],
            'description': updated_vendor_data['description'],
            'approved_status': updated_vendor_data['approved_status'],
            'created_at': updated_vendor_data['created_at'],
            'total_meals': total_meals,
            'total_orders': total_orders,
            'average_rating': average_rating
        }
        
    except Exception as e:
        logger.error(f"Database error in update_vendor_profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/meals", response_model=dict)
def get_vendor_meals(
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get current vendor's meals"""
    try:
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can access this endpoint"
            )
        
        # Get vendor ID
        vendor_query = "SELECT id FROM vendors WHERE user_id = %s"
        vendor = db.execute_query(vendor_query, (current_user['id'],))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor profile not found"
            )
        
        vendor_id = vendor[0]['id']
        
        # Get vendor's meals
        meals_query = """
            SELECT * FROM meals 
            WHERE vendor_id = %s
            ORDER BY created_at DESC
        """
        meals = db.execute_query(meals_query, (vendor_id,))
        
        return {
            'meals': meals
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as they are
        raise
    except Exception as e:
        logger.error(f"Database error in get_vendor_meals: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

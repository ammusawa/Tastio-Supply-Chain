from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from typing import List, Optional
import os
import uuid
import time
from database import get_db
from schemas import MealCreate, MealResponse, MealUpdate, MealList
from auth import get_current_active_user
from config import settings
import logging

router = APIRouter(prefix="/meals", tags=["Meals"])

logger = logging.getLogger(__name__)


@router.post("/", response_model=MealResponse)
async def create_meal(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    availability: bool = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Create a new meal (vendor only)"""
    try:
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can create meals"
            )
        
        # Get vendor profile
        vendor_query = "SELECT * FROM vendors WHERE user_id = %s"
        vendor = db.execute_query(vendor_query, (current_user['id'],))
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vendor profile not found. Please create a vendor profile first."
            )
        
        if not vendor[0]['approved_status']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vendor profile not yet approved"
            )
        
        # Handle image upload
        image_url = None
        if image:
            # Create uploads directory if it doesn't exist
            os.makedirs(settings.upload_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = os.path.splitext(image.filename)[1]
            filename = f"meal_{int(time.time())}_{uuid.uuid4().hex[:8]}{file_extension}"
            file_path = os.path.join(settings.upload_dir, filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                content = image.file.read()
                buffer.write(content)
            
            image_url = f"/uploads/{filename}"
        
        # Create meal
        insert_query = """
            INSERT INTO meals (vendor_id, name, description, price, availability, image_url, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        meal_id = db.execute_insert(insert_query, (
            vendor[0]['id'],
            name,
            description,
            price,
            availability,
            image_url
        ))
        
        # Get the created meal
        meal_query = """
            SELECT m.*, v.id as vendor_id, v.address as vendor_address,
                   u.name as vendor_name, u.email as vendor_email
            FROM meals m
            JOIN vendors v ON m.vendor_id = v.id
            JOIN users u ON v.user_id = u.id
            WHERE m.id = %s
        """
        meal = db.execute_query(meal_query, (meal_id,))
        
        if not meal:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create meal"
            )
        
        meal_data_db = meal[0]
        
        return MealResponse(
            id=meal_data_db['id'],
            vendor_id=meal_data_db['vendor_id'],
            name=meal_data_db['name'],
            description=meal_data_db['description'],
            price=meal_data_db['price'],
            availability=meal_data_db['availability'],
            image_url=meal_data_db.get('image_url'),
            created_at=meal_data_db['created_at'],
            vendor={
                'id': meal_data_db['vendor_id'],
                'name': meal_data_db['vendor_name'],
                'address': meal_data_db['vendor_address'],
                'email': meal_data_db['vendor_email']
            }
        )
        
    except Exception as e:
        logger.error(f"Database error in create_meal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/", response_model=MealList)
def get_meals(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    vendor_id: Optional[int] = Query(None),
    available_only: bool = Query(True),
    db=Depends(get_db)
):
    """Get list of meals with optional filtering"""
    try:
        # Build query based on filters
        where_conditions = []
        params = []
        
        if vendor_id:
            where_conditions.append("m.vendor_id = %s")
            params.append(vendor_id)
        
        if available_only:
            where_conditions.append("m.availability = %s")
            params.append(True)
        
        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        # Get total count
        count_query = f"""
            SELECT COUNT(*) as total
            FROM meals m
            {where_clause}
        """
        total_result = db.execute_query(count_query, params)
        total = total_result[0]['total'] if total_result else 0
        
        # Get meals with vendor info
        meals_query = f"""
            SELECT m.*, v.id as vendor_id, v.address as vendor_address,
                   v.bank_name, v.account_number, v.account_name,
                   u.name as vendor_name, u.email as vendor_email
            FROM meals m
            JOIN vendors v ON m.vendor_id = v.id
            JOIN users u ON v.user_id = u.id
            {where_clause}
            ORDER BY m.created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, skip])
        meals = db.execute_query(meals_query, params)
        
        # Convert to response format
        meal_responses = []
        for meal in meals:
            meal_responses.append(MealResponse(
                id=meal['id'],
                vendor_id=meal['vendor_id'],
                name=meal['name'],
                description=meal['description'],
                price=meal['price'],
                availability=meal['availability'],
                image_url=meal.get('image_url'),
                created_at=meal['created_at'],
                vendor={
                    'id': meal['vendor_id'],
                    'name': meal['vendor_name'],
                    'address': meal['vendor_address'],
                    'email': meal['vendor_email'],
                    'bank_name': meal.get('bank_name'),
                    'account_number': meal.get('account_number'),
                    'account_name': meal.get('account_name')
                }
            ))
        
        return MealList(meals=meal_responses, total=total)
        
    except Exception as e:
        logger.error(f"Database error in get_meals: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/{meal_id}", response_model=MealResponse)
def get_meal(meal_id: int, db=Depends(get_db)):
    """Get meal details"""
    try:
        meal_query = """
            SELECT m.*, v.id as vendor_id, v.address as vendor_address,
                   v.bank_name, v.account_number, v.account_name,
                   u.name as vendor_name, u.email as vendor_email
            FROM meals m
            JOIN vendors v ON m.vendor_id = v.id
            JOIN users u ON v.user_id = u.id
            WHERE m.id = %s
        """
        meal = db.execute_query(meal_query, (meal_id,))
        
        if not meal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meal not found"
            )
        
        meal_data = meal[0]
        
        return MealResponse(
            id=meal_data['id'],
            vendor_id=meal_data['vendor_id'],
            name=meal_data['name'],
            description=meal_data['description'],
            price=meal_data['price'],
            availability=meal_data['availability'],
            image_url=meal_data.get('image_url'),
            created_at=meal_data['created_at'],
            vendor={
                'id': meal_data['vendor_id'],
                'name': meal_data['vendor_name'],
                'address': meal_data['vendor_address'],
                'email': meal_data['vendor_email'],
                'bank_name': meal_data.get('bank_name'),
                'account_number': meal_data.get('account_number'),
                'account_name': meal_data.get('account_name')
            }
        )
        
    except Exception as e:
        logger.error(f"Database error in get_meal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.put("/{meal_id}", response_model=MealResponse)
def update_meal(
    meal_id: int,
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    availability: bool = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Update meal (vendor only)"""
    try:
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can update meals"
            )
        
        # Check if meal exists and belongs to current user
        meal_query = """
            SELECT m.*, v.user_id as vendor_user_id
            FROM meals m
            JOIN vendors v ON m.vendor_id = v.id
            WHERE m.id = %s
        """
        meal = db.execute_query(meal_query, (meal_id,))
        
        if not meal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meal not found"
            )
        
        if meal[0]['vendor_user_id'] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this meal"
            )
        
        # Handle image upload
        image_url = meal[0].get('image_url')
        if image:
            # Create uploads directory if it doesn't exist
            os.makedirs(settings.upload_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = os.path.splitext(image.filename)[1]
            filename = f"meal_{meal_id}_{int(time.time())}{file_extension}"
            file_path = os.path.join(settings.upload_dir, filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                content = image.file.read()
                buffer.write(content)
            
            image_url = f"/uploads/{filename}"
        
        # Update meal
        update_query = """
            UPDATE meals 
            SET name = %s, description = %s, price = %s, availability = %s, image_url = %s, updated_at = NOW()
            WHERE id = %s
        """
        db.execute_update(update_query, (
            name,
            description,
            price,
            availability,
            image_url,
            meal_id
        ))
        
        # Get updated meal
        updated_meal_query = """
            SELECT m.*, v.id as vendor_id, v.address as vendor_address,
                   u.name as vendor_name, u.email as vendor_email
            FROM meals m
            JOIN vendors v ON m.vendor_id = v.id
            JOIN users u ON v.user_id = u.id
            WHERE m.id = %s
        """
        updated_meal = db.execute_query(updated_meal_query, (meal_id,))
        
        if not updated_meal:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update meal"
            )
        
        meal_data_updated = updated_meal[0]
        
        return MealResponse(
            id=meal_data_updated['id'],
            vendor_id=meal_data_updated['vendor_id'],
            name=meal_data_updated['name'],
            description=meal_data_updated['description'],
            price=meal_data_updated['price'],
            availability=meal_data_updated['availability'],
            image_url=meal_data_updated.get('image_url'),
            created_at=meal_data_updated['created_at'],
            vendor={
                'id': meal_data_updated['vendor_id'],
                'name': meal_data_updated['vendor_name'],
                'address': meal_data_updated['vendor_address'],
                'email': meal_data_updated['vendor_email']
            }
        )
        
    except Exception as e:
        logger.error(f"Database error in update_meal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.delete("/{meal_id}")
def delete_meal(
    meal_id: int,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Delete meal (vendor only)"""
    try:
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can delete meals"
            )
        
        # Check if meal exists and belongs to current user
        meal_query = """
            SELECT m.*, v.user_id as vendor_user_id
            FROM meals m
            JOIN vendors v ON m.vendor_id = v.id
            WHERE m.id = %s
        """
        meal = db.execute_query(meal_query, (meal_id,))
        
        if not meal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meal not found"
            )
        
        if meal[0]['vendor_user_id'] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this meal"
            )
        
        # Delete meal
        delete_query = "DELETE FROM meals WHERE id = %s"
        db.execute_delete(delete_query, (meal_id,))
        
        return {"message": "Meal deleted successfully"}
        
    except Exception as e:
        logger.error(f"Database error in delete_meal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.post("/{meal_id}/upload-image")
async def upload_meal_image(
    meal_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Upload meal image (vendor only)"""
    try:
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can upload meal images"
            )
        
        # Check if meal exists and belongs to current user
        meal_query = """
            SELECT m.*, v.user_id as vendor_user_id
            FROM meals m
            JOIN vendors v ON m.vendor_id = v.id
            WHERE m.id = %s
        """
        meal = db.execute_query(meal_query, (meal_id,))
        
        if not meal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meal not found"
            )
        
        if meal[0]['vendor_user_id'] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to upload image for this meal"
            )
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1]
        filename = f"meal_{meal_id}_{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(settings.upload_dir, filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Update meal with image URL
        image_url = f"/uploads/{filename}"
        update_query = "UPDATE meals SET image_url = %s WHERE id = %s"
        db.execute_update(update_query, (image_url, meal_id))
        
        return {"message": "Image uploaded successfully", "image_url": image_url}
        
    except Exception as e:
        logger.error(f"Database error in upload_meal_image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/vendor/my-meals", response_model=List[MealResponse])
def get_my_meals(
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get current vendor's meals"""
    if current_user['role'] != 'vendor':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only vendors can access this endpoint"
        )
    
    vendor_query = "SELECT * FROM vendors WHERE user_id = %s"
    vendor = db.execute_query(vendor_query, (current_user['id'],))
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor profile not found"
        )
    
    vendor_data = vendor[0]
    
    meals_query = """
        SELECT m.*, v.id as vendor_id, v.address as vendor_address,
               u.name as vendor_name, u.email as vendor_email
        FROM meals m
        JOIN vendors v ON m.vendor_id = v.id
        JOIN users u ON v.user_id = u.id
        WHERE m.vendor_id = %s
    """
    meals = db.execute_query(meals_query, (vendor_data['id'],))
    
    meal_responses = []
    for meal in meals:
        meal_responses.append(MealResponse(
            id=meal['id'],
            vendor_id=meal['vendor_id'],
            name=meal['name'],
            description=meal['description'],
            price=meal['price'],
            availability=meal['availability'],
            image_url=meal.get('image_url'),
            created_at=meal['created_at'],
            vendor={
                'id': meal['vendor_id'],
                'name': meal['vendor_name'],
                'address': meal['vendor_address'],
                'email': meal['vendor_email']
            }
        ))
    
    return meal_responses

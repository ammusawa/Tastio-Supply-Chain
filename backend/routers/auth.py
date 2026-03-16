from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from database import DatabaseManager, get_db
from schemas import UserCreate, Token, UserResponse
from auth import authenticate_user, create_access_token, get_password_hash, get_current_active_user, verify_password
from config import settings
import logging

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db=Depends(get_db)):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user_query = "SELECT * FROM users WHERE email = %s OR phone = %s"
        existing_user = db.execute_query(existing_user_query, (user_data.email, user_data.phone))
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email or phone already exists"
            )
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Insert new user
        insert_query = """
            INSERT INTO users (name, email, phone, password_hash, role, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        user_id = db.execute_insert(
            insert_query,
            (user_data.name, user_data.email, user_data.phone, hashed_password, user_data.role.value, True)
        )
        
        # Get the created user
        user_query = "SELECT * FROM users WHERE id = %s"
        user = db.execute_query(user_query, (user_id,))
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        # If user is a vendor, automatically create vendor profile
        if user[0]['role'] == 'vendor':
            try:
                vendor_insert_query = """
                    INSERT INTO vendors (user_id, description, address, approved_status, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                """
                default_description = f"Vendor profile for {user[0]['name']}"
                default_address = "Kano, Nigeria"
                
                db.execute_insert(vendor_insert_query, (
                    user_id,
                    default_description,
                    default_address,
                    False  # Not approved by default
                ))
                
                logging.info(f"Auto-created vendor profile for user {user_id}")
                
            except Exception as vendor_error:
                logging.error(f"Failed to create vendor profile for user {user_id}: {str(vendor_error)}")
                # Don't fail registration if vendor profile creation fails
                # User can create profile later via profile page
        
        return UserResponse(
            id=user[0]['id'],
            name=user[0]['name'],
            email=user[0]['email'],
            phone=user[0]['phone'],
            role=user[0]['role'],
            is_active=user[0]['is_active'],
            created_at=user[0]['created_at']
        )
        
    except Exception as e:
        logging.error(f"Database error in register: {str(e)}")
        if "Database connection not available" in str(e):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is currently unavailable. Please try again later."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


@router.post("/login", response_model=dict)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    """Login and get access token with user information"""
    try:
        # Get user by email
        user_query = "SELECT * FROM users WHERE email = %s"
        user = db.execute_query(user_query, (form_data.username,))
        
        if not user or not verify_password(form_data.password, user[0]['password_hash']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user[0]['is_active']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        # Create access token
        access_token = create_access_token(data={"sub": user[0]['email']})
        
        # Return token and user information
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user[0]['id'],
                "name": user[0]['name'],
                "email": user[0]['email'],
                "phone": user[0]['phone'],
                "role": user[0]['role'],
                "is_active": user[0]['is_active'],
                "created_at": user[0]['created_at']
            }
        }
        
    except Exception as e:
        logging.error(f"Database error in login: {str(e)}")
        if "Database connection not available" in str(e):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is currently unavailable. Please try again later."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate user"
        )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user=Depends(get_current_active_user)):
    """Get current user information"""
    return current_user


@router.post("/refresh", response_model=Token)
async def refresh_token(current_user=Depends(get_current_active_user)):
    """Refresh access token"""
    try:
        # Create new access token
        access_token = create_access_token(data={"sub": current_user['email']})
        
        return Token(access_token=access_token, token_type="bearer")
        
    except Exception as e:
        logging.error(f"Error refreshing token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )


@router.put("/update-profile", response_model=UserResponse)
async def update_profile(
    profile_data: dict,
    current_user=Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Update user profile information"""
    try:
        # Validate required fields
        if not profile_data.get('name') or not profile_data.get('email') or not profile_data.get('phone'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name, email, and phone are required"
            )
        
        # Check if email is already taken by another user
        if profile_data['email'] != current_user['email']:
            email_check_query = "SELECT id FROM users WHERE email = %s AND id != %s"
            existing_email = db.execute_query(email_check_query, (profile_data['email'], current_user['id']))
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is already taken by another user"
                )
        
        # Check if phone is already taken by another user
        if profile_data['phone'] != current_user['phone']:
            phone_check_query = "SELECT id FROM users WHERE phone = %s AND id != %s"
            existing_phone = db.execute_query(phone_check_query, (profile_data['phone'], current_user['id']))
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number is already taken by another user"
                )
        
        # Prepare update data
        update_fields = []
        update_values = []
        
        # Basic profile fields
        if profile_data.get('name') != current_user['name']:
            update_fields.append("name = %s")
            update_values.append(profile_data['name'])
        
        if profile_data.get('email') != current_user['email']:
            update_fields.append("email = %s")
            update_values.append(profile_data['email'])
        
        if profile_data.get('phone') != current_user['phone']:
            update_fields.append("phone = %s")
            update_values.append(profile_data['phone'])
        
        # Handle password change if provided
        if profile_data.get('new_password'):
            if not profile_data.get('current_password'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is required to change password"
                )
            
            # Verify current password
            if not verify_password(profile_data['current_password'], current_user['password_hash']):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect"
                )
            
            # Hash new password
            new_password_hash = get_password_hash(profile_data['new_password'])
            update_fields.append("password_hash = %s")
            update_values.append(new_password_hash)
        
        # If no changes, return current user
        if not update_fields:
            return current_user
        
        # Add user ID to values
        update_values.append(current_user['id'])
        
        # Build and execute update query
        update_query = f"""
            UPDATE users 
            SET {', '.join(update_fields)}
            WHERE id = %s
        """
        db.execute_update(update_query, tuple(update_values))
        
        # Get updated user
        updated_user_query = "SELECT * FROM users WHERE id = %s"
        updated_user = db.execute_query(updated_user_query, (current_user['id'],))
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated user"
            )
        
        return UserResponse(
            id=updated_user[0]['id'],
            name=updated_user[0]['name'],
            email=updated_user[0]['email'],
            phone=updated_user[0]['phone'],
            role=updated_user[0]['role'],
            is_active=updated_user[0]['is_active'],
            created_at=updated_user[0]['created_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Database error in update_profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

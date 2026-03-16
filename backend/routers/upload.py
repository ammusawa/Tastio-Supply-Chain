from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from auth import get_current_active_user
from database import get_db
import os
import time
import logging

router = APIRouter(prefix="/upload", tags=["File Upload"])

logger = logging.getLogger(__name__)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Create payment_proofs subdirectory
PAYMENT_PROOFS_DIR = os.path.join(UPLOAD_DIR, "payment_proofs")
if not os.path.exists(PAYMENT_PROOFS_DIR):
    os.makedirs(PAYMENT_PROOFS_DIR)


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user)
):
    """Upload a file (payment proof, profile picture, etc.)"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only image files are allowed"
            )
        
        # Validate file size (max 5MB)
        file_size = 0
        content = await file.read()
        file_size = len(content)
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 5MB"
            )
        
        # Generate unique filename
        timestamp = int(time.time())
        file_extension = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
        filename = f"payment_proof_{current_user['id']}_{timestamp}{file_extension}"
        
        # Save file
        file_path = os.path.join(PAYMENT_PROOFS_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Return the URL
        file_url = f"/uploads/payment_proofs/{filename}"
        
        logger.info(f"File uploaded successfully: {file_url} by user {current_user['id']}")
        
        return JSONResponse(content={
            "url": file_url,
            "filename": filename,
            "size": file_size,
            "content_type": file.content_type
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file"
        )


@router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user)
):
    """Upload a profile picture"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only image files are allowed"
            )
        
        # Validate file size (max 2MB for profile pictures)
        file_size = 0
        content = await file.read()
        file_size = len(content)
        
        if file_size > 2 * 1024 * 1024:  # 2MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 2MB"
            )
        
        # Generate unique filename
        timestamp = int(time.time())
        file_extension = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
        filename = f"profile_{current_user['id']}_{timestamp}{file_extension}"
        
        # Save file
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Return the URL
        file_url = f"/uploads/{filename}"
        
        logger.info(f"Profile picture uploaded successfully: {file_url} by user {current_user['id']}")
        
        return JSONResponse(content={
            "url": file_url,
            "filename": filename,
            "size": file_size,
            "content_type": file.content_type
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading profile picture: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload profile picture"
        )

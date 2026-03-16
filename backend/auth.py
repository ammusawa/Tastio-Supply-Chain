from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from database import get_db
from schemas import TokenData
from config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def verify_token(token: str, credentials_exception):
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
        return token_data
    except JWTError:
        raise credentials_exception


async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    """Get the current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(token, credentials_exception)
    user_query = "SELECT * FROM users WHERE email = %s"
    user_result = db.execute_query(user_query, (token_data.email,))
    
    if not user_result:
        raise credentials_exception
    
    user = user_result[0]
    
    if not user['is_active']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user


async def get_current_active_user(current_user=Depends(get_current_user)):
    """Get the current active user"""
    if not current_user['is_active']:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def authenticate_user(db, email: str, password: str):
    """Authenticate a user with email and password"""
    user_query = "SELECT * FROM users WHERE email = %s"
    user_result = db.execute_query(user_query, (email,))
    
    if not user_result:
        return False
    
    user = user_result[0]
    if not verify_password(password, user['password_hash']):
        return False
    
    return user


# Role-based access control functions
def require_role(allowed_roles: list):
    """Decorator to require specific roles for access"""
    def role_checker(current_user=Depends(get_current_user)):
        if current_user['role'] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


def require_customer():
    """Require customer role"""
    return require_role(['customer'])


def require_vendor():
    """Require vendor role"""
    return require_role(['vendor'])


def require_admin():
    """Require admin role"""
    return require_role(['admin'])


def require_customer_or_vendor():
    """Require either customer or vendor role"""
    return require_role(['customer', 'vendor'])


def require_vendor_or_admin():
    """Require either vendor or admin role"""
    return require_role(['vendor', 'admin'])


async def get_current_vendor(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get the current user's vendor profile if they are a vendor"""
    if current_user['role'] != 'vendor':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Vendor role required."
        )
    
    # Get vendor profile
    vendor_query = "SELECT * FROM vendors WHERE user_id = %s"
    vendor_result = db.execute_query(vendor_query, (current_user['id'],))
    
    if not vendor_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found"
        )
    
    vendor = vendor_result[0]
    return vendor


def check_vendor_approval(vendor=Depends(get_current_vendor)):
    """Check if vendor is approved"""
    if not vendor['approved_status']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor account not yet approved"
        )
    return vendor

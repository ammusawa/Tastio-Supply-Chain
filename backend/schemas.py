from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime
import enum

# Define enums directly in schemas to avoid SQLAlchemy dependency
class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"           # Order received, waiting for vendor acceptance
    ACCEPTED = "accepted"         # Vendor accepted the order
    PREPARING = "preparing"       # Vendor is preparing the meal
    READY = "ready"              # Meal is ready for pickup/delivery
    OUT_FOR_DELIVERY = "out_for_delivery"  # Order is being delivered
    DELIVERED = "delivered"       # Order completed successfully
    CANCELLED = "cancelled"       # Order cancelled (by customer or vendor)
    REJECTED = "rejected"         # Vendor rejected the order

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"           # Payment not yet made
    PAID = "paid"                # Payment completed
    FAILED = "failed"            # Payment failed
    REFUNDED = "refunded"        # Payment refunded

class PaymentMethod(str, enum.Enum):
    CASH_ON_DELIVERY = "cash_on_delivery"
    BANK_TRANSFER = "bank_transfer"
    CARD_PAYMENT = "card_payment"
    MOBILE_MONEY = "mobile_money"

# Base schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: str


class VendorBase(BaseModel):
    description: Optional[str] = None
    address: str
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None


class MealBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    availability: bool = True


class OrderBase(BaseModel):
    meal_id: int
    quantity: int = 1
    delivery_address: Optional[str] = None
    special_instructions: Optional[str] = None


class ReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None

    @validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


# Create schemas
class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.CUSTOMER


class VendorCreate(VendorBase):
    user_id: int


class MealCreate(MealBase):
    pass


class OrderCreate(OrderBase):
    payment_method: PaymentMethod = PaymentMethod.CASH_ON_DELIVERY
    payment_proof_url: Optional[str] = None
    transaction_reference: Optional[str] = None


class ReviewCreate(ReviewBase):
    order_id: int


# Update schemas
class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class VendorUpdate(BaseModel):
    description: Optional[str] = None
    address: Optional[str] = None
    profile_picture: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    approved_status: Optional[bool] = None


class MealUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    availability: Optional[bool] = None


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    estimated_ready_time: Optional[datetime] = None
    notes: Optional[str] = None


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None

    @validator('rating')
    def validate_rating(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Rating must be between 1 and 5')
        return v


# Response schemas
class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class VendorResponse(VendorBase):
    id: int
    user_id: int
    profile_picture: Optional[str] = None
    approved_status: bool
    created_at: datetime
    user: dict

    class Config:
        from_attributes = True


class MealResponse(MealBase):
    id: int
    vendor_id: int
    image_url: Optional[str] = None
    created_at: datetime
    vendor: dict

    class Config:
        from_attributes = True


class OrderResponse(OrderBase):
    id: int
    user_id: int
    vendor_id: int
    total_amount: float
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: PaymentMethod
    delivery_address: Optional[str] = None
    special_instructions: Optional[str] = None
    estimated_ready_time: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    meal: dict
    vendor: dict
    customer: dict

    class Config:
        from_attributes = True


class ReviewResponse(ReviewBase):
    id: int
    order_id: int
    user_id: int
    vendor_id: int
    meal_id: int
    created_at: datetime
    user: dict

    class Config:
        from_attributes = True


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# Vendor with meals
class VendorWithMeals(VendorResponse):
    meals: List[MealResponse] = []


# Order with details
class OrderWithDetails(OrderResponse):
    pass


# Review with customer info
class ReviewWithCustomer(ReviewResponse):
    pass


# List responses
class VendorList(BaseModel):
    vendors: List[VendorResponse]
    total: int


class MealList(BaseModel):
    meals: List[MealResponse]
    total: int


class OrderList(BaseModel):
    orders: List[OrderResponse]
    total: int


class ReviewList(BaseModel):
    reviews: List[ReviewWithCustomer]
    total: int

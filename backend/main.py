from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from config import settings

# Import routers
from routers import auth, vendors, meals, orders, reviews, admin, notifications, messages, users, upload
from database import db_manager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Tastio App API",
    description="Homemade Food Ordering App for Kano - API Documentation",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
if os.path.exists(settings.upload_dir):
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Include routers - Remove the prefix from routers that already have it
app.include_router(auth.router, prefix="/api")  # auth router already has /auth prefix
app.include_router(vendors.router, prefix="/api")  # vendors router already has /vendors prefix
app.include_router(meals.router, prefix="/api")  # meals router already has /meals prefix
app.include_router(orders.router, prefix="/api")  # orders router already has /orders prefix
app.include_router(reviews.router, prefix="/api")  # reviews router already has /reviews prefix
app.include_router(admin.router, prefix="/api")  # admin router already has /admin prefix
app.include_router(notifications.router, prefix="/api")  # notifications router already has /notifications prefix
app.include_router(messages.router, prefix="/api")  # messages router already has /messages prefix
app.include_router(users.router, prefix="/api")  # users router already has /users prefix
app.include_router(upload.router, prefix="/api")  # upload router already has /upload prefix


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to Tastio API"}

@app.get("/health")
def health_check():
    """Health check endpoint to monitor database connectivity"""
    try:
        # Test database connection
        db_status = db_manager.test_connection()
        pool_status = db_manager.get_pool_status()
        
        return {
            "status": "healthy" if db_status else "unhealthy",
            "database": {
                "connected": db_status,
                "pool": pool_status
            },
            "timestamp": "2024-01-16T12:00:00Z"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": {
                "connected": False,
                "error": str(e)
            },
            "timestamp": "2024-01-16T12:00:00Z"
        }

@app.get("/api/health")
def api_health_check():
    """API-specific health check"""
    return health_check()


@app.get("/setup")
async def setup_info():
    """Setup information"""
    return {
        "message": "Database setup required",
        "steps": [
            "1. Install and start MySQL server",
            "2. Create database: tastio_app",
            "3. Run schema.sql to create tables",
            "4. Update config.py with correct database credentials",
            "5. Restart the application"
        ],
        "database_url": settings.database_url
    }


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Tastio App API...")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔧 Setup Info: http://localhost:8000/setup")
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )

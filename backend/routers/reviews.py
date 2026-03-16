from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from database import get_db
from schemas import ReviewCreate, ReviewResponse, ReviewUpdate, ReviewList
from auth import get_current_active_user
import logging

router = APIRouter(prefix="/reviews", tags=["Reviews"])

logger = logging.getLogger(__name__)


@router.post("/", response_model=ReviewResponse)
def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Create a new review"""
    try:
        # Check if order exists and belongs to current user
        order_query = "SELECT * FROM orders WHERE id = %s AND user_id = %s"
        order = db.execute_query(order_query, (review_data.order_id, current_user['id']))
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        order_data = order[0]
        
        # Check if order is delivered
        if order_data['status'] != 'delivered':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only review delivered orders"
            )
        
        # Check if review already exists
        existing_review_query = "SELECT * FROM reviews WHERE order_id = %s"
        existing_review = db.execute_query(existing_review_query, (review_data.order_id,))
        
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Review already exists for this order"
            )
        
        # Create review
        insert_query = """
            INSERT INTO reviews (order_id, user_id, vendor_id, meal_id, rating, comment, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        review_id = db.execute_insert(insert_query, (
            review_data.order_id,
            current_user['id'],
            order_data['vendor_id'],
            order_data['meal_id'],
            review_data.rating,
            review_data.comment
        ))
        
        # Get the created review
        review_query = """
            SELECT r.*, u.name as user_name, u.email as user_email
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = %s
        """
        review = db.execute_query(review_query, (review_id,))
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create review"
            )
        
        review_data_db = review[0]
        
        return ReviewResponse(
            id=review_data_db['id'],
            order_id=review_data_db['order_id'],
            user_id=review_data_db['user_id'],
            vendor_id=review_data_db['vendor_id'],
            meal_id=review_data_db['meal_id'],
            rating=review_data_db['rating'],
            comment=review_data_db['comment'],
            created_at=review_data_db['created_at'],
            user={
                'id': review_data_db['user_id'],
                'name': review_data_db['user_name'],
                'email': review_data_db['user_email']
            }
        )
        
    except Exception as e:
        logger.error(f"Database error in create_review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/", response_model=ReviewList)
def get_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    vendor_id: Optional[int] = Query(None),
    meal_id: Optional[int] = Query(None),
    db=Depends(get_db)
):
    """Get list of reviews with optional filtering"""
    try:
        # Build query based on filters
        where_conditions = []
        params = []
        
        if vendor_id:
            where_conditions.append("r.vendor_id = %s")
            params.append(vendor_id)
        
        if meal_id:
            where_conditions.append("r.meal_id = %s")
            params.append(meal_id)
        
        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        # Get total count
        count_query = f"""
            SELECT COUNT(*) as total
            FROM reviews r
            {where_clause}
        """
        total_result = db.execute_query(count_query, params)
        total = total_result[0]['total'] if total_result else 0
        
        # Get reviews with user info
        reviews_query = f"""
            SELECT r.*, u.name as user_name, u.email as user_email
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            {where_clause}
            ORDER BY r.created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, skip])
        reviews = db.execute_query(reviews_query, params)
        
        # Convert to response format
        review_responses = []
        for review in reviews:
            review_responses.append(ReviewResponse(
                id=review['id'],
                order_id=review['order_id'],
                user_id=review['user_id'],
                vendor_id=review['vendor_id'],
                meal_id=review['meal_id'],
                rating=review['rating'],
                comment=review['comment'],
                created_at=review['created_at'],
                user={
                    'id': review['user_id'],
                    'name': review['user_name'],
                    'email': review['user_email']
                }
            ))
        
        return ReviewList(reviews=review_responses, total=total)
        
    except Exception as e:
        logger.error(f"Database error in get_reviews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/{review_id}", response_model=ReviewResponse)
def get_review(review_id: int, db=Depends(get_db)):
    """Get review details"""
    try:
        review_query = """
            SELECT r.*, u.name as user_name, u.email as user_email
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = %s
        """
        review = db.execute_query(review_query, (review_id,))
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        review_data = review[0]
        
        return ReviewResponse(
            id=review_data['id'],
            order_id=review_data['order_id'],
            user_id=review_data['user_id'],
            vendor_id=review_data['vendor_id'],
            meal_id=review_data['meal_id'],
            rating=review_data['rating'],
            comment=review_data['comment'],
            created_at=review_data['created_at'],
            user={
                'id': review_data['user_id'],
                'name': review_data['user_name'],
                'email': review_data['user_email']
            }
        )
        
    except Exception as e:
        logger.error(f"Database error in get_review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.put("/{review_id}", response_model=ReviewResponse)
def update_review(
    review_id: int,
    review_data: ReviewUpdate,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Update review (owner only)"""
    try:
        # Check if review exists and belongs to current user
        review_query = "SELECT * FROM reviews WHERE id = %s AND user_id = %s"
        review = db.execute_query(review_query, (review_id, current_user['id']))
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        # Update review
        update_query = """
            UPDATE reviews 
            SET rating = %s, comment = %s, updated_at = NOW()
            WHERE id = %s
        """
        db.execute_update(update_query, (
            review_data.rating,
            review_data.comment,
            review_id
        ))
        
        # Get updated review
        updated_review_query = """
            SELECT r.*, u.name as user_name, u.email as user_email
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = %s
        """
        updated_review = db.execute_query(updated_review_query, (review_id,))
        
        if not updated_review:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update review"
            )
        
        review_data_updated = updated_review[0]
        
        return ReviewResponse(
            id=review_data_updated['id'],
            order_id=review_data_updated['order_id'],
            user_id=review_data_updated['user_id'],
            vendor_id=review_data_updated['vendor_id'],
            meal_id=review_data_updated['meal_id'],
            rating=review_data_updated['rating'],
            comment=review_data_updated['comment'],
            created_at=review_data_updated['created_at'],
            user={
                'id': review_data_updated['user_id'],
                'name': review_data_updated['user_name'],
                'email': review_data_updated['user_email']
            }
        )
        
    except Exception as e:
        logger.error(f"Database error in update_review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Delete review (owner or admin only)"""
    try:
        # Check if review exists
        review_query = "SELECT * FROM reviews WHERE id = %s"
        review = db.execute_query(review_query, (review_id,))
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        review_data = review[0]
        
        # Check if user can delete this review
        if review_data['user_id'] != current_user['id'] and current_user['role'] != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this review"
            )
        
        # Delete review
        delete_query = "DELETE FROM reviews WHERE id = %s"
        db.execute_delete(delete_query, (review_id,))
        
        return {"message": "Review deleted successfully"}
        
    except Exception as e:
        logger.error(f"Database error in delete_review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/vendor/{vendor_id}/stats")
def get_vendor_review_stats(vendor_id: int, db=Depends(get_db)):
    """Get vendor review statistics"""
    try:
        # Get average rating
        avg_rating_query = """
            SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews
            FROM reviews
            WHERE vendor_id = %s
        """
        stats = db.execute_query(avg_rating_query, (vendor_id,))
        
        if not stats or not stats[0]['total_reviews']:
            return {
                "vendor_id": vendor_id,
                "average_rating": 0,
                "total_reviews": 0,
                "rating_distribution": {}
            }
        
        stats_data = stats[0]
        
        # Get rating distribution
        distribution_query = """
            SELECT rating, COUNT(*) as count
            FROM reviews
            WHERE vendor_id = %s
            GROUP BY rating
            ORDER BY rating DESC
        """
        distribution = db.execute_query(distribution_query, (vendor_id,))
        
        rating_distribution = {}
        for item in distribution:
            rating_distribution[str(item['rating'])] = item['count']
        
        return {
            "vendor_id": vendor_id,
            "average_rating": float(stats_data['average_rating']),
            "total_reviews": stats_data['total_reviews'],
            "rating_distribution": rating_distribution
        }
        
    except Exception as e:
        logger.error(f"Database error in get_vendor_review_stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

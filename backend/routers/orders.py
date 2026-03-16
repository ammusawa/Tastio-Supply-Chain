from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from database import get_db
from schemas import OrderCreate, OrderResponse, OrderUpdate, OrderList, OrderStatus, PaymentStatus
from auth import get_current_active_user, require_customer, require_vendor, get_current_vendor
import logging

router = APIRouter(prefix="/orders", tags=["Orders"])

logger = logging.getLogger(__name__)


@router.post("/", response_model=OrderResponse)
def create_order(
    order_data: OrderCreate,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Create a new order"""
    try:
        # Check if user is a customer
        if current_user['role'] != 'customer':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only customers can create orders"
            )
        
        # Check if meal exists and is available
        meal_query = "SELECT * FROM meals WHERE id = %s AND availability = %s"
        meal = db.execute_query(meal_query, (order_data.meal_id, True))
        
        if not meal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Meal not found or not available"
            )
        
        meal_data = meal[0]
        
        # Calculate total amount
        total_amount = meal_data['price'] * order_data.quantity
        
        # Create order
        insert_query = """
            INSERT INTO orders (user_id, meal_id, vendor_id, quantity, total_amount, 
                               delivery_address, special_instructions, status, payment_status, 
                               payment_method, payment_proof_url, transaction_reference, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """
        order_id = db.execute_insert(insert_query, (
            current_user['id'],
            order_data.meal_id,
            meal_data['vendor_id'],
            order_data.quantity,
            total_amount,
            order_data.delivery_address,
            order_data.special_instructions,
            'pending',
            'pending',
            order_data.payment_method.value,
            order_data.payment_proof_url,
            order_data.transaction_reference
        ))
        
        # Get the created order with details
        order_query = """
            SELECT o.*, m.name as meal_name, m.price as meal_price, m.image_url as meal_image,
                   v.address as vendor_address, v.user_id as vendor_user_id,
                   u.name as vendor_name, u.email as vendor_email,
                   cu.name as customer_name, cu.email as customer_email, cu.phone as customer_phone
            FROM orders o
            JOIN meals m ON o.meal_id = m.id
            JOIN vendors v ON o.vendor_id = v.id
            JOIN users u ON v.user_id = u.id
            JOIN users cu ON o.user_id = cu.id
            WHERE o.id = %s
        """
        order = db.execute_query(order_query, (order_id,))
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create order"
            )
        
        order_data_db = order[0]
        
        # Create notification for the vendor about the new order
        notification_query = """
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (%s, %s, %s, %s, FALSE)
        """
        db.execute_update(notification_query, (
            order_data_db['vendor_user_id'],  # Use the vendor's user_id
            "New Order Received! 📦",
            f"New order #{order_data_db['id']} from {order_data_db['customer_name']} for {order_data_db['meal_name']}",
            "order_update"
        ))
        
        return OrderResponse(
            id=order_data_db['id'],
            user_id=order_data_db['user_id'],
            meal_id=order_data_db['meal_id'],
            vendor_id=order_data_db['vendor_id'],
            quantity=order_data_db['quantity'],
            total_amount=order_data_db['total_amount'],
            delivery_address=order_data_db['delivery_address'],
            special_instructions=order_data_db.get('special_instructions'),
            status=order_data_db['status'],
            payment_status=order_data_db['payment_status'],
            payment_method=order_data_db['payment_method'],
            estimated_ready_time=order_data_db.get('estimated_ready_time'),
            notes=order_data_db.get('notes'),
            created_at=order_data_db['created_at'],
            updated_at=order_data_db.get('updated_at'),
            meal={
                'id': order_data_db['meal_id'],
                'name': order_data_db['meal_name'],
                'price': order_data_db['meal_price'],
                'image_url': order_data_db.get('meal_image')
            },
            vendor={
                'id': order_data_db['vendor_id'],
                'name': order_data_db['vendor_name'],
                'address': order_data_db['vendor_address'],
                'email': order_data_db['vendor_email']
            },
            customer={
                'id': order_data_db['user_id'],
                'name': order_data_db['customer_name'],
                'email': order_data_db['customer_email'],
                'phone': order_data_db['customer_phone']
            }
        )
        
    except Exception as e:
        logger.error(f"Database error in create_order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/", response_model=OrderList)
def get_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    order_status: Optional[OrderStatus] = Query(None),
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get orders based on user role"""
    try:
        base_query = """
            SELECT o.*, m.name as meal_name, m.price as meal_price, m.image_url as meal_image,
                   v.address as vendor_address, u.name as vendor_name, u.email as vendor_email,
                   cu.name as customer_name, cu.email as customer_email, cu.phone as customer_phone
            FROM orders o
            JOIN meals m ON o.meal_id = m.id
            JOIN vendors v ON o.vendor_id = v.id
            JOIN users u ON v.user_id = u.id
            JOIN users cu ON o.user_id = cu.id
        """
        
        where_conditions = []
        params = []
        
        # Filter by user role
        if current_user['role'] == 'customer':
            where_conditions.append("o.user_id = %s")
            params.append(current_user['id'])
        elif current_user['role'] == 'vendor':
            # Get vendor ID for the current user
            vendor_query = "SELECT id FROM vendors WHERE user_id = %s"
            vendor_result = db.execute_query(vendor_query, (current_user['id'],))
            if not vendor_result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vendor profile not found"
                )
            vendor_id = vendor_result[0]['id']
            where_conditions.append("o.vendor_id = %s")
            params.append(vendor_id)
        
        # Filter by status if provided
        if order_status:
            where_conditions.append("o.status = %s")
            params.append(order_status.value)
        
        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)
        
        # Get total count first (without LIMIT and OFFSET)
        count_query = """
            SELECT COUNT(*) as total FROM orders o
        """
        if where_conditions:
            count_query += " WHERE " + " AND ".join(where_conditions)
            count_params = params
        else:
            count_params = []
        
        total_result = db.execute_query(count_query, tuple(count_params))
        total = total_result[0]['total'] if total_result else 0
        
        # Add ordering and pagination for main query
        base_query += " ORDER BY o.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, skip])
        
        orders = db.execute_query(base_query, tuple(params))
        
        order_responses = []
        for order_data in orders:
            order_responses.append(OrderResponse(
                id=order_data['id'],
                user_id=order_data['user_id'],
                meal_id=order_data['meal_id'],
                vendor_id=order_data['vendor_id'],
                quantity=order_data['quantity'],
                total_amount=order_data['total_amount'],
                delivery_address=order_data['delivery_address'],
                special_instructions=order_data.get('special_instructions'),
                status=order_data['status'],
                payment_status=order_data['payment_status'],
                payment_method=order_data['payment_method'],
                estimated_ready_time=order_data.get('estimated_ready_time'),
                notes=order_data.get('notes'),
                created_at=order_data['created_at'],
                updated_at=order_data.get('updated_at'),
                meal={
                    'id': order_data['meal_id'],
                    'name': order_data['meal_name'],
                    'price': order_data['meal_price'],
                    'image_url': order_data.get('meal_image')
                },
                vendor={
                    'id': order_data['vendor_id'],
                    'name': order_data['vendor_name'],
                    'address': order_data['vendor_address'],
                    'email': order_data['vendor_email']
                },
                customer={
                    'id': order_data['user_id'],
                    'name': order_data['customer_name'],
                    'email': order_data['customer_email'],
                    'phone': order_data['customer_phone']
                }
            ))
        
        return OrderList(orders=order_responses, total=total)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error in get_orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get a specific order"""
    try:
        order_query = """
            SELECT o.*, m.name as meal_name, m.price as meal_price, m.image_url as meal_image,
                   v.address as vendor_address, u.name as vendor_name, u.email as vendor_email,
                   cu.name as customer_name, cu.email as customer_email, cu.phone as customer_phone
            FROM orders o
            JOIN meals m ON o.meal_id = m.id
            JOIN vendors v ON o.vendor_id = v.id
            JOIN users u ON v.user_id = u.id
            JOIN users cu ON o.user_id = cu.id
            WHERE o.id = %s
        """
        order = db.execute_query(order_query, (order_id,))
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        order_data = order[0]
        
        # Check if user can access this order
        if current_user['role'] == 'customer' and order_data['user_id'] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this order"
            )
        
        if current_user['role'] == 'vendor':
            # Get vendor ID for the current user
            vendor_query = "SELECT id FROM vendors WHERE user_id = %s"
            vendor_result = db.execute_query(vendor_query, (current_user['id'],))
            if not vendor_result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vendor profile not found"
                )
            vendor_id = vendor_result[0]['id']
            if order_data['vendor_id'] != vendor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to access this order"
                )
        
        return OrderResponse(
            id=order_data['id'],
            user_id=order_data['user_id'],
            meal_id=order_data['meal_id'],
            vendor_id=order_data['vendor_id'],
            quantity=order_data['quantity'],
            total_amount=order_data['total_amount'],
            delivery_address=order_data['delivery_address'],
            special_instructions=order_data.get('special_instructions'),
            status=order_data['status'],
            payment_status=order_data['payment_status'],
            payment_method=order_data['payment_method'],
            estimated_ready_time=order_data.get('estimated_ready_time'),
            notes=order_data.get('notes'),
            created_at=order_data['created_at'],
            updated_at=order_data.get('updated_at'),
            meal={
                'id': order_data['meal_id'],
                'name': order_data['meal_name'],
                'price': order_data['meal_price'],
                'image_url': order_data.get('meal_image')
            },
            vendor={
                'id': order_data['vendor_id'],
                'name': order_data['vendor_name'],
                'address': order_data['vendor_address'],
                'email': order_data['vendor_email']
            },
            customer={
                'id': order_data['user_id'],
                'name': order_data['customer_name'],
                'email': order_data['customer_email'],
                'phone': order_data['customer_phone']
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error in get_order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.put("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    status_update: OrderUpdate,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Update order status (vendor or admin only)"""
    try:
        # Check if order exists
        order_query = "SELECT * FROM orders WHERE id = %s"
        order = db.execute_query(order_query, (order_id,))
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        order_data = order[0]
        
        # Check if user can update this order
        if current_user['role'] == 'customer' and order_data['user_id'] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this order"
            )
        
        if current_user['role'] == 'vendor':
            # Get vendor ID for the current user
            vendor_query = "SELECT id FROM vendors WHERE user_id = %s"
            vendor_result = db.execute_query(vendor_query, (current_user['id'],))
            if not vendor_result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vendor profile not found"
                )
            vendor_id = vendor_result[0]['id']
            if order_data['vendor_id'] != vendor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to update this order"
                )
        
            # Validate status transitions for vendors
            valid_transitions = {
                'pending': ['accepted', 'rejected'],
                'accepted': ['preparing'],
                'preparing': ['ready'],
                'ready': ['out_for_delivery', 'delivered'],
                'out_for_delivery': ['delivered']
            }
            
            current_status = order_data['status']
            new_status = status_update.status.value if status_update.status else current_status
            
            if current_status in valid_transitions and new_status not in valid_transitions[current_status]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status transition from {current_status} to {new_status}"
                )
        
        # Update order
        update_fields = []
        update_values = []
        
        if status_update.status:
            update_fields.append("status = %s")
            update_values.append(status_update.status.value)
        
        if status_update.payment_status:
            update_fields.append("payment_status = %s")
            update_values.append(status_update.payment_status.value)
        
        if status_update.estimated_ready_time:
            update_fields.append("estimated_ready_time = %s")
            update_values.append(status_update.estimated_ready_time)
        
        if status_update.notes:
            update_fields.append("notes = %s")
            update_values.append(status_update.notes)
        
        if update_fields:
            update_fields.append("updated_at = NOW()")
            update_values.append(order_id)
            
            update_query = f"UPDATE orders SET {', '.join(update_fields)} WHERE id = %s"
            db.execute_update(update_query, tuple(update_values))
        
        # Get updated order
        updated_order_query = """
            SELECT o.*, m.name as meal_name, m.price as meal_price, m.image_url as meal_image,
                   v.address as vendor_address, u.name as vendor_name, u.email as vendor_email,
                   cu.name as customer_name, cu.email as customer_email, cu.phone as customer_phone
            FROM orders o
            JOIN meals m ON o.meal_id = m.id
            JOIN vendors v ON o.vendor_id = v.id
            JOIN users u ON v.user_id = u.id
            JOIN users cu ON o.user_id = cu.id
            WHERE o.id = %s
        """
        updated_order = db.execute_query(updated_order_query, (order_id,))
        
        if not updated_order:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update order"
            )
        
        order_data_updated = updated_order[0]
        
        return OrderResponse(
            id=order_data_updated['id'],
            user_id=order_data_updated['user_id'],
            meal_id=order_data_updated['meal_id'],
            vendor_id=order_data_updated['vendor_id'],
            quantity=order_data_updated['quantity'],
            total_amount=order_data_updated['total_amount'],
            delivery_address=order_data_updated['delivery_address'],
            special_instructions=order_data_updated.get('special_instructions'),
            status=order_data_updated['status'],
            payment_status=order_data_updated['payment_status'],
            payment_method=order_data_updated['payment_method'],
            estimated_ready_time=order_data_updated.get('estimated_ready_time'),
            notes=order_data_updated.get('notes'),
            created_at=order_data_updated['created_at'],
            updated_at=order_data_updated.get('updated_at'),
            meal={
                'id': order_data_updated['meal_id'],
                'name': order_data_updated['meal_name'],
                'price': order_data_updated['meal_price'],
                'image_url': order_data_updated.get('meal_image')
            },
            vendor={
                'id': order_data_updated['vendor_id'],
                'name': order_data_updated['vendor_name'],
                'address': order_data_updated['vendor_address'],
                'email': order_data_updated['vendor_email']
            },
            customer={
                'id': order_data_updated['user_id'],
                'name': order_data_updated['customer_name'],
                'email': order_data_updated['customer_email'],
                'phone': order_data_updated['customer_phone']
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error in update_order_status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


# Vendor-specific order management endpoints
@router.get("/vendor/pending", response_model=OrderList)
def get_pending_orders(
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get pending orders for vendor"""
    try:
        # Check if user is a vendor
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can access pending orders"
            )
        
        # Get vendor ID for the current user
        vendor_query = "SELECT id FROM vendors WHERE user_id = %s"
        vendor_result = db.execute_query(vendor_query, (current_user['id'],))
        if not vendor_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor profile not found"
            )
        vendor_id = vendor_result[0]['id']
        
        query = """
            SELECT o.*, m.name as meal_name, m.price as meal_price, m.image_url as meal_image,
                   v.address as vendor_address, u.name as vendor_name, u.email as vendor_email,
                   cu.name as customer_name, cu.email as customer_email, cu.phone as customer_phone
            FROM orders o
            JOIN meals m ON o.meal_id = m.id
            JOIN vendors v ON o.vendor_id = v.id
            JOIN users u ON v.user_id = u.id
            JOIN users cu ON o.user_id = cu.id
            WHERE o.vendor_id = %s AND o.status = 'pending'
            ORDER BY o.created_at ASC
        """
        orders = db.execute_query(query, (vendor_id,))
        
        order_responses = []
        for order_data in orders:
            order_responses.append(OrderResponse(
                id=order_data['id'],
                user_id=order_data['user_id'],
                meal_id=order_data['meal_id'],
                vendor_id=order_data['vendor_id'],
                quantity=order_data['quantity'],
                total_amount=order_data['total_amount'],
                delivery_address=order_data['delivery_address'],
                special_instructions=order_data.get('special_instructions'),
                status=order_data['status'],
                payment_status=order_data['payment_status'],
                payment_method=order_data['payment_method'],
                estimated_ready_time=order_data.get('estimated_ready_time'),
                notes=order_data.get('notes'),
                created_at=order_data['created_at'],
                updated_at=order_data.get('updated_at'),
                meal={
                    'id': order_data['meal_id'],
                    'name': order_data['meal_name'],
                    'price': order_data['meal_price'],
                    'image_url': order_data.get('meal_image')
                },
                vendor={
                    'id': order_data['vendor_id'],
                    'name': order_data['vendor_name'],
                    'address': order_data['vendor_address'],
                    'email': order_data['vendor_email']
                },
                customer={
                    'id': order_data['user_id'],
                    'name': order_data['customer_name'],
                    'email': order_data['customer_email'],
                    'phone': order_data['customer_phone']
                }
            ))
        
        return OrderList(orders=order_responses, total=len(order_responses))
        
    except Exception as e:
        logger.error(f"Database error in get_pending_orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.post("/{order_id}/accept")
def accept_order(
    order_id: int,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Accept an order (vendor only)"""
    try:
        # Check if user is a vendor
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can accept orders"
            )
        
        # Get vendor ID for the current user
        vendor_query = "SELECT id FROM vendors WHERE user_id = %s"
        vendor_result = db.execute_query(vendor_query, (current_user['id'],))
        if not vendor_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor profile not found"
            )
        vendor_id = vendor_result[0]['id']
        
        # Check if order exists and is pending
        order_query = "SELECT * FROM orders WHERE id = %s AND vendor_id = %s AND status = 'pending'"
        order = db.execute_query(order_query, (order_id, vendor_id))
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found or not available for acceptance"
            )
        
        # Update order status to accepted
        update_query = "UPDATE orders SET status = 'accepted', updated_at = NOW() WHERE id = %s"
        db.execute_update(update_query, (order_id,))
        
        return {"message": "Order accepted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error in accept_order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.post("/{order_id}/reject")
def reject_order(
    order_id: int,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Reject an order (vendor only)"""
    try:
        # Check if user is a vendor
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can reject orders"
            )
        
        # Get vendor ID for the current user
        vendor_query = "SELECT id FROM vendors WHERE user_id = %s"
        vendor_result = db.execute_query(vendor_query, (current_user['id'],))
        if not vendor_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor profile not found"
            )
        vendor_id = vendor_result[0]['id']
        
        # Check if order exists and is pending
        order_query = "SELECT * FROM orders WHERE id = %s AND vendor_id = %s AND status = 'pending'"
        order = db.execute_query(order_query, (order_id, vendor_id))
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found or not available for rejection"
            )
        
        # Update order status to rejected
        update_query = "UPDATE orders SET status = 'rejected', updated_at = NOW() WHERE id = %s"
        db.execute_update(update_query, (order_id,))
        
        return {"message": "Order rejected successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error in reject_order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.delete("/{order_id}")
def cancel_order(
    order_id: int,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Cancel order (customer only)"""
    try:
        if current_user['role'] != 'customer':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only customers can cancel orders"
            )
        
        # Check if order exists and belongs to customer
        order_query = "SELECT * FROM orders WHERE id = %s AND user_id = %s"
        order = db.execute_query(order_query, (order_id, current_user['id']))
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        order_data = order[0]
        
        # Check if order can be cancelled (only pending or accepted orders)
        if order_data['status'] not in ['pending', 'accepted']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order cannot be cancelled at this stage"
            )
        
        # Update order status to cancelled
        update_query = "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = %s"
        db.execute_update(update_query, (order_id,))
        
        return {"message": "Order cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error in cancel_order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.post("/{order_id}/confirm-payment", response_model=dict)
def confirm_payment(
    order_id: int,
    confirmation_data: dict,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Vendor confirms or rejects payment for an order"""
    try:
        # Check if user is a vendor
        if current_user['role'] != 'vendor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only vendors can confirm payments"
            )
        
        # Get vendor ID for the current user
        vendor_query = "SELECT id FROM vendors WHERE user_id = %s"
        vendor_result = db.execute_query(vendor_query, (current_user['id'],))
        if not vendor_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor profile not found"
            )
        vendor_id = vendor_result[0]['id']
        
        # Get order details
        order_query = """
            SELECT o.*, cu.name as customer_name, cu.email as customer_email,
                   m.name as meal_name, v.user_id as vendor_user_id
            FROM orders o
            JOIN users cu ON o.user_id = cu.id
            JOIN meals m ON o.meal_id = m.id
            JOIN vendors v ON o.vendor_id = v.id
            WHERE o.id = %s AND o.vendor_id = %s
        """
        order_result = db.execute_query(order_query, (order_id, vendor_id))
        
        if not order_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found or not authorized"
            )
        
        order = order_result[0]
        
        # Check if payment is already confirmed
        if order['payment_confirmed_by_vendor']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment already confirmed for this order"
            )
        
        # Update order payment status
        is_confirmed = confirmation_data.get('confirmed', False)
        payment_notes = confirmation_data.get('notes', '')
        
        update_query = """
            UPDATE orders 
            SET payment_confirmed_by_vendor = %s,
                payment_confirmed_at = NOW(),
                payment_notes = %s,
                payment_status = %s
            WHERE id = %s
        """
        
        new_payment_status = 'paid' if is_confirmed else 'failed'
        
        db.execute_update(update_query, (
            is_confirmed,
            payment_notes,
            new_payment_status,
            order_id
        ))
        
        # Create payment confirmation record
        confirmation_type = 'payment_received' if is_confirmed else 'payment_rejected'
        confirmation_message = confirmation_data.get('message', 
            f"Payment {'confirmed' if is_confirmed else 'rejected'} for order #{order_id}")
        
        confirmation_query = """
            INSERT INTO payment_confirmations 
            (order_id, vendor_id, customer_id, confirmation_type, message, transaction_reference)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        db.execute_update(confirmation_query, (
            order_id,
            vendor_id,
            order['user_id'],
            confirmation_type,
            confirmation_message,
            order.get('transaction_reference')
        ))
        
        # Create notification for customer
        notification_title = "Payment Confirmed! ✅" if is_confirmed else "Payment Issue ⚠️"
        notification_message = (
            f"Your payment for order #{order_id} ({order['meal_name']}) has been confirmed by {current_user['name']}"
            if is_confirmed else
            f"Payment issue with order #{order_id} ({order['meal_name']}). Please contact {current_user['name']}"
        )
        
        notification_query = """
            INSERT INTO notifications (user_id, title, message, type, is_read)
            VALUES (%s, %s, %s, %s, FALSE)
        """
        
        db.execute_update(notification_query, (
            order['user_id'],
            notification_title,
            notification_message,
            "payment"
        ))
        
        # Create notification for vendor
        vendor_notification_title = "Payment Action Completed" if is_confirmed else "Payment Rejected"
        vendor_notification_message = (
            f"You confirmed payment for order #{order_id} from {order['customer_name']}"
            if is_confirmed else
            f"You rejected payment for order #{order_id} from {order['customer_name']}"
        )
        
        db.execute_update(notification_query, (
            current_user['id'],
            vendor_notification_title,
            vendor_notification_message,
            "payment"
        ))
        
        return {
            "message": f"Payment {'confirmed' if is_confirmed else 'rejected'} successfully",
            "order_id": order_id,
            "payment_status": new_payment_status,
            "confirmed": is_confirmed
        }
        
    except Exception as e:
        logger.error(f"Database error in confirm_payment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )


@router.get("/{order_id}/payment-details", response_model=dict)
def get_payment_details(
    order_id: int,
    current_user: dict = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get payment details for an order"""
    try:
        # Get order with payment details
        order_query = """
            SELECT o.*, cu.name as customer_name, cu.email as customer_email,
                   vu.name as vendor_name, v.user_id as vendor_user_id,
                   m.name as meal_name
            FROM orders o
            JOIN users cu ON o.user_id = cu.id
            JOIN vendors v ON o.vendor_id = v.id
            JOIN users vu ON v.user_id = vu.id
            JOIN meals m ON o.meal_id = m.id
            WHERE o.id = %s
        """
        order_result = db.execute_query(order_query, (order_id,))
        
        if not order_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        order = order_result[0]
        
        # Check authorization
        if current_user['role'] == 'customer' and order['user_id'] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this order"
            )
        elif current_user['role'] == 'vendor' and order['vendor_user_id'] != current_user['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this order"
            )
        
        # Get payment confirmations
        confirmations_query = """
            SELECT * FROM payment_confirmations 
            WHERE order_id = %s 
            ORDER BY created_at DESC
        """
        confirmations = db.execute_query(confirmations_query, (order_id,))
        
        return {
            "order_id": order['id'],
            "payment_method": order['payment_method'],
            "payment_status": order['payment_status'],
            "payment_confirmed_by_vendor": order['payment_confirmed_by_vendor'],
            "payment_confirmed_at": order['payment_confirmed_at'],
            "payment_notes": order['payment_notes'],
            "transaction_reference": order['transaction_reference'],
            "payment_proof_url": order['payment_proof_url'],
            "total_amount": order['total_amount'],
            "customer_name": order['customer_name'],
            "vendor_name": order['vendor_name'],
            "meal_name": order['meal_name'],
            "confirmations": confirmations
        }
        
    except Exception as e:
        logger.error(f"Database error in get_payment_details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

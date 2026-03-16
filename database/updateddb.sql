-- =====================================================
-- TASTIO APP - COMPLETE DATABASE SCHEMA
-- Homemade Food Ordering App for Kano
-- Updated Database Schema with All Features
-- =====================================================

-- Create database
CREATE DATABASE IF NOT EXISTS tastio_app;
USE tastio_app;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'vendor', 'admin') DEFAULT 'customer' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_role (role)
);

-- =====================================================
-- VENDORS TABLE
-- =====================================================
CREATE TABLE vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    profile_picture VARCHAR(255),
    description TEXT,
    address VARCHAR(255) NOT NULL,
    approved_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_approved (approved_status)
);

-- =====================================================
-- MEALS TABLE
-- =====================================================
CREATE TABLE meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    availability BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    INDEX idx_vendor (vendor_id),
    INDEX idx_availability (availability),
    INDEX idx_price (price)
);

-- =====================================================
-- ORDERS TABLE (Enhanced with Payment and Status Management)
-- =====================================================
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    meal_id INT NOT NULL,
    vendor_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'rejected') DEFAULT 'pending' NOT NULL,
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' NOT NULL,
    payment_method ENUM('cash_on_delivery', 'bank_transfer', 'card_payment', 'mobile_money') DEFAULT 'cash_on_delivery' NOT NULL,
    delivery_address VARCHAR(255),
    special_instructions TEXT,
    estimated_ready_time TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_vendor (vendor_id),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- REVIEWS TABLE
-- =====================================================
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNIQUE NOT NULL,
    user_id INT NOT NULL,
    vendor_id INT NOT NULL,
    meal_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_vendor (vendor_id),
    INDEX idx_rating (rating)
);

-- =====================================================
-- MESSAGES TABLE (For complaints, suggestions, and communication)
-- =====================================================
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    sender_type ENUM('customer', 'vendor', 'admin') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('complaint', 'suggestion', 'inquiry', 'reply') NOT NULL,
    target_user_id INT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    parent_message_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Indexes for better performance
    INDEX idx_sender_id (sender_id),
    INDEX idx_target_user_id (target_user_id),
    INDEX idx_message_type (message_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_parent_message_id (parent_message_id)
);

-- =====================================================
-- NOTIFICATIONS TABLE (For system notifications)
-- =====================================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('order_update', 'payment', 'system', 'promotion') DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert default admin user (password: admin123)
INSERT INTO users (name, email, phone, password_hash, role) VALUES 
('Admin', 'admin@tastio.com', '+2348000000000', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2O', 'admin');

-- Insert sample users (password: password123 for all)
INSERT INTO users (name, email, phone, password_hash, role) VALUES 
('John Doe', 'john@example.com', '+2348012345678', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2O', 'customer'),
('Mama Aisha', 'mamaaisha@example.com', '+2348012345679', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2O', 'vendor'),
('Chef Bello', 'chefbello@example.com', '+2348012345680', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2O', 'vendor'),
('Fatima Hassan', 'fatima@example.com', '+2348012345681', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2O', 'customer'),
('Chef1', 'chef1@tastio.com', '+2348012345682', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2O', 'vendor');

-- Insert sample vendors
INSERT INTO vendors (user_id, description, address, approved_status) VALUES 
(3, 'Traditional Nigerian home cooking with a modern twist. Specializing in Jollof Rice, Suya, and Egusi Soup.', 'Nasarawa GRA, Kano', TRUE),
(4, 'Authentic Hausa cuisine prepared with love and care. Fresh ingredients, traditional recipes.', 'Unguwar Rimi, Kano', TRUE),
(6, 'Professional chef with over 10 years of experience. Specializing in continental and local dishes.', 'Sabon Gari, Kano', TRUE);

-- Insert sample meals
INSERT INTO meals (vendor_id, name, description, price, availability) VALUES 
(1, 'Jollof Rice', 'Spicy rice cooked with tomatoes, peppers, and aromatic spices. A Nigerian classic that brings the authentic taste of West Africa to your plate.', 1500.00, TRUE),
(1, 'Suya', 'Grilled meat skewers seasoned with groundnut powder and spices. Served with onions and tomatoes.', 800.00, TRUE),
(1, 'Egusi Soup', 'Ground melon seed soup with spinach and meat. Served with pounded yam or eba.', 1200.00, TRUE),
(2, 'Tuwo Shinkafa', 'Rice pudding served with various soups. A traditional Hausa delicacy.', 1000.00, TRUE),
(2, 'Masa', 'Rice cakes served with honey or sugar. Perfect for breakfast or dessert.', 500.00, TRUE),
(2, 'Dambu Nama', 'Shredded beef jerky with spices. A popular Hausa snack.', 700.00, TRUE),
(3, 'Chicken Biryani', 'Aromatic rice dish with tender chicken, spices, and herbs. Served with raita and salad.', 2000.00, TRUE),
(3, 'Beef Steak', 'Grilled beef steak with mashed potatoes and vegetables. Premium quality meat.', 2500.00, TRUE),
(3, 'Fish Curry', 'Fresh fish cooked in rich curry sauce with rice. Healthy and delicious.', 1800.00, TRUE);

-- Insert sample orders
INSERT INTO orders (user_id, meal_id, vendor_id, quantity, total_amount, delivery_address, status, payment_status, payment_method) VALUES 
(2, 1, 1, 2, 3000.00, '123 Main Street, Kano', 'delivered', 'paid', 'cash_on_delivery'),
(2, 3, 1, 1, 1200.00, '123 Main Street, Kano', 'delivered', 'paid', 'cash_on_delivery'),
(5, 4, 2, 1, 1000.00, '456 Park Avenue, Kano', 'pending', 'pending', 'cash_on_delivery'),
(5, 6, 2, 2, 1400.00, '456 Park Avenue, Kano', 'accepted', 'pending', 'cash_on_delivery'),
(2, 7, 3, 1, 2000.00, '123 Main Street, Kano', 'preparing', 'pending', 'cash_on_delivery'),
(5, 8, 3, 1, 2500.00, '456 Park Avenue, Kano', 'ready', 'paid', 'bank_transfer');

-- Insert sample reviews
INSERT INTO reviews (order_id, user_id, vendor_id, meal_id, rating, comment) VALUES 
(1, 2, 1, 1, 5, 'Amazing Jollof Rice! The best I have ever tasted. Will definitely order again.'),
(2, 2, 1, 3, 4, 'Great Egusi soup, very authentic taste. The pounded yam was perfect.'),
(5, 2, 3, 7, 5, 'Excellent Chicken Biryani! The spices were perfectly balanced and the chicken was tender.');

-- Insert sample messages
INSERT INTO messages (sender_id, sender_type, subject, content, message_type, target_user_id, status) VALUES
(2, 'customer', 'Complaint about late delivery', 'My order was delivered 2 hours late and the food was cold. This is unacceptable service.', 'complaint', 3, 'open'),
(3, 'vendor', 'Suggestion for app improvement', 'It would be great if we could set custom delivery times for different areas. This would help us manage orders better.', 'suggestion', NULL, 'open'),
(2, 'customer', 'General inquiry about payment', 'I want to know if you accept mobile money payments like M-Pesa or Airtel Money.', 'inquiry', NULL, 'open'),
(3, 'vendor', 'Complaint about customer behavior', 'A customer was very rude and refused to pay the correct amount. Need admin intervention.', 'complaint', 2, 'open'),
(5, 'customer', 'Appreciation message', 'Thank you for the excellent service! The food was delicious and delivered on time.', 'suggestion', 3, 'open'),
(6, 'vendor', 'Request for feature', 'Can we have a feature to set different prices for different delivery zones?', 'suggestion', NULL, 'open');

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
(2, 'Order Delivered', 'Your order #1 has been delivered successfully. Enjoy your meal!', 'order_update', FALSE),
(2, 'Payment Received', 'Payment of ₦3,000 for order #1 has been received.', 'payment', FALSE),
(3, 'New Order', 'You have received a new order #5 from John Doe.', 'order_update', FALSE),
(5, 'Order Status Update', 'Your order #3 is being prepared by the vendor.', 'order_update', FALSE),
(1, 'System Maintenance', 'Scheduled maintenance will occur tonight at 2 AM. Service may be temporarily unavailable.', 'system', FALSE);

-- =====================================================
-- ADDITIONAL INDEXES FOR BETTER PERFORMANCE
-- =====================================================
CREATE INDEX idx_orders_meal_vendor ON orders(meal_id, vendor_id);
CREATE INDEX idx_meals_vendor_available ON meals(vendor_id, availability);
CREATE INDEX idx_vendors_user_approved ON vendors(user_id, approved_status);
CREATE INDEX idx_messages_sender_target ON messages(sender_id, target_user_id);
CREATE INDEX idx_notifications_user_type ON notifications(user_id, type);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for vendor statistics
CREATE VIEW vendor_stats AS
SELECT 
    v.id as vendor_id,
    u.name as vendor_name,
    COUNT(DISTINCT m.id) as total_meals,
    COUNT(DISTINCT o.id) as total_orders,
    AVG(r.rating) as average_rating,
    SUM(o.total_amount) as total_revenue
FROM vendors v
JOIN users u ON v.user_id = u.id
LEFT JOIN meals m ON v.id = m.vendor_id
LEFT JOIN orders o ON v.id = o.vendor_id
LEFT JOIN reviews r ON o.id = r.order_id
WHERE v.approved_status = TRUE
GROUP BY v.id, u.name;

-- View for order details with user and meal information
CREATE VIEW order_details AS
SELECT 
    o.id as order_id,
    o.status,
    o.payment_status,
    o.total_amount,
    o.created_at,
    u.name as customer_name,
    u.email as customer_email,
    m.name as meal_name,
    v.id as vendor_id,
    vend.name as vendor_name
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN meals m ON o.meal_id = m.id
JOIN vendors v ON o.vendor_id = v.id
JOIN users vend ON v.user_id = vend.id;

-- =====================================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- =====================================================

DELIMITER //

-- Procedure to update order status
CREATE PROCEDURE UpdateOrderStatus(
    IN order_id INT,
    IN new_status VARCHAR(50),
    IN new_payment_status VARCHAR(50)
)
BEGIN
    UPDATE orders 
    SET status = new_status, 
        payment_status = new_payment_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = order_id;
    
    -- Create notification for customer
    INSERT INTO notifications (user_id, title, message, type)
    SELECT 
        o.user_id,
        CONCAT('Order #', o.id, ' Status Updated'),
        CONCAT('Your order status has been updated to: ', new_status),
        'order_update'
    FROM orders o
    WHERE o.id = order_id;
END //

-- Procedure to calculate vendor earnings
CREATE PROCEDURE GetVendorEarnings(
    IN vendor_id INT,
    IN start_date DATE,
    IN end_date DATE
)
BEGIN
    SELECT 
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(r.rating) as average_rating
    FROM orders o
    LEFT JOIN reviews r ON o.id = r.order_id
    WHERE o.vendor_id = vendor_id
    AND DATE(o.created_at) BETWEEN start_date AND end_date
    AND o.status = 'delivered';
END //

DELIMITER ;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

DELIMITER //

-- Trigger to update vendor approval status notification
CREATE TRIGGER vendor_approval_notification
AFTER UPDATE ON vendors
FOR EACH ROW
BEGIN
    IF NEW.approved_status = TRUE AND OLD.approved_status = FALSE THEN
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (NEW.user_id, 'Vendor Account Approved', 'Congratulations! Your vendor account has been approved. You can now start accepting orders.', 'system');
    END IF;
END //

-- Trigger to create notification when order is placed
CREATE TRIGGER order_notification
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    -- Notify vendor about new order
    INSERT INTO notifications (user_id, title, message, type)
    SELECT 
        v.user_id,
        'New Order Received',
        CONCAT('You have received a new order #', NEW.id, ' for ', NEW.quantity, 'x ', m.name),
        'order_update'
    FROM vendors v
    JOIN meals m ON NEW.meal_id = m.id
    WHERE v.id = NEW.vendor_id;
END //

DELIMITER ;

-- =====================================================
-- FINAL COMMENTS AND NOTES
-- =====================================================

/*
DATABASE SETUP COMPLETE!

This database includes:
1. Complete user management system
2. Vendor management with approval system
3. Meal catalog with images and availability
4. Order management with status tracking
5. Payment system with multiple payment methods
6. Review and rating system
7. Messaging system for complaints and suggestions
8. Notification system
9. Performance indexes and views
10. Stored procedures for common operations
11. Triggers for automatic notifications

Sample data includes:
- 1 Admin user (admin@tastio.com / admin123)
- 2 Customer users (john@example.com, fatima@example.com / password123)
- 3 Vendor users (mamaaisha@example.com, chefbello@example.com, chef1@tastio.com / password123)
- 9 sample meals across 3 vendors
- 6 sample orders with various statuses
- 3 sample reviews
- 6 sample messages
- 5 sample notifications

To use this database:
1. Run this script to create the complete database
2. The backend will automatically connect to tastio_app database
3. All sample data is ready for testing
4. Users can log in with the provided credentials
*/

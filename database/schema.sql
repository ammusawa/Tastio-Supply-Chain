-- Tastio App Database Schema
-- Homemade Food Ordering App for Kano

-- Create database
CREATE DATABASE IF NOT EXISTS tastio_app;
USE tastio_app;

-- Users table
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

-- Vendors table
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

-- Meals table
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

-- Orders table
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

-- Reviews table
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

-- Insert default admin user
INSERT INTO users (name, email, phone, password_hash, role) VALUES 
('Admin', 'admin@tastio.com', '+2348000000000', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2O', 'admin');

-- Insert sample users
INSERT INTO users (name, email, phone, password_hash, role) VALUES 
('John Doe', 'john@example.com', '+2348012345678', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2O', 'customer'),
('Mama Aisha', 'mamaaisha@example.com', '+2348012345679', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2O', 'vendor'),
('Chef Bello', 'chefbello@example.com', '+2348012345680', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2O', 'vendor'),
('Fatima Hassan', 'fatima@example.com', '+2348012345681', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2O', 'customer');

-- Insert sample vendors
INSERT INTO vendors (user_id, description, address, approved_status) VALUES 
(3, 'Traditional Nigerian home cooking with a modern twist. Specializing in Jollof Rice, Suya, and Egusi Soup.', 'Nasarawa GRA, Kano', TRUE),
(4, 'Authentic Hausa cuisine prepared with love and care. Fresh ingredients, traditional recipes.', 'Unguwar Rimi, Kano', TRUE);

-- Insert sample meals
INSERT INTO meals (vendor_id, name, description, price, availability) VALUES 
(1, 'Jollof Rice', 'Spicy rice cooked with tomatoes, peppers, and aromatic spices. A Nigerian classic that brings the authentic taste of West Africa to your plate.', 1500.00, TRUE),
(1, 'Suya', 'Grilled meat skewers seasoned with groundnut powder and spices. Served with onions and tomatoes.', 800.00, TRUE),
(1, 'Egusi Soup', 'Ground melon seed soup with spinach and meat. Served with pounded yam or eba.', 1200.00, TRUE),
(2, 'Tuwo Shinkafa', 'Rice pudding served with various soups. A traditional Hausa delicacy.', 1000.00, TRUE),
(2, 'Masa', 'Rice cakes served with honey or sugar. Perfect for breakfast or dessert.', 500.00, TRUE),
(2, 'Dambu Nama', 'Shredded beef jerky with spices. A popular Hausa snack.', 700.00, TRUE);

-- Insert sample orders
INSERT INTO orders (user_id, meal_id, vendor_id, quantity, total_amount, delivery_address, status, payment_status, payment_method) VALUES 
(2, 1, 1, 2, 3000.00, '123 Main Street, Kano', 'delivered', 'paid', 'cash_on_delivery'),
(2, 3, 1, 1, 1200.00, '123 Main Street, Kano', 'delivered', 'paid', 'cash_on_delivery'),
(5, 4, 2, 1, 1000.00, '456 Park Avenue, Kano', 'pending', 'pending', 'cash_on_delivery'),
(5, 6, 2, 2, 1400.00, '456 Park Avenue, Kano', 'accepted', 'pending', 'cash_on_delivery');

-- Insert sample reviews
INSERT INTO reviews (order_id, user_id, vendor_id, meal_id, rating, comment) VALUES 
(1, 2, 1, 1, 5, 'Amazing Jollof Rice! The best I have ever tasted. Will definitely order again.'),
(2, 2, 1, 3, 4, 'Great Egusi soup, very authentic taste. The pounded yam was perfect.');

-- Create indexes for better performance
CREATE INDEX idx_orders_meal_vendor ON orders(meal_id, vendor_id);
CREATE INDEX idx_meals_vendor_available ON meals(vendor_id, availability);
CREATE INDEX idx_vendors_user_approved ON vendors(user_id, approved_status);

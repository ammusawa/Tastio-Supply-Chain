-- Migration script to add new columns to orders table for enhanced order flow
-- Run this script to update existing database

-- Add new columns to orders table
ALTER TABLE orders 
ADD COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' NOT NULL AFTER status,
ADD COLUMN payment_method ENUM('cash_on_delivery', 'bank_transfer', 'card_payment', 'mobile_money') DEFAULT 'cash_on_delivery' NOT NULL AFTER payment_status,
ADD COLUMN estimated_ready_time TIMESTAMP NULL AFTER special_instructions,
ADD COLUMN notes TEXT AFTER estimated_ready_time;

-- Update status enum to include new statuses
ALTER TABLE orders 
MODIFY COLUMN status ENUM('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'rejected') DEFAULT 'pending' NOT NULL;

-- Add index for payment_status
CREATE INDEX idx_payment_status ON orders(payment_status);

-- Update existing orders to have proper payment status
UPDATE orders SET payment_status = 'paid' WHERE status = 'delivered';
UPDATE orders SET payment_status = 'pending' WHERE status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery');
UPDATE orders SET payment_status = 'refunded' WHERE status = 'cancelled';

-- Update existing orders to have proper payment method (default to cash on delivery)
UPDATE orders SET payment_method = 'cash_on_delivery' WHERE payment_method IS NULL;

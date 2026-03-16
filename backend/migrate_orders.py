#!/usr/bin/env python3
"""
Database migration script for Tastio orders table
"""

import mysql.connector
import sys
import os

# Add the current directory to Python path to import config
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import settings

def run_migration():
    """Run the database migration"""
    try:
        # Connect to database
        connection = mysql.connector.connect(
            host=settings.db_host,
            user=settings.db_user,
            password=settings.db_pass,
            database=settings.db_name
        )
        
        cursor = connection.cursor()
        
        print("🔄 Running database migration...")
        
        # Migration queries
        migration_queries = [
            # Add new columns
            "ALTER TABLE orders ADD COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' NOT NULL AFTER status",
            "ALTER TABLE orders ADD COLUMN payment_method ENUM('cash_on_delivery', 'bank_transfer', 'card_payment', 'mobile_money') DEFAULT 'cash_on_delivery' NOT NULL AFTER payment_status",
            "ALTER TABLE orders ADD COLUMN estimated_ready_time TIMESTAMP NULL AFTER special_instructions",
            "ALTER TABLE orders ADD COLUMN notes TEXT AFTER estimated_ready_time",
            
            # Update status enum
            "ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'rejected') DEFAULT 'pending' NOT NULL",
            
            # Add index
            "CREATE INDEX idx_payment_status ON orders(payment_status)",
            
            # Update existing orders
            "UPDATE orders SET payment_status = 'paid' WHERE status = 'delivered'",
            "UPDATE orders SET payment_status = 'pending' WHERE status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery')",
            "UPDATE orders SET payment_status = 'refunded' WHERE status = 'cancelled'",
            "UPDATE orders SET payment_method = 'cash_on_delivery' WHERE payment_method IS NULL"
        ]
        
        for i, query in enumerate(migration_queries, 1):
            try:
                print(f"  {i}/{len(migration_queries)}: {query[:50]}...")
                cursor.execute(query)
                connection.commit()
                print(f"    ✅ Success")
            except Exception as e:
                if "Duplicate column name" in str(e) or "Duplicate key name" in str(e):
                    print(f"    ⚠️  Skipped (already exists): {str(e)[:50]}...")
                else:
                    print(f"    ❌ Error: {str(e)}")
                    raise
        
        print("✅ Database migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    run_migration()

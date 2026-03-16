import mysql.connector
from mysql.connector import Error, pooling
from config import settings
import json
from typing import Dict, List, Any, Optional
import time
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.pool = None
        self.max_retries = 3
        self.retry_delay = 1  # seconds
        self.initialize_pool()
    
    def initialize_pool(self):
        """Initialize connection pool"""
        try:
            pool_config = {
                'pool_name': 'tastio_pool',
                'pool_size': 10,  # Number of connections in the pool
                'host': settings.db_host,
                'user': settings.db_user,
                'password': settings.db_pass,
                'database': settings.db_name,
                'autocommit': True,
                'charset': 'utf8mb4',
                'use_unicode': True,
                'get_warnings': True,
                'raise_on_warnings': False,
                'connection_timeout': 60,  # Connection timeout in seconds
                'init_command': "SET SESSION sql_mode='STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'"
            }
            
            self.pool = mysql.connector.pooling.MySQLConnectionPool(**pool_config)
            logger.info("✅ Database connection pool initialized successfully")
        except Error as e:
            logger.error(f"❌ Failed to initialize database pool: {e}")
            self.pool = None
    
    def get_connection(self):
        """Get database connection from pool with retry logic"""
        if not self.pool:
            self.initialize_pool()
            if not self.pool:
                raise Exception("Database connection pool not available. Please check MySQL server.")
        
        for attempt in range(self.max_retries):
            try:
                connection = self.pool.get_connection()
                if connection.is_connected():
                    return connection
                else:
                    connection.close()
                    raise Error("Connection not active")
            except Error as e:
                logger.warning(f"Database connection attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                    # Try to reinitialize pool if connection failed
                    if attempt == 1:  # On second attempt, try to reinitialize
                        try:
                            self.initialize_pool()
                        except:
                            pass
                else:
                    raise Exception(f"Failed to get database connection after {self.max_retries} attempts: {e}")
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """Execute SELECT query and return results with retry logic"""
        connection = None
        cursor = None
        
        for attempt in range(self.max_retries):
            try:
                connection = self.get_connection()
                cursor = connection.cursor(dictionary=True)
                cursor.execute(query, params or ())
                results = cursor.fetchall()
                return results
            except Error as e:
                logger.warning(f"Query execution attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"❌ Error executing query after {self.max_retries} attempts: {e}")
                    raise e
            finally:
                if cursor:
                    cursor.close()
                if connection:
                    try:
                        connection.close()
                    except:
                        pass
    
    def execute_update(self, query: str, params: tuple = None) -> int:
        """Execute INSERT, UPDATE, DELETE query and return affected rows with retry logic"""
        connection = None
        cursor = None
        
        for attempt in range(self.max_retries):
            try:
                connection = self.get_connection()
                cursor = connection.cursor()
                cursor.execute(query, params or ())
                affected_rows = cursor.rowcount
                return affected_rows
            except Error as e:
                logger.warning(f"Update execution attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"❌ Error executing update after {self.max_retries} attempts: {e}")
                    raise e
            finally:
                if cursor:
                    cursor.close()
                if connection:
                    try:
                        connection.close()
                    except:
                        pass
    
    def execute_insert(self, query: str, params: tuple = None) -> int:
        """Execute INSERT query and return last insert ID with retry logic"""
        connection = None
        cursor = None
        
        for attempt in range(self.max_retries):
            try:
                connection = self.get_connection()
                cursor = connection.cursor()
                cursor.execute(query, params or ())
                last_id = cursor.lastrowid
                return last_id
            except Error as e:
                logger.warning(f"Insert execution attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"❌ Error executing insert after {self.max_retries} attempts: {e}")
                    raise e
            finally:
                if cursor:
                    cursor.close()
                if connection:
                    try:
                        connection.close()
                    except:
                        pass
    
    def execute_delete(self, query: str, params: tuple = None) -> int:
        """Execute DELETE query and return affected rows with retry logic"""
        return self.execute_update(query, params)
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            connection.close()
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def get_pool_status(self) -> Dict:
        """Get connection pool status"""
        if not self.pool:
            return {"status": "not_initialized"}
        
        try:
            status_info = {
                "status": "active",
                "pool_name": self.pool.pool_name,
                "pool_size": self.pool.pool_size
            }
            
            # Add pool_reset_session if available
            if hasattr(self.pool, 'pool_reset_session'):
                status_info["pool_reset_session"] = self.pool.pool_reset_session
                
            return status_info
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def close(self):
        """Close all connections in the pool"""
        if self.pool:
            try:
                # Close all connections in the pool
                for connection in self.pool._cnx_queue:
                    try:
                        connection.close()
                    except:
                        pass
                logger.info("Database connection pool closed")
            except Exception as e:
                logger.error(f"Error closing database pool: {e}")

# Global database manager instance
db_manager = DatabaseManager()

def get_db():
    """Dependency to get database manager"""
    return db_manager

#!/usr/bin/env python
"""
Script to create a new PostgreSQL database for the Musical Academy app
"""
import psycopg2
from psycopg2 import sql
import sys

# Connection parameters
ADMIN_USER = "postgres"
ADMIN_PASSWORD = "27ee227c7a566ac5"
HOST = "wasel-dev-db.wasel.ma"
PORT = "2234"
NEW_DB_NAME = "musical_academy"

def create_database():
    """Create the musical_academy database if it doesn't exist"""
    try:
        # Connect to the default 'postgres' database
        print(f"Connecting to PostgreSQL server at {HOST}:{PORT}...")
        conn = psycopg2.connect(
            dbname="postgres",
            user=ADMIN_USER,
            password=ADMIN_PASSWORD,
            host=HOST,
            port=PORT
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s",
            (NEW_DB_NAME,)
        )
        exists = cursor.fetchone()
        
        if exists:
            print(f"✓ Database '{NEW_DB_NAME}' already exists")
        else:
            # Create database
            print(f"Creating database '{NEW_DB_NAME}'...")
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(NEW_DB_NAME)
                )
            )
            print(f"✓ Database '{NEW_DB_NAME}' created successfully!")
        
        cursor.close()
        conn.close()
        
        # Test connection to new database
        print(f"\nTesting connection to '{NEW_DB_NAME}'...")
        test_conn = psycopg2.connect(
            dbname=NEW_DB_NAME,
            user=ADMIN_USER,
            password=ADMIN_PASSWORD,
            host=HOST,
            port=PORT
        )
        test_conn.close()
        print(f"✓ Connection to '{NEW_DB_NAME}' successful!")
        
        print("\n" + "="*60)
        print("Database setup complete!")
        print("="*60)
        print("\nNext steps:")
        print("1. Run migrations: python manage.py migrate")
        print("2. Create superuser: python manage.py createsuperuser")
        print("3. Start server: python manage.py runserver 0.0.0.0:8009")
        
        return True
        
    except psycopg2.Error as e:
        print(f"\n✗ Error: {e}")
        print("\nPossible issues:")
        print("- Check that PostgreSQL server is accessible")
        print("- Verify credentials are correct")
        print("- Ensure port 2234 is not blocked by firewall")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = create_database()
    sys.exit(0 if success else 1)

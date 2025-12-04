#!/usr/bin/env python3
"""Add long_term_balance column to user table"""

from app.core.db import engine
from sqlmodel import text

def main():
    print("Adding long_term_balance column to user table...")
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'long_term_balance'"))
        column_exists = bool(result.fetchone())
        
        if column_exists:
            print("long_term_balance column already exists")
        else:
            # Add the column
            conn.execute(text("ALTER TABLE \"user\" ADD COLUMN long_term_balance FLOAT NOT NULL DEFAULT 0"))
            print("Successfully added long_term_balance column")
        
        # Commit the transaction
        conn.commit()

if __name__ == "__main__":
    main()

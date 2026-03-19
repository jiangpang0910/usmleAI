"""
Database connection and session management module.

Provides the SQLAlchemy engine, session factory, declarative base,
and a dependency function for FastAPI route injection.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# SQLAlchemy engine — manages the connection pool to PostgreSQL
# Uses the DATABASE_URL from application settings
engine = create_engine(settings.DATABASE_URL)

# Session factory — creates new database sessions bound to the engine
# autocommit=False: transactions must be explicitly committed
# autoflush=False: prevents automatic flushing before queries for better control
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class — all ORM models inherit from this
# Provides the metadata registry for table creation and schema management
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session.

    Yields a SQLAlchemy session and ensures it is closed after
    the request completes, even if an exception occurs.

    Usage in FastAPI routes:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        # Always close the session to return the connection to the pool
        db.close()

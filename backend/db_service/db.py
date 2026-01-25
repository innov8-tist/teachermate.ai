from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
load_dotenv()

DB_URL = os.getenv("DB_URL_POSTGRES")

# Improved connection pool settings
engine = create_engine(
    DB_URL,
    pool_size=10,          # Increase base pool size
    max_overflow=20,       # Increase overflow
    pool_timeout=60,       # Increase timeout
    pool_recycle=3600,     # Recycle connections every hour
    pool_pre_ping=True,    # Validate connections before use
    echo=False             # Set to True for SQL debugging
)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
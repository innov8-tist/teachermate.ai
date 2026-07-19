from sqlalchemy import Column, Integer, String
from db_service.db import Base


class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    institution = Column(String, nullable=True)
    pfp_url = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)

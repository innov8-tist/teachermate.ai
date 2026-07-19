"""
CO Mapper Models
SQLAlchemy database models for CO mapping functionality
"""

from sqlalchemy import Column, Integer, String, ForeignKey
from db_service.db import Base


class COTemplate(Base):
    """CO mapping templates created by teachers (formerly Subject)"""
    __tablename__ = "co_templates"
    id = Column(Integer, primary_key=True, index=True)
    ia = Column(String, nullable=False)  # Internal Assessment identifier
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    name = Column(String, nullable=False)  # Subject name
    branch = Column(String, nullable=False)
    sem = Column(Integer, nullable=False)
    image_path = Column(String, nullable=False)  # Path to uploaded CO mapping image
    student_count = Column(Integer, nullable=False)


class COQuestionMapping(Base):
    """Maps questions to Course Outcomes (formerly COMAPPEDQUESTION)"""
    __tablename__ = "co_question_mappings"
    id = Column(Integer, primary_key=True, index=True)
    q_no = Column(String, nullable=False)  # Question number
    co_no = Column(String, nullable=False)  # Course Outcome number
    template_id = Column(Integer, ForeignKey("co_templates.id"), nullable=False)


class StudentAnswerMark(Base):
    """Student marks for each question (formerly StudentMark)"""
    __tablename__ = "co_student_answer_marks"
    id = Column(Integer, primary_key=True, index=True)
    question_no = Column(String, nullable=False)
    mark = Column(String, nullable=False)
    regno = Column(String, nullable=False)  # Student registration number
    template_id = Column(Integer, ForeignKey("co_templates.id"), nullable=False)
    ia_id = Column(Integer, nullable=False)


class Subject(Base):
    """Catalog of all available subjects (formerly AllSubject)"""
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    branch = Column(String, nullable=False)
    sem = Column(Integer, nullable=False)

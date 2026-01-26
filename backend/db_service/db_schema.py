from sqlalchemy import Column,Integer,Boolean,String,ForeignKey,Text,JSON
from .db import Base


class Teacher(Base):
    """Teacher/Faculty accounts"""
    __tablename__ = "teachers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    institution = Column(String, nullable=True)
    pfp_url = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)


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


class COQuestionMapping(Base):
    """Maps questions to Course Outcomes (formerly COMAPPEDQUESTION)"""
    __tablename__ = "co_question_mappings"
    id = Column(Integer, primary_key=True, index=True)
    q_no = Column(String, nullable=False)  # Question number
    co_no = Column(String, nullable=False)  # Course Outcome number
    template_id = Column(Integer, ForeignKey("co_templates.id"), nullable=False)


class StudentAnswerMark(Base):
    """Student marks for each question (formerly StudentMark)"""
    __tablename__ = "student_answer_marks"
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


class EvaluationSchema(Base):
    """Evaluation criteria and answer keys (formerly AnswerSchema)"""
    __tablename__ = "evaluation_schemas"
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("co_templates.id"), nullable=False)
    question_no = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    total_mark = Column(Integer, nullable=False)
    mark_criteria = Column(JSON, nullable=False)  # Marking scheme
    answer = Column(Text, nullable=False)  # Expected answer
    image_explanation = Column(Text, nullable=True)
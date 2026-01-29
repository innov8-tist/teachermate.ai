from sqlalchemy import Column,Integer,Boolean,String,ForeignKey,Text,JSON,Float
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
    question_no = Column(String, nullable=False)
    question = Column(Text, nullable=False)
    total_mark = Column(Integer, nullable=False)
    mark_criteria = Column(JSON, nullable=False)  # Marking scheme
    answer = Column(Text, nullable=False)  # Expected answer
    image_explanation = Column(Text, nullable=True)  # AI-extracted explanation from image
    image_paths = Column(JSON, nullable=True)  # List of cropped image paths

class STUDENTINFO(Base):
    __tablename__="student_info"
    id=Column(Integer,primary_key=True,index=True)
    reg_no=Column(String,nullable=False)
    name=Column(String,nullable=False)
    branch=Column(String,nullable=False)
    division=Column(String,nullable=False)


class Evaluation(Base):
    """Evaluation sessions for answer schema processing"""
    __tablename__ = "evaluations"
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("co_templates.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    pdf_path = Column(String, nullable=False)  # Path to uploaded PDF
    status = Column(String, default="in_progress")  # in_progress, completed
    created_at = Column(String, nullable=False)  # ISO timestamp
    updated_at = Column(String, nullable=False)  # ISO timestamp


class StudentEvaluationProgress(Base):
    """Track student evaluation progress for resuming evaluations"""
    __tablename__ = "student_evaluation_progress"
    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"), nullable=False)
    student_reg_no = Column(String, nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    total_questions = Column(Integer, nullable=False)  # Total questions in evaluation
    completed_questions = Column(Integer, default=0)  # Questions completed so far
    upload_method = Column(String, nullable=False)  # 'pdf' or 'camera'
    pdf_id = Column(String, nullable=True)  # PDF ID if uploaded
    pdf_filename = Column(String, nullable=True)  # Original PDF filename
    status = Column(String, default="in_progress")  # in_progress, completed, abandoned
    created_at = Column(String, nullable=False)  # ISO timestamp
    updated_at = Column(String, nullable=False)  # ISO timestamp
    last_question_completed = Column(String, nullable=True)  # Last completed question number


class StudentAnswerEvaluation(Base):
    """Student answer evaluations with AI feedback"""
    __tablename__ = "student_answer_evaluations"
    id = Column(Integer, primary_key=True, index=True)
    question_no = Column(String, nullable=False)
    template_id = Column(Integer, ForeignKey("co_templates.id"), nullable=False)
    student_reg_no = Column(String, nullable=True)  # Student registration number
    mark_score = Column(Float, nullable=False)  # Marks awarded
    total_mark = Column(Integer, nullable=False)  # Total marks for question
    feedback = Column(JSON, nullable=False)  # List of feedback points
    student_image_paths = Column(JSON, nullable=False)  # Paths to student answer images
    evaluated_at = Column(String, nullable=False)  # ISO timestamp
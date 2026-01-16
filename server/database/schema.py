from sqlalchemy import (
    Integer,
    String,
    Text,
    ForeignKey,
    Timestamp
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship
)
from datetime import datetime


class Base(DeclarativeBase):
    pass


class Institution(Base):
    __tablename__ = "institution"

    institution_id: Mapped[int] = mapped_column(primary_key=True)
    institution_name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str] = mapped_column(String(255))

    teachers = relationship("Teacher", back_populates="institution")
    courses = relationship("Course", back_populates="institution")


class Teacher(Base):
    __tablename__ = "teacher"

    teacher_id: Mapped[int] = mapped_column(primary_key=True)
    teacher_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    department: Mapped[str] = mapped_column(String(255))
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institution.institution_id")
    )

    institution = relationship("Institution", back_populates="teachers")
    courses = relationship("Course", back_populates="teacher")


class Course(Base):
    __tablename__ = "course"

    course_id: Mapped[int] = mapped_column(primary_key=True)
    course_name: Mapped[str] = mapped_column(String(255))
    semester: Mapped[int] = mapped_column(Integer)
    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("teacher.teacher_id")
    )
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institution.institution_id")
    )

    teacher = relationship("Teacher", back_populates="courses")
    institution = relationship("Institution", back_populates="courses")
    students = relationship("Student", back_populates="course")
    course_outcomes = relationship("CourseOutcome", back_populates="course")
    answer_schemas = relationship("AnswerSchema", back_populates="course")


class Student(Base):
    __tablename__ = "student"

    student_id: Mapped[int] = mapped_column(primary_key=True)
    student_name: Mapped[str] = mapped_column(String(255))
    register_number: Mapped[str] = mapped_column(String(50))
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id")
    )

    course = relationship("Course", back_populates="students")
    answer_sheets = relationship("AnswerSheet", back_populates="student")


class CourseOutcome(Base):
    __tablename__ = "course_outcome"

    co_id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id")
    )
    module_number: Mapped[int] = mapped_column(Integer)
    co_code: Mapped[str] = mapped_column(String(50))
    co_description: Mapped[str] = mapped_column(Text)

    course = relationship("Course", back_populates="course_outcomes")
    answer_schemas = relationship("AnswerSchema", back_populates="course_outcome")
    co_attainments = relationship("COAttainment", back_populates="course_outcome")


class AnswerSchema(Base):
    __tablename__ = "answer_schema"

    schema_id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id")
    )
    question_number: Mapped[int] = mapped_column(Integer)
    question_type: Mapped[str] = mapped_column(String(50))
    max_marks: Mapped[int] = mapped_column(Integer)
    model_answer: Mapped[str] = mapped_column(Text)
    co_id: Mapped[int] = mapped_column(
        ForeignKey("course_outcome.co_id")
    )

    course = relationship("Course", back_populates="answer_schemas")
    course_outcome = relationship("CourseOutcome", back_populates="answer_schemas")
    evaluations = relationship("Evaluation", back_populates="answer_schema")


class AnswerSheet(Base):
    __tablename__ = "answer_sheet"

    answer_sheet_id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student.student_id")
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id")
    )
    uploaded_date: Mapped[datetime] = mapped_column(
        Timestamp, default=datetime.utcnow
    )

    student = relationship("Student", back_populates="answer_sheets")
    student_answers = relationship("StudentAnswer", back_populates="answer_sheet")
    co_attainments = relationship("COAttainment", back_populates="answer_sheet")


class StudentAnswer(Base):
    __tablename__ = "student_answer"

    answer_id: Mapped[int] = mapped_column(primary_key=True)
    answer_sheet_id: Mapped[int] = mapped_column(
        ForeignKey("answer_sheet.answer_sheet_id")
    )
    question_number: Mapped[int] = mapped_column(Integer)
    extracted_text: Mapped[str] = mapped_column(Text)
    image_path: Mapped[str] = mapped_column(String(255))

    answer_sheet = relationship("AnswerSheet", back_populates="student_answers")
    evaluations = relationship("Evaluation", back_populates="student_answer")


class Evaluation(Base):
    __tablename__ = "evaluation"

    evaluation_id: Mapped[int] = mapped_column(primary_key=True)
    answer_id: Mapped[int] = mapped_column(
        ForeignKey("student_answer.answer_id")
    )
    schema_id: Mapped[int] = mapped_column(
        ForeignKey("answer_schema.schema_id")
    )
    obtained_marks: Mapped[int] = mapped_column(Integer)
    feedback: Mapped[str] = mapped_column(Text)

    student_answer = relationship("StudentAnswer", back_populates="evaluations")
    answer_schema = relationship("AnswerSchema", back_populates="evaluations")


class COAttainment(Base):
    __tablename__ = "co_attainment"

    co_attainment_id: Mapped[int] = mapped_column(primary_key=True)
    answer_sheet_id: Mapped[int] = mapped_column(
        ForeignKey("answer_sheet.answer_sheet_id")
    )
    co_id: Mapped[int] = mapped_column(
        ForeignKey("course_outcome.co_id")
    )
    total_marks: Mapped[int] = mapped_column(Integer)

    answer_sheet = relationship("AnswerSheet", back_populates="co_attainments")
    course_outcome = relationship("CourseOutcome", back_populates="co_attainments")
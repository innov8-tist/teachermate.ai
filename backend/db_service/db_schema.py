from sqlalchemy import Column,Integer,Boolean,String,ForeignKey
from .db import Base


class Teacher(Base):
    __tablename__="Teacher"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String,nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    institution = Column(String, nullable=True)
    pfp_url = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)

class Subject(Base):
    __tablename__ = "co_mapped_subjects"
    id = Column(Integer, primary_key=True, index=True)
    ia = Column(String,nullable=False)
    teacher_id=Column(Integer,ForeignKey("Teacher.id"),nullable=False)
    name = Column(String, nullable=False)
    branch = Column(String, nullable=False)
    sem=Column(Integer,nullable=False)
    image_path=Column(String,nullable=False)

class COMAPPEDQUESTION(Base):
    __tablename__ = "co_mapped_question"
    id = Column(Integer, primary_key=True, index=True)
    q_no = Column (String, nullable=False)
    co_no = Column(String, nullable=False)
    subject_id = Column(Integer, ForeignKey("co_mapped_subjects.id"), nullable=False)

class StudentMark(Base):
    __tablename__="student_mapped_answer"
    id = Column(Integer,primary_key=True,index=True)
    question_no=Column(String,nullable=False)
    mark = Column(String,nullable=False)
    regno= Column(String,nullable=False)
    subject_id=Column(Integer,ForeignKey("co_mapped_subjects.id"),nullable=False)
    ia_id=Column(Integer,nullable=False)

class AllSubject(Base):
    __tablename__ = "all_subject"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    branch = Column(String, nullable=False)
    sem=Column(Integer, nullable=False)
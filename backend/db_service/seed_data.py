from db_service.db import SessionLocal
from modules.co_mapper.models import Subject
from db_service.db_schema import STUDENTINFO

def seed_subjects(silent=False):
    db = SessionLocal()
    try:
        from sqlalchemy.exc import ProgrammingError
        import psycopg2.errors
        
        try:
            existing = db.query(Subject).first()
            if existing:
                if not silent:
                    print("✓ Subjects already seeded, skipping...")
                return
        except (ProgrammingError, psycopg2.errors.UndefinedTable) as e:
            # Table doesn't exist yet, skip silently
            if not silent:
                print(f"⚠️  Subjects table doesn't exist yet, skipping...")
            return
        
        subjects = [
            Subject(id=5, name='Oops', branch='CSE', sem=3),
            Subject(id=6, name='Maths', branch='CSE', sem=3),
            Subject(id=7, name='Toc', branch='CSE', sem=3),
            Subject(id=8, name='DSA', branch='CSE', sem=3),

            Subject(id=1, name='MSS', branch='CSE', sem=4),
            Subject(id=2, name='MPMC', branch='CSE', sem=4),
            Subject(id=3, name='SS', branch='CSE', sem=4),

            Subject(id=9, name='Microcontroller', branch='CSE', sem=5),
            Subject(id=4, name='CN', branch='CSE', sem=5),
            Subject(id=10, name='ML', branch='CSE', sem=5),

            Subject(id=11, name='AI', branch='CSE', sem=7),
            Subject(id=12, name='Cloud', branch='CSE', sem=7),
            Subject(id=13, name='EHS', branch='CSE', sem=7),
        ]
        
        db.add_all(subjects)
        db.commit()
        if not silent:
            print(f"✓ Seeded {len(subjects)} subjects")
        
    except Exception as e:
        if not silent:
            print(f"✗ Error seeding subjects: {e}")
            import traceback
            traceback.print_exc()
        db.rollback()
    finally:
        db.close()


def seed_students(silent=False):
    """Insert default student information"""
    db = SessionLocal()
    try:
        from sqlalchemy.exc import ProgrammingError
        import psycopg2.errors
        
        try:
            existing = db.query(STUDENTINFO).first()
            if existing:
                if not silent:
                    print("✓ Students already seeded, skipping...")
                return
        except (ProgrammingError, psycopg2.errors.UndefinedTable) as e:
            # Table doesn't exist yet, skip silently
            if not silent:
                print(f"⚠️  Students table doesn't exist yet, skipping...")
            return
        
        students = [
            (1, 'TOC23CS001', 'AARYA O A', 'CSE', 'A'),
            (2, 'TOC23CS002', 'ABEL KURIAN', 'CSE', 'A'),
            (3, 'TOC23CS003', 'ABHINANDANA A M', 'CSE', 'A'),
            (4, 'TOC23CS004', 'ABHINAND DILEP', 'CSE', 'A'),
            (5, 'TOC23CS005', 'ABHINAV K SUDHEER', 'CSE', 'A'),
            (6, 'TOC23CS006', 'ABHINAV P', 'CSE', 'A'),
            (7, 'TOC23CS007', 'ABHISHEK SIVADASAN', 'CSE', 'A'),
            (8, 'TOC23CS008', 'ABIRAM SUNIL', 'CSE', 'A'),
            (9, 'TOC23CS009', 'ADHITHYAN RAJESH', 'CSE', 'A'),
            (10, 'TOC23CS010', 'ADITHYA ASHOK', 'CSE', 'A'),
            (11, 'TOC23CS011', 'ADITHYAN BIJU', 'CSE', 'A'),
            (12, 'TOC23CS012', 'AEIN ANTONY AUGUSTINE', 'CSE', 'A'),
            (13, 'TOC23CS013', 'AHAMMED ZAYAN M H', 'CSE', 'A'),
            (14, 'TOC23CS014', 'AINA THOMAS', 'CSE', 'A'),
            (15, 'TOC23CS015', 'AISHATH REHAM', 'CSE', 'A'),
            (16, 'TOC23CS016', 'AISWARYA P S', 'CSE', 'A'),
            (17, 'TOC23CS017', 'AKSHAY P', 'CSE', 'A'),
            (18, 'TOC23CS018', 'AKSHAY R NAIR', 'CSE', 'A'),
            (19, 'TOC23CS019', 'ALAN SINY MATHEW', 'CSE', 'A'),
            (20, 'TOC23CS020', 'ALVIN PAUL MATHEW', 'CSE', 'A'),
            (21, 'TOC23CS021', 'AMALA SHAJU', 'CSE', 'A'),
            (22, 'TOC23CS022', 'AMITHA C AGNEL', 'CSE', 'A'),
            (23, 'TOC23CS023', 'ANIRUDH K', 'CSE', 'A'),
            (24, 'TOC23CS024', 'ANJANA C', 'CSE', 'A'),
            (25, 'TOC23CS025', 'ANJANA JIBY', 'CSE', 'A'),
            (26, 'TOC23CS026', 'ANJU E K', 'CSE', 'A'),
            (27, 'TOC23CS027', 'ANKITH BIJU', 'CSE', 'A'),
            (28, 'TOC23CS028', 'ANSHIKA MARIYAM GEORGE', 'CSE', 'A'),
            (29, 'TOC23CS029', 'ANUB SUNIL', 'CSE', 'A'),
            (30, 'TOC23CS030', 'ANUGRAHA PRASHANTH', 'CSE', 'A'),
            (31, 'TOC23CS0231', 'ARAM SUNIL', 'CSE', 'A'),
            (32, 'TOC23CS032', 'ARJUN A', 'CSE', 'A'),
            (33, 'TOC23CS033', 'ARUN C S', 'CSE', 'A'),
            (34, 'TOC23CS034', 'ASHIK V S', 'CSE', 'A'),
            (35, 'TOC23CS035', 'ASWATHY GOPINATH', 'CSE', 'A'),
            (36, 'TOC23CS036', 'ASWIN ASOKAN', 'CSE', 'A'),
            (37, 'TOC23CS037', 'ASWIN KRISHNA', 'CSE', 'A'),
            (38, 'TOC23CS038', 'AUGUSTINE SHIFSON', 'CSE', 'A'),
            (39, 'TOC23CS039', 'AXEL VICTOR', 'CSE', 'A'),
            (40, 'TOC23CS040', 'AYSHA SULTHANA', 'CSE', 'A'),
            (41, 'TOC23CS041', 'BASIL VARGHESE', 'CSE', 'A'),
            (42, 'TOC23CS042', 'BIBIN BIJU', 'CSE', 'A'),
            (43, 'TOC23CS043', 'BRITTO LIONEL FRANCIS', 'CSE', 'A'),
            (44, 'TOC23CS044', 'CELIN SNEHA', 'CSE', 'A'),
            (45, 'TOC23CS045', 'CHRIS JOSEPH SAJI', 'CSE', 'A'),
            (46, 'TOC23CS046', 'DELBIN MATHEW', 'CSE', 'A'),
            (47, 'TOC23CS047', 'DEVA NANDA NAIR', 'CSE', 'A'),
            (48, 'TOC23CS048', 'DEVIKA SHAJI', 'CSE', 'A'),
            (49, 'TOC23CS049', 'DILSHA P P', 'CSE', 'A'),
            (50, 'TOC23CS050', 'ELDHO SHAJU', 'CSE', 'A'),
            (51, 'TOC23CS051', 'FATHIMA SANAM. A. M', 'CSE', 'A'),
            (52, 'TOC23CS052', 'FATHIMA SHIRIN M A', 'CSE', 'A'),
            (53, 'TOC23CS053', 'FESTIN BIJU', 'CSE', 'A'),
            (54, 'TOC23CS054', 'FIZA FATHIMA PULIYAPPILLY SUDHEER', 'CSE', 'A'),
            (55, 'TOC23CS055', 'FOSEAYA ANJU BEJOY', 'CSE', 'A'),
            (56, 'TOC23CS056', 'GEORDIE JO FRANK', 'CSE', 'A'),
            (57, 'TOC23CS057', 'GOURIE G', 'CSE', 'A'),
            (58, 'TOC23CS058', 'GOWRI UNNIKRISHNAN', 'CSE', 'A'),
            (59, 'TOC23CS059', 'HARSHIT KUMAR SINGH', 'CSE', 'A'),
            (60, 'TOC23CS060', 'HRISHIKESH K R', 'CSE', 'A'),
            (61, 'TOC23CS061', 'IRINE PAUL', 'CSE', 'A'),
            (62, 'TOC23CS062', 'ISSAC PAUL', 'CSE', 'A'),
            (63, 'TOC23CS063', 'IVAN PAUL', 'CSE', 'A'),
            (64, 'TOC23CS064', 'IWIN SHIJO', 'CSE', 'A'),
            (65, 'TOC23CS065', 'JIYA KRISHNA', 'CSE', 'B'),
            (66, 'TOC23CS066', 'JOEL BABY', 'CSE', 'B'),
            (67, 'TOC23CS067', 'JOHN ADAMS KURIAN', 'CSE', 'B'),
            (68, 'TOC23CS068', 'JOHN JOSEPH', 'CSE', 'B'),
            (69, 'TOC23CS069', 'JOHN VINOY', 'CSE', 'B'),
            (70, 'TOC23CS070', 'JON GIGI JOHN', 'CSE', 'B'),
            (71, 'TOC23CS071', 'JOSEPH BIJU', 'CSE', 'B'),
            (72, 'TOC23CS072', 'JYOTHILAKSHMI BABU', 'CSE', 'B'),
            (73, 'TOC23CS073', 'K A AYISHA NASRIN', 'CSE', 'B'),
            (74, 'TOC23CS074', 'K A HARIKRISHNAN', 'CSE', 'B'),
            (75, 'TOC23CS075', 'KARAN REJU', 'CSE', 'B'),
            (76, 'TOC23CS076', 'KARTHIK SUMON', 'CSE', 'B'),
            (77, 'TOC23CS077', 'KASINATH P', 'CSE', 'B'),
            (78, 'TOC23CS078', 'KASYAP P', 'CSE', 'B'),
            (79, 'TOC23CS079', 'K N IMRAN', 'CSE', 'B'),
            (80, 'TOC23CS080', 'KRIPA BABYCHAN', 'CSE', 'B'),
            (81, 'TOC23CS081', 'LAMIHA A', 'CSE', 'B'),
            (82, 'TOC23CS082', 'MADHAV J NAIR', 'CSE', 'B'),
            (83, 'TOC23CS083', 'MANU MADHU', 'CSE', 'B'),
            (84, 'TOC23CS084', 'MARIA ANNA VIBIN', 'CSE', 'B'),
            (85, 'TOC23CS085', 'MERRIN THOMAS', 'CSE', 'B'),
            (86, 'TOC23CS086', 'MOHAMMED AHAL P A', 'CSE', 'B'),
            (87, 'TOC23CS087', 'MOHAMMED SAHAL P T', 'CSE', 'B'),
            (88, 'TOC23CS088', 'MOHAMMED ZIYAN P M', 'CSE', 'B'),
            (89, 'TOC23CS089', 'NANDANA P R', 'CSE', 'B'),
            (90, 'TOC23CS090', 'NAVEEN RAVI', 'CSE', 'B'),
            (91, 'TOC23CS091', 'NAYANAMOL K J', 'CSE', 'B'),
            (92, 'TOC23CS092', 'NEHA ARUN', 'CSE', 'B'),
            (93, 'TOC23CS093', 'NETHRA DINESH', 'CSE', 'B'),
            (94, 'TOC23CS094', 'NIKHIL VIJAI', 'CSE', 'B'),
            (95, 'TOC23CS095', 'NIKKU P JOSE', 'CSE', 'B'),
            (96, 'TOC23CS096', 'PIYUSH K', 'CSE', 'B'),
            (97, 'TOC23CS097', 'REYAN REJI', 'CSE', 'B'),
            (98, 'TOC23CS098', 'RIA REJI', 'CSE', 'B'),
            (99, 'TOC23CS099', 'ROHITH RAJ A', 'CSE', 'B'),
            (100, 'TOC23CS100', 'SABAN P S', 'CSE', 'B'),
            (101, 'TOC23CS101', 'SADHIKA RAVIKUMAR', 'CSE', 'B'),
            (102, 'TOC23CS102', 'SAHISHNU SATHYARTHY', 'CSE', 'B'),
            (103, 'TOC23CS103', 'SAMUEL JOY', 'CSE', 'B'),
            (104, 'TOC23CS104', 'SANE YACOB C S', 'CSE', 'B'),
            (105, 'TOC23CS105', 'SANJAY SUDHEER', 'CSE', 'B'),
            (106, 'TOC23CS106', 'SEBIN SIBICHAN', 'CSE', 'B'),
            (107, 'TOC23CS107', 'SEBI VARKEY', 'CSE', 'B'),
            (108, 'TOC23CS108', 'SEREENA JOSHY', 'CSE', 'B'),
            (109, 'TOC23CS109', 'SHALOM SUBI KURUVILLA', 'CSE', 'B'),
            (110, 'TOC23CS110', 'SHANKAR UNNIKRISHNAN', 'CSE', 'B'),
            (111, 'TOC23CS111', 'SHAWN SHAJAN', 'CSE', 'B'),
            (112, 'TOC23CS112', 'SHREYA R S', 'CSE', 'B'),
            (113, 'TOC23CS113', 'SIRIN SIMON', 'CSE', 'B'),
            (114, 'TOC23CS114', 'SIVANI S', 'CSE', 'B'),
            (115, 'TOC23CS115', 'SOUMYA R', 'CSE', 'B'),
            (116, 'TOC23CS116', 'SREEDEV S', 'CSE', 'B'),
            (117, 'TOC23CS117', 'SUBAHAN SADATH', 'CSE', 'B'),
            (118, 'TOC23CS118', 'SURAJ P A', 'CSE', 'B'),
            (119, 'TOC23CS119', 'SWATHI H NAIR', 'CSE', 'B'),
            (120, 'TOC23CS120', 'TANIYA NIXON', 'CSE', 'B'),
            (121, 'TOC23CS121', 'T N HARIVINAYAK', 'CSE', 'B'),
            (122, 'TOC23CS122', 'UDAY KRISHNA JAYAN', 'CSE', 'B'),
            (123, 'TOC23CS123', 'VAISAKH AJITHAN', 'CSE', 'B'),
            (124, 'TOC23CS124', 'VISALDEV ANILKUMAR', 'CSE', 'B'),
            (125, 'TOC-TEST1', 'Test-TM-1', 'CSE', 'B'),
            (126, 'TOC-TEST2', 'Test-TM-2', 'CSE', 'B'),
            (127, 'TOC-TEST3', 'Test-TM-3', 'CSE', 'B'),
            (128, 'TOC-TEST4', 'Test-TM-4', 'CSE', 'B'),

        ]
        
        student_objects = [
            STUDENTINFO(id=id, reg_no=reg_no, name=name, branch=branch, division=division)
            for id, reg_no, name, branch, division in students
        ]
        
        db.add_all(student_objects)
        db.commit()
        if not silent:
            print(f"✓ Seeded {len(student_objects)} students")
        
    except Exception as e:
        if not silent:
            print(f"✗ Error seeding students: {e}")
            import traceback
            traceback.print_exc()
        db.rollback()
    finally:
        db.close()


def seed_all():
    """Run all seed functions"""
    print("=" * 50)
    print("SEEDING DATABASE")
    print("=" * 50)

    # Seed data
    seed_subjects()
    seed_students()
    
    print("=" * 50)
    print("✓ DATABASE SEEDING COMPLETE")
    print("=" * 50)


if __name__ == "__main__":
    seed_all()

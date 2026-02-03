#!/usr/bin/env python3
"""
Debug script to check sync status for a student
Shows exactly what's in the database
"""

import sys
sys.path.insert(0, 'backend')

from db_operation.db_server import DBServiceForServer
from db_service.db_schema import (
    COTemplate, StudentAnswerMark, EvaluationSchema,
    StudentEvaluationProgress, StudentAnswerEvaluation
)

def debug_student_sync(template_id, student_reg_no):
    """Check sync status for a student"""
    db_service = DBServiceForServer()
    
    print("=" * 80)
    print(f"SYNC STATUS DEBUG: {student_reg_no}")
    print("=" * 80)
    
    try:
        # 1. Check template
        template = db_service.db.query(COTemplate).filter(
            COTemplate.id == template_id
        ).first()
        
        if not template:
            print(f"\n❌ Template {template_id} NOT FOUND")
            return
        
        ia_number = int(template.ia.replace("IA", ""))
        print(f"\n✅ Template Found:")
        print(f"   ID: {template.id}")
        print(f"   Name: {template.name}")
        print(f"   IA: {template.ia} (IA Number: {ia_number})")
        print(f"   Branch: {template.branch}")
        print(f"   Semester: {template.sem}")
        
        # 2. Check CO Mapper marks
        co_marks = db_service.db.query(StudentAnswerMark).filter(
            StudentAnswerMark.template_id == template_id,
            StudentAnswerMark.regno == student_reg_no,
            StudentAnswerMark.ia_id == ia_number
        ).all()
        
        print(f"\n{'✅' if co_marks else '❌'} CO Mapper Marks: {len(co_marks)} found")
        if co_marks:
            print("   Questions:")
            for mark in co_marks:
                print(f"   - Q{mark.question_no}: {mark.mark} marks")
        else:
            print("   ⚠️  Student has NO marks in CO Mapper!")
            print("   → Upload student answer sheet to CO Mapper first")
        
        # 3. Check evaluation schema
        eval_schema = db_service.db.query(EvaluationSchema).filter(
            EvaluationSchema.template_id == template_id
        ).first()
        
        print(f"\n{'✅' if eval_schema else '❌'} Evaluation Schema:")
        if eval_schema:
            print(f"   ID: {eval_schema.id}")
            print(f"   PDF Path: {eval_schema.pdf_path}")
            print(f"   Status: {eval_schema.status}")
            print(f"   Teacher ID: {eval_schema.teacher_id}")
        else:
            print("   ⚠️  NO evaluation schema found!")
            print("   → Upload answer key PDF in Evaluation tab first")
            print("   → Reverse sync will NOT work without this!")
        
        # 4. Check evaluation progress
        if eval_schema:
            progress = db_service.db.query(StudentEvaluationProgress).filter(
                StudentEvaluationProgress.schema_id == eval_schema.id,
                StudentEvaluationProgress.student_reg_no == student_reg_no
            ).first()
            
            print(f"\n{'✅' if progress else '❌'} Evaluation Progress:")
            if progress:
                print(f"   ID: {progress.id}")
                print(f"   Upload Method: {progress.upload_method}")
                print(f"   Total Questions: {progress.total_questions}")
                print(f"   PDF Path: {progress.student_pdf_path or 'None (CO Mapper upload)'}")
                print(f"   Created: {progress.created_at}")
                print(f"   Updated: {progress.updated_at}")
                
                # 5. Check evaluation records
                evaluations = db_service.db.query(StudentAnswerEvaluation).filter(
                    StudentAnswerEvaluation.progress_id == progress.id
                ).all()
                
                print(f"\n✅ Evaluation Records: {len(evaluations)} found")
                if evaluations:
                    print("   Questions:")
                    for eval in evaluations:
                        print(f"   - Q{eval.question_no}: {eval.mark_score}/{eval.total_mark} marks")
            else:
                print("   ⚠️  Student has NO evaluation progress!")
                print("   → This means reverse sync hasn't happened yet")
                print("   → Or student was never uploaded to CO Mapper")
        
        # 6. Summary
        print("\n" + "=" * 80)
        print("SUMMARY:")
        print("=" * 80)
        
        has_co_marks = len(co_marks) > 0
        has_eval_schema = eval_schema is not None
        has_progress = eval_schema and db_service.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.schema_id == eval_schema.id,
            StudentEvaluationProgress.student_reg_no == student_reg_no
        ).first() is not None
        
        print(f"{'✅' if has_co_marks else '❌'} Student has CO Mapper marks")
        print(f"{'✅' if has_eval_schema else '❌'} Evaluation schema exists")
        print(f"{'✅' if has_progress else '❌'} Student has evaluation progress")
        
        if has_co_marks and has_eval_schema and not has_progress:
            print("\n⚠️  SYNC SHOULD HAPPEN BUT HASN'T!")
            print("   Possible reasons:")
            print("   1. Backend server not restarted after code fix")
            print("   2. Student was uploaded BEFORE the fix")
            print("   3. Exception occurred during sync (check backend logs)")
            print("\n   SOLUTION:")
            print("   1. Restart backend server")
            print("   2. Delete student from CO Mapper")
            print("   3. Re-upload student answer sheet")
            print("   OR use manual sync:")
            print(f"   python3 test_reverse_sync.py")
        elif has_co_marks and not has_eval_schema:
            print("\n⚠️  MISSING EVALUATION SCHEMA!")
            print("   SOLUTION:")
            print("   1. Go to Evaluation tab")
            print("   2. Upload answer key PDF for this subject")
            print("   3. Then re-upload student to CO Mapper")
        elif not has_co_marks:
            print("\n⚠️  STUDENT NOT IN CO MAPPER!")
            print("   SOLUTION:")
            print("   1. Go to CO Mapper")
            print("   2. Upload student answer sheet (front page)")
        elif has_progress:
            print("\n✅ EVERYTHING IS SYNCED!")
            print("   Student should appear in both CO Mapper and Evaluation tabs")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db_service.close()

if __name__ == "__main__":
    # Change these values to match your data
    TEMPLATE_ID = 1  # Your template/subject ID
    STUDENT_REG_NO = "TOC23CS049"  # The student you're testing
    
    print("\n🔍 Checking sync status...")
    print(f"Template ID: {TEMPLATE_ID}")
    print(f"Student: {STUDENT_REG_NO}")
    print()
    
    debug_student_sync(TEMPLATE_ID, STUDENT_REG_NO)

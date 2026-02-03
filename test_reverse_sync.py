#!/usr/bin/env python3
"""
Quick test script to verify reverse sync is working
Run this after uploading a student to CO Mapper
"""

import sys
sys.path.insert(0, 'backend')

from db_operation.db_server import DBServiceForServer

def test_reverse_sync():
    """Test the reverse sync function"""
    db_service = DBServiceForServer()
    
    # Test parameters - adjust these based on your data
    template_id = 1  # Change to your template ID
    student_reg_no = "TOC23CS049"  # The missing student
    ia_number = 1  # Change to your IA number
    
    print("=" * 60)
    print("TESTING REVERSE SYNC")
    print(f"Template ID: {template_id}")
    print(f"Student: {student_reg_no}")
    print(f"IA Number: {ia_number}")
    print("=" * 60)
    
    try:
        # Check if student has CO mapper marks
        from db_service.db_schema import StudentAnswerMark
        co_marks = db_service.db.query(StudentAnswerMark).filter(
            StudentAnswerMark.template_id == template_id,
            StudentAnswerMark.regno == student_reg_no,
            StudentAnswerMark.ia_id == ia_number
        ).all()
        
        print(f"\n✓ Found {len(co_marks)} CO mapper marks for student")
        for mark in co_marks:
            print(f"  - Q{mark.question_no}: {mark.mark} marks")
        
        # Check if evaluation schema exists
        from db_service.db_schema import EvaluationSchema
        eval_schema = db_service.db.query(EvaluationSchema).filter(
            EvaluationSchema.template_id == template_id
        ).first()
        
        if eval_schema:
            print(f"\n✓ Found evaluation schema (ID: {eval_schema.id})")
        else:
            print(f"\n✗ No evaluation schema found for template {template_id}")
            print("  You need to upload an answer key first!")
            return
        
        # Check if progress already exists
        from db_service.db_schema import StudentEvaluationProgress
        existing_progress = db_service.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.schema_id == eval_schema.id,
            StudentEvaluationProgress.student_reg_no == student_reg_no
        ).first()
        
        if existing_progress:
            print(f"\n⚠️  Student already has evaluation progress (ID: {existing_progress.id})")
            print("   Reverse sync will be skipped to avoid duplicates")
        else:
            print(f"\n✓ No existing progress - ready to sync")
        
        # Perform reverse sync
        print("\n" + "=" * 60)
        print("RUNNING REVERSE SYNC...")
        print("=" * 60)
        
        success = db_service.sync_co_mapper_to_evaluation(
            template_id=template_id,
            student_reg_no=student_reg_no,
            ia_number=ia_number
        )
        
        if success:
            print("\n" + "=" * 60)
            print("✅ REVERSE SYNC SUCCESSFUL!")
            print("=" * 60)
            
            # Verify the sync
            progress = db_service.db.query(StudentEvaluationProgress).filter(
                StudentEvaluationProgress.schema_id == eval_schema.id,
                StudentEvaluationProgress.student_reg_no == student_reg_no
            ).first()
            
            if progress:
                print(f"\n✓ Progress record created (ID: {progress.id})")
                print(f"  - Upload method: {progress.upload_method}")
                print(f"  - Total questions: {progress.total_questions}")
                
                from db_service.db_schema import StudentAnswerEvaluation
                evaluations = db_service.db.query(StudentAnswerEvaluation).filter(
                    StudentAnswerEvaluation.progress_id == progress.id
                ).all()
                
                print(f"\n✓ Created {len(evaluations)} evaluation records:")
                for eval in evaluations:
                    print(f"  - Q{eval.question_no}: {eval.mark_score} marks")
        else:
            print("\n" + "=" * 60)
            print("⚠️  REVERSE SYNC SKIPPED OR FAILED")
            print("=" * 60)
            print("Check the logs above for details")
        
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db_service.close()

if __name__ == "__main__":
    test_reverse_sync()

#!/usr/bin/env python3
"""
Quick script to sync existing CO Mapper data to Evaluation
Run this once to sync all existing students
"""

from db_operation.db_server import DBServiceForServer
from db_service.db_schema import COTemplate, StudentAnswerMark
from sqlalchemy import distinct

def sync_all_existing_data():
    """Sync all existing CO Mapper students to Evaluation"""
    db_service = DBServiceForServer()
    
    try:
        print("\n" + "="*60)
        print("SYNCING ALL EXISTING CO MAPPER DATA TO EVALUATION")
        print("="*60 + "\n")
        
        # Get all templates
        templates = db_service.db.query(COTemplate).all()
        
        total_synced = 0
        total_skipped = 0
        
        for template in templates:
            print(f"\nProcessing template: {template.name} (ID: {template.id})")
            ia_number = int(template.ia.replace("IA", ""))
            
            # Get all unique students for this template
            students = db_service.db.query(
                distinct(StudentAnswerMark.regno)
            ).filter(
                StudentAnswerMark.template_id == template.id,
                StudentAnswerMark.ia_id == ia_number
            ).all()
            
            print(f"Found {len(students)} students in CO Mapper")
            
            for (student_reg_no,) in students:
                print(f"\n  Syncing student: {student_reg_no}")
                success = db_service.sync_co_mapper_to_evaluation(
                    template_id=template.id,
                    student_reg_no=student_reg_no,
                    ia_number=ia_number
                )
                
                if success:
                    total_synced += 1
                    print(f"  ✅ Synced {student_reg_no}")
                else:
                    total_skipped += 1
                    print(f"  ⚠️ Skipped {student_reg_no} (already exists or no eval schema)")
        
        print("\n" + "="*60)
        print("SYNC COMPLETE")
        print(f"Total synced: {total_synced}")
        print(f"Total skipped: {total_skipped}")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db_service.close()

if __name__ == "__main__":
    sync_all_existing_data()

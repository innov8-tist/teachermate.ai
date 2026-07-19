"""
CO Mapper Service
Business logic layer for CO mapper operations
Handles sync operations between CO Mapper and Evaluation system
"""

from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from pathlib import Path
import uuid
import os

from .repository import CoMapperRepository
from .processing import (
    extract_co_mappings_from_image,
    ExtractionPipeline,
    ImageProcess
)
from .models import COTemplate
from services.s3_service import s3_service


class CoMapperService:
    """Service layer for CO mapper operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repository = CoMapperRepository(db)
    
    # ========== Subject Catalog ==========
    
    def get_subjects_by_semester(self, semester: int):
        """Get all subjects for a semester"""
        return self.repository.get_subjects_by_semester(semester)
    
    # ========== CO Template Operations ==========
    
    def create_co_template(self, subject_name: str, sem: int, ia_number: int,
                          student_count: int, teacher_id: int, image_content: bytes,
                          image_filename: str, temp_folder: Path):
        """
        Create CO template with image processing
        
        Args:
            subject_name: Subject name
            sem: Semester number
            ia_number: IA number
            student_count: Number of students
            teacher_id: Teacher ID
            image_content: Image file content
            image_filename: Original filename
            temp_folder: Temporary folder for processing
            
        Returns:
            Created template with processing status
        """
        unique_id = str(uuid.uuid4())
        file_extension = os.path.splitext(image_filename)[1]
        
        # Upload to S3 if available
        s3_url = None
        if s3_service.is_available:
            s3_url = s3_service.upload_co_image(image_content, file_extension)
            print(f"Uploaded CO image to S3: {s3_url}")
        
        # Save to temp folder for processing
        temp_filename = f"{unique_id}{file_extension}"
        temp_path = temp_folder / temp_filename
        with open(temp_path, "wb") as buffer:
            buffer.write(image_content)
        
        print("=" * 50)
        print("CO Creation Details:")
        print(f"Teacher ID: {teacher_id}")
        print(f"Subject Name: {subject_name}")
        print(f"Semester: {sem}")
        print(f"IA Number: {ia_number}")
        print(f"Student Count: {student_count}")
        print(f"Image Unique ID: {unique_id}")
        print(f"S3 URL: {s3_url or 'S3 not available'}")
        print(f"Temp Path: {temp_path}")
        print("=" * 50)
        
        try:
            # Create template in database
            created_subject = self.repository.create_co_template(
                subject_name=subject_name,
                sem=sem,
                ia_number=ia_number,
                student_count=student_count,
                teacher_id=teacher_id,
                image_path=s3_url or str(temp_path)
            )
            
            # Extract CO mappings using LLM
            extract_co_mappings_from_image(
                image_path=str(temp_path),
                subject_id=created_subject.id
            )
            
            # Clean up temp file
            try:
                os.remove(temp_path)
                print(f"Cleaned up temp file: {temp_path}")
            except Exception as e:
                print(f"Failed to clean up temp file: {e}")
            
            return created_subject
            
        except Exception as e:
            if temp_path.exists():
                os.remove(temp_path)
            raise e
    
    def get_templates_by_teacher(self, teacher_id: int):
        """Get all CO templates for a teacher"""
        return self.repository.get_templates_by_teacher(teacher_id)
    
    def get_template_info(self, template_id: int):
        """Get template information"""
        return self.repository.get_template_info(template_id)
    
    def get_co_details(self, template_id: int):
        """Get CO question mappings"""
        return self.repository.get_co_details(template_id)
    
    def get_questions_list(self, template_id: int):
        """Get all questions for a template"""
        return self.repository.get_questions_list(template_id)
    
    def delete_co_template(self, template_id: int):
        """
        Delete CO template with cascading delete
        Deletes: EvaluationSchema → StudentEvaluationProgress → StudentAnswerEvaluation
        Then: COQuestionMapping, StudentAnswerMark, COTemplate
        """
        try:
            print(f"Deleting CO template {template_id} and all associated data...")
            
            # Delete evaluation system records
            evaluation_schemas = self.repository.get_evaluation_schemas_by_template(template_id)
            print(f"  Found {len(evaluation_schemas)} evaluation schemas to delete")
            
            for schema in evaluation_schemas:
                progress_records = self.repository.get_progress_records_by_schema_and_regno(
                    schema.id, ""
                )
                progress_records = self.db.query(
                    self.repository.db.query.__self__.__class__
                ).filter_by(schema_id=schema.id).all()
                
                from db_service.db_schema import StudentEvaluationProgress
                progress_records = self.db.query(StudentEvaluationProgress).filter(
                    StudentEvaluationProgress.schema_id == schema.id
                ).all()
                
                print(f"  Schema {schema.id}: Found {len(progress_records)} progress records")
                
                for progress in progress_records:
                    self.repository.delete_evaluation_records_by_progress(progress.id)
                
                # Delete progress records
                for progress in progress_records:
                    self.repository.delete_progress_record(progress)
                
                # Delete schema
                self.db.delete(schema)
            
            # Delete CO mappings and marks
            self.repository.delete_mappings_by_template(template_id)
            self.repository.delete_marks_by_template(template_id)
            
            # Delete template
            success = self.repository.delete_template(template_id)
            
            if success:
                print(f"Successfully deleted CO template {template_id} and all associated data")
            
            return success
            
        except Exception as e:
            self.repository.rollback()
            print(f"Error deleting CO template: {e}")
            raise e
    
    # ========== Student Marks Operations ==========
    
    def get_students_by_template(self, template_id: int):
        """Get students who submitted for a template"""
        return self.repository.get_students_by_template(template_id)
    
    def get_student_marks(self, template_id: int, regno: str):
        """Get marks for a specific student"""
        return self.repository.get_student_marks(template_id, regno)
    
    def delete_student_marks(self, template_id: int, regno: str):
        """
        Delete student marks and related evaluation records
        """
        try:
            print(f"\n{'='*60}")
            print(f"DELETING STUDENT MARKS FROM CO MAPPER")
            print(f"Student: {regno}")
            print(f"Template ID: {template_id}")
            print(f"{'='*60}\n")
            
            # Delete CO mapper marks
            deleted_marks = self.repository.delete_student_marks_by_template_and_regno(
                template_id, regno
            )
            
            print(f"✓ Deleted {deleted_marks} CO mapper marks")
            
            # Delete from Evaluation system
            evaluation_schemas = self.repository.get_evaluation_schemas_by_template(template_id)
            
            total_deleted_evaluations = 0
            total_deleted_progress = 0
            
            for schema in evaluation_schemas:
                progress_records = self.repository.get_progress_records_by_schema_and_regno(
                    schema.id, regno
                )
                
                for progress in progress_records:
                    deleted_evals = self.repository.delete_evaluation_records_by_progress(progress.id)
                    total_deleted_evaluations += deleted_evals
                    
                    self.repository.delete_progress_record(progress)
                    total_deleted_progress += 1
            
            self.repository.commit()
            
            print(f"✓ Deleted {total_deleted_evaluations} evaluation records")
            print(f"✓ Deleted {total_deleted_progress} progress records")
            print(f"\n{'='*60}")
            print(f"✅ DELETION COMPLETE")
            print(f"CO mapper marks: {deleted_marks}")
            print(f"Evaluation records: {total_deleted_evaluations}")
            print(f"Progress records: {total_deleted_progress}")
            print(f"{'='*60}\n")
            
            return deleted_marks > 0
            
        except Exception as e:
            self.repository.rollback()
            print(f"Error deleting student marks: {e}")
            raise e
    
    # ========== Excel Export ==========
    
    def get_excel_data(self, template_id: int):
        """Get data formatted for Excel export"""
        return self.repository.get_co_mapped_data_for_excel(template_id)
    
    # ========== Student Sheet Upload ==========
    
    def process_student_sheet(self, template_id: int, image_content: bytes,
                             image_filename: str, temp_folder: Path):
        """
        Process student answer sheet: extract regno and marks
        
        Returns:
            dict with extraction results and sync status
        """
        try:
            unique_id = str(uuid.uuid4())
            file_extension = os.path.splitext(image_filename)[1]
            
            # Upload original to S3
            original_s3_url = None
            if s3_service.is_available:
                original_s3_url = s3_service.upload_student_sheet(
                    file_content=image_content,
                    file_extension=file_extension,
                    subject_id=template_id,
                    unique_id=unique_id
                )
            
            # Save to temp folder
            temp_filename = f"{template_id}_{unique_id}{file_extension}"
            temp_path = temp_folder / temp_filename
            with open(temp_path, "wb") as buffer:
                buffer.write(image_content)
            
            print("=" * 50)
            print("Student Sheet Upload Details:")
            print(f"Template ID: {template_id}")
            print(f"Image Unique ID: {unique_id}")
            print(f"Original S3 URL: {original_s3_url or 'S3 not available'}")
            print(f"Temp Path: {temp_path}")
            print("=" * 50)
            
            # Get template to find IA number
            template = self.db.query(COTemplate).filter(COTemplate.id == template_id).first()
            if not template:
                if temp_path.exists():
                    os.remove(temp_path)
                raise ValueError("CO template not found")
            
            ia_number = int(template.ia.replace("IA", ""))
            
            # Process image
            image_processor = ImageProcess()
            processed_images = image_processor.process_student_image(
                image_path=str(temp_path),
                subject_id=template_id,
                unique_id=unique_id,
                output_dir=None
            )
            
            # Upload processed images to S3
            top_s3_url = None
            bot_s3_url = None
            if s3_service.is_available:
                top_s3_url = s3_service.upload_processed_image(
                    file_content=processed_images['top_image_bytes'],
                    file_extension='.png',
                    subject_id=template_id,
                    unique_id=unique_id,
                    image_type='top'
                )
                bot_s3_url = s3_service.upload_processed_image(
                    file_content=processed_images['bot_image_bytes'],
                    file_extension='.png',
                    subject_id=template_id,
                    unique_id=unique_id,
                    image_type='bot'
                )
            
            print("=" * 50)
            print("Processed Images:")
            print(f"Top S3 URL: {top_s3_url or 'S3 not available'}")
            print(f"Bottom S3 URL: {bot_s3_url or 'S3 not available'}")
            print("=" * 50)
            
            # Extract data using LLM
            extraction_pipeline = ExtractionPipeline()
            extracted_data = extraction_pipeline.process_student_sheet(
                top_image_path=top_s3_url,
                bottom_image_path=bot_s3_url,
                subject_id=template_id,
                ia_id=ia_number,
                save_to_db=True
            )
            
            print("=" * 50)
            print("Extracted Data:")
            print(f"Registration No: {extracted_data['regno']}")
            print(f"Marks: {extracted_data['marks']}")
            print(f"IA Number: {ia_number}")
            print("Data saved to database!")
            print("=" * 50)
            
            # Reverse sync to Evaluation system
            print("\n" + "=" * 50)
            print("ATTEMPTING REVERSE SYNC TO EVALUATION...")
            print("=" * 50)
            
            reverse_sync_success = self.sync_co_mapper_to_evaluation(
                template_id=template_id,
                student_reg_no=extracted_data['regno'],
                ia_number=ia_number
            )
            
            if reverse_sync_success:
                print("✅ Successfully synced CO Mapper data to Evaluation system")
            else:
                print("⚠️ Reverse sync skipped (evaluation schema not found or already exists)")
            
            # Clean up temp files
            try:
                if temp_path.exists():
                    os.remove(temp_path)
                image_processor.cleanup_temp_files(
                    processed_images['top_image_path'],
                    processed_images['bot_image_path']
                )
                print("All temporary files cleaned up")
            except Exception as e:
                print(f"Failed to clean up some temp files: {e}")
            
            return {
                "success": True,
                "data": {
                    "subject_id": template_id,
                    "ia_number": ia_number,
                    "image_id": unique_id,
                    "original_image_url": original_s3_url,
                    "top_image_url": top_s3_url,
                    "bot_image_url": bot_s3_url,
                    "regno": extracted_data['regno'],
                    "marks": extracted_data['marks']
                },
                "evaluation_synced": reverse_sync_success
            }
            
        except Exception as e:
            print(f"Error processing student sheet: {str(e)}")
            # Clean up on error
            try:
                if 'temp_path' in locals() and temp_path.exists():
                    os.remove(temp_path)
                if 'processed_images' in locals():
                    image_processor.cleanup_temp_files(
                        processed_images.get('top_image_path'),
                        processed_images.get('bot_image_path')
                    )
            except:
                pass
            raise e
    
    # ========== Sync Operations ==========
    
    def sync_co_mapper_to_evaluation(self, template_id: int, student_reg_no: str, ia_number: int):
        """
        Reverse sync: Create evaluation records from CO mapper data
        Called when student answer sheet is uploaded directly to CO Mapper
        """
        try:
            print(f"\n{'='*60}")
            print(f"REVERSE SYNC: CO MAPPER → EVALUATION")
            print(f"Student: {student_reg_no}")
            print(f"Template ID: {template_id}")
            print(f"IA Number: {ia_number}")
            print(f"{'='*60}\n")
            
            # Get CO mapper marks
            co_marks = self.repository.get_student_marks_for_sync(
                template_id, student_reg_no, ia_number
            )
            
            if not co_marks:
                print(f"⚠️ No CO mapper marks found for student {student_reg_no}")
                return False
            
            print(f"Found {len(co_marks)} CO mapper marks")
            
            # Find evaluation schema
            evaluation_schema = self.repository.get_evaluation_schema_by_template(template_id)
            
            if not evaluation_schema:
                print(f"⚠️ No evaluation schema found for template {template_id}")
                print(f"   Student marks saved to CO Mapper only")
                return False
            
            print(f"Found evaluation schema: {evaluation_schema.id}")
            
            # Check if progress already exists
            existing_progress = self.repository.get_student_progress_by_schema_and_regno(
                evaluation_schema.id, student_reg_no
            )
            
            if existing_progress:
                print(f"⚠️ Evaluation progress already exists for student {student_reg_no}")
                print(f"   Skipping reverse sync to avoid duplicates")
                return False
            
            # Create progress record
            timestamp = datetime.now().isoformat()
            progress = self.repository.create_student_progress(
                schema_id=evaluation_schema.id,
                teacher_id=evaluation_schema.teacher_id,
                regno=student_reg_no,
                total_questions=len(co_marks),
                upload_method='co_mapper',
                timestamp=timestamp
            )
            
            print(f"✓ Created progress record (ID: {progress.id})")
            
            # Create evaluation records
            evaluations_created = 0
            for mark in co_marks:
                self.repository.create_student_evaluation(
                    progress_id=progress.id,
                    teacher_id=evaluation_schema.teacher_id,
                    regno=student_reg_no,
                    question_no=mark.question_no,
                    mark_score=float(mark.mark),
                    total_mark=int(float(mark.mark)),
                    feedback=[],
                    timestamp=timestamp
                )
                evaluations_created += 1
                print(f"  ✓ Q{mark.question_no}: {mark.mark} marks")
            
            self.repository.commit()
            
            print(f"\n{'='*60}")
            print(f"✅ REVERSE SYNC COMPLETED")
            print(f"Progress record created: 1")
            print(f"Evaluation records created: {evaluations_created}")
            print(f"{'='*60}\n")
            
            return True
            
        except Exception as e:
            self.repository.rollback()
            print(f"Error in reverse sync: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

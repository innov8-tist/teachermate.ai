from PIL import Image
import numpy as np
import cv2
import fitz  
import os
import shutil

class ImageProcess:

    def save_first_page_as_png(self, pdf_path: str, output_image: str = "page_1.png"):
        with fitz.open(pdf_path) as doc:
            page = doc.load_page(0)
            pix = page.get_pixmap(dpi=300)
            pix.save(output_image)
        print(f"First page saved as {output_image}")

    def split_image_half(self, image_name: str):
        img = Image.open(image_name)
        width, height = img.size
        mid_y = height // 2

        img.crop((0, 0, width, mid_y)).save("top.png")
        img.crop((0, mid_y, width, height)).save("bot.png")

        print("Vertical 50-50 split done")

    def _middle_crop(self, image_name: str, top_ratio: float, bottom_ratio: float, output: str):
        img = Image.open(image_name)
        width, height = img.size

        top_cut = int(height * top_ratio)
        bottom_cut = int(height * bottom_ratio)

        img.crop((0, top_cut, width, bottom_cut)).save(output)
        return output

    def middle_croping_top(self, image_name: str, output: str = "top.png"):
        return self._middle_crop(image_name, 0.25, 0.80, output)

    def middle_croping_bottom(self, image_name: str, output: str = "bot.png"):
        return self._middle_crop(image_name, 0.35, 1.0, output)

    def ocr_enhancement(self, image_name: str):
        img = cv2.imread(image_name)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        clahe = cv2.createCLAHE(clipLimit=2, tileGridSize=(8, 8))
        contrast = clahe.apply(gray)

        denoised = cv2.fastNlMeansDenoising(
            contrast,
            None,
            h=7,
            templateWindowSize=7,
            searchWindowSize=21
        )

        kernel = np.array([
            [0, -0.5, 0],
            [-0.5, 3, -0.5],
            [0, -0.5, 0]
        ])

        sharpened = cv2.filter2D(denoised, -1, kernel)
        cv2.imwrite(image_name, sharpened)

    def process_student_image(self, image_path: str, subject_id: int, unique_id: str, output_dir: str = None):
        """
        Process student answer sheet image and return top/bottom parts as bytes
        
        Args:
            image_path: Path to the uploaded image
            subject_id: Subject ID for naming
            unique_id: Unique identifier for the image
            output_dir: Optional directory to save processed images locally (for fallback)
        
        Returns:
            dict with paths and bytes for top and bottom images
        """
        # Temporary files for processing
        temp_top = f"temp_top_{unique_id}.png"
        temp_bot = f"temp_bot_{unique_id}.png"
        temp_split_top = f"temp_split_top_{unique_id}.png"
        temp_split_bot = f"temp_split_bot_{unique_id}.png"
        
        try:
            # Split image into top and bottom halves
            img = Image.open(image_path)
            width, height = img.size
            mid_y = height // 2

            img.crop((0, 0, width, mid_y)).save(temp_split_top)
            img.crop((0, mid_y, width, height)).save(temp_split_bot)
            
            # Crop the middle sections
            self.middle_croping_top(temp_split_top, temp_top)
            self.middle_croping_bottom(temp_split_bot, temp_bot)
            
            # Apply OCR enhancement
            self.ocr_enhancement(temp_top)
            self.ocr_enhancement(temp_bot)
            
            # Read processed images as bytes
            with open(temp_top, 'rb') as f:
                top_bytes = f.read()
            with open(temp_bot, 'rb') as f:
                bot_bytes = f.read()
            
            result = {
                "top_image_bytes": top_bytes,
                "bot_image_bytes": bot_bytes,
                "top_image_path": temp_top,
                "bot_image_path": temp_bot
            }
            
            # Optionally save to output directory for fallback
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                top_output = os.path.join(output_dir, f"{subject_id}_{unique_id}_top.png")
                bot_output = os.path.join(output_dir, f"{subject_id}_{unique_id}_bot.png")
                shutil.copy(temp_top, top_output)
                shutil.copy(temp_bot, bot_output)
                result["top_image_fallback"] = top_output
                result["bot_image_fallback"] = bot_output
            
            # Clean up temporary split files
            for temp_file in [temp_split_top, temp_split_bot]:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            
            print(f"Processed images ready for upload")
            
            return result
        except Exception as e:
            # Clean up on error
            for temp_file in [temp_split_top, temp_split_bot, temp_top, temp_bot]:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            raise e
    
    def cleanup_temp_files(self, temp_top: str, temp_bot: str):
        """Clean up temporary processing files"""
        for temp_file in [temp_top, temp_bot]:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                    print(f"✓ Cleaned up temp file: {temp_file}")
                except Exception as e:
                    print(f"⚠ Failed to clean up {temp_file}: {e}")


if __name__ == "__main__":
    pipeline = ImageProcess()
    pdf_path="../answer_sheet_pdfs/ARJUN A.pdf"

    pipeline.save_first_page_as_png(pdf_path, "first_page.png")
    pipeline.split_image_half("first_page.png")
    pipeline.middle_croping_top("top.png")
    pipeline.middle_croping_bottom("bot.png")
    pipeline.ocr_enhancement("top.png")
    pipeline.ocr_enhancement("bot.png")

    student_name = os.path.splitext(os.path.basename(pdf_path))[0]
    base_output_dir = os.path.join("..", "answer_sheet_processed_images")
    student_dir = os.path.join(base_output_dir, student_name)
    os.makedirs(student_dir, exist_ok=True)


    for img in ["top.png", "bot.png"]:
        if os.path.exists(img):
            shutil.move(img, os.path.join(student_dir, img))

    print(f"Moved images to {student_dir}")
    if os.path.exists("first_page.png"):
        os.remove("first_page.png")
        print("first_page.png removed")

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

    def process_student_image(self, image_path: str, subject_id: int, unique_id: str, output_dir: str):
        """
        Process student answer sheet image and save top/bottom parts
        
        Args:
            image_path: Path to the uploaded image
            subject_id: Subject ID for naming
            unique_id: Unique identifier for the image
            output_dir: Directory to save processed images
        
        Returns:
            dict with paths to top and bottom images
        """
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Define output paths
        top_output = os.path.join(output_dir, f"{subject_id}_{unique_id}_top.png")
        bot_output = os.path.join(output_dir, f"{subject_id}_{unique_id}_bot.png")
        
        # Temporary files for processing
        temp_top = "temp_top.png"
        temp_bot = "temp_bot.png"
        
        try:
            # Split image into top and bottom halves
            self.split_image_half(image_path)
            
            # Crop the middle sections
            self.middle_croping_top("top.png", temp_top)
            self.middle_croping_bottom("bot.png", temp_bot)
            
            # Apply OCR enhancement
            self.ocr_enhancement(temp_top)
            self.ocr_enhancement(temp_bot)
            
            # Move to final destination
            shutil.move(temp_top, top_output)
            shutil.move(temp_bot, bot_output)
            
            # Clean up temporary files
            for temp_file in ["top.png", "bot.png"]:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            
            print(f"Processed images saved to {output_dir}")
            
            return {
                "top_image": top_output,
                "bot_image": bot_output
            }
        except Exception as e:
            # Clean up on error
            for temp_file in ["top.png", "bot.png", temp_top, temp_bot]:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            raise e


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

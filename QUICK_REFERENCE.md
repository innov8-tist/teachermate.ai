# PDF Cropping - Quick Reference Guide

## 🚀 Quick Start

### Run Backend
```bash
cd backend
./start_server.sh
```

### Run Frontend (EAS Dev Client Required)
```bash
cd app
npx expo start --dev-client
```

## 📁 Key Files

### Frontend
```
app/screens/evaluation/
├── pdf-cropper-screen.tsx       ← Main cropper component
├── attach-images-screen.tsx     ← Question list with crop previews
├── upload-schema-screen.tsx     ← PDF upload
└── evaluation-home.tsx          ← Schema list

app/app/(tabs)/index.tsx         ← Navigation & state management
```

### Backend
```
backend/routes/evaluation.py     ← API endpoints
backend/server.py                ← Route mounting
backend/public/
├── evaluation_pdfs/             ← Uploaded PDFs
└── evaluation_crops/            ← Cropped images
```

## 🔌 API Endpoints

### Upload PDF
```http
POST /api/evaluation/upload-schema-pdf
Content-Type: multipart/form-data

subject: "MSS - IA 1"
pdf_file: <file>
```

### Crop Section
```http
POST /api/evaluation/crop-pdf-section
Content-Type: application/json

{
  "pdf_uri": "/public/evaluation_pdfs/{uuid}.pdf",
  "page_number": 1,
  "x": 10.5,
  "y": 20.3,
  "width": 80.0,
  "height": 30.0
}
```

### Submit Schema
```http
POST /api/evaluation/submit-answer-schema
Content-Type: multipart/form-data

subject: "MSS - IA 1"
pdf_id: "uuid"
questions_data: "[{...}]"
```

## 📊 Data Models

### CropRect
```typescript
{
  x: number;        // 0-100 (percentage)
  y: number;        // 0-100 (percentage)
  width: number;    // 0-100 (percentage)
  height: number;   // 0-100 (percentage)
}
```

### CroppedSection
```typescript
{
  questionId: string;
  pdfUri: string;
  pageNumber: number;
  crop: CropRect;
  timestamp: number;
}
```

### Question
```typescript
{
  id: string;
  label: string;
  images: string[];
  croppedSections?: CroppedSection[];
}
```

## 🎯 User Flow

```
1. Evaluation Tab → Tap "+" FAB
2. Select Subject → Upload PDF → Tap "Continue"
3. Question List → Tap "+" on question
4. PDF Cropper → Tap "Start Cropping"
5. Drag & Resize Rectangle → Tap "Confirm"
6. Back to Question List → Repeat for other questions
7. Tap "Submit" → Success!
```

## 🛠️ Common Tasks

### Add New Question
```typescript
// In index.tsx
const [questions, setQuestions] = useState<Question[]>([
  { id: '7', label: 'Question 7', images: [], croppedSections: [] },
  // Add more...
]);
```

### Customize Crop Rectangle
```typescript
// In pdf-cropper-screen.tsx
const cropX = useSharedValue(SCREEN_WIDTH * 0.1);      // Initial X
const cropY = useSharedValue(PDF_CONTAINER_HEIGHT * 0.1); // Initial Y
const cropWidth = useSharedValue(SCREEN_WIDTH * 0.8);  // Initial width
const cropHeight = useSharedValue(PDF_CONTAINER_HEIGHT * 0.3); // Initial height
```

### Customize Gestures (Reanimated v4 API)
```typescript
// In pdf-cropper-screen.tsx
const panGesture = Gesture.Pan()
  .onStart(() => {
    'worklet';
    // Save initial position
  })
  .onUpdate((event) => {
    'worklet';
    // Update crop position
  });
```

### Change Crop Color
```typescript
// In pdf-cropper-screen.tsx
borderColor: '#14B8A6',  // Teal - change to any color
backgroundColor: '#14B8A6', // Handle color
```

### Adjust Minimum Crop Size
```typescript
// In pdf-cropper-screen.tsx
const MIN_CROP_SIZE = 50; // Change to desired minimum (pixels)
```

## 🐛 Debugging

### Check PDF Upload
```bash
# Backend logs
tail -f backend/logs/server.log

# Check uploaded files
ls -la backend/public/evaluation_pdfs/
```

### Check Crop Output
```bash
# Check cropped images
ls -la backend/public/evaluation_crops/

# View image details
file backend/public/evaluation_crops/*.png
```

### Frontend Debugging
```typescript
// In pdf-cropper-screen.tsx
console.log('Crop coordinates:', {
  x: cropX.value,
  y: cropY.value,
  width: cropWidth.value,
  height: cropHeight.value
});

// In attach-images-screen.tsx
console.log('Questions:', questions);
console.log('Cropped sections:', questions[0].croppedSections);
```

## ⚠️ Common Issues

### PDF Not Rendering
- **Cause**: Using Expo Go instead of Dev Client
- **Fix**: Build with `eas build --profile development`

### Crop Rectangle Not Visible
- **Cause**: Not in cropping mode
- **Fix**: Tap "Start Cropping" button

### Backend 404 on Crop
- **Cause**: PDF file not found
- **Fix**: Check PDF was uploaded successfully

### Gestures Not Working
- **Cause**: Missing GestureHandlerRootView
- **Fix**: Already wrapped in PDFCropperScreen

## 📦 Dependencies

### Already Installed ✅
- react-native-pdf
- react-native-gesture-handler
- react-native-reanimated
- expo-dev-client
- expo-document-picker

### Backend
- PyMuPDF (fitz)
- Pillow
- FastAPI

## 🎨 Styling

### Colors
```typescript
Primary: '#14B8A6'    // Teal
Background: '#F9FAFB' // Light gray
Border: '#E5E7EB'     // Gray
Text: '#111827'       // Dark gray
Overlay: 'rgba(0, 0, 0, 0.5)' // Semi-transparent black
```

### Dimensions
```typescript
HEADER_HEIGHT: 60
FOOTER_HEIGHT: 80
MIN_CROP_SIZE: 50
HANDLE_SIZE: 24
```

## 🧪 Testing Checklist

- [ ] PDF uploads successfully
- [ ] PDF renders on screen
- [ ] Crop rectangle appears
- [ ] Rectangle can be moved
- [ ] Corner handles resize
- [ ] Stays within bounds
- [ ] Confirm saves crop
- [ ] Preview shows page number
- [ ] Multiple crops work
- [ ] Submit validates crops
- [ ] Backend crops correctly
- [ ] Images saved at 300 DPI

## 📝 Code Snippets

### Get Crop Percentage
```typescript
const getPercentageCrop = (): CropRect => {
  return {
    x: (cropX.value / pdfDimensions.width) * 100,
    y: (cropY.value / pdfDimensions.height) * 100,
    width: (cropWidth.value / pdfDimensions.width) * 100,
    height: (cropHeight.value / pdfDimensions.height) * 100,
  };
};
```

### Add Cropped Section
```typescript
const handleCropConfirm = (croppedSection: CroppedSection) => {
  const updatedQuestions = questions.map(q =>
    q.id === croppedSection.questionId
      ? { 
          ...q, 
          croppedSections: [...(q.croppedSections || []), croppedSection] 
        }
      : q
  );
  setQuestions(updatedQuestions);
};
```

### Backend Crop
```python
# Render page at 300 DPI
mat = fitz.Matrix(300/72, 300/72)
pix = page.get_pixmap(matrix=mat)

# Convert percentages to pixels
crop_x = int((crop_request.x / 100) * img_width)
crop_y = int((crop_request.y / 100) * img_height)

# Crop image
cropped_img = img.crop((crop_x, crop_y, crop_x + crop_width, crop_y + crop_height))
```

## 🔗 Related Files

- `EVALUATION_PDF_WORKFLOW_NEW.md` - Full documentation
- `IMPLEMENTATION_SUMMARY.md` - What changed
- `EVALUATION_PDF_WORKFLOW.md` - Old implementation (deprecated)

## 💡 Tips

1. **Always use percentages** for crop coordinates (resolution-independent)
2. **Test on physical device** for accurate gesture handling
3. **Use 300 DPI** for backend cropping (good quality)
4. **Validate crop size** before confirming (min 5% area)
5. **Show page numbers** in previews (helps users identify crops)

## 🚨 Important Notes

- ⚠️ Requires EAS Dev Client (not Expo Go)
- ⚠️ PDF must be uploaded before cropping
- ⚠️ Crop coordinates are percentages (0-100)
- ⚠️ Backend crops at 300 DPI (high quality)
- ⚠️ Authentication required for all endpoints

## 📞 Support

For issues or questions:
1. Check diagnostics: `getDiagnostics` tool
2. Review logs: Backend and Metro bundler
3. Test on physical device
4. Verify dependencies installed
5. Check EAS Dev Client build

---

**Last Updated**: January 2026
**Status**: ✅ Production Ready

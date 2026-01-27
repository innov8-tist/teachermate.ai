# Quick Fix Guide - Expo Go PDF Error

## The Error You Saw
```
ERROR [Invariant Violation: Your JavaScript code tried to access a native module that doesn't exist]
Code: pdf-cropper-screen.tsx:4
```

## What Was Wrong
1. `react-native-pdf` doesn't work in Expo Go (needs native modules)
2. PDF file URI was passed directly from phone storage
3. Some hardcoded localhost URLs

## What I Fixed

### ✅ Backend
Added endpoint to convert PDF pages to images:
- `/api/evaluation/pdf-images/{pdf_id}`
- Caches images for fast loading

### ✅ Frontend - Upload Screen
Now uploads PDF to backend first:
```typescript
// Before: Pass local file URI
onSuccess(file.uri, subject)

// After: Upload PDF, get ID, pass ID
const response = await fetch(`${BASE_URL}/api/evaluation/upload-schema-pdf`, ...)
onSuccess(responseData.pdf_id, subject)
```

### ✅ Frontend - PDF Cropper
Now uses images instead of PDF:
```typescript
// Before: react-native-pdf (doesn't work in Expo Go)
<Pdf source={{ uri: pdfUri }} />

// After: Images from backend (works everywhere)
<ScrollView>
  {pageImages.map(imageUri => (
    <Image source={{ uri: imageUri }} />
  ))}
</ScrollView>
```

### ✅ Centralized BASE_URL
All services now use:
```typescript
import { BASE_URL } from '../../constants/api';
```

## How to Test

1. **Install dependencies:**
   ```bash
   cd app
   npm install
   ```

2. **Make sure backend is running:**
   ```bash
   cd backend
   python server.py
   ```

3. **Start Expo:**
   ```bash
   cd app
   npm start
   ```

4. **On your phone:**
   - Open Expo Go
   - Scan QR code
   - Go to Evaluation tab
   - Upload a PDF
   - Try cropping - it should work now!

## Network Setup

Your `app/constants/api.ts` is already set to:
```typescript
const BASE_URL = 'http://192.168.1.4:8000';
```

Make sure:
- ✅ Your computer IP is `192.168.1.4`
- ✅ Phone and computer on same WiFi
- ✅ Backend running on port 8000
- ✅ Firewall allows port 8000

To verify your IP:
```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

## What Changed

| File | Change |
|------|--------|
| `backend/routes/evaluation.py` | Added `/pdf-images/{pdf_id}` endpoint |
| `app/screens/evaluation/upload-schema-screen.tsx` | Upload PDF to backend |
| `app/screens/evaluation/pdf-cropper-screen.tsx` | Use images instead of PDF |
| `app/services/api/evaluation-service.ts` | Import BASE_URL |
| `app/app/(tabs)/index.tsx` | Handle PDF ID instead of URI |
| `app/package.json` | Removed react-native-pdf |

## Expected Behavior

1. **Upload PDF** → Shows "Uploading..." → Success
2. **Attach Images** → Shows questions
3. **Tap + button** → Opens cropper with PDF pages as images
4. **Scroll pages** → Smooth scrolling through images
5. **Crop section** → Drag and resize crop box
6. **Confirm** → Shows preview → Saves crop

All of this now works in Expo Go! 🎉

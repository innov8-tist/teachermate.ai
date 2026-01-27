# Quick Fix Guide - PDF Cropper Multi-Page Issue

## Problem
Cropping worked on page 1 but not on other pages.

## Solution
Changed from client-side image cropping to backend-based PDF cropping.

## What to Test

1. **Start backend**: `cd backend && python server.py`
2. **Start app**: `cd app && npm start`
3. **Upload PDF** with multiple pages
4. **Crop page 1** - should work
5. **Scroll to page 2** - footer shows "Page 2"
6. **Crop page 2** - should now work! ✅

## How It Works Now

```
Frontend                          Backend
--------                          -------
1. User crops area
2. Convert to %                   
3. Send to API        ──────►     4. Open PDF
                                  5. Load page 2
                                  6. Render at 300 DPI
                                  7. Crop using %
                                  8. Save image
9. Display preview    ◄──────     9. Return URL
```

## Key Changes

### Frontend (`app/screens/evaluation/pdf-cropper-screen.tsx`)
- Removed: Client-side image manipulation
- Added: API call to backend with percentages
- Simpler: Just send crop coordinates as %

### Backend (`backend/routes/evaluation.py`)
- Added: Detailed logging
- Already had: Crop endpoint working
- Now: Better debugging output

## Debugging

**Frontend logs**:
```
🎯 Sending crop request to backend...
📄 Page: 2  ← Should match current page
📏 Crop percentages: { x: 25, y: 30, width: 50, height: 40 }
```

**Backend logs**:
```
🎯 Crop request received:
  Page: 2  ← Should match frontend
📖 Loaded page 2 (0-indexed: 1)
✂️ Crop coordinates (pixels): x=877, y=1488, w=1754, h=1984
✅ Cropped image size: (1754, 1984)
```

## If Still Not Working

1. **Check page number** - Is it updating when you scroll?
2. **Check backend logs** - Is it receiving the request?
3. **Check network** - Any errors in the API call?

## Files Modified
- `app/screens/evaluation/pdf-cropper-screen.tsx`
- `backend/routes/evaluation.py`

## Documentation
- `FINAL_SOLUTION.md` - Complete explanation
- `BACKEND_CROP_SOLUTION.md` - Detailed flow
- This file - Quick reference

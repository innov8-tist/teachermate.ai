# Quick Test - Is Reverse Sync Working?

## Check Backend Console

When you upload a student answer sheet to CO Mapper, look for these messages in the backend console:

### ✅ SUCCESS - You should see:
```
==================================================
ATTEMPTING REVERSE SYNC TO EVALUATION...
==================================================

============================================================
REVERSE SYNC: CO MAPPER → EVALUATION
Student: TOC23CS049
Template ID: 45
IA Number: 1
============================================================

Found 5 CO mapper marks
Found evaluation schema: 123
✓ Created progress record (ID: 456)
  ✓ Q1: 3 marks
  ✓ Q2: 3 marks

============================================================
✅ REVERSE SYNC COMPLETED
Progress record created: 1
Evaluation records created: 5
============================================================

✅ Successfully synced CO Mapper data to Evaluation system
```

### ⚠️ SKIPPED - You might see:
```
⚠️ No evaluation schema found for template 45
   Student marks saved to CO Mapper only
```
**This means**: You need to upload answer key PDF in Evaluation section first!

### ❌ ERROR - You might see:
```
Error in reverse sync: [error message]
```
**This means**: There's a bug - send me the error message

## What to Check

1. **Did you restart backend server?**
   - Stop server (Ctrl+C)
   - Start again: `python server.py` or `uvicorn server:app --reload`

2. **Is there an evaluation schema?**
   - Go to Evaluation section
   - Check if MPMC has an answer key uploaded
   - If not, upload answer key PDF first

3. **Check the console output**
   - Copy the entire output when you upload
   - Send it to me if there's an error

## Quick Fix Steps

### Step 1: Upload Answer Key (if not done)
1. Go to Evaluation section
2. Click "Upload" on MPMC
3. Select answer key PDF
4. Upload

### Step 2: Upload Student Sheet
1. Go to CO Mapper
2. Click "Upload" on MPMC  
3. Upload student answer sheet image
4. Watch backend console

### Step 3: Check Results
1. Go to Evaluation section
2. Click "Results" on MPMC
3. Student should appear

## If Still Not Working

Send me:
1. Backend console output (copy everything)
2. Screenshot of Evaluation section
3. Screenshot of CO Mapper section

I'll fix it immediately!

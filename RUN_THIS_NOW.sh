#!/bin/bash
# Quick fix to sync existing CO Mapper data to Evaluation

echo "=========================================="
echo "Syncing CO Mapper data to Evaluation..."
echo "=========================================="

cd backend
python sync_existing_data.py

echo ""
echo "=========================================="
echo "✅ DONE! Now restart your backend server"
echo "=========================================="
echo ""
echo "Then check Evaluation section - all students should appear!"

#!/bin/bash

# Test script to verify analytics ranges are correct
# Replace YOUR_TOKEN with your actual JWT token

echo "Testing Analytics Score Distribution Endpoint..."
echo "================================================"
echo ""

# Test without authentication (should fail)
echo "1. Testing endpoint accessibility..."
curl -s -X GET "http://localhost:8000/api/analytics/score-distribution" | jq '.' 2>/dev/null || echo "❌ Endpoint requires authentication (expected)"
echo ""

# Test with authentication (replace YOUR_TOKEN)
echo "2. Testing with authentication (replace YOUR_TOKEN in script)..."
echo "   curl -X GET 'http://localhost:8000/api/analytics/score-distribution' -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""

# Expected response format
echo "3. Expected Response Format:"
cat << 'EOF'
{
  "ranges": [
    {"range": "0-47", "count": X, "label": "Fail"},
    {"range": "48-59", "count": Y, "label": "Pass"},
    {"range": "60-74", "count": Z, "label": "Good"},
    {"range": "75-100", "count": W, "label": "Excellent"}
  ]
}
EOF
echo ""

echo "4. If you see ranges like '0-40', '41-60', '61-80', '81-100':"
echo "   → Backend is NOT running the updated code"
echo "   → Restart the backend server"
echo ""

echo "5. If you see ranges like '0-47', '48-59', '60-74', '75-100':"
echo "   → Backend is correct ✓"
echo "   → Issue is in frontend cache"
echo "   → Pull down to refresh in the app"
echo ""

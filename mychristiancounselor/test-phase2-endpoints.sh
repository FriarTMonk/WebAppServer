#!/bin/bash
API_URL="http://localhost:3697"
TOKEN="your-jwt-token-here"

echo "Testing Phase 2 API Endpoints..."

# 1. Custom assessment assignment
echo "\n1. POST /counsel/assessments/custom/:id/assign"
curl -X POST "$API_URL/counsel/assessments/custom/test-id/assign" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"memberId":"test-member-id"}'

# 2. Reading list GET
echo "\n\n2. GET /resources/reading-list"
curl "$API_URL/resources/reading-list?status=all" \
  -H "Authorization: Bearer $TOKEN"

# 3. Reading list POST
echo "\n\n3. POST /resources/reading-list"
curl -X POST "$API_URL/resources/reading-list" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"test-book-id","status":"want_to_read"}'

# 4. Reading list PUT
echo "\n\n4. PUT /resources/reading-list/:itemId"
curl -X PUT "$API_URL/resources/reading-list/test-item-id" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"currently_reading","progress":50}'

# 5. Reading list DELETE
echo "\n\n5. DELETE /resources/reading-list/:itemId"
curl -X DELETE "$API_URL/resources/reading-list/test-item-id" \
  -H "Authorization: Bearer $TOKEN"

# 6. CSV export
echo "\n\n6. GET /counsel/wellbeing/member/:id/history/export"
curl "$API_URL/counsel/wellbeing/member/test-member-id/history/export" \
  -H "Authorization: Bearer $TOKEN"

# 7. Assessment form
echo "\n\n7. GET /counsel/assessments/assigned/:id/form"
curl "$API_URL/counsel/assessments/assigned/test-assigned-id/form" \
  -H "Authorization: Bearer $TOKEN"

echo "\n\nAll tests complete!"

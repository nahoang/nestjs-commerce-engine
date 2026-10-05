# 00-foundation/health.hurl
# Kiểm tra hợp đồng cơ sở hạ tầng: /health, X-Request-ID, 404 envelope, 422 envelope

# 1. Health check & Request ID tự sinh
GET {{base_url}}/health
HTTP 200
[Asserts]
header "X-Request-ID" exists
jsonpath "$.status" == "healthy"
jsonpath "$.version" exists

# 2. Request ID được echo lại đúng giá trị client gửi
GET {{base_url}}/health
X-Request-ID: req-echo-{{run_id}}
HTTP 200
[Asserts]
header "X-Request-ID" == "req-echo-{{run_id}}"
jsonpath "$.status" == "healthy"

# 3. 404 envelope khi không tìm thấy tài nguyên nghiệp vụ (ENTITY_NOT_FOUND)
GET {{base_url}}/api/v1/test-exceptions/entity-not-found
HTTP 404
[Asserts]
header "X-Request-ID" exists
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"
jsonpath "$.detail" exists

# 4. 422 envelope khi request body vi phạm validation (VALIDATION_ERROR)
POST {{base_url}}/api/v1/test-fixtures/products
Content-Type: application/json
{}
HTTP 422
[Asserts]
header "X-Request-ID" exists
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.detail" exists
jsonpath "$.errors" count >= 1
jsonpath "$.errors[0].field" exists

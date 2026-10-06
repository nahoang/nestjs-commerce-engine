# 01-catalog/1.7-channels.hurl
# Test contract for Step 1.7: Kênh bán hàng (DOMAIN-SPEC-1-CATALOG § 1.7)

# 1. Tạo kênh VND, slug tự sinh từ tên (R1), mặc định is_active = true (R3)
POST {{base_url}}/api/v1/channels
Content-Type: application/json
{
    "name": "Kênh VN {{run_id}}",
    "currency": "VND"
}
HTTP 201
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" exists
jsonpath "$.data.name" == "Kênh VN {{run_id}}"
jsonpath "$.data.slug" == "kenh-vn-{{run_id}}"
jsonpath "$.data.currency" == "VND"
jsonpath "$.data.is_active" == true
jsonpath "$.data.created_at" exists
jsonpath "$.data.updated_at" exists
[Captures]
vn_slug: jsonpath "$.data.slug"

# 2. Tạo kênh USD với slug riêng, currency viết thường được chuẩn hóa
POST {{base_url}}/api/v1/channels
Content-Type: application/json
{
    "name": "US Store {{run_id}}",
    "slug": "us-store-{{run_id}}",
    "currency": "usd"
}
HTTP 201
[Asserts]
jsonpath "$.data.slug" == "us-store-{{run_id}}"
jsonpath "$.data.currency" == "USD"
[Captures]
us_slug: jsonpath "$.data.slug"

# 3. Trùng slug -> 409
POST {{base_url}}/api/v1/channels
Content-Type: application/json
{
    "name": "Trùng {{run_id}}",
    "slug": "{{us_slug}}",
    "currency": "EUR"
}
HTTP 409
[Asserts]
jsonpath "$.error_code" == "DUPLICATE_ENTITY"

# 4. currency sai -> 422 field currency
POST {{base_url}}/api/v1/channels
Content-Type: application/json
{
    "name": "Sai tiền tệ {{run_id}}",
    "currency": "dong"
}
HTTP 422
[Asserts]
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.errors[0].field" == "currency"

# 5. Danh sách phân trang có cả hai kênh vừa tạo
GET {{base_url}}/api/v1/channels?limit=100
HTTP 200
[Asserts]
jsonpath "$.total" >= 2
jsonpath "$.data[?(@.slug == '{{vn_slug}}')]" count == 1
jsonpath "$.data[?(@.slug == '{{us_slug}}')]" count == 1

# 6. Lấy theo slug
GET {{base_url}}/api/v1/channels/{{vn_slug}}
HTTP 200
[Asserts]
jsonpath "$.data.currency" == "VND"

# 7. Slug không tồn tại -> 404
GET {{base_url}}/api/v1/channels/khong-ton-tai-{{run_id}}
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 8. PATCH tắt kênh, currency gửi kèm bị bỏ qua (R2, R4)
PATCH {{base_url}}/api/v1/channels/{{vn_slug}}
Content-Type: application/json
{
    "is_active": false,
    "currency": "USD"
}
HTTP 200
[Asserts]
jsonpath "$.data.is_active" == false
jsonpath "$.data.currency" == "VND"
jsonpath "$.data.slug" == "{{vn_slug}}"

# 9. Kênh tắt vẫn quản trị được: đổi tên và bật lại
PATCH {{base_url}}/api/v1/channels/{{vn_slug}}
Content-Type: application/json
{
    "name": "Kênh Việt Nam {{run_id}}",
    "is_active": true
}
HTTP 200
[Asserts]
jsonpath "$.data.name" == "Kênh Việt Nam {{run_id}}"
jsonpath "$.data.is_active" == true
jsonpath "$.data.currency" == "VND"

# 10. PATCH slug không tồn tại -> 404
PATCH {{base_url}}/api/v1/channels/khong-ton-tai-{{run_id}}
Content-Type: application/json
{ "is_active": false }
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 01-catalog/1.1-categories.hurl
# Test contract for Step 1.1: Danh mục — CRUD cơ bản (DOMAIN-SPEC-1-CATALOG § 1.1)

# 1. Tạo "Thời trang" (không slug) -> slug tự sinh = "thoi-trang-{{run_id}}", parent_id = null
POST {{base_url}}/api/v1/categories
Content-Type: application/json
{
    "name": "Thời trang {{run_id}}"
}
HTTP 201
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" exists
jsonpath "$.data.name" == "Thời trang {{run_id}}"
jsonpath "$.data.slug" == "thoi-trang-{{run_id}}"
jsonpath "$.data.parent_id" == null
jsonpath "$.data.is_active" == true
jsonpath "$.data.created_at" exists
jsonpath "$.data.updated_at" exists
[Captures]
parent_id: jsonpath "$.data.id"
parent_slug: jsonpath "$.data.slug"

# 2. Tạo "Đồ Nam" với parent_id = id "Thời trang" -> 201, parent_id đúng
POST {{base_url}}/api/v1/categories
Content-Type: application/json
{
    "name": "Đồ Nam {{run_id}}",
    "parent_id": "{{parent_id}}"
}
HTTP 201
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" exists
jsonpath "$.data.name" == "Đồ Nam {{run_id}}"
jsonpath "$.data.slug" == "do-nam-{{run_id}}"
jsonpath "$.data.parent_id" == "{{parent_id}}"
jsonpath "$.data.is_active" == true

# 3. Tạo danh mục với parent_id không tồn tại -> 404 ENTITY_NOT_FOUND
POST {{base_url}}/api/v1/categories
Content-Type: application/json
{
    "name": "Lỗi Parent {{run_id}}",
    "parent_id": "00000000-0000-0000-0000-000000000000"
}
HTTP 404
[Asserts]
header "X-Request-ID" exists
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"
jsonpath "$.detail" exists

# 4. Tạo hai danh mục cùng slug -> lần 2 trả 409 DUPLICATE_ENTITY
POST {{base_url}}/api/v1/categories
Content-Type: application/json
{
    "name": "Thời trang {{run_id}}"
}
HTTP 409
[Asserts]
header "X-Request-ID" exists
jsonpath "$.error_code" == "DUPLICATE_ENTITY"
jsonpath "$.detail" exists

# 5. name = "" -> 422 VALIDATION_ERROR, errors[].field = "name"
POST {{base_url}}/api/v1/categories
Content-Type: application/json
{
    "name": ""
}
HTTP 422
[Asserts]
header "X-Request-ID" exists
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.errors" count >= 1
jsonpath "$.errors[?(@.field == 'name')]" count >= 1

# 6. Danh sách với limit=1 khi có 2 danh mục -> total >= 2, page=1, page_size=1, has_next=true
GET {{base_url}}/api/v1/categories?limit=1&offset=0
HTTP 200
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data" count == 1
jsonpath "$.total" >= 2
jsonpath "$.page" == 1
jsonpath "$.page_size" == 1
jsonpath "$.has_next" == true

# 7. Lấy chi tiết theo slug và theo id -> cùng kết quả
GET {{base_url}}/api/v1/categories/{{parent_slug}}
HTTP 200
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" == "{{parent_id}}"
jsonpath "$.data.slug" == "{{parent_slug}}"

GET {{base_url}}/api/v1/categories/{{parent_id}}
HTTP 200
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" == "{{parent_id}}"
jsonpath "$.data.slug" == "{{parent_slug}}"

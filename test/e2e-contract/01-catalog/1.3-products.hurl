# 01-catalog/1.3-products.hurl
# Test contract for Step 1.3: Sản phẩm — CRUD & phân trang (DOMAIN-SPEC-1-CATALOG § 1.3)

# 0. Đăng nhập admin (API-CONVENTIONS §7): mọi request ghi của catalog cần quyền admin
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
    "email": "{{admin_email}}",
    "password": "{{admin_password}}"
}
HTTP 200
[Captures]
admin_token: jsonpath "$.data.access_token"

# 1. Tạo sản phẩm không slug -> slug tự sinh, is_published = false
POST {{base_url}}/api/v1/products
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Áo Thun Cotton Nam {{run_id}}"
}
HTTP 201
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" exists
jsonpath "$.data.name" == "Áo Thun Cotton Nam {{run_id}}"
jsonpath "$.data.slug" == "ao-thun-cotton-nam-{{run_id}}"
jsonpath "$.data.is_published" == false
jsonpath "$.data.category_id" == null
jsonpath "$.data.created_at" exists
jsonpath "$.data.updated_at" exists
[Captures]
product_id: jsonpath "$.data.id"
product_slug: jsonpath "$.data.slug"

# 2. category_id không tồn tại -> 404 ENTITY_NOT_FOUND
POST {{base_url}}/api/v1/products
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Lỗi Danh Mục {{run_id}}",
    "category_id": "00000000-0000-0000-0000-000000000000"
}
HTTP 404
[Asserts]
header "X-Request-ID" exists
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"
jsonpath "$.detail" exists

# 3. Trùng slug -> 409 DUPLICATE_ENTITY
POST {{base_url}}/api/v1/products
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Áo Thun Cotton Nam {{run_id}}"
}
HTTP 409
[Asserts]
header "X-Request-ID" exists
jsonpath "$.error_code" == "DUPLICATE_ENTITY"
jsonpath "$.detail" exists

# 4. Phân trang: limit=2 -> 2 phần tử, total >= 2, has_next theo dữ liệu
POST {{base_url}}/api/v1/products
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Sản phẩm Trang 2 {{run_id}}"
}
HTTP 201

POST {{base_url}}/api/v1/products
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Sản phẩm Trang 3 {{run_id}}"
}
HTTP 201

GET {{base_url}}/api/v1/products?limit=2&offset=0
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data" count == 2
jsonpath "$.total" >= 3
jsonpath "$.page" == 1
jsonpath "$.page_size" == 2
jsonpath "$.has_next" == true

# 5. Chi tiết theo slug và theo id -> cùng kết quả
GET {{base_url}}/api/v1/products/{{product_slug}}
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
jsonpath "$.data.id" == "{{product_id}}"
jsonpath "$.data.slug" == "{{product_slug}}"

GET {{base_url}}/api/v1/products/{{product_id}}
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
jsonpath "$.data.id" == "{{product_id}}"
jsonpath "$.data.slug" == "{{product_slug}}"

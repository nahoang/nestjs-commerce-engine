# 01-catalog/1.2-category-tree.hurl
# Test contract for Step 1.2: Cây danh mục & breadcrumbs (DOMAIN-SPEC-1-CATALOG § 1.2)

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

# 1. Tạo "Thời trang Cây" (root) -> 201
POST {{base_url}}/api/v1/categories
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Thời trang Cây {{run_id}}"
}
HTTP 201
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" exists
jsonpath "$.data.name" == "Thời trang Cây {{run_id}}"
jsonpath "$.data.slug" == "thoi-trang-cay-{{run_id}}"
jsonpath "$.data.parent_id" == null
[Captures]
root_id: jsonpath "$.data.id"
root_slug: jsonpath "$.data.slug"

# 2. Tạo "Đồ Nam Cây" với parent_id = root_id -> 201
POST {{base_url}}/api/v1/categories
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Đồ Nam Cây {{run_id}}",
    "parent_id": "{{root_id}}"
}
HTTP 201
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" exists
jsonpath "$.data.name" == "Đồ Nam Cây {{run_id}}"
jsonpath "$.data.slug" == "do-nam-cay-{{run_id}}"
jsonpath "$.data.parent_id" == "{{root_id}}"
[Captures]
men_id: jsonpath "$.data.id"
men_slug: jsonpath "$.data.slug"

# 3. Tạo "Áo thun Cây" với parent_id = men_id -> 201
POST {{base_url}}/api/v1/categories
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Áo thun Cây {{run_id}}",
    "parent_id": "{{men_id}}"
}
HTTP 201
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" exists
jsonpath "$.data.name" == "Áo thun Cây {{run_id}}"
jsonpath "$.data.slug" == "ao-thun-cay-{{run_id}}"
jsonpath "$.data.parent_id" == "{{men_id}}"
[Captures]
tshirt_id: jsonpath "$.data.id"
tshirt_slug: jsonpath "$.data.slug"

# 4. Tạo "Quần jeans Cây" với parent_id = men_id -> 201
POST {{base_url}}/api/v1/categories
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Quần jeans Cây {{run_id}}",
    "parent_id": "{{men_id}}"
}
HTTP 201
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" exists
jsonpath "$.data.name" == "Quần jeans Cây {{run_id}}"
jsonpath "$.data.slug" == "quan-jeans-cay-{{run_id}}"
jsonpath "$.data.parent_id" == "{{men_id}}"
[Captures]
jeans_id: jsonpath "$.data.id"
jeans_slug: jsonpath "$.data.slug"

# 5. Cây từ root_id = root_slug: 1 gốc, 3 cấp, Áo thun đứng trước Quần jeans
GET {{base_url}}/api/v1/categories/tree?root_id={{root_slug}}
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data" count == 1
jsonpath "$.data[0].slug" == "{{root_slug}}"
jsonpath "$.data[0].children" count == 1
jsonpath "$.data[0].children[0].slug" == "{{men_slug}}"
jsonpath "$.data[0].children[0].children" count == 2
jsonpath "$.data[0].children[0].children[0].slug" == "{{tshirt_slug}}"
jsonpath "$.data[0].children[0].children[1].slug" == "{{jeans_slug}}"

# 6. /tree?root_id=do-nam-cay -> gốc là "Đồ Nam Cây"
GET {{base_url}}/api/v1/categories/tree?root_id={{men_slug}}
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data" count == 1
jsonpath "$.data[0].slug" == "{{men_slug}}"
jsonpath "$.data[0].children" count == 2
jsonpath "$.data[0].children[0].slug" == "{{tshirt_slug}}"
jsonpath "$.data[0].children[1].slug" == "{{jeans_slug}}"

# 7. /ao-thun-cay/breadcrumbs -> ["Thời trang Cây", "Đồ Nam Cây", "Áo thun Cây"] theo đúng thứ tự
GET {{base_url}}/api/v1/categories/{{tshirt_slug}}/breadcrumbs
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data" count == 3
jsonpath "$.data[0].slug" == "{{root_slug}}"
jsonpath "$.data[1].slug" == "{{men_slug}}"
jsonpath "$.data[2].slug" == "{{tshirt_slug}}"

# 8. Breadcrumbs của danh mục gốc -> mảng 1 phần tử
GET {{base_url}}/api/v1/categories/{{root_slug}}/breadcrumbs
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data" count == 1
jsonpath "$.data[0].slug" == "{{root_slug}}"

# 9. GET /tree?root_id=nonexistent -> 404 ENTITY_NOT_FOUND
GET {{base_url}}/api/v1/categories/tree?root_id=nonexistent-{{run_id}}
Authorization: Bearer {{admin_token}}
HTTP 404
[Asserts]
header "X-Request-ID" exists
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 10. GET /nonexistent/breadcrumbs -> 404 ENTITY_NOT_FOUND
GET {{base_url}}/api/v1/categories/nonexistent-{{run_id}}/breadcrumbs
Authorization: Bearer {{admin_token}}
HTTP 404
[Asserts]
header "X-Request-ID" exists
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

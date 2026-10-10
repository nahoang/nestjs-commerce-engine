# 02-auth/2.4-rbac.hurl
# Test contract for Step 2.4: Phân quyền (RBAC) & bảo vệ catalog (DOMAIN-SPEC-2-AUTH § 2.4)

# 0a. Chuẩn bị: một customer đăng ký và đăng nhập
POST {{base_url}}/api/v1/auth/register
Content-Type: application/json
{
    "email": "rbac-{{run_id}}@example.com",
    "password": "correct-horse-battery",
    "first_name": "Rbac",
    "last_name": "Customer"
}
HTTP 201

POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
    "email": "rbac-{{run_id}}@example.com",
    "password": "correct-horse-battery"
}
HTTP 200
[Captures]
customer_token: jsonpath "$.data.access_token"

# 0b. Đăng nhập admin (API-CONVENTIONS §7)
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
    "email": "{{admin_email}}",
    "password": "{{admin_password}}"
}
HTTP 200
[Captures]
admin_token: jsonpath "$.data.access_token"

# 1a. customer tạo danh mục -> 403 FORBIDDEN (R1)
POST {{base_url}}/api/v1/categories
Authorization: Bearer {{customer_token}}
Content-Type: application/json
{
    "name": "Rbac {{run_id}} Customer"
}
HTTP 403
[Asserts]
jsonpath "$.error_code" == "FORBIDDEN"

# 1b. Không token -> 401 UNAUTHENTICATED
POST {{base_url}}/api/v1/categories
Content-Type: application/json
{
    "name": "Rbac {{run_id}} Anonymous"
}
HTTP 401
[Asserts]
jsonpath "$.error_code" == "UNAUTHENTICATED"

# 1c. admin tạo danh mục -> 201
POST {{base_url}}/api/v1/categories
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Rbac {{run_id}} Admin"
}
HTTP 201

# 1d. Đọc danh mục vẫn công khai (storefront)
GET {{base_url}}/api/v1/categories
HTTP 200

# 2a. admin tạo một sản phẩm nháp
POST {{base_url}}/api/v1/products
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Rbac{{run_id}} Draft",
    "variants": [
        { "sku": "RBAC-D-{{run_id}}", "name": "D", "price_amount": "100000", "currency": "VND" }
    ]
}
HTTP 201
[Asserts]
jsonpath "$.data.is_published" == false
[Captures]
draft_slug: jsonpath "$.data.slug"

# 2b. Khách vãng lai xem sản phẩm nháp -> 404 (R3)
GET {{base_url}}/api/v1/products/{{draft_slug}}
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 2c. customer cũng không thấy bản nháp -> 404
GET {{base_url}}/api/v1/products/{{draft_slug}}
Authorization: Bearer {{customer_token}}
HTTP 404

# 2d. admin xem được -> 200 (R4)
GET {{base_url}}/api/v1/products/{{draft_slug}}
Authorization: Bearer {{admin_token}}
HTTP 200
[Asserts]
jsonpath "$.data.slug" == "{{draft_slug}}"

# 3a. admin tạo một sản phẩm đã xuất bản
POST {{base_url}}/api/v1/products
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Rbac{{run_id}} Live",
    "is_published": true,
    "variants": [
        { "sku": "RBAC-L-{{run_id}}", "name": "L", "price_amount": "100000", "currency": "VND" }
    ]
}
HTTP 201
[Asserts]
jsonpath "$.data.is_published" == true
[Captures]
live_slug: jsonpath "$.data.slug"

# 3b. Khách vãng lai: sản phẩm đã xuất bản xem được
GET {{base_url}}/api/v1/products/{{live_slug}}
HTTP 200

# 3c. Khách vãng lai gửi is_published=false -> tham số bị bỏ qua, chỉ thấy sản phẩm đã xuất bản
GET {{base_url}}/api/v1/products
[QueryStringParams]
keyword: Rbac{{run_id}}
is_published: false
HTTP 200
[Asserts]
jsonpath "$.total" == 1
jsonpath "$.data[0].is_published" == true

# 3d. customer: như khách vãng lai
GET {{base_url}}/api/v1/products
Authorization: Bearer {{customer_token}}
[QueryStringParams]
keyword: Rbac{{run_id}}
is_published: false
HTTP 200
[Asserts]
jsonpath "$.total" == 1
jsonpath "$.data[0].is_published" == true

# 3e. admin dùng được is_published=false -> thấy bản nháp
GET {{base_url}}/api/v1/products
Authorization: Bearer {{admin_token}}
[QueryStringParams]
keyword: Rbac{{run_id}}
is_published: false
HTTP 200
[Asserts]
jsonpath "$.total" == 1
jsonpath "$.data[0].is_published" == false

# 3f. Token sai trên route tùy chọn -> 401 (không bị hạ cấp thành khách)
GET {{base_url}}/api/v1/products
Authorization: Bearer not.a.token
HTTP 401

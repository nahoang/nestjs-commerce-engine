# 03-cart/3.2-cart.hurl
# Test contract for Step 3.2: Giỏ hàng — persistence & API (DOMAIN-SPEC-3-CART § 3.2)
# Mỗi lần chạy dùng kênh riêng theo {{run_id}} nên không lẫn dữ liệu của file khác.

# 0. Đăng nhập admin: seed catalog cần quyền admin (giỏ hàng thì không cần đăng nhập)
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
    "email": "{{admin_email}}",
    "password": "{{admin_password}}"
}
HTTP 200
[Captures]
admin_token: jsonpath "$.data.access_token"

# Seed: kênh VND
POST {{base_url}}/api/v1/channels
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{ "name": "VN Cart {{run_id}}", "slug": "vn-cart-{{run_id}}", "currency": "VND" }
HTTP 201
[Captures]
vn_slug: jsonpath "$.data.slug"

# Seed: sản phẩm xuất bản 2 biến thể (giá gốc 999 USD, không được lộ vào giỏ) + 1 sản phẩm nháp
POST {{base_url}}/api/v1/products
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Áo Giỏ Hàng {{run_id}}",
    "is_published": true,
    "variants": [
        { "sku": "CRT-M-{{run_id}}", "name": "M", "price_amount": "999", "currency": "USD" },
        { "sku": "CRT-L-{{run_id}}", "name": "L", "price_amount": "999", "currency": "USD" }
    ]
}
HTTP 201
[Captures]
variant_m: jsonpath "$.data.variants[?(@.name == 'M')].id" nth 0
variant_l: jsonpath "$.data.variants[?(@.name == 'L')].id" nth 0

POST {{base_url}}/api/v1/products
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{
    "name": "Áo Nháp Giỏ {{run_id}}",
    "variants": [
        { "sku": "CRT-D-{{run_id}}", "name": "D", "price_amount": "5", "currency": "USD" }
    ]
}
HTTP 201
[Captures]
draft_variant: jsonpath "$.data.variants[0].id"

POST {{base_url}}/api/v1/channels/{{vn_slug}}/listings
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{ "variant_id": "{{variant_m}}", "price_amount": "200000" }
HTTP 201
[Captures]
listing_m_price: jsonpath "$.data.price_amount"

POST {{base_url}}/api/v1/channels/{{vn_slug}}/listings
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{ "variant_id": "{{variant_l}}", "price_amount": "150000.50" }
HTTP 201

POST {{base_url}}/api/v1/channels/{{vn_slug}}/listings
Authorization: Bearer {{admin_token}}
Content-Type: application/json
{ "variant_id": "{{draft_variant}}", "price_amount": "100" }
HTTP 201

# 1. Tạo giỏ trên kênh VND (không cần Bearer) -> currency VND, lines rỗng, token 64 hex
POST {{base_url}}/api/v1/carts
Content-Type: application/json
{ "channel_slug": "{{vn_slug}}" }
HTTP 201
[Captures]
cart_token: jsonpath "$.data.token"
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.token" matches /^[0-9a-f]{64}$/
jsonpath "$.data.channel_slug" == "{{vn_slug}}"
jsonpath "$.data.currency" == "VND"
jsonpath "$.data.status" == "ACTIVE"
jsonpath "$.data.lines" count == 0
jsonpath "$.data.subtotal_amount" == "0.00"
jsonpath "$.data.voucher_code" == null
jsonpath "$.data.discount_amount" == "0.00"
jsonpath "$.data.total_amount" == "0.00"

# 1b. Kênh không tồn tại -> 404; thiếu channel_slug -> 422
POST {{base_url}}/api/v1/carts
Content-Type: application/json
{ "channel_slug": "khong-co-{{run_id}}" }
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

POST {{base_url}}/api/v1/carts
Content-Type: application/json
{}
HTTP 422
[Asserts]
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.errors[0].field" == "channel_slug"

# 2. Thêm 2 biến thể -> subtotal đúng theo giá KÊNH (không lộ giá gốc 999)
POST {{base_url}}/api/v1/carts/{{cart_token}}/lines
Content-Type: application/json
{ "variant_id": "{{variant_m}}", "quantity": 2 }
HTTP 200

POST {{base_url}}/api/v1/carts/{{cart_token}}/lines
Content-Type: application/json
{ "variant_id": "{{variant_l}}", "quantity": 1 }
HTTP 200

GET {{base_url}}/api/v1/carts/{{cart_token}}
HTTP 200
[Captures]
line_m: jsonpath "$.data.lines[?(@.variant_id == '{{variant_m}}')].id" nth 0
[Asserts]
jsonpath "$.data.lines" count == 2
jsonpath "$.data.subtotal_amount" == "550000.50"
jsonpath "$.data.total_amount" == "550000.50"
jsonpath "$.data.lines[0].unit_price_amount" == "200000.00"
jsonpath "$.data.lines[0].line_total_amount" == "400000.00"
jsonpath "$.data.lines[0].is_available" == true
jsonpath "$.data.lines[0].reserved_until" == null
jsonpath "$.data.lines[0].product_name" exists
jsonpath "$.data.lines[0].sku" exists

# 2b. Thêm lại cùng biến thể -> cộng dồn vào dòng cũ (3.1 R1), vẫn 2 dòng
POST {{base_url}}/api/v1/carts/{{cart_token}}/lines
Content-Type: application/json
{ "variant_id": "{{variant_m}}", "quantity": 1 }
HTTP 200
[Asserts]
jsonpath "$.data.lines" count == 2
jsonpath "$.data.lines[0].quantity" == 3
jsonpath "$.data.subtotal_amount" == "750000.50"

# 3. PATCH số lượng -> subtotal cập nhật
PATCH {{base_url}}/api/v1/carts/{{cart_token}}/lines/{{line_m}}
Content-Type: application/json
{ "quantity": 1 }
HTTP 200
[Asserts]
jsonpath "$.data.subtotal_amount" == "350000.50"

# 3b. Vượt tối đa (50) -> 400; số lượng 0 -> 422
PATCH {{base_url}}/api/v1/carts/{{cart_token}}/lines/{{line_m}}
Content-Type: application/json
{ "quantity": 51 }
HTTP 400
[Asserts]
jsonpath "$.error_code" == "INVALID_OPERATION"

PATCH {{base_url}}/api/v1/carts/{{cart_token}}/lines/{{line_m}}
Content-Type: application/json
{ "quantity": 0 }
HTTP 422
[Asserts]
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.errors[0].field" == "quantity"

# 3c. DELETE dòng -> biến mất; xóa lần hai -> 404
DELETE {{base_url}}/api/v1/carts/{{cart_token}}/lines/{{line_m}}
HTTP 200
[Asserts]
jsonpath "$.data.lines" count == 1
jsonpath "$.data.subtotal_amount" == "150000.50"

DELETE {{base_url}}/api/v1/carts/{{cart_token}}/lines/{{line_m}}
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 4. Biến thể không có listing ở kênh -> 400; sản phẩm nháp -> 400; biến thể không tồn tại -> 404
POST {{base_url}}/api/v1/carts/{{cart_token}}/lines
Content-Type: application/json
{ "variant_id": "{{draft_variant}}", "quantity": 1 }
HTTP 400
[Asserts]
jsonpath "$.error_code" == "INVALID_OPERATION"

POST {{base_url}}/api/v1/carts/{{cart_token}}/lines
Content-Type: application/json
{ "variant_id": "00000000-0000-0000-0000-000000000000", "quantity": 1 }
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 5. Token không tồn tại -> 404 (test case 5 'đổi giá listing -> giỏ phản ánh giá mới' cần sửa listing,
#    chưa có API sửa giá ở 1.8 nên chỉ kiểm bằng e2e Jest test 5, không có trong Hurl)
GET {{base_url}}/api/v1/carts/khong-co-{{run_id}}
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

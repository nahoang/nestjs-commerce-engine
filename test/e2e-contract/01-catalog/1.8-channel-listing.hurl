# 01-catalog/1.8-channel-listing.hurl
# Test contract for Step 1.8: Giá theo kênh & storefront (DOMAIN-SPEC-1-CATALOG § 1.8)
# Mỗi lần chạy dùng kênh riêng theo {{run_id}} nên không lẫn dữ liệu của file khác.

# Seed: hai kênh VND và USD
POST {{base_url}}/api/v1/channels
Content-Type: application/json
{ "name": "VN Listing {{run_id}}", "slug": "vn-listing-{{run_id}}", "currency": "VND" }
HTTP 201
[Captures]
vn_slug: jsonpath "$.data.slug"

POST {{base_url}}/api/v1/channels
Content-Type: application/json
{ "name": "US Listing {{run_id}}", "slug": "us-listing-{{run_id}}", "currency": "USD" }
HTTP 201
[Captures]
us_slug: jsonpath "$.data.slug"

# Seed: sản phẩm đã xuất bản với 2 biến thể (giá gốc 999 USD, không được lộ ra storefront)
POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Áo Thun Basic Kênh {{run_id}}",
    "is_published": true,
    "variants": [
        { "sku": "LST-M-{{run_id}}", "name": "M", "price_amount": "999", "currency": "USD" },
        { "sku": "LST-L-{{run_id}}", "name": "L", "price_amount": "999", "currency": "USD" }
    ]
}
HTTP 201
[Captures]
product_id: jsonpath "$.data.id"
variant_m: jsonpath "$.data.variants[?(@.name == 'M')].id" nth 0
variant_l: jsonpath "$.data.variants[?(@.name == 'L')].id" nth 0

# Seed: sản phẩm nháp
POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Áo Nháp Kênh {{run_id}}",
    "variants": [
        { "sku": "LST-D-{{run_id}}", "name": "D", "price_amount": "5", "currency": "USD" }
    ]
}
HTTP 201
[Captures]
draft_variant: jsonpath "$.data.variants[0].id"

# 1. Biến thể M: 250000 VND trên kênh VND -> currency lấy từ kênh, client gửi currency bị bỏ qua
POST {{base_url}}/api/v1/channels/{{vn_slug}}/listings
Content-Type: application/json
{ "variant_id": "{{variant_m}}", "price_amount": "250000", "currency": "EUR" }
HTTP 201
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" exists
jsonpath "$.data.variant_id" == "{{variant_m}}"
jsonpath "$.data.channel_id" exists
jsonpath "$.data.price_amount" == "250000.00"
jsonpath "$.data.currency" == "VND"
jsonpath "$.data.is_available" == true
jsonpath "$.data.created_at" exists
jsonpath "$.data.updated_at" exists

# 1b. Cùng biến thể: 12 USD trên kênh USD
POST {{base_url}}/api/v1/channels/{{us_slug}}/listings
Content-Type: application/json
{ "variant_id": "{{variant_m}}", "price_amount": "12" }
HTTP 201
[Asserts]
jsonpath "$.data.price_amount" == "12.00"
jsonpath "$.data.currency" == "USD"

# 1c. Storefront mỗi kênh trả đúng giá và tiền tệ của kênh (không lộ giá gốc 999)
GET {{base_url}}/api/v1/channels/{{vn_slug}}/products
HTTP 200
[Asserts]
jsonpath "$.total" == 1
jsonpath "$.data[0].is_published" == true
jsonpath "$.data[0].variants" count == 1
jsonpath "$.data[0].variants[0].price_amount" == "250000.00"
jsonpath "$.data[0].variants[0].currency" == "VND"

GET {{base_url}}/api/v1/channels/{{us_slug}}/products
HTTP 200
[Asserts]
jsonpath "$.total" == 1
jsonpath "$.data[0].variants[0].price_amount" == "12.00"
jsonpath "$.data[0].variants[0].currency" == "USD"

# 2. Listing thứ hai cho cùng (variant, channel) -> 409
POST {{base_url}}/api/v1/channels/{{vn_slug}}/listings
Content-Type: application/json
{ "variant_id": "{{variant_m}}", "price_amount": "1" }
HTTP 409
[Asserts]
jsonpath "$.error_code" == "DUPLICATE_ENTITY"

# 2b. Giá âm -> 422 field price_amount
POST {{base_url}}/api/v1/channels/{{vn_slug}}/listings
Content-Type: application/json
{ "variant_id": "{{variant_l}}", "price_amount": "-1" }
HTTP 422
[Asserts]
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.errors[0].field" == "price_amount"

# 2c. Kênh hoặc biến thể không tồn tại -> 404
POST {{base_url}}/api/v1/channels/khong-co-{{run_id}}/listings
Content-Type: application/json
{ "variant_id": "{{variant_m}}", "price_amount": "1" }
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

POST {{base_url}}/api/v1/channels/{{vn_slug}}/listings
Content-Type: application/json
{ "variant_id": "00000000-0000-0000-0000-000000000000", "price_amount": "1" }
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 3. Sản phẩm nháp có listing -> không xuất hiện trên storefront
POST {{base_url}}/api/v1/channels/{{vn_slug}}/listings
Content-Type: application/json
{ "variant_id": "{{draft_variant}}", "price_amount": "50000" }
HTTP 201

GET {{base_url}}/api/v1/channels/{{vn_slug}}/products
HTTP 200
[Asserts]
jsonpath "$.total" == 1

# 4. Biến thể is_available = false bị ẩn (L chưa khả dụng), sản phẩm vẫn còn vì M khả dụng
POST {{base_url}}/api/v1/channels/{{vn_slug}}/listings
Content-Type: application/json
{ "variant_id": "{{variant_l}}", "price_amount": "260000", "is_available": false }
HTTP 201
[Asserts]
jsonpath "$.data.is_available" == false

GET {{base_url}}/api/v1/channels/{{vn_slug}}/products
HTTP 200
[Asserts]
jsonpath "$.total" == 1
jsonpath "$.data[0].variants" count == 1
jsonpath "$.data[0].variants[0].name" == "M"

# 6. R8: storefront vừa được gọi (cache) -> unpublish có hiệu lực ngay ở request kế tiếp
POST {{base_url}}/api/v1/products/{{product_id}}/unpublish
HTTP 200

GET {{base_url}}/api/v1/channels/{{vn_slug}}/products
HTTP 200
[Asserts]
jsonpath "$.total" == 0

POST {{base_url}}/api/v1/products/{{product_id}}/publish
HTTP 200

GET {{base_url}}/api/v1/channels/{{vn_slug}}/products
HTTP 200
[Asserts]
jsonpath "$.total" == 1

# 5. Tắt kênh USD -> storefront của kênh đó trả 404 ngay
PATCH {{base_url}}/api/v1/channels/{{us_slug}}
Content-Type: application/json
{ "is_active": false }
HTTP 200

GET {{base_url}}/api/v1/channels/{{us_slug}}/products
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 5b. Kênh không tồn tại -> 404; bật lại kênh -> storefront trở lại ngay
GET {{base_url}}/api/v1/channels/khong-co-{{run_id}}/products
HTTP 404

PATCH {{base_url}}/api/v1/channels/{{us_slug}}
Content-Type: application/json
{ "is_active": true }
HTTP 200

GET {{base_url}}/api/v1/channels/{{us_slug}}/products
HTTP 200
[Asserts]
jsonpath "$.total" == 1

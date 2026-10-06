# 01-catalog/1.6-search.hurl
# Test contract for Step 1.6: Tìm kiếm & lọc sản phẩm (DOMAIN-SPEC-1-CATALOG § 1.6)
# Truy vấn được giới hạn theo danh mục/từ khóa của {{run_id}} để không lẫn dữ liệu của file khác.

# Seed: cây danh mục Thời trang -> Đồ Nam -> Áo thun
POST {{base_url}}/api/v1/categories
Content-Type: application/json
{ "name": "Thời trang Tìm {{run_id}}" }
HTTP 201
[Captures]
root_id: jsonpath "$.data.id"

POST {{base_url}}/api/v1/categories
Content-Type: application/json
{ "name": "Đồ Nam Tìm {{run_id}}", "parent_id": "{{root_id}}" }
HTTP 201
[Captures]
men_id: jsonpath "$.data.id"

POST {{base_url}}/api/v1/categories
Content-Type: application/json
{ "name": "Áo thun Tìm {{run_id}}", "parent_id": "{{men_id}}" }
HTTP 201
[Captures]
tee_id: jsonpath "$.data.id"

# Seed: A (Áo thun, VND 150000 & 90000 + USD 12), B (Đồ Nam, VND 250000),
# C (Đồ Nam, VND 300000, "áo" chỉ có trong mô tả), D (gốc, VND 500000),
# E (không danh mục, chỉ USD 15), F (Áo thun, VND 120000 & 400000)
POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Áo {{run_id}} Thun",
    "category_id": "{{tee_id}}",
    "variants": [
        { "sku": "SRCH-A1-{{run_id}}", "name": "A1", "price_amount": "150000", "currency": "VND" },
        { "sku": "SRCH-A2-{{run_id}}", "name": "A2", "price_amount": "90000", "currency": "VND" }
    ]
}
HTTP 201
[Captures]
a_id: jsonpath "$.data.id"

POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Áo {{run_id}} Sơ Mi",
    "category_id": "{{men_id}}",
    "variants": [
        { "sku": "SRCH-B1-{{run_id}}", "name": "B1", "price_amount": "250000", "currency": "VND" }
    ]
}
HTTP 201

POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Quần {{run_id}} Jean",
    "description": "Phối cùng áo {{run_id}} thun",
    "category_id": "{{men_id}}",
    "variants": [
        { "sku": "SRCH-C1-{{run_id}}", "name": "C1", "price_amount": "300000", "currency": "VND" }
    ]
}
HTTP 201

POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Váy {{run_id}} Xòe",
    "category_id": "{{root_id}}",
    "variants": [
        { "sku": "SRCH-D1-{{run_id}}", "name": "D1", "price_amount": "500000", "currency": "VND" }
    ]
}
HTTP 201

POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Mũ {{run_id}} Lưỡi Trai",
    "variants": [
        { "sku": "SRCH-E1-{{run_id}}", "name": "E1", "price_amount": "15", "currency": "USD" }
    ]
}
HTTP 201

POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Áo {{run_id}} Khoác",
    "category_id": "{{tee_id}}",
    "variants": [
        { "sku": "SRCH-F1-{{run_id}}", "name": "F1", "price_amount": "120000", "currency": "VND" },
        { "sku": "SRCH-F2-{{run_id}}", "name": "F2", "price_amount": "400000", "currency": "VND" }
    ]
}
HTTP 201

# 1. keyword không phân biệt hoa thường, tìm cả tên lẫn mô tả -> A, B, C (mô tả), F
GET {{base_url}}/api/v1/products
[QueryStringParams]
keyword: ÁO {{run_id}}
HTTP 200
[Asserts]
header "X-Request-ID" exists
jsonpath "$.total" == 4
jsonpath "$.data" count == 4

# 2. category_id = Đồ Nam -> gồm cả sản phẩm của Áo thun (A, F) và của chính nó (B, C)
GET {{base_url}}/api/v1/products
[QueryStringParams]
category_id: {{men_id}}
keyword: {{run_id}}
HTTP 200
[Asserts]
jsonpath "$.total" == 4
jsonpath "$.data[?(@.id == '{{a_id}}')]" count == 1

# 2b. category_id không tồn tại -> 404
GET {{base_url}}/api/v1/products
[QueryStringParams]
category_id: 00000000-0000-0000-0000-000000000000
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 3. Khoảng giá theo giá thấp nhất (R5): A (min 90000) bị loại, C (300000) nằm trong khoảng -> B, C, F
GET {{base_url}}/api/v1/products
[QueryStringParams]
category_id: {{root_id}}
min_price: 100000
max_price: 300000
currency: VND
HTTP 200
[Asserts]
jsonpath "$.total" == 3
jsonpath "$.data" count == 3

# 4. min_price không có currency -> 422, field currency
GET {{base_url}}/api/v1/products
[QueryStringParams]
min_price: 100000
HTTP 422
[Asserts]
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.errors[0].field" == "currency"

# 4b. sort_by=price_asc không có currency -> 422
GET {{base_url}}/api/v1/products
[QueryStringParams]
sort_by: price_asc
HTTP 422
[Asserts]
jsonpath "$.errors[0].field" == "currency"

# 4c. min_price > max_price -> 422
GET {{base_url}}/api/v1/products
[QueryStringParams]
min_price: 300000
max_price: 100000
currency: VND
HTTP 422
[Asserts]
jsonpath "$.errors[0].field" == "max_price"

# 5. price_asc: giá thấp nhất tăng dần, sản phẩm không có VND (E) bị loại -> A, F, B, C, D
GET {{base_url}}/api/v1/products
[QueryStringParams]
category_id: {{root_id}}
sort_by: price_asc
currency: VND
HTTP 200
[Asserts]
jsonpath "$.total" == 5
jsonpath "$.data[0].name" == "Áo {{run_id}} Thun"
jsonpath "$.data[1].name" == "Áo {{run_id}} Khoác"
jsonpath "$.data[2].name" == "Áo {{run_id}} Sơ Mi"
jsonpath "$.data[3].name" == "Quần {{run_id}} Jean"
jsonpath "$.data[4].name" == "Váy {{run_id}} Xòe"

# 5b. newest (mặc định): sản phẩm tạo sau xếp trước (F, D, C, B, A)
GET {{base_url}}/api/v1/products
[QueryStringParams]
category_id: {{root_id}}
sort_by: newest
HTTP 200
[Asserts]
jsonpath "$.total" == 5
jsonpath "$.data[0].name" == "Áo {{run_id}} Khoác"
jsonpath "$.data[1].name" == "Váy {{run_id}} Xòe"
jsonpath "$.data[4].name" == "Áo {{run_id}} Thun"

# 6. Kết hợp keyword + danh mục + khoảng giá -> giao của các điều kiện: B (250000), F (120000)
GET {{base_url}}/api/v1/products
[QueryStringParams]
keyword: áo {{run_id}}
category_id: {{men_id}}
min_price: 100000
max_price: 260000
currency: VND
sort_by: price_desc
limit: 1
HTTP 200
[Asserts]
jsonpath "$.total" == 2
jsonpath "$.data" count == 1
jsonpath "$.data[0].name" == "Áo {{run_id}} Sơ Mi"
jsonpath "$.has_next" == true

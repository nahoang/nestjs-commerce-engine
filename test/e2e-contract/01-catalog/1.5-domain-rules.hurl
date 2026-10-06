# 01-catalog/1.5-domain-rules.hurl
# Test contract for Step 1.5: Value Objects, entity có hành vi & tầng use case (DOMAIN-SPEC-1-CATALOG § 1.5)
# Test case 1–3 (Money, Slug) là unit test thuần domain; file này kiểm tra test case 4–7 qua HTTP.

# 4. Slug do client truyền không hợp lệ -> 422, field slug
POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Slug Không Hợp Lệ {{run_id}}",
    "slug": "Ao Thun"
}
HTTP 422
[Asserts]
header "X-Request-ID" exists
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.errors[0].field" == "slug"

POST {{base_url}}/api/v1/categories
Content-Type: application/json
{
    "name": "Danh Mục Slug Sai {{run_id}}",
    "slug": "Do_Nam"
}
HTTP 422
[Asserts]
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.errors[0].field" == "slug"

# 5. Sản phẩm có biến thể TS-M; thêm biến thể SKU "ts-m" -> 409 (SKU không phân biệt hoa thường)
POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Áo Quy Tắc Domain {{run_id}}",
    "variants": [
        {"sku": "V15-M-{{run_id}}", "name": "M", "price_amount": "10.00", "currency": "USD"}
    ]
}
HTTP 201
[Captures]
product_id: jsonpath "$.data.id"

POST {{base_url}}/api/v1/products/{{product_id}}/variants
Content-Type: application/json
{
    "sku": "v15-m-{{run_id}}",
    "name": "Trùng khác hoa thường",
    "price_amount": "10.00"
}
HTTP 409
[Asserts]
jsonpath "$.error_code" == "DUPLICATE_ENTITY"

# 5b. SKU được lưu và trả về ở dạng chuẩn hóa (in hoa)
POST {{base_url}}/api/v1/products/{{product_id}}/variants
Content-Type: application/json
{
    "sku": "  v15-l-{{run_id}} ",
    "name": "L",
    "price_amount": "10.00"
}
HTTP 201
[Asserts]
jsonpath "$.data.sku" == "V15-L-{{run_id}}"

# 7. Sản phẩm đã có biến thể USD, thêm biến thể VND -> 400 INVALID_OPERATION
POST {{base_url}}/api/v1/products/{{product_id}}/variants
Content-Type: application/json
{
    "sku": "V15-VND-{{run_id}}",
    "name": "VND",
    "price_amount": "250000",
    "currency": "VND"
}
HTTP 400
[Asserts]
jsonpath "$.error_code" == "INVALID_OPERATION"

# 6. Xuất bản sản phẩm chưa có biến thể -> 400; thêm biến thể rồi xuất bản -> 200
POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Sản Phẩm Nháp {{run_id}}"
}
HTTP 201
[Asserts]
jsonpath "$.data.is_published" == false
[Captures]
draft_id: jsonpath "$.data.id"

POST {{base_url}}/api/v1/products/{{draft_id}}/publish
HTTP 400
[Asserts]
jsonpath "$.error_code" == "INVALID_OPERATION"

POST {{base_url}}/api/v1/products/{{draft_id}}/variants
Content-Type: application/json
{
    "sku": "V15-D-{{run_id}}",
    "name": "Mặc định",
    "price_amount": "5.00"
}
HTTP 201

POST {{base_url}}/api/v1/products/{{draft_id}}/publish
HTTP 200
[Asserts]
jsonpath "$.data.is_published" == true
jsonpath "$.data.variants" count == 1

POST {{base_url}}/api/v1/products/{{draft_id}}/unpublish
HTTP 200
[Asserts]
jsonpath "$.data.is_published" == false

# 6b. publish / unpublish sản phẩm không tồn tại -> 404
POST {{base_url}}/api/v1/products/00000000-0000-0000-0000-000000000000/publish
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

POST {{base_url}}/api/v1/products/00000000-0000-0000-0000-000000000000/unpublish
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 6c. Tạo sản phẩm với is_published=true và không có biến thể -> 400, không có sản phẩm nào được tạo
POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Xuất Bản Ngay {{run_id}}",
    "is_published": true
}
HTTP 400
[Asserts]
jsonpath "$.error_code" == "INVALID_OPERATION"

GET {{base_url}}/api/v1/products/xuat-ban-ngay-{{run_id}}
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 6d. Tạo sản phẩm với is_published=true kèm biến thể -> 201, đã xuất bản
POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Xuất Bản Có Biến Thể {{run_id}}",
    "is_published": true,
    "variants": [
        {"sku": "V15-P-{{run_id}}", "name": "Duy nhất", "price_amount": "1.00"}
    ]
}
HTTP 201
[Asserts]
jsonpath "$.data.is_published" == true

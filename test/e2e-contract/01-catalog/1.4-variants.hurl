# 01-catalog/1.4-variants.hurl
# Test contract for Step 1.4: Biến thể (variant) & chống N+1 (DOMAIN-SPEC-1-CATALOG § 1.4)

# 1. Tạo sản phẩm kèm 3 biến thể M/L/XL -> price_amount là chuỗi thập phân
POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Áo Thun Biến Thể {{run_id}}",
    "variants": [
        {"sku": "V14-M-{{run_id}}", "name": "M", "price_amount": "250000.00"},
        {"sku": "V14-L-{{run_id}}", "name": "L", "price_amount": "250000"},
        {"sku": "V14-XL-{{run_id}}", "name": "XL", "price_amount": "275000.5", "currency": "vnd"}
    ]
}
HTTP 201
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.variants" count == 3
[Captures]
product_id: jsonpath "$.data.id"
product_slug: jsonpath "$.data.slug"

GET {{base_url}}/api/v1/products/{{product_slug}}
HTTP 200
[Asserts]
jsonpath "$.data.variants" count == 3
jsonpath "$.data.variants[?(@.name=='M')].price_amount" nth 0 == "250000.00"
jsonpath "$.data.variants[?(@.name=='L')].price_amount" nth 0 == "250000.00"
jsonpath "$.data.variants[?(@.name=='XL')].price_amount" nth 0 == "275000.50"
jsonpath "$.data.variants[?(@.name=='M')].currency" nth 0 == "USD"
jsonpath "$.data.variants[?(@.name=='XL')].currency" nth 0 == "VND"
jsonpath "$.data.variants[?(@.name=='M')].product_id" nth 0 == "{{product_id}}"

# 2. Hai biến thể cùng SKU trong một payload -> 409, không sản phẩm nào được tạo
POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Payload Trùng SKU {{run_id}}",
    "variants": [
        {"sku": "V14-DUP-{{run_id}}", "name": "A", "price_amount": "1.00"},
        {"sku": "V14-DUP-{{run_id}}", "name": "B", "price_amount": "2.00"}
    ]
}
HTTP 409
[Asserts]
header "X-Request-ID" exists
jsonpath "$.error_code" == "DUPLICATE_ENTITY"

GET {{base_url}}/api/v1/products/payload-trung-sku-{{run_id}}
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

# 3. Thêm biến thể với SKU đã tồn tại ở sản phẩm khác -> 409
POST {{base_url}}/api/v1/products
Content-Type: application/json
{
    "name": "Sản Phẩm Khác {{run_id}}"
}
HTTP 201
[Captures]
other_product_id: jsonpath "$.data.id"

POST {{base_url}}/api/v1/products/{{other_product_id}}/variants
Content-Type: application/json
{
    "sku": "V14-M-{{run_id}}",
    "name": "Trùng",
    "price_amount": "100.00"
}
HTTP 409
[Asserts]
jsonpath "$.error_code" == "DUPLICATE_ENTITY"

# 3b. Thêm biến thể hợp lệ -> 201, price_amount là chuỗi, currency mặc định USD
POST {{base_url}}/api/v1/products/{{other_product_id}}/variants
Content-Type: application/json
{
    "sku": "V14-NEW-{{run_id}}",
    "name": "Mới",
    "price_amount": "19.9"
}
HTTP 201
[Asserts]
jsonpath "$.data.product_id" == "{{other_product_id}}"
jsonpath "$.data.sku" == "V14-NEW-{{run_id}}"
jsonpath "$.data.price_amount" == "19.90"
jsonpath "$.data.currency" == "USD"
jsonpath "$.data.id" exists
jsonpath "$.data.created_at" exists
jsonpath "$.data.updated_at" exists

# 4a. price_amount = -1 -> 422
POST {{base_url}}/api/v1/products/{{other_product_id}}/variants
Content-Type: application/json
{
    "sku": "V14-NEG-{{run_id}}",
    "name": "Giá âm",
    "price_amount": "-1"
}
HTTP 422
[Asserts]
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.errors[0].field" == "price_amount"

# 4b. currency = "us" -> 422
POST {{base_url}}/api/v1/products/{{other_product_id}}/variants
Content-Type: application/json
{
    "sku": "V14-CUR-{{run_id}}",
    "name": "Tiền tệ sai",
    "price_amount": "1.00",
    "currency": "us"
}
HTTP 422
[Asserts]
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.errors[0].field" == "currency"

# 4c. currency = "vnd" -> lưu "VND"
POST {{base_url}}/api/v1/products/{{other_product_id}}/variants
Content-Type: application/json
{
    "sku": "V14-VND-{{run_id}}",
    "name": "Đồng Việt Nam",
    "price_amount": "1000",
    "currency": "vnd"
}
HTTP 201
[Asserts]
jsonpath "$.data.currency" == "VND"
jsonpath "$.data.price_amount" == "1000.00"

# 5. product_id không tồn tại -> 404
POST {{base_url}}/api/v1/products/00000000-0000-0000-0000-000000000000/variants
Content-Type: application/json
{
    "sku": "V14-404-{{run_id}}",
    "name": "Không có sản phẩm",
    "price_amount": "1.00"
}
HTTP 404
[Asserts]
jsonpath "$.error_code" == "ENTITY_NOT_FOUND"

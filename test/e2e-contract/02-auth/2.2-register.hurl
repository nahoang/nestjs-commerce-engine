# 02-auth/2.2-register.hurl
# Test contract for Step 2.2: Đăng ký (DOMAIN-SPEC-2-AUTH § 2.2)

# 1. Đăng ký hợp lệ -> 201, role = customer, email được chuẩn hóa, không lộ trường nhạy cảm (R4)
POST {{base_url}}/api/v1/auth/register
Content-Type: application/json
{
    "email": "Lan-{{run_id}}@Example.com",
    "password": "correct-horse-battery",
    "first_name": "Lan",
    "last_name": "Nguyen"
}
HTTP 201
[Asserts]
header "X-Request-ID" exists
jsonpath "$.data.id" exists
jsonpath "$.data.email" == "lan-{{run_id}}@example.com"
jsonpath "$.data.first_name" == "Lan"
jsonpath "$.data.last_name" == "Nguyen"
jsonpath "$.data.role" == "customer"
jsonpath "$.data.is_active" == true
jsonpath "$.data.created_at" exists
jsonpath "$.data.updated_at" exists
jsonpath "$.data.password" not exists
jsonpath "$.data.password_hash" not exists
jsonpath "$.data.token_key" not exists

# 2. Kèm "role": "admin" -> vẫn là customer (R3)
POST {{base_url}}/api/v1/auth/register
Content-Type: application/json
{
    "email": "mallory-{{run_id}}@example.com",
    "password": "correct-horse-battery",
    "first_name": "Mallory",
    "last_name": "X",
    "role": "admin"
}
HTTP 201
[Asserts]
jsonpath "$.data.role" == "customer"

# 3. Email trùng (khác hoa thường) -> 409 (R2)
POST {{base_url}}/api/v1/auth/register
Content-Type: application/json
{
    "email": "LAN-{{run_id}}@example.com",
    "password": "correct-horse-battery",
    "first_name": "Lan",
    "last_name": "Hai"
}
HTTP 409
[Asserts]
jsonpath "$.error_code" == "DUPLICATE_ENTITY"

# 4. Mật khẩu 7 ký tự -> 422 field password (R1)
POST {{base_url}}/api/v1/auth/register
Content-Type: application/json
{
    "email": "short-{{run_id}}@example.com",
    "password": "1234567",
    "first_name": "Short",
    "last_name": "Pass"
}
HTTP 422
[Asserts]
jsonpath "$.error_code" == "VALIDATION_ERROR"
jsonpath "$.errors[?(@.field=='password')]" exists

# 5. Email sai định dạng -> 422 field email (R1)
POST {{base_url}}/api/v1/auth/register
Content-Type: application/json
{
    "email": "not-an-email",
    "password": "correct-horse-battery",
    "first_name": "Bad",
    "last_name": "Email"
}
HTTP 422
[Asserts]
jsonpath "$.errors[?(@.field=='email')]" exists

# 02-auth/2.3-login.hurl
# Test contract for Step 2.3: Đăng nhập, /me, đổi mật khẩu (DOMAIN-SPEC-2-AUTH § 2.3)
# Giới hạn tần suất (R6) và token hết hạn là test riêng của từng stack, không nằm ở đây.

# 0. Chuẩn bị: tạo tài khoản
POST {{base_url}}/api/v1/auth/register
Content-Type: application/json
{
    "email": "login-{{run_id}}@example.com",
    "password": "correct-horse-battery",
    "first_name": "Lan",
    "last_name": "Nguyen"
}
HTTP 201
[Captures]
user_id: jsonpath "$.data.id"

# 1. Đăng nhập đúng (email khác hoa thường) -> token
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
    "email": "LOGIN-{{run_id}}@Example.com",
    "password": "correct-horse-battery"
}
HTTP 200
[Asserts]
jsonpath "$.data.access_token" isString
jsonpath "$.data.token_type" == "bearer"
jsonpath "$.data.expires_in" > 0
[Captures]
old_token: jsonpath "$.data.access_token"

# 1b. /me với token -> đúng user, không lộ trường nhạy cảm
GET {{base_url}}/api/v1/auth/me
Authorization: Bearer {{old_token}}
HTTP 200
[Asserts]
jsonpath "$.data.id" == {{user_id}}
jsonpath "$.data.email" == "login-{{run_id}}@example.com"
jsonpath "$.data.role" == "customer"
jsonpath "$.data.password_hash" not exists
jsonpath "$.data.token_key" not exists

# 2. Sai mật khẩu -> 401 UNAUTHENTICATED
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
    "email": "login-{{run_id}}@example.com",
    "password": "wrong-password"
}
HTTP 401
[Asserts]
jsonpath "$.error_code" == "UNAUTHENTICATED"
jsonpath "$.detail" == "Could not validate credentials"

# 2b. Email không tồn tại -> đúng cùng lỗi (không cho đoán email)
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
    "email": "nobody-{{run_id}}@example.com",
    "password": "wrong-password"
}
HTTP 401
[Asserts]
jsonpath "$.error_code" == "UNAUTHENTICATED"
jsonpath "$.detail" == "Could not validate credentials"

# 3. /me không token -> 401
GET {{base_url}}/api/v1/auth/me
HTTP 401
[Asserts]
jsonpath "$.error_code" == "UNAUTHENTICATED"

# 3b. /me với token rác -> 401
GET {{base_url}}/api/v1/auth/me
Authorization: Bearer not.a.token
HTTP 401
[Asserts]
jsonpath "$.error_code" == "UNAUTHENTICATED"

# 4. Đổi mật khẩu (cần mật khẩu hiện tại) -> token mới
POST {{base_url}}/api/v1/auth/change-password
Authorization: Bearer {{old_token}}
Content-Type: application/json
{
    "current_password": "correct-horse-battery",
    "new_password": "a-brand-new-passphrase"
}
HTTP 200
[Asserts]
jsonpath "$.data.access_token" isString
jsonpath "$.data.token_type" == "bearer"
[Captures]
new_token: jsonpath "$.data.access_token"

# 4b. Token cũ bị thu hồi
GET {{base_url}}/api/v1/auth/me
Authorization: Bearer {{old_token}}
HTTP 401

# 4c. Token mới dùng được
GET {{base_url}}/api/v1/auth/me
Authorization: Bearer {{new_token}}
HTTP 200
[Asserts]
jsonpath "$.data.id" == {{user_id}}

# 4d. Mật khẩu cũ không đăng nhập được nữa
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
    "email": "login-{{run_id}}@example.com",
    "password": "correct-horse-battery"
}
HTTP 401

# 4e. Mật khẩu mới đăng nhập được
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
{
    "email": "login-{{run_id}}@example.com",
    "password": "a-brand-new-passphrase"
}
HTTP 200

# 5. Đổi mật khẩu với mật khẩu hiện tại sai -> 401
POST {{base_url}}/api/v1/auth/change-password
Authorization: Bearer {{new_token}}
Content-Type: application/json
{
    "current_password": "wrong-current",
    "new_password": "another-passphrase-1"
}
HTTP 401

# 5b. Mật khẩu mới 7 ký tự -> 422 field new_password
POST {{base_url}}/api/v1/auth/change-password
Authorization: Bearer {{new_token}}
Content-Type: application/json
{
    "current_password": "a-brand-new-passphrase",
    "new_password": "1234567"
}
HTTP 422
[Asserts]
jsonpath "$.errors[?(@.field=='new_password')]" exists

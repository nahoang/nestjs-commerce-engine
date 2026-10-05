# Bộ E2E Hợp Đồng Chung (Hurl) — E-Commerce Domain

> Bộ kiểm thử API end-to-end độc lập ngôn ngữ, dùng chung cho cả hai stack triển khai: **NestJS** (`nestjs-commerce-engine`) và **FastAPI** (`fastapi-ecommerce-core`).
> Đặc tả hợp đồng API: [API-CONVENTIONS.md](../specs/API-CONVENTIONS.md).

---

## 1. Cài Đặt Hurl

- **Ubuntu / Debian**:
  ```bash
  sudo apt update && sudo apt install -y hurl
  # Hoặc tải file .deb từ https://github.com/Orange-OpenSource/hurl/releases
  ```
- **macOS**:
  ```bash
  brew install hurl
  ```
- **Windows**:
  ```powershell
  winget install Orange-OpenSource.Hurl
  # Hoặc tải portable zip từ https://github.com/Orange-OpenSource/hurl/releases
  ```

---

## 2. Cách Chạy

```bash
# Chạy 1 file:
hurl --test \
  --variable base_url=http://localhost:3000 \
  --variable run_id=$(date +%s) \
  00-foundation/health.hurl

# Chạy toàn bộ 1 phase:
hurl --test \
  --variable base_url=http://localhost:3000 \
  --variable run_id=$(date +%s) \
  00-foundation/*.hurl
```

---

## 3. Quy Ước Kiểm Thử Hợp Đồng

1. **Cấu trúc thư mục**:
   - Thư mục: `NN-<phase>/` (ví dụ: `00-foundation/`, `01-catalog/`, `02-auth/`).
   - Tên file: `<X.Y>-<slug>.hurl` (ví dụ: `health.hurl`, `1.1-categories.hurl`).

2. **Quy tắc Assert (Trung lập Stack)**:
   - **Chỉ assert theo hợp đồng**: HTTP status code, `error_code`, `errors[*].field`, cấu trúc envelope (`data`, `total`, `page`).
   - **KHÔNG assert nội dung `message` hoặc `detail`**: FastAPI và NestJS có thể có câu chữ giải thích lỗi khác nhau, chỉ cần khớp `error_code` (ví dụ: `ENTITY_NOT_FOUND`, `VALIDATION_ERROR`).
   - **KHÔNG assert định dạng `id`**: Client coi `id` là chuỗi không rỗng opaque (FastAPI dùng 32-hex, NestJS dùng UUID v4). Chỉ kiểm tra `jsonpath "$.data.id" isString` và không rỗng.
   - **Tiền**: So sánh theo chuỗi số thập phân 2 chữ số (ví dụ `"250000.00"`).
   - **Dữ liệu duy nhất**: Mọi dữ liệu có ràng buộc UNIQUE (slug, SKU, email) bắt buộc dùng hậu tố `{{run_id}}` (ví dụ `slug: "ao-thun-{{run_id}}"`) để có thể chạy lặp lại nhiều lần mà không bị lỗi trùng lặp.

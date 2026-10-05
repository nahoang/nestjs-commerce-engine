# Bộ E2E Hợp Đồng Chung (Hurl) — E-Commerce Domain (Bản sao cho CI / Local)

> File nguồn gốc: `../ecommerce-domain/e2e/`. Chỉ sửa ở nguồn, đồng bộ bằng `scripts/sync-e2e.sh`.
> Đặc tả hợp đồng API: `../ecommerce-domain/specs/API-CONVENTIONS.md`.

---

## 1. Cài Đặt Hurl

- **Ubuntu / Debian**:
  ```bash
  sudo apt update && sudo apt install -y hurl
  ```
- **macOS**:
  ```bash
  brew install hurl
  ```
- **Windows**:
  ```powershell
  winget install Orange-OpenSource.Hurl
  ```

---

## 2. Cách Chạy

```bash
# Chạy toàn bộ e2e contract:
bash scripts/e2e.sh

# Chạy trực tiếp 1 file:
hurl --test \
  --variable base_url=http://localhost:3000 \
  --variable run_id=$(date +%s) \
  test/e2e-contract/00-foundation/health.hurl
```

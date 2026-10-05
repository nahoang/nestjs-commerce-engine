import { randomBytes } from 'node:crypto';

/**
 * Generates a clean, URL-friendly slug from a text string according to API-CONVENTIONS §6.
 *
 * Algorithm:
 * 1. Thay đ → d, Đ → D.
 * 2. Chuẩn hóa Unicode NFKD, bỏ toàn bộ ký tự không phải ASCII (loại dấu tiếng Việt).
 * 3. Bỏ mọi ký tự không phải chữ/số/gạch dưới/khoảng trắng/gạch ngang; trim; chuyển chữ thường.
 * 4. Gộp chuỗi khoảng trắng và gạch ngang liên tiếp thành một '-'.
 * 5. Nếu kết quả rỗng → 8 ký tự hex ngẫu nhiên.
 */
export function slugify(name: string): string {
  // 1. Thay đ → d, Đ → D
  let text = name.replace(/đ/g, 'd').replace(/Đ/g, 'D');

  // 2. Chuẩn hóa Unicode NFKD, bỏ toàn bộ ký tự không phải ASCII (loại dấu tiếng Việt)
  text = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // 3. Bỏ mọi ký tự không phải chữ/số/gạch dưới/khoảng trắng/gạch ngang; trim; chuyển chữ thường
  text = text
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase();

  // 4. Gộp chuỗi khoảng trắng và gạch ngang liên tiếp thành một '-'
  const slug = text.replace(/[-\s]+/g, '-');

  // 5. Nếu kết quả rỗng → 8 ký tự hex ngẫu nhiên
  return slug || randomBytes(4).toString('hex');
}

// Sinh mã tự động dùng chung cho client lẫn server (SKU, barcode, mã coupon).
// Dùng crypto.getRandomValues — có sẵn ở cả trình duyệt và Node 18+/edge.

// Số nguyên ngẫu nhiên trong [0, max), phân bố đều (loại bỏ phần dư lệch).
function randomInt(max: number): number {
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= limit);
  return n % max;
}

// Bảng chữ bỏ ký tự dễ nhầm (0/O, 1/I/L, B/8…) cho mã người đọc/đọc-qua-điện-thoại.
const READABLE = "ACDEFGHJKMNPQRTUVWXY2346789";

function randomCode(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += READABLE[randomInt(READABLE.length)];
  return out;
}

// SKU sản phẩm: tiền tố + 6 ký tự dễ đọc. VD: SP7KQD4M.
export function generateSku(prefix = "SP"): string {
  return `${prefix}${randomCode(6)}`;
}

// Mã coupon khuyến mãi: 8 ký tự dễ đọc (tuỳ chọn tiền tố). VD: Q7F3DAKM.
export function generatePromoCode(prefix = ""): string {
  return `${prefix}${randomCode(8)}`;
}

// Số kiểm tra EAN-13 (chuẩn GS1) cho 12 chữ số đầu: trọng số 1,3 xen kẽ từ trái.
export function ean13CheckDigit(digits12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = digits12.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? n : n * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

// Barcode nội bộ chuẩn EAN-13: tiền tố '2' (GS1 dành cho hàng dùng nội bộ
// trong cửa hàng) + 11 chữ số ngẫu nhiên + 1 số kiểm tra → 13 chữ số, quét được.
export function generateBarcodeEan13(): string {
  let base = "2";
  for (let i = 0; i < 11; i++) base += String(randomInt(10));
  return base + ean13CheckDigit(base);
}

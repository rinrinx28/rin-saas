// Đọc số tiền VND bằng chữ tiếng Việt (hóa đơn bắt buộc có dòng "bằng chữ").
// Hỗ trợ tới hàng nghìn tỷ — quá đủ cho giá trị đơn hàng.

const UNITS = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];

// Đọc một nhóm 3 chữ số. `full` = đọc cả "không trăm" khi nhóm không đứng đầu.
function readGroup(num: number, full: boolean): string {
  const tram = Math.floor(num / 100);
  const chuc = Math.floor((num % 100) / 10);
  const donvi = num % 10;
  const parts: string[] = [];

  if (tram > 0 || full) parts.push(`${UNITS[tram]} trăm`);

  if (chuc === 0) {
    if (donvi > 0 && parts.length > 0) parts.push(`lẻ ${UNITS[donvi]}`);
    else if (donvi > 0) parts.push(UNITS[donvi]);
  } else if (chuc === 1) {
    parts.push("mười");
    if (donvi === 5) parts.push("lăm");
    else if (donvi > 0) parts.push(UNITS[donvi]);
  } else {
    parts.push(`${UNITS[chuc]} mươi`);
    if (donvi === 1) parts.push("mốt");
    else if (donvi === 5) parts.push("lăm");
    else if (donvi > 0) parts.push(UNITS[donvi]);
  }

  return parts.join(" ");
}

const BASE_SCALES = ["", "nghìn", "triệu"];

// Hậu tố cấp độ cho nhóm thứ i (0 = nhóm thấp nhất): nghìn/triệu/tỷ, lặp "tỷ".
function scaleWord(i: number): string {
  const base = BASE_SCALES[i % 3];
  const ty = "tỷ ".repeat(Math.floor(i / 3)).trim();
  return [base, ty].filter(Boolean).join(" ");
}

/** Đọc số nguyên VND ≥ 0 thành chữ, viết hoa đầu câu, kèm "đồng". */
export function vndToWords(amount: number): string {
  const n = Math.max(0, Math.floor(amount));
  if (n === 0) return "Không đồng";

  const groups: number[] = [];
  let x = n;
  while (x > 0) {
    groups.unshift(x % 1000);
    x = Math.floor(x / 1000);
  }
  const count = groups.length;

  const chunks: string[] = [];
  groups.forEach((g, idx) => {
    if (g === 0) return;
    const scaleIdx = count - 1 - idx;
    const isLeading = chunks.length === 0;
    const scale = scaleWord(scaleIdx);
    chunks.push([readGroup(g, !isLeading), scale].filter(Boolean).join(" "));
  });

  const text = chunks.join(" ").replace(/\s+/g, " ").trim();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
}

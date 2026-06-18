// Mã hóa Code-128 (subset B) — chuẩn cho mã chữ-số (coupon khuyến mãi…).
// Trả về chuỗi module nhị phân ('1' = vạch đen, '0' = khoảng trắng), bắt đầu
// bằng vạch. Không phụ thuộc DOM → dùng được cả server lẫn client.
//
// Vì sao Code-128B: hỗ trợ toàn bộ ASCII in được (chữ HOA, số, ký hiệu) nên mã
// coupon như "HE2026" mã hóa trực tiếp; khi quét, máy trả về đúng chuỗi gốc →
// khớp thẳng với promotions.code (không cần ánh xạ phụ).

// Bảng độ rộng 6 phần tử (vạch/trắng xen kẽ) cho 107 ký hiệu Code-128 (0..106).
// Phần tử cuối (106) là Stop, 7 phần tử (13 module). Theo chuẩn ISO/IEC 15417.
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;
const ASCII_OFFSET = 32; // ký tự ' ' (32) → giá trị 0 trong subset B

/** Mã hóa chuỗi ASCII in được thành chuỗi module Code-128B. Ký tự ngoài 32..126 → ném lỗi. */
export function encodeCode128B(value: string): string {
  const codes: number[] = [START_B];
  for (const ch of value) {
    const v = ch.charCodeAt(0) - ASCII_OFFSET;
    if (v < 0 || v > 94) throw new Error(`Ký tự không hỗ trợ Code-128B: "${ch}"`);
    codes.push(v);
  }
  // Số kiểm tra (checksum) mod 103: start + Σ(value_i × vị_trí_i), vị trí từ 1.
  let sum = START_B;
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
  codes.push(sum % 103);
  codes.push(STOP);

  let bits = "";
  for (const c of codes) {
    let bar = true;
    for (const w of PATTERNS[c]) {
      bits += (bar ? "1" : "0").repeat(Number(w));
      bar = !bar;
    }
  }
  return bits;
}

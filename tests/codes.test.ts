import { describe, expect, it } from "vitest";
import {
  ean13CheckDigit,
  generateBarcodeEan13,
  generatePromoCode,
  generateSku,
} from "../lib/codes";

// Ký tự dễ nhầm bị loại khỏi bảng chữ mã người đọc: 0 1 5 B I L O S Z.
const AMBIGUOUS = /[015BILOSZ]/;

describe("generateSku", () => {
  it("có tiền tố SP và 6 ký tự dễ đọc", () => {
    const sku = generateSku();
    expect(sku).toMatch(/^SP[ACDEFGHJKMNPQRTUVWXY2346789]{6}$/);
    expect(sku.slice(2)).not.toMatch(AMBIGUOUS);
  });

  it("nhận tiền tố tuỳ chỉnh", () => {
    expect(generateSku("HH")).toMatch(/^HH/);
  });
});

describe("generatePromoCode", () => {
  it("dài 8 ký tự dễ đọc", () => {
    const code = generatePromoCode();
    expect(code).toHaveLength(8);
    expect(code).not.toMatch(AMBIGUOUS);
  });

  it("hiếm khi trùng (100 mã đều khác nhau)", () => {
    const set = new Set(Array.from({ length: 100 }, () => generatePromoCode()));
    expect(set.size).toBe(100);
  });
});

describe("ean13CheckDigit", () => {
  it("tính đúng theo vector chuẩn GS1", () => {
    expect(ean13CheckDigit("400638133393")).toBe("1");
    expect(ean13CheckDigit("978014300723")).toBe("4");
  });
});

describe("generateBarcodeEan13", () => {
  it("13 chữ số, tiền tố nội bộ '2', số kiểm tra hợp lệ", () => {
    const bc = generateBarcodeEan13();
    expect(bc).toMatch(/^\d{13}$/);
    expect(bc[0]).toBe("2");
    expect(ean13CheckDigit(bc.slice(0, 12))).toBe(bc[12]);
  });

  it("không trùng trong 100 lần sinh", () => {
    const set = new Set(Array.from({ length: 100 }, () => generateBarcodeEan13()));
    expect(set.size).toBe(100);
  });
});

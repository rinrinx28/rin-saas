import { describe, expect, it } from "vitest";
import { vndToWords } from "@/lib/vnd-words";

describe("vndToWords — đọc tiền VND bằng chữ", () => {
  it("không / số nhỏ", () => {
    expect(vndToWords(0)).toBe("Không đồng");
    expect(vndToWords(1)).toBe("Một đồng");
    expect(vndToWords(5)).toBe("Năm đồng");
    expect(vndToWords(10)).toBe("Mười đồng");
    expect(vndToWords(15)).toBe("Mười lăm đồng");
    expect(vndToWords(21)).toBe("Hai mươi mốt đồng");
    expect(vndToWords(25)).toBe("Hai mươi lăm đồng");
  });

  it("hàng trăm có 'lẻ'", () => {
    expect(vndToWords(100)).toBe("Một trăm đồng");
    expect(vndToWords(105)).toBe("Một trăm lẻ năm đồng");
    expect(vndToWords(101)).toBe("Một trăm lẻ một đồng");
  });

  it("hàng nghìn", () => {
    expect(vndToWords(1000)).toBe("Một nghìn đồng");
    expect(vndToWords(21000)).toBe("Hai mươi mốt nghìn đồng");
    expect(vndToWords(100000)).toBe("Một trăm nghìn đồng");
    expect(vndToWords(150000)).toBe("Một trăm năm mươi nghìn đồng");
  });

  it("triệu / tỷ", () => {
    expect(vndToWords(1000000)).toBe("Một triệu đồng");
    expect(vndToWords(1234567)).toBe(
      "Một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy đồng",
    );
    expect(vndToWords(1000000000)).toBe("Một tỷ đồng");
  });

  it("nhóm giữa bằng 0 → đọc 'không trăm lẻ'", () => {
    expect(vndToWords(1000005)).toBe("Một triệu không trăm lẻ năm đồng");
  });

  it("làm tròn số âm / thập phân", () => {
    expect(vndToWords(-50)).toBe("Không đồng");
    expect(vndToWords(99.9)).toBe("Chín mươi chín đồng");
  });
});

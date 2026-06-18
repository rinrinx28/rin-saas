import { describe, expect, it } from "vitest";
import { encodeCode128B } from "../lib/barcode";

const START_B = "11010010000"; // ký hiệu Start B
const STOP = "1100011101011"; // ký hiệu Stop (13 module)

describe("encodeCode128B", () => {
  it("chỉ gồm module 0/1, bắt đầu Start B và kết thúc Stop", () => {
    const bits = encodeCode128B("HE2026");
    expect(bits).toMatch(/^[01]+$/);
    expect(bits.startsWith(START_B)).toBe(true);
    expect(bits.endsWith(STOP)).toBe(true);
  });

  it("độ dài đúng = StartB + data×11 + checksum×11 + Stop(13)", () => {
    // 1 ký tự: 11 + 11 + 11 + 13 = 46
    expect(encodeCode128B("A")).toHaveLength(46);
    // 6 ký tự: 11 + 66 + 11 + 13 = 101
    expect(encodeCode128B("HE2026")).toHaveLength(101);
  });

  it("ném lỗi với ký tự ngoài ASCII in được (vd có dấu tiếng Việt)", () => {
    expect(() => encodeCode128B("HÉ")).toThrow();
  });
});

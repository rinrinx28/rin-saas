import { encodeCode128B } from "@/lib/barcode";
import { cn } from "@/lib/utils";

interface BarcodeProps {
  value: string;
  /** Chiều cao vạch (px). */
  height?: number;
  /** Độ rộng 1 module (px) — ≥ 2 để máy quét đọc tốt. */
  moduleWidth?: number;
  /** Số module lề trắng mỗi bên (quiet zone) — chuẩn ≥ 10. */
  quietZone?: number;
  /** Hiện chuỗi mã dưới vạch (HRI). */
  showValue?: boolean;
  className?: string;
}

// Render barcode Code-128 thành SVG (đen/trắng cố định để quét ổn định, không
// phụ thuộc theme). Trả về null nếu value rỗng hoặc có ký tự không mã hóa được.
export function Barcode({
  value,
  height = 48,
  moduleWidth = 2,
  quietZone = 10,
  showValue = true,
  className,
}: BarcodeProps) {
  if (!value) return null;

  let bits: string;
  try {
    bits = encodeCode128B(value);
  } catch {
    return null;
  }

  const totalModules = bits.length + quietZone * 2;
  const width = totalModules * moduleWidth;

  // Gom các dải '1' liên tiếp thành từng vạch.
  const bars: { x: number; w: number }[] = [];
  for (let i = 0; i < bits.length; ) {
    if (bits[i] === "1") {
      let j = i + 1;
      while (j < bits.length && bits[j] === "1") j++;
      bars.push({ x: (quietZone + i) * moduleWidth, w: (j - i) * moduleWidth });
      i = j;
    } else {
      i++;
    }
  }

  return (
    <span className={cn("inline-flex flex-col items-center gap-0.5 rounded-md bg-white p-2", className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`Mã vạch ${value}`}
        className="block"
      >
        <rect width={width} height={height} fill="#ffffff" />
        {bars.map((b, k) => (
          <rect key={k} x={b.x} y={0} width={b.w} height={height} fill="#000000" />
        ))}
      </svg>
      {showValue && <span className="tnum text-xs tracking-widest text-black">{value}</span>}
    </span>
  );
}

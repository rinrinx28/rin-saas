import { ImageResponse } from "next/og";

// Favicon rin·saas — tile primary + logo mark (3 thanh pill xếp tầng + chấm).
// Dựng bằng div để tương thích Satori (next/og). Màu primary ≈ oklch(52% .17 280).
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const PRIMARY = "#5a56c7";

export default function Icon() {
  const bar = (width: number, opacity = 1) => ({
    width,
    height: 3.4,
    borderRadius: 2,
    background: "#ffffff",
    opacity,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 2.6,
          padding: 7,
          background: PRIMARY,
          borderRadius: 8,
        }}
      >
        <div style={bar(18)} />
        <div style={bar(18, 0.55)} />
        <div style={{ display: "flex", alignItems: "center", gap: 2.5 }}>
          <div style={bar(11, 0.55)} />
          <div style={{ width: 4.6, height: 4.6, borderRadius: 999, background: "#ffffff" }} />
        </div>
      </div>
    ),
    { ...size },
  );
}

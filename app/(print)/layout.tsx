// Layout trang in — không sidebar/topbar, nền trung tính, nội dung hóa đơn trắng.
export default function PrintLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-dvh bg-neutral-100 text-black">{children}</div>;
}

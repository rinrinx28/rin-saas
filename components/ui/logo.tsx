import { cn } from "@/lib/utils";

// Logo mark rin·saas — ba thanh pill xếp tầng (dòng hoá đơn / lớp tồn kho) với
// chấm "tổng tiền" làm điểm nhấn, hô ứng dấu · trong tên thương hiệu.
// Vẽ bằng currentColor → tự hợp màu theo ngữ cảnh (nền primary, sidebar, footer…).
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("size-6 shrink-0", className)}
    >
      <rect x="4" y="4.5" width="16" height="3.4" rx="1.7" fill="currentColor" />
      <rect x="4" y="10.3" width="16" height="3.4" rx="1.7" fill="currentColor" opacity="0.5" />
      <rect x="4" y="16.1" width="10.5" height="3.4" rx="1.7" fill="currentColor" opacity="0.5" />
      <circle cx="18" cy="17.8" r="2" fill="currentColor" />
    </svg>
  );
}

// Wordmark đầy đủ: mark + "rin·saas". Dùng khi muốn logo trọn gói; các nơi đã có
// sẵn chữ riêng thì chỉ cần <LogoMark/>.
export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="font-display font-semibold tracking-tight">rin·saas</span>
    </span>
  );
}

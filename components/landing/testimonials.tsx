import { Star } from "lucide-react";

interface Review {
  quote: string;
  name: string;
  role: string;
  tint: string;
}

const REVIEWS: Review[] = [
  {
    quote:
      "Trước đây cuối ngày phải ngồi dò sao kê ngân hàng cả tiếng. Giờ tiền về là Lumi tự khớp đơn, mình chỉ liếc báo cáo là xong.",
    name: "Phương Anh",
    role: "Chủ chuỗi thời trang · 3 chi nhánh, TP.HCM",
    tint: "bg-primary-bg text-primary",
  },
  {
    quote:
      "Quét mã bán hàng nhanh, tồn kho trừ ngay tức thì. Nhân viên mới chỉ cần một buổi là dùng thành thạo.",
    name: "Minh Tuấn",
    role: "Cửa hàng tạp hóa · Hà Nội",
    tint: "bg-info-bg text-info",
  },
  {
    quote:
      "Báo cáo lãi/lỗ theo từng sản phẩm giúp mình biết mặt hàng nào nên nhập thêm, mặt hàng nào nên dừng. Quyết định nhập hàng tự tin hẳn.",
    name: "Thu Mai",
    role: "Shop mỹ phẩm · Đà Nẵng",
    tint: "bg-success-bg text-success",
  },
  {
    quote:
      "Quản lý 5 quán trên cùng một màn hình, doanh thu cập nhật theo thời gian thực. Không phải gọi điện hỏi từng nơi nữa.",
    name: "Đăng Khoa",
    role: "Chuỗi cà phê · 5 chi nhánh",
    tint: "bg-warning-bg text-warning",
  },
  {
    quote:
      "Hóa đơn điện tử xuất đúng chuẩn, khách yên tâm. Công nợ khách quen cũng theo dõi gọn gàng, không sót đồng nào.",
    name: "Thúy Hằng",
    role: "Cửa hàng mẹ & bé · Cần Thơ",
    tint: "bg-primary-bg text-primary",
  },
  {
    quote:
      "Phiếu nhập kho, công nợ nhà cung cấp, đối soát chuyển khoản — đúng những gì một nhà phân phối cần, không thừa không thiếu.",
    name: "Hoàng Nam",
    role: "Nhà phân phối · Bình Dương",
    tint: "bg-info-bg text-info",
  },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[parts.length - 1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export function Testimonials() {
  return (
    <section aria-labelledby="reviews-heading" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <p className="text-sm font-medium text-primary">Khách hàng nói gì</p>
        <h2 id="reviews-heading" className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Được tin dùng bởi cửa hàng khắp Việt Nam
        </h2>
        <p className="mt-3 text-fg-muted">
          Từ tạp hóa, thời trang đến chuỗi cà phê — Lumi giúp chủ shop bán nhanh hơn và nắm
          dòng tiền rõ ràng hơn mỗi ngày.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REVIEWS.map((r) => (
          <figure
            key={r.name}
            data-reveal
            className="flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm transition-shadow duration-300 hover:shadow-md"
          >
            <div className="flex gap-0.5 text-primary">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-fg">
              “{r.quote}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${r.tint}`}
              >
                {initials(r.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="truncate text-xs text-fg-muted">{r.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

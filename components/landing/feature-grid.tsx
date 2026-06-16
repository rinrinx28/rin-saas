import {
  Boxes,
  FileText,
  Landmark,
  ShoppingCart,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
  span: string;
  tint: string;
}

const FEATURES: Feature[] = [
  {
    icon: ShoppingCart,
    title: "Bán hàng (POS) siêu nhanh",
    desc: "Tìm hoặc quét sản phẩm, chọn biến thể, chiết khấu, thu tiền mặt hay QR chuyển khoản — tự xác nhận khi tiền về. Trừ kho tức thì.",
    span: "lg:col-span-3 lg:row-span-2",
    tint: "text-primary",
  },
  {
    icon: Boxes,
    title: "Tồn kho đa chi nhánh realtime",
    desc: "Tồn theo từng chi nhánh, đồng bộ thời gian thực. Cảnh báo sắp hết, nhận diện hàng tồn đọng.",
    span: "lg:col-span-3",
    tint: "text-info",
  },
  {
    icon: TrendingUp,
    title: "Báo cáo tức thì",
    desc: "Doanh thu, lãi/lỗ, tồn kho — biểu đồ cập nhật trực tiếp theo từng đơn, từng phiếu nhập.",
    span: "lg:col-span-3",
    tint: "text-success",
  },
  {
    icon: FileText,
    title: "Hóa đơn điện tử",
    desc: "Bản thể hiện HĐĐT đúng chuẩn NĐ 123/2020 — sẵn sàng cắm nhà cung cấp Viettel / MISA / VNPT.",
    span: "lg:col-span-2",
    tint: "text-primary",
  },
  {
    icon: Landmark,
    title: "Đối soát tự động",
    desc: "Kết nối SePay: tiền chuyển khoản về là tự khớp đơn, ghi sổ — không phải dò tay.",
    span: "lg:col-span-2",
    tint: "text-warning",
  },
  {
    icon: UsersRound,
    title: "Phân quyền nhân sự",
    desc: "Vai trò 4 cấp, gán theo chi nhánh, lời mời tham gia — kiểm soát ai làm được gì.",
    span: "lg:col-span-2",
    tint: "text-info",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" aria-labelledby="features-heading" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <p className="text-sm font-medium text-primary">Tất cả trong một</p>
        <h2 id="features-heading" className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Mọi thứ một cửa hàng cần để vận hành
        </h2>
        <p className="mt-3 text-fg-muted">
          Thay vì ghép nối nhiều công cụ rời rạc, rin·saas gom bán hàng, kho, hóa đơn và dòng tiền
          về một nơi mạch lạc.
        </p>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-6">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          const featured = f.span.includes("row-span-2");
          return (
            <article
              key={f.title}
              data-reveal
              className={`group flex flex-col rounded-xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${f.span}`}
            >
              <span className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface-2">
                <Icon className={`size-5 ${f.tint}`} />
              </span>
              <h3 className={`mt-4 font-semibold tracking-tight ${featured ? "text-xl" : "text-base"}`}>
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{f.desc}</p>
              {featured && (
                <div className="mt-auto pt-6">
                  <div className="flex items-end gap-1.5">
                    {[40, 64, 52, 78, 60, 90].map((h, i) => (
                      <div
                        key={i}
                        className="w-full rounded-t bg-primary/80 transition-transform duration-500 group-hover:scale-y-110"
                        style={{ height: h, transformOrigin: "bottom" }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

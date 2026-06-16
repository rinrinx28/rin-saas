import { Check, Printer, Receipt, ScrollText, Zap } from "lucide-react";
import { DashboardMock } from "@/components/landing/dashboard-mock";

const VN_DOCS = [
  { icon: Receipt, label: "Hóa đơn điện tử chuẩn NĐ 123/2020 (HĐ GTGT & bán hàng)" },
  { icon: ScrollText, label: "Phiếu nhập kho Mẫu 01-VT (TT 133/2016)" },
  { icon: Printer, label: "In bill máy nhiệt K58 / K80 + hóa đơn A4" },
];

export function Showcase() {
  return (
    <section id="showcase" className="border-y border-border bg-surface-2/40">
      <div className="mx-auto max-w-6xl space-y-20 px-5 py-20 lg:space-y-28 lg:py-28">
        {/* Hàng 1: Realtime */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div data-reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-bg px-3 py-1 text-xs font-medium text-primary">
              <Zap className="size-3.5" /> Thời gian thực
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Từ quầy bán đến báo cáo, đồng bộ trong tích tắc
            </h2>
            <p className="mt-4 text-fg-muted">
              Mỗi đơn bán, mỗi phiếu nhập đẩy thẳng vào tồn kho và báo cáo qua Supabase Realtime.
              Quản lý ngồi ở đâu cũng thấy doanh thu, tồn kho, dòng tiền cập nhật ngay — không cần
              bấm tải lại.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "Trừ kho & ghi sổ ngay khi tạo đơn",
                "Tiền chuyển khoản về tự khớp đơn, tự xác nhận",
                "Biểu đồ doanh thu / lãi-lỗ cập nhật trực tiếp",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  <span className="text-fg-muted">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal className="lg:pl-6">
            <DashboardMock />
          </div>
        </div>

        {/* Hàng 2: Chuẩn Việt Nam */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div data-reveal className="order-2 lg:order-1">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-md">
              <p className="text-sm font-medium text-fg-muted">Sẵn sàng cho nghiệp vụ Việt Nam</p>
              <ul className="mt-4 space-y-3">
                {VN_DOCS.map((d) => {
                  const Icon = d.icon;
                  return (
                    <li
                      key={d.label}
                      className="flex items-center gap-3 rounded-lg border border-border px-3.5 py-3"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-primary">
                        <Icon className="size-4" />
                      </span>
                      <span className="text-sm">{d.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div data-reveal className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-bg px-3 py-1 text-xs font-medium text-primary">
              🇻🇳 Made for Vietnam
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Đúng chuẩn, đúng giấy tờ ở Việt Nam
            </h2>
            <p className="mt-4 text-fg-muted">
              Hóa đơn điện tử theo Nghị định 123/2020, phiếu nhập kho Mẫu 01-VT, đối soát chuyển
              khoản qua SePay, in bill máy nhiệt — những thứ một cửa hàng Việt thật sự dùng hằng
              ngày, làm sẵn cho bạn.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

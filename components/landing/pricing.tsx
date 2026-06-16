import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanKey } from "@/lib/plans";

interface Tier {
  key: PlanKey;
  tagline: string;
  features: string[];
  featured?: boolean;
  cta: string;
}

const TIERS: Tier[] = [
  {
    key: "free",
    tagline: "Bắt đầu bán hàng ngay",
    features: ["30 sản phẩm", "1 chi nhánh", "2 nhân viên", "POS · tồn kho · báo cáo cơ bản"],
    cta: "Dùng thử miễn phí",
  },
  {
    key: "pro",
    tagline: "Cho cửa hàng đang lớn",
    features: [
      "1.000 sản phẩm",
      "5 chi nhánh",
      "10 nhân viên",
      "Hóa đơn điện tử + đối soát SePay",
      "Báo cáo nâng cao realtime",
    ],
    featured: true,
    cta: "Chọn gói Pro",
  },
  {
    key: "business",
    tagline: "Quy mô chuỗi, không giới hạn",
    features: [
      "Không giới hạn sản phẩm",
      "Không giới hạn chi nhánh",
      "Không giới hạn nhân viên",
      "Toàn bộ tính năng Pro",
      "Ưu tiên hỗ trợ",
    ],
    cta: "Liên hệ / Đăng ký",
  },
];

function priceLabel(key: PlanKey): { amount: string; suffix: string } {
  const price = PLANS[key].price;
  if (price === 0) return { amount: "Miễn phí", suffix: "" };
  return { amount: `${price.toLocaleString("vi-VN")}₫`, suffix: "/tháng" };
}

export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <p className="text-sm font-medium text-primary">Bảng giá</p>
        <h2 id="pricing-heading" className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Minh bạch, trả theo quy mô
        </h2>
        <p className="mt-3 text-fg-muted">Bắt đầu miễn phí, nâng cấp khi cửa hàng lớn lên. Hủy bất cứ lúc nào.</p>
      </div>

      <div className="mt-12 grid items-start gap-5 lg:grid-cols-3">
        {TIERS.map((t) => {
          const plan = PLANS[t.key];
          const { amount, suffix } = priceLabel(t.key);
          return (
            <div
              key={t.key}
              data-reveal
              className={
                t.featured
                  ? "relative rounded-2xl border-2 border-primary bg-surface p-7 shadow-lg lg:-mt-3"
                  : "rounded-2xl border border-border bg-surface p-7 shadow-sm"
              }
            >
              {t.featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-fg shadow-sm">
                  Phổ biến nhất
                </span>
              )}
              <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-fg-muted">{t.tagline}</p>
              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="tnum font-display text-4xl font-semibold tracking-tight">{amount}</span>
                {suffix && <span className="text-sm text-fg-subtle">{suffix}</span>}
              </p>

              <Button asChild className="mt-6 w-full" variant={t.featured ? "primary" : "outline"}>
                <Link href="/register">{t.cta}</Link>
              </Button>

              <ul className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="text-fg-muted">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

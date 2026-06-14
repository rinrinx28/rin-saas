import {
  ArrowUpRight,
  Boxes,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ThemeToggle } from "@/components/theme-toggle";

const kpis = [
  { label: "Doanh thu hôm nay", value: "12.450.000", unit: "₫", delta: "+8%" },
  { label: "Đơn hàng", value: "37", unit: "", delta: "+5" },
  { label: "Sản phẩm sắp hết", value: "6", unit: "", delta: "cần nhập" },
] as const;

const products = [
  { sku: "A001", name: "Áo thun cotton trắng", stock: 120, price: "90.000" },
  { sku: "A002", name: "Quần jean nam slim", stock: 45, price: "250.000" },
  { sku: "B010", name: "Nón lưỡi trai basic", stock: 8, price: "60.000" },
  { sku: "C300", name: "Túi vải canvas", stock: 0, price: "120.000" },
] as const;

function stockBadge(stock: number) {
  if (stock === 0) return <Badge variant="danger">Hết hàng</Badge>;
  if (stock <= 10) return <Badge variant="warning">Sắp hết</Badge>;
  return <Badge variant="success">Còn hàng</Badge>;
}

export default function Home() {
  return (
    <div className="min-h-full bg-bg">
      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-6">
          <Boxes className="size-5 text-primary" />
          <span className="font-display text-lg font-semibold tracking-tight">
            rin·saas
          </span>
          <Badge variant="primary" className="ml-1">
            Design foundation
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
              <Input
                placeholder="Tìm sản phẩm, đơn hàng…"
                className="w-64 pl-9"
              />
            </div>
            <ThemeToggle />
            <Button size="sm">
              <Plus /> Tạo đơn
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* Hero / tiêu đề */}
        <section className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Tổng quan cửa hàng
          </h1>
          <p className="text-fg-muted">
            Bộ nền thiết kế — Light luxury SaaS, đủ dấu tiếng Việt, số đẳng chiều.
          </p>
        </section>

        {/* KPI cards — comfortable, dùng display font + .tnum */}
        <section className="grid gap-4 sm:grid-cols-3">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-fg-muted">{kpi.label}</p>
                  <TrendingUp className="size-4 text-success" />
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="tnum text-3xl font-semibold tracking-tight">
                    {kpi.value}
                  </span>
                  <span className="text-lg text-fg-muted">{kpi.unit}</span>
                </div>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-success">
                  <ArrowUpRight className="size-3" /> {kpi.delta}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Bảng nghiệp vụ — compact, ruled+hover, cột số .tnum căn phải */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Sản phẩm</CardTitle>
              <CardDescription>Tồn kho theo chi nhánh chính</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus /> Thêm sản phẩm
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>SKU</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="text-right">Tồn</TableHead>
                  <TableHead className="text-right">Giá bán</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.sku}>
                    <TableCell className="tnum text-fg-muted">{p.sku}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-center">
                      {stockBadge(p.stock)}
                    </TableCell>
                    <TableCell className="tnum text-right">{p.stock}</TableCell>
                    <TableCell className="tnum text-right">
                      {p.price} ₫
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Showcase controls */}
        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Variants & states — ADR 0004</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Xóa</Button>
              <Button loading>Đang lưu</Button>
              <Button disabled>Disabled</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inputs & badges</CardTitle>
              <CardDescription>Soft-filled + ngữ nghĩa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Bình thường" />
              <Input placeholder="Lỗi (aria-invalid)" aria-invalid />
              <Input placeholder="Disabled" disabled />
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="success">Đã thanh toán</Badge>
                <Badge variant="warning">Nợ tới hạn</Badge>
                <Badge variant="danger">Quá hạn</Badge>
                <Badge variant="info">Nháp</Badge>
                <Badge variant="primary">Mới</Badge>
                <Badge>Trung tính</Badge>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

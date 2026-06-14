import { ArrowUpRight, Plus, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const kpis = [
  { label: "Doanh thu hôm nay", value: "12.450.000", unit: "₫", delta: "+8%" },
  { label: "Đơn hàng", value: "37", unit: "", delta: "+5" },
  { label: "Sản phẩm sắp hết", value: "6", unit: "", delta: "cần nhập" },
  { label: "Công nợ phải thu", value: "3.200.000", unit: "₫", delta: "5 KH" },
] as const;

const lowStock = [
  { sku: "B010", name: "Nón lưỡi trai basic", stock: 8, price: "60.000" },
  { sku: "C300", name: "Túi vải canvas", stock: 0, price: "120.000" },
  { sku: "D120", name: "Vớ cotton (combo 5)", stock: 4, price: "45.000" },
] as const;

function stockBadge(stock: number) {
  if (stock === 0) return <Badge variant="danger">Hết hàng</Badge>;
  if (stock <= 10) return <Badge variant="warning">Sắp hết</Badge>;
  return <Badge variant="success">Còn hàng</Badge>;
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Tổng quan cửa hàng"
        description="Số liệu demo — sẽ nối dữ liệu thật khi gắn Supabase."
        actions={
          <Button>
            <Plus /> Tạo đơn
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Sản phẩm sắp hết hàng</CardTitle>
            <CardDescription>Cần lên kế hoạch nhập thêm</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Xem tồn kho
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
              {lowStock.map((p) => (
                <TableRow key={p.sku}>
                  <TableCell className="tnum text-fg-muted">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-center">{stockBadge(p.stock)}</TableCell>
                  <TableCell className="tnum text-right">{p.stock}</TableCell>
                  <TableCell className="tnum text-right">{p.price} ₫</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

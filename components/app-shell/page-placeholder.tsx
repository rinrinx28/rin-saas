import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";

interface PagePlaceholderProps {
  title: string;
  description?: string;
  phase: string;
}

// Trang chưa build — empty state nhất quán (ADR 0004), đánh dấu phase từ ADR 0005.
export function PagePlaceholder({ title, description, phase }: PagePlaceholderProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
          <Hammer className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Đang xây dựng</p>
          <p className="max-w-sm text-sm text-fg-muted">
            Tính năng này thuộc <span className="font-medium text-fg">{phase}</span>{" "}
            trong lộ trình. Giao diện nền đã sẵn sàng.
          </p>
        </div>
      </Card>
    </>
  );
}

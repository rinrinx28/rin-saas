// Tiện ích phân trang/lọc cho các trang danh sách (state nằm trên URL).

export const PAGE_SIZE = 20;

// Chuẩn hóa số trang từ query param (>=1, mặc định 1).
export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

// Khoảng [from, to] cho .range() của Supabase theo trang.
export function rangeFor(page: number, size: number = PAGE_SIZE): [number, number] {
  const from = (page - 1) * size;
  return [from, from + size - 1];
}

// Tổng số trang từ count (tối thiểu 1).
export function totalPages(count: number | null, size: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil((count ?? 0) / size));
}

// Làm sạch chuỗi tìm kiếm: bỏ ký tự đại diện ilike (% _) và ký tự phá cú pháp
// PostgREST or() ( , ( ) " \ ), an toàn cho cả .ilike() lẫn .or().
export function sanitizeSearch(raw: string | undefined): string {
  return (raw ?? "")
    .replace(/[%_,()"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

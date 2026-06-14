// Mã ngân hàng có icon SVG thật trong public/banks (sinh tự động).
// Dùng để BankIcon ưu tiên ảnh thật, thiếu thì fallback chip màu.

export const BANK_ICON_CODES: ReadonlySet<string> = new Set(["ABB","ACB","BAB","BIDV","BVB","CIMB","EIB","HDB","ICB","KLB","LPB","MB","MSB","NAB","NCB","OCB","PGB","PVCB","SCB","SEAB","SHB","SHBVN","TCB","TIMO","TPB","VAB","VBA","VCB","VIB","VPB","WVN"]);

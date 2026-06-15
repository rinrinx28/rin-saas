// Hằng số báo cáo tồn kho — tách khỏi actions.ts ("use server" chỉ export async function).

/** Ngưỡng cảnh báo hàng sắp hết (số lượng còn lại). */
export const DEFAULT_THRESHOLD = 5;

/** Số ngày không bán được để coi là hàng tồn đọng. */
export const DEFAULT_DEAD_DAYS = 30;

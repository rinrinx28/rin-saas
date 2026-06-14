import { createClient } from "@/lib/supabase/client";

const BUCKET = "product-images";

// Upload ảnh sản phẩm → trả URL public. Đổi sang R2 sau chỉ cần sửa hàm này (ADR 0007).
export async function uploadProductImage(
  file: File,
  orgId: string,
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

-- 0014 — Bật Realtime cho payment_requests → UI nhận sự kiện 'paid' tức thì
-- (thay vì poll). RLS vẫn lọc: chỉ thành viên org nhận được thay đổi của org mình.

alter publication supabase_realtime add table public.payment_requests;

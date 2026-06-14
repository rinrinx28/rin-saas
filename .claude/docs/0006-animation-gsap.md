# 0006 — Hoạt ảnh (Animation) với GSAP

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14
- **Liên quan:** [0001](0001-design-language.md), [0004](0004-component-rules.md)

## Bối cảnh

Cần một thư viện animation nhất quán cho các chuyển động "có chủ đích" (làm rõ
luồng, không phô trương — theo 0001): sidebar thu gọn/mở rộng, entrance, sau này
là chuyển trang, panel POS, v.v.

## Quyết định

- **Dùng GSAP** (`gsap`) + **`@gsap/react`** (`useGSAP`) làm thư viện animation
  chính cho các chuyển động JS phức tạp / có chuỗi.
- **`useGSAP({ scope })`** cho mọi animation trong React → tự cleanup khi unmount,
  selector giới hạn trong scope (không rò rỉ ra ngoài component).
- **Reduced motion bắt buộc:** kiểm tra `prefers-reduced-motion`
  (`window.matchMedia` hoặc `gsap.matchMedia()`); nếu bật → `duration: 0` (đặt
  trạng thái cuối tức thì, không animate).
- **Thời lượng/easing** bám token 0002: nhanh ~0.15s, thường ~0.3s; easing
  `power2.inOut`/`power2.out` (tương đương cảm giác `--ease-out-expo`).
- **Phân vai với CSS:** chuyển động đơn giản (hover/focus, fade nhỏ) vẫn dùng CSS
  transition (rẻ hơn). GSAP cho: chuỗi (timeline), stagger, thu gọn sidebar,
  entrance, animation phụ thuộc trạng thái.
- **Tài sản tham khảo:** bộ skill GSAP có sẵn (gsap-core, gsap-react,
  gsap-timeline, gsap-scrolltrigger…). Lazy-load plugin nặng khi cần (ADR perf).

### Ngoại lệ "animate layout-bound" (có kiểm soát)

Rule chung tránh animate `width`. **Thu gọn sidebar được phép animate `width`** vì:
chỉ 1 phần tử, kích hoạt theo chủ đích của user (không phải mỗi frame khi scroll),
tần suất thấp. Không mở rộng ngoại lệ này cho animation chạy liên tục.

## Hành vi sidebar (chốt kèm ADR này)

- Hai trạng thái: **mở rộng 240px** / **thu gọn 72px** (chỉ icon).
- Nút toggle ở **đáy sidebar**; khi thu gọn chỉ còn icon, label clip.
- GSAP animate `width` của `<aside>` + fade label; entrance khi mount: sidebar
  trượt nhẹ + nav item stagger.
- **Persist bằng cookie** (`sidebar-collapsed`): server đọc trong `(app)/layout`
  → render đúng width ngay từ SSR (không flash). Lần render đầu (khôi phục) đặt
  trạng thái tức thì (duration 0), không animate.

## Phương án đã cân nhắc & loại

- **Framer Motion:** tốt cho React nhưng user chọn GSAP; GSAP mạnh hơn cho
  timeline/scroll phức tạp sẽ cần sau.
- **CSS-only cho mọi thứ:** đủ cho hover nhưng đuối với chuỗi/stagger/điều phối.

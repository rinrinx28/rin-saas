import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Route công khai (không cần đăng nhập).
const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password"];
// Route chỉ dành cho khách (đã đăng nhập thì đẩy về dashboard). /reset-password
// KHÔNG nằm đây: phiên khôi phục cần ở lại để đặt mật khẩu mới.
const GUEST_ONLY_PREFIXES = ["/login", "/register", "/forgot-password"];

function matchPrefix(prefixes: string[], pathname: string): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Refresh phiên + bảo vệ route. Nếu chưa cấu hình env → cho qua (UI vẫn chạy).
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Trang landing "/" công khai cho mọi người (kể cả khách lạ).
  const isLanding = pathname === "/";

  // Chưa đăng nhập + vào trang cần auth → đẩy về /login
  if (!user && !isLanding && !matchPrefix(PUBLIC_PREFIXES, pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // Đã đăng nhập mà vào trang chỉ-dành-cho-khách → đẩy về /dashboard
  if (user && matchPrefix(GUEST_ONLY_PREFIXES, pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

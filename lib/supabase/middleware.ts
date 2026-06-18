import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/constants";

// Route công khai (không cần đăng nhập).
const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password"];
// Route chỉ dành cho khách (đã đăng nhập thì đẩy về hub). /reset-password KHÔNG
// nằm đây: phiên khôi phục cần ở lại để đặt mật khẩu mới.
const GUEST_ONLY_PREFIXES = ["/login", "/register", "/forgot-password"];
// Khu vực workspace (gắn 1 cửa hàng). URL chuẩn là /s/[orgId]/... — ADR 0015.
// URL trần (vd /products) được tự nâng lên /s/[orgId]/... bằng cookie active_org.
const WORKSPACE_PREFIXES = [
  "/dashboard", "/products", "/categories", "/inventory", "/purchases", "/orders",
  "/customers", "/suppliers", "/reports", "/promotions", "/shifts", "/cash",
  "/settings", "/pos", "/print",
];

function matchPrefix(prefixes: string[], pathname: string): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Refresh phiên + bảo vệ route + URL-scope cửa hàng. Chưa cấu hình env → cho qua.
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
  const isLanding = pathname === "/";

  // Chưa đăng nhập + vào trang cần auth → đẩy về /login
  if (!user && !isLanding && !matchPrefix(PUBLIC_PREFIXES, pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // Đã đăng nhập mà vào trang chỉ-dành-cho-khách → đẩy về hub
  if (user && matchPrefix(GUEST_ONLY_PREFIXES, pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app";
    return NextResponse.redirect(redirectUrl);
  }

  // URL-scope: /s/[orgId]/rest → ghi cookie active_org=orgId rồi rewrite về /rest.
  // Server Action POST cũng đi qua URL này → action đọc đúng org của tab (đa-tab OK).
  const scoped = pathname.match(/^\/s\/([^/]+)(\/.*)?$/);
  if (user && scoped) {
    const orgId = scoped[1];
    const rest = scoped[2] || "/dashboard";
    request.cookies.set(ACTIVE_ORG_COOKIE, orgId);

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = rest;
    const res = NextResponse.rewrite(rewriteUrl, { request });
    // Mang theo cookie auth vừa refresh + ghi active_org cho client đọc.
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    res.cookies.set(ACTIVE_ORG_COOKIE, orgId, {
      path: "/",
      sameSite: "lax",
      maxAge: 31536000,
    });
    return res;
  }

  // URL trần thuộc workspace (vd /products) → nâng lên /s/[orgId]/... bằng cookie.
  if (user && matchPrefix(WORKSPACE_PREFIXES, pathname)) {
    const cookieOrg = request.cookies.get(ACTIVE_ORG_COOKIE)?.value;
    const target = request.nextUrl.clone();
    target.pathname = cookieOrg ? `/s/${cookieOrg}${pathname}` : "/app";
    return NextResponse.redirect(target);
  }

  return supabaseResponse;
}

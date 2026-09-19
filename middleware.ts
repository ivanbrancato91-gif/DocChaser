import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/recover",
  "/reset-password",
  "/pricing",
  "/privacy",
  "/terms",
  "/cookies",
  "/faq",
  "/features",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lascia passare tutto ciò che non deve essere controllato
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Pagine pubbliche
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Controllo cookie JWT (nessun Supabase qui)
  const token =
    req.cookies.get("dc_session")?.value ||
    req.cookies.get("sb-access-token")?.value ||
    req.cookies.get("access_token")?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
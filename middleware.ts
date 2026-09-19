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

  // Lascia passare API, asset, immagini e file statici
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/public") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Rotte pubbliche
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith("/portal/")
  ) {
    return NextResponse.next();
  }

  // Controllo cookie di autenticazione
  const token =
    req.cookies.get("sb-access-token")?.value ??
    req.cookies.get("access-token")?.value ??
    req.cookies.get("token")?.value;

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
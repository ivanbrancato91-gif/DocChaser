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

  // Lascia passare API e asset statici
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts")
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

  // Controllo sessione Supabase
  const session =
    req.cookies.get("sb-access-token") ||
    req.cookies.get("sb-access-token.0");

  if (!session) {
    const login = new URL("/login", req.url);
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};
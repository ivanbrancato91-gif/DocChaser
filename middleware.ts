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

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Escludi API, assets e file statici
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Lascia passare il portale clienti
  if (pathname.startsWith("/portal/")) {
    return NextResponse.next();
  }

  // Pagine pubbliche
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Controllo cookie (Edge-safe)
  const session = req.cookies.get("dc_session")?.value;

  if (!session) {
    const login = new URL("/login", req.url);
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
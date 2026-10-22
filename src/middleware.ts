import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. NEVER redirect API routes - they must handle auth themselves (returning 401 JSON)
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 2. Allow Next.js internals and static files
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname.includes(".")) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(
    request.cookies.get("tracklist.session_token")?.value ||
      request.cookies.get("__Secure-tracklist.session_token")?.value,
  );

  // 3. Handle /login page
  if (pathname.startsWith("/login")) {
    if (hasSessionCookie) {
      const nextParam = request.nextUrl.searchParams.get("next");
      const target = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // 4. Optimistic redirect for unauthenticated page requests
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    const destination = pathname + request.nextUrl.search;
    if (destination && destination !== "/") {
      loginUrl.searchParams.set("next", destination);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

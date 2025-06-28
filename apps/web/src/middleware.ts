import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { getSafeRedirectUrl } from "@/lib/redirect-utils";

const ROUTE_CONFIG = {
  protected: [{ exact: false, path: "/editor" }],
  auth: [
    { exact: true, path: "/login" },
    { exact: true, path: "/signup" },
  ],
  defaultRedirect: "/editor",
  loginPath: "/login",
} as const;

function isRouteMatch(
  pathname: string,
  routes: readonly { exact: boolean; path: string }[]
) {
  return routes.some((route) => {
    if (route.exact) {
      return pathname === route.path;
    }
    return pathname.startsWith(route.path);
  });
}

function buildRedirectUrl(base: string, redirectPath: string, nextUrl: URL) {
  const safePath = getSafeRedirectUrl(
    redirectPath,
    ROUTE_CONFIG.defaultRedirect
  );

  const redirectParam = `?redirect=${encodeURIComponent(safePath)}`;
  return new URL(base + redirectParam, nextUrl);
}

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const session = getSessionCookie(request);
  const isLoggedIn = !!session;
  const isProtectedRoute = isRouteMatch(
    nextUrl.pathname,
    ROUTE_CONFIG.protected
  );
  const isAuthRoute = isRouteMatch(nextUrl.pathname, ROUTE_CONFIG.auth);

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(
      new URL(ROUTE_CONFIG.defaultRedirect, nextUrl)
    );
  }

  if (isProtectedRoute && !isLoggedIn) {
    let redirectPath = nextUrl.pathname;
    if (nextUrl.search) {
      redirectPath += nextUrl.search;
    }

    const loginRedirectUrl = buildRedirectUrl(
      ROUTE_CONFIG.loginPath,
      redirectPath,
      nextUrl
    );

    return NextResponse.redirect(loginRedirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

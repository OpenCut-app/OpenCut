import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATH_PREFIXES = ["/auth", "/privacy", "/terms"];
const PUBLIC_EXACT_PATHS = ["/robots.txt", "/sitemap.xml", "/manifest.json"];

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const isPublicPath =
		PUBLIC_EXACT_PATHS.includes(pathname) ||
		PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

	const hasRefreshCookie = request.cookies.has("refresh_token");

	if (isPublicPath) {
		return NextResponse.next();
	}

	if (!hasRefreshCookie) {
		const loginUrl = new URL("/auth/login", request.url);
		const nextTarget = `${pathname}${request.nextUrl.search}`;
		loginUrl.searchParams.set("next", nextTarget);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - api routes
		 * - next internal/static assets
		 * - files with extensions (images, icons, etc from /public)
		 */
		"/((?!api|_next/static|_next/image|.*\\..*).*)",
	],
};

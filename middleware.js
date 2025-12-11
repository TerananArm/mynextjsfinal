// middleware.js - Route Protection
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicPaths = ['/login', '/api/auth', '/api/setup'];
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

    // Static files and assets don't need auth
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.') // files with extensions
    ) {
        return NextResponse.next();
    }

    // Allow public paths
    if (isPublicPath) {
        return NextResponse.next();
    }

    // Get secret from env or fallback to hardcoded (must match authOptions)
    const secret = process.env.NEXTAUTH_SECRET || 'super-secret-key-123456789';

    // Check for session token
    const token = await getToken({
        req: request,
        secret: secret,
    });

    // Protected routes - redirect to login if no token
    const protectedPaths = ['/dashboard', '/schedule', '/print'];
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

    if (isProtectedPath && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If user is logged in and trying to access login page, redirect to dashboard
    if (pathname === '/login' && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

// Only run middleware on specific routes
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes) - handled separately
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

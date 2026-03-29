import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Note: In an Edge serverless environment (like Vercel), this Map is scoped strictly 
// to the lifetime of an individual isolate. It provides "best effort" rate limiting 
// to thwart sudden script bursts, but for true global rate-limiting across distributed 
// workers, an external data store like Redis (e.g., @upstash/ratelimit) is required.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const RATE_LIMIT = 5; // requests
const WINDOW_MS = 60 * 1000; // 1 minute

export function middleware(request: NextRequest) {
  // 1. Rate Limiting for the /api/parse API Route
  if (request.nextUrl.pathname === '/api/parse') {
    const ip = request.ip || 
               request.headers.get('x-forwarded-for')?.split(',')[0] || 
               '127.0.0.1';
    
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    const record = rateLimitMap.get(ip);
    
    if (!record || record.lastReset < windowStart) {
      // The user has no record or the limit window has passed.
      rateLimitMap.set(ip, { count: 1, lastReset: now });
    } else {
      // User is within the current window.
      if (record.count >= RATE_LIMIT) {
        return new NextResponse(
          JSON.stringify({ 
            success: false, 
            error: "Too many requests. Please try again later." 
          }),
          { 
            status: 429, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      record.count += 1;
      rateLimitMap.set(ip, record);
    }
  }

  // 2. Global Security Headers (Content Security Policy)
  const response = NextResponse.next();
  
  // A restrictive CSP: Only allow scripts from 'self'. Disallow eval(), inline scripts (unless nonce'd).
  // Note: Next.js dev mode requires 'unsafe-eval' to work properly. We apply a basic version here.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' blob: data:;
    connect-src 'self' https://generativelanguage.googleapis.com;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  // Match the parse API and all HTML routes for security headers
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

type CookieToSet = {
  name: string;
  value: string;
  options: Parameters<NextResponse["cookies"]["set"]>[2];
};

const protectedRoutes = [
  "/dashboard",
  "/profile",
  "/tournaments",
  "/tournaments/create",
];

const protectedTournamentSegments = [
  "/edit",
  "/registrations",
  "/payments",
  "/auction",
  "/teams",
  "/export",
];

function isProtectedPath(pathname: string) {
  if (protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return true;
  }

  return /^\/tournaments\/[^/]+/.test(pathname)
    && protectedTournamentSegments.some((segment) => pathname.endsWith(segment) || pathname.includes(`${segment}/`));
}

export async function updateSession(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new NextResponse(
      `<html>
        <head>
          <title>Configuration Error - TurfTitans</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; background: #0b0f19; color: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 80vh; margin: 0; }
            .card { background: #111827; padding: 2.5rem; border-radius: 1rem; max-width: 600px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #1f2937; text-align: center; }
            .logo { font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, #10b981, #059669); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1.5rem; }
            h1 { color: #ef4444; font-size: 1.5rem; margin-top: 0; font-weight: 700; }
            p { color: #9ca3af; line-height: 1.6; font-size: 1rem; margin-bottom: 2rem; }
            .steps { text-align: left; background: #1f2937; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid #374151; }
            .steps h2 { font-size: 1.1rem; margin-top: 0; color: #e5e7eb; }
            ol { margin: 0; padding-left: 1.25rem; color: #d1d5db; line-height: 1.7; }
            code { background: #111827; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; color: #10b981; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">TurfTitans</div>
            <h1>Configuration Error</h1>
            <p>The required Supabase environment variables are missing in your deployment. Please add them to your Vercel Project Settings to activate the application.</p>
            <div class="steps">
              <h2>How to fix this:</h2>
              <ol>
                <li>Go to your <strong>Vercel Dashboard</strong>.</li>
                <li>Select the <strong>turftitans</strong> project.</li>
                <li>Go to <strong>Settings</strong> &gt; <strong>Environment Variables</strong>.</li>
                <li>Add the following keys with their corresponding values:
                  <ul>
                    <li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
                    <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                    <li><code>SUPABASE_SERVICE_ROLE_KEY</code> (required for admin features like auctions)</li>
                  </ul>
                </li>
                <li>Redeploy your project for the changes to take effect.</li>
              </ol>
            </div>
          </div>
        </body>
      </html>`,
      {
        status: 500,
        headers: { "content-type": "text/html" },
      }
    );
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && ["/login", "/sign-up"].includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

const DASHBOARD_ROUTES = [
  "/admin",
  "/gudang",
  "/penjahit",
  "/finance",
  "/installer",
  "/owner",
];

const PUBLIC_ROUTES = ["/", "/login"];

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isDashboardRoute = DASHBOARD_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Not logged in → redirect to login
  if (!user && isDashboardRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged in → don't show login page
  if (user && pathname === "/login") {
    const { data: staffData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = staffData?.role ?? "admin";
    const dashboards: Record<string, string> = {
      admin: "/admin",
      gudang: "/gudang",
      penjahit: "/penjahit",
      finance: "/finance",
      installer: "/installer",
      owner: "/owner",
    };

    return NextResponse.redirect(
      new URL(dashboards[role] ?? "/admin", request.url)
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};

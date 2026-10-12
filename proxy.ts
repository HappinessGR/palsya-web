import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedPage = createRouteMatcher([
  "/dashboard(.*)",
  "/patient(.*)",
  "/clinician(.*)",
  "/admin(.*)",
  "/onboarding(.*)",
  "/auth/continue",
  "/me",
]);

// Signed-in check only. Which role may open which page is enforced on the
// server by each area's layout (src/lib/authz.ts requirePagePermission), and
// every API route checks its own permission (authorizeApi → 401/403 JSON) —
// API routes are deliberately not listed here so they answer with a status
// code instead of a sign-in redirect. Roles are read from the database, never
// from the request.
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedPage(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)", "/__clerk/:path*"],
};

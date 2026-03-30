export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/groups/:path*",
    "/api/users/:path*",
    "/api/groups/:path*",
    "/api/expenses/:path*",
    "/api/settlements/:path*",
  ],
};

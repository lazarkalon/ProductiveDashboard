export { default } from "next-auth/middleware"

export const config = {
  // Protect EVERYTHING by default
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}

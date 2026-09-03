import { NextResponse, type NextRequest } from 'next/server'

// Next 16 renamed the `middleware` file convention to `proxy`.
// See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md

// This app uses localStorage-based demo auth — all auth checks happen client-side.
// The proxy only handles static asset bypassing and passes all requests through.
export function proxy(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

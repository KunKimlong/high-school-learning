import { NextResponse, type NextRequest } from 'next/server'
import { defaultLocale, locales, type Locale } from './i18n/config'

/** Pick the first supported locale from Accept-Language, e.g. "en-US,en;q=0.9" → "en". */
function getLocale(request: NextRequest): Locale {
  const header = request.headers.get('accept-language') ?? ''
  const preferred = header
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase())
    .filter(Boolean)
  for (const tag of preferred) {
    const match = locales.find((l) => tag === l || tag.startsWith(`${l}-`))
    if (match) return match
  }
  return defaultLocale
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return
  request.nextUrl.pathname = `/${getLocale(request)}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  // Skip Next internals, API routes and files with an extension (favicon.ico, images…).
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}

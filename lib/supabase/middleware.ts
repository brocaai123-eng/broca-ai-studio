import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/admin', '/ai-assistant', '/reports', '/marketplace/submit']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Admin-only routes - check role
  if (request.nextUrl.pathname.startsWith('/admin') && user) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('🛡️ Admin Route Check:', {
      userId: user.id,
      profileRole: profile?.role,
      error: error?.message,
      isAdmin: profile?.role === 'admin'
    })

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      console.log('❌ Non-admin accessing /admin, redirecting to /dashboard')
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from auth pages
  // Exception: Allow /signup with invitation token or step=plan (for plan selection after signup)
  const authPaths = ['/login', '/signup']
  const isAuthPath = authPaths.some(path => 
    request.nextUrl.pathname === path
  )
  
  // Don't redirect if user is on signup page with an invitation token or step=plan
  const hasInvitationToken = request.nextUrl.searchParams.has('invitation')
  const hasStepPlan = request.nextUrl.searchParams.get('step') === 'plan'
  const isSignupWithSpecialParams = request.nextUrl.pathname === '/signup' && (hasInvitationToken || hasStepPlan)

  if (isAuthPath && user && !isSignupWithSpecialParams) {
    // Check if user is admin to redirect appropriately
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Debug logging
    console.log('🔍 Middleware Debug:', {
      userId: user.id,
      userEmail: user.email,
      profileRole: profile?.role,
      profileData: profile,
      error: error,
      isAdmin: profile?.role === 'admin'
    })

    const url = request.nextUrl.clone()
    // Redirect admins to /admin, brokers to /dashboard
    url.pathname = profile?.role === 'admin' ? '/admin' : '/dashboard'
    console.log('➡️ Redirecting to:', url.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

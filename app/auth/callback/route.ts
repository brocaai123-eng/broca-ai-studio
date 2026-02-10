import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const cookieStore = await cookies()
  const mode = cookieStore.get('signup_mode')?.value
  const affiliateCode = cookieStore.get('affiliate_code')?.value

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if user has a subscription
      const { data: subscription } = await supabase
        .from('broker_subscriptions')
        .select('id, status')
        .eq('broker_id', data.user.id)
        .eq('status', 'active')
        .maybeSingle()
      
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      // If admin, go to admin dashboard
      if (profile?.role === 'admin') {
        return NextResponse.redirect(`${origin}/admin`)
      }

      // If affiliate, go to affiliate dashboard
      if (profile?.role === 'affiliate') {
        return NextResponse.redirect(`${origin}/affiliate`)
      }

      // If user signed up as affiliate (mode=affiliate from cookie), redirect to affiliate registration
      if (mode === 'affiliate') {
        // Clear the cookie
        cookieStore.delete('signup_mode')
        return NextResponse.redirect(`${origin}/affiliate/register`)
      }

      // If no subscription and broker role, redirect to plan selection
      if (!subscription && profile?.role === 'broker') {
        // If user came from an affiliate link, track the click/signup
        if (affiliateCode) {
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin
            await fetch(`${appUrl}/api/affiliate/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                affiliateCode,
                referredEmail: data.user.email,
                referredName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
                referredUserId: data.user.id,
              }),
            })
          } catch (e) {
            console.error('Failed to track affiliate signup:', e)
          }
          // Pass affiliate code in redirect URL so signup page can send it to Stripe
          return NextResponse.redirect(`${origin}/signup?step=plan&aff=${encodeURIComponent(affiliateCode)}`)
        }
        return NextResponse.redirect(`${origin}/signup?step=plan`)
      }

      // Otherwise go to next or dashboard
      const redirectTo = next || '/dashboard'
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}

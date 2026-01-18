'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from './client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null; data: { user: User | null; session: Session | null } | null }>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Process referral bonus when user signs up
async function processReferral(userId: string, userEmail: string, referralToken: string) {
  try {
    const response = await fetch('/api/broker/referrals/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: referralToken,
        newUserId: userId,
        newUserEmail: userEmail,
      }),
    });
    
    const data = await response.json();
    if (response.ok && data.success) {
      console.log('Referral processed successfully:', data);
    } else {
      console.error('Failed to process referral:', data.error);
    }
  } catch (error) {
    console.error('Error processing referral:', error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const referralProcessedRef = useRef(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Process referral when user signs in for the first time (after signup)
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user && !referralProcessedRef.current) {
        const referralToken = typeof window !== 'undefined' ? sessionStorage.getItem('referral_token') : null;
        if (referralToken) {
          referralProcessedRef.current = true;
          sessionStorage.removeItem('referral_token');
          await processReferral(session.user.id, session.user.email || '', referralToken);
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error, data }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signOut,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRegisterAffiliate } from '@/lib/hooks/use-affiliate';
import BrocaLogo from '@/components/ui/BrocaLogo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Megaphone, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AffiliateRegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { mutate: registerAffiliate, isPending } = useRegisterAffiliate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signup?mode=affiliate');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
    }
  }, [user]);

  const handleRegister = () => {
    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    registerAffiliate(
      {
        userId: user!.id,
        email: user!.email || '',
        fullName: fullName,
        phone: phone || undefined,
        company: company || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Welcome to the Broca Affiliate Program!');
          // Clear any stored signup flags
          sessionStorage.removeItem('affiliate_signup');
          router.push('/affiliate');
        },
        onError: (error: Error) => {
          if (error.message?.includes('already registered')) {
            router.push('/affiliate');
          } else {
            toast.error(error.message || 'Failed to register as affiliate');
          }
        },
      }
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const benefits = [
    'Earn 25% recurring commission on every referral',
    'No subscription or upfront costs',
    'Access marketing materials & resources',
    'Real-time tracking dashboard',
    'Monthly payouts via Stripe, PayPal, or bank transfer',
  ];

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <BrocaLogo size="lg" />
          </Link>
        </div>

        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Complete Affiliate Setup
            </h1>
            <p className="text-muted-foreground">
              Fill in your details to activate your affiliate account
            </p>
          </div>

          {/* Benefits */}
          <div className="mb-6 space-y-2.5">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="h-12 bg-secondary/50 border-border/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Phone (optional)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="h-12 bg-secondary/50 border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-foreground">Company (optional)</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company name"
                className="h-12 bg-secondary/50 border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-foreground">Website (optional)</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://your-website.com"
                className="h-12 bg-secondary/50 border-border/50"
              />
            </div>

            <Button
              onClick={handleRegister}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  Activate Affiliate Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Want to use Broca as a broker instead?{' '}
              <Link href="/signup" className="text-primary hover:text-primary/80 font-medium">
                Sign up as a broker
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

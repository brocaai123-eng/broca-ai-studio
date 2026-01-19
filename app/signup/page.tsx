"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Check, Loader2, Gift, CreditCard, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BrocaLogo from "@/components/ui/BrocaLogo";
import { useAuth } from "@/lib/supabase/auth-context";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

interface InvitationData {
  id: string;
  email: string;
  name: string | null;
  plan_id: string | null;
  plan?: {
    id: string;
    name: string;
    price: number;
    tokens_per_month: number;
  };
}

interface ReferralData {
  id: string;
  referred_email: string;
  referred_name: string | null;
  referrer_name: string | null;
  referrer_company: string | null;
  expires_at: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  tokens_per_month: number;
  description: string | null;
}

const benefits = [
  "AI-powered document extraction",
  "Customizable onboarding forms",
  "Automated client notifications",
];

function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invitationToken = searchParams.get("invitation");
  const referralToken = searchParams.get("ref");
  const subscriptionStatus = searchParams.get("subscription");
  const stepParam = searchParams.get("step");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [step, setStep] = useState<"signup" | "plan" | "checkout">(
    stepParam === "plan" ? "plan" : "signup"
  );
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(!!invitationToken || !!referralToken);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const { signUpWithEmail, signInWithGoogle, signOut, user } = useAuth();
  const { toast } = useToast();

  // Fetch invitation or referral details if token provided
  useEffect(() => {
    if (invitationToken) {
      fetchInvitation(invitationToken);
    } else if (referralToken) {
      fetchReferral(referralToken);
    } else {
      setIsLoadingInvitation(false);
    }
    fetchPlans();
  }, [invitationToken, referralToken]);

  // Handle subscription status from redirect
  useEffect(() => {
    if (subscriptionStatus === "cancelled") {
      toast({
        title: "Subscription Cancelled",
        description: "You can complete your subscription anytime.",
      });
    }
  }, [subscriptionStatus, toast]);

  // If user is logged in and step=plan (but NOT invitation/referral), show plan selection
  // For invitation links, we want to show a sign-out prompt instead
  useEffect(() => {
    if (user && stepParam === "plan" && !invitationToken && !referralToken && step === "signup") {
      setStep("plan");
    }
  }, [user, step, stepParam, invitationToken, referralToken]);

  const fetchReferral = async (token: string) => {
    try {
      const response = await fetch(`/api/broker/referrals/verify?token=${token}`);
      const data = await response.json();

      setIsLoadingInvitation(false);

      if (!response.ok || !data.valid) {
        toast({
          title: "Invalid Referral",
          description: data.error || "This referral link is invalid or has expired.",
          variant: "destructive",
        });
        return;
      }

      setReferral(data.referral);
      if (data.referral.referred_email) {
        setEmail(data.referral.referred_email);
      }
      if (data.referral.referred_name) {
        setName(data.referral.referred_name);
      }
    } catch (error) {
      setIsLoadingInvitation(false);
      toast({
        title: "Error",
        description: "Failed to verify referral link.",
        variant: "destructive",
      });
    }
  };

  const fetchInvitation = async (token: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("broker_invitations")
      .select(`
        id, email, name, plan_id, expires_at,
        plan:subscription_plans(id, name, price, tokens_per_month)
      `)
      .eq("invitation_token", token)
      .eq("status", "pending")
      .single();

    setIsLoadingInvitation(false);

    if (error || !data) {
      toast({
        title: "Invalid Invitation",
        description: "This invitation link is invalid or has expired.",
        variant: "destructive",
      });
      return;
    }

    // Check if expired
    const expiresAt = new Date(data.expires_at || 0);
    if (expiresAt < new Date()) {
      toast({
        title: "Invitation Expired",
        description: "This invitation link has expired. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    // Transform the data
    const planData = Array.isArray(data.plan) ? data.plan[0] : data.plan;
    const invitationData: InvitationData = {
      id: data.id,
      email: data.email,
      name: data.name,
      plan_id: data.plan_id,
      plan: planData || undefined,
    };

    setInvitation(invitationData);
    setEmail(data.email);
    setName(data.name || "");
    if (data.plan_id) {
      setSelectedPlan(data.plan_id);
    }
  };

  const fetchPlans = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (data) {
      setPlans(data);
      if (!selectedPlan && data.length > 0) {
        setSelectedPlan(data[0].id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Store referral token for processing after email verification
      if (referralToken) {
        sessionStorage.setItem("referral_token", referralToken);
      }
      
      const { error } = await signUpWithEmail(email, password, name);
      if (error) {
        toast({
          title: "Signup failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link. Please verify your email to continue.",
        });
        // If invitation, stay on page to show plan selection after email verification
        if (invitation) {
          toast({
            title: "Next Step",
            description: "After verifying your email, sign in to complete your subscription.",
          });
        }
        // If referral, show message about bonus
        if (referral) {
          toast({
            title: "Referral Applied!",
            description: `Your referrer will receive bonus tokens when you verify your email and sign in.`,
          });
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Store invitation token for after OAuth redirect
      if (invitationToken) {
        sessionStorage.setItem("invitation_token", invitationToken);
      }
      // Store referral token for after OAuth redirect
      if (referralToken) {
        sessionStorage.setItem("referral_token", referralToken);
      }
      await signInWithGoogle();
    } catch {
      toast({
        title: "Error",
        description: "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user || !selectedPlan) return;

    setCheckoutLoading(true);
    try {
      // Check if selected plan is Free ($0)
      const selectedPlanData = plans.find(p => p.id === selectedPlan);
      
      if (selectedPlanData && selectedPlanData.price === 0) {
        // Create free subscription via API (bypasses RLS)
        const response = await fetch('/api/subscription/activate-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            planId: selectedPlan,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
            // Subscription already exists
            toast({
              title: "Already Subscribed",
              description: "You already have an active subscription.",
              variant: "destructive",
            });
            router.push('/dashboard');
            return;
          }
          throw new Error(data.error || 'Failed to activate free plan');
        }

        toast({
          title: "Success!",
          description: "Your free plan is now active. Welcome to BrocaAI!",
        });
        
        router.push('/dashboard');
        return;
      }

      // For paid plans, proceed with Stripe
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          userId: user.id,
          invitationToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (isLoadingInvitation) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is logged in and has an invitation token, show sign-out prompt
  if (user && invitationToken && invitation) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <BrocaLogo size="lg" />
            </Link>
          </div>

          <div className="glass-card p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-yellow-500" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                You Have an Invitation
              </h1>
              <p className="text-muted-foreground">
                You&apos;re currently logged in as <strong>{user.email}</strong>. 
                To use this invitation for <strong>{invitation.email}</strong>, please sign out first.
              </p>
            </div>

            {invitation.plan && (
              <div className="mb-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {invitation.plan.name} Plan Invitation
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${invitation.plan.price}/month • {invitation.plan.tokens_per_month} tokens
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={() => signOut()}
              className="w-full h-12 btn-glow bg-primary hover:bg-primary/90 mb-3"
            >
              <LogOut className="mr-2 w-5 h-5" />
              Sign Out & Accept Invitation
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Continue as {user.email?.split('@')[0]}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show plan selection if user is logged in and step=plan (but NOT for invitation links)
  if (user && (step === "plan" || stepParam === "plan") && !invitationToken) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <BrocaLogo size="lg" />
            </Link>
          </div>

          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Choose Your Plan
              </h1>
              <p className="text-muted-foreground">
                Select a plan to continue
              </p>
            </div>

            {invitation?.plan && (
              <div className="mb-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground">
                    Recommended: <strong>{invitation.plan.name}</strong> plan
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-4 mb-8">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="text-right">
                        <span className="text-2xl font-bold">${plan.price}</span>
                        <span className="text-muted-foreground text-sm">/month</span>
                      </div>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span>
                        {plan.tokens_per_month === -1
                          ? "Unlimited tokens"
                          : `${plan.tokens_per_month.toLocaleString()} tokens/month`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={handleCheckout}
              className="w-full h-12 btn-glow bg-primary hover:bg-primary/90"
              disabled={checkoutLoading || !selectedPlan}
            >
              {checkoutLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  Continue to Payment
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>

            <p className="mt-4 text-xs text-muted-foreground text-center">
              Secure payment powered by Stripe
            </p>

            {/* Sign out option for admins testing the flow */}
            <div className="mt-6 pt-6 border-t border-border/50">
              <p className="text-sm text-muted-foreground text-center mb-3">
                Want to test the full signup flow?
              </p>
              <Button
                variant="outline"
                onClick={() => signOut()}
                className="w-full"
              >
                <LogOut className="mr-2 w-4 h-4" />
                Sign out to create a new account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <BrocaLogo size="lg" />
          </Link>
        </div>

        {/* Signup Card */}
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              {invitation ? "Accept Your Invitation" : referral ? "Join BrocaAI" : "Get Early Access"}
            </h1>
            <p className="text-muted-foreground">
              {invitation
                ? `Welcome${invitation.name ? `, ${invitation.name}` : ""}! Create your account to get started.`
                : referral 
                  ? `${referral.referrer_name || "A fellow broker"} invited you to join!`
                  : "Join 2,500+ agents already on the waitlist"}
            </p>
          </div>

          {invitation && invitation.plan && (
            <div className="mb-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {invitation.plan.name} Plan
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${invitation.plan.price}/month • {invitation.plan.tokens_per_month === -1 ? "Unlimited" : invitation.plan.tokens_per_month} tokens
                  </p>
                </div>
              </div>
            </div>
          )}

          {referral && (
            <div className="mb-6 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Referral Invitation
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Invited by {referral.referrer_name || "a fellow broker"}
                    {referral.referrer_company && ` from ${referral.referrer_company}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="mb-6 space-y-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 mb-6 border-border/50 hover:bg-secondary/50"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Work Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@realestate.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground pr-12"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 btn-glow bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            By signing up, you agree to our{" "}
            <Link href="#" className="text-primary hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
          </p>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}

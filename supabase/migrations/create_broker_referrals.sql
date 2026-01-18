-- Migration: Create broker referrals system
-- Run this in your Supabase SQL Editor

-- Create broker_referrals table
CREATE TABLE IF NOT EXISTS public.broker_referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_email TEXT NOT NULL,
  referred_name TEXT,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  tokens_rewarded BOOLEAN DEFAULT FALSE,
  reward_amount INTEGER DEFAULT 30,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.broker_referrals ENABLE ROW LEVEL SECURITY;

-- Policies for broker_referrals
CREATE POLICY "Brokers can view own referrals" ON public.broker_referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Brokers can create referrals" ON public.broker_referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "System can update referrals" ON public.broker_referrals
  FOR UPDATE USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_broker_referrals_token ON public.broker_referrals(referral_token);
CREATE INDEX IF NOT EXISTS idx_broker_referrals_email ON public.broker_referrals(referred_email);
CREATE INDEX IF NOT EXISTS idx_broker_referrals_referrer ON public.broker_referrals(referrer_id);

-- Function to process referral reward
CREATE OR REPLACE FUNCTION process_referral_reward(
  p_referral_token TEXT,
  p_referred_broker_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_referral RECORD;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get the referral
  SELECT * INTO v_referral 
  FROM public.broker_referrals 
  WHERE referral_token = p_referral_token 
    AND status = 'pending'
    AND expires_at > NOW();
  
  IF v_referral IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update referral status
  UPDATE public.broker_referrals 
  SET 
    status = 'accepted',
    referred_broker_id = p_referred_broker_id,
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_referral.id;
  
  -- Add reward tokens to referrer
  SELECT tokens_remaining INTO v_current_balance
  FROM public.broker_subscriptions
  WHERE broker_id = v_referral.referrer_id;
  
  IF v_current_balance IS NOT NULL THEN
    v_new_balance := v_current_balance + v_referral.reward_amount;
    
    UPDATE public.broker_subscriptions 
    SET tokens_remaining = v_new_balance
    WHERE broker_id = v_referral.referrer_id;
    
    -- Log the reward transaction
    INSERT INTO public.token_transactions (
      broker_id, 
      action_type, 
      description, 
      tokens_amount, 
      balance_after
    ) VALUES (
      v_referral.referrer_id, 
      'referral_bonus', 
      'Referral reward - ' || v_referral.referred_email || ' signed up',
      v_referral.reward_amount,
      v_new_balance
    );
    
    -- Mark tokens as rewarded
    UPDATE public.broker_referrals 
    SET tokens_rewarded = TRUE
    WHERE id = v_referral.id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add referral_bonus to token action types if not exists
-- (This might need to be done manually if the type is strictly enforced)

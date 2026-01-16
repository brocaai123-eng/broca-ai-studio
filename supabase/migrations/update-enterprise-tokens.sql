-- Migration: Update Enterprise plan from unlimited (-1) to 1500 tokens
-- Run this in your Supabase SQL Editor

-- Update the Enterprise plan tokens_per_month from -1 to 1500
UPDATE subscription_plans 
SET 
  tokens_per_month = 1500,
  features = '["1500 AI tokens/month", "Unlimited clients", "Dedicated support", "Custom integrations", "White-label option", "API access"]'
WHERE name = 'Enterprise';

-- Update any existing subscriptions on Enterprise plan to have 1500 tokens
UPDATE broker_subscriptions bs
SET 
  tokens_remaining = 1500 - COALESCE(tokens_used, 0)
FROM subscription_plans sp
WHERE bs.plan_id = sp.id 
  AND sp.name = 'Enterprise'
  AND bs.status = 'active';

-- Update the deduct_tokens function to remove unlimited token handling
CREATE OR REPLACE FUNCTION deduct_tokens(
  p_broker_id UUID,
  p_amount INTEGER,
  p_action_type TEXT,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT bs.tokens_remaining INTO v_current_balance
  FROM public.broker_subscriptions bs
  WHERE bs.broker_id = p_broker_id;
  
  -- Check if enough tokens
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct tokens
  UPDATE public.broker_subscriptions 
  SET tokens_remaining = tokens_remaining - p_amount,
      tokens_used = tokens_used + p_amount,
      updated_at = NOW()
  WHERE broker_id = p_broker_id;
  
  -- Log transaction
  INSERT INTO public.token_transactions (broker_id, action_type, description, tokens_amount, balance_after)
  VALUES (p_broker_id, p_action_type, p_description, -p_amount, v_current_balance - p_amount);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the changes
SELECT * FROM subscription_plans WHERE name = 'Enterprise';

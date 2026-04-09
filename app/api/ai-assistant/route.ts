import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Internal API Helpers ──────────────────────────────────────────────
// These call our own APIs server-side to fetch live data for the assistant

async function fetchMarketData(query: string, baseUrl: string): Promise<string> {
  try {
    const res = await fetch(`${baseUrl}/api/market-intelligence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return `[Market data unavailable for "${query}": ${err.error || res.statusText}]`;
    }
    const data = await res.json();
    return `
LIVE MARKET DATA for ${data.location} (${data.zipCode}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• ARIA Market Score: ${data.ariaScore.total}/100
• Market Type: ${data.marketType.label} Market — ${data.marketType.description}
• Median Home Price: ${data.rentCast.medianPrice ? '$' + data.rentCast.medianPrice.toLocaleString() : 'N/A'}
• Active Listings: ${data.rentCast.activeListings ?? 'N/A'}
• Avg Days on Market: ${data.rentCast.averageDaysOnMarket ?? 'N/A'}
• Months of Supply: ${data.ariaScore.breakdown.inventoryHealth.raw ?? 'N/A'}
• Price per Sq Ft: ${data.rentCast.medianPricePerSqFt ? '$' + data.rentCast.medianPricePerSqFt.toFixed(0) : 'N/A'}
• 30yr Mortgage Rate: ${data.fred.currentMortgageRate ? data.fred.currentMortgageRate + '%' : 'N/A'}
• Rate Trend: ${data.fred.rateTrend}
• Median Household Income: ${data.census.medianIncome ? '$' + data.census.medianIncome.toLocaleString() : 'N/A'}
• Population: ${data.census.population ? data.census.population.toLocaleString() : 'N/A'}
• Inflation Rate (CPI): ${data.bls.inflationRate ? data.bls.inflationRate + '%' : 'N/A'}
• Price-to-Income Ratio: ${data.rentCast.medianPrice && data.census.medianIncome ? (data.rentCast.medianPrice / data.census.medianIncome).toFixed(1) + 'x' : 'N/A'}

ARIA Score Breakdown:
${(Object.values(data.ariaScore.breakdown) as { label: string; score: number; weight: number }[]).map(b => `  • ${b.label}: ${b.score}/100 (weight: ${b.weight}%)`).join('\n')}

AI Market Summary:
${data.aiSummary}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  } catch (err) {
    console.error('Market data fetch error:', err);
    return `[Could not fetch market data for "${query}" — service error]`;
  }
}

async function fetchSavedAnalyses(userId: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('market_analyses')
      .select('location, zip_code, aria_score, market_type, ai_summary, created_at')
      .eq('broker_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data?.length) return '[No saved market analyses found]';

    return `SAVED MARKET ANALYSES (${data.length} most recent):\n` +
      data.map((a, i) => `${i + 1}. ${a.location} (${a.zip_code}) — ARIA: ${a.aria_score}, Type: ${a.market_type}, Saved: ${new Date(a.created_at).toLocaleDateString()}`).join('\n');
  } catch {
    return '[Could not fetch saved analyses]';
  }
}

async function fetchClientData(userId: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, email, status, deal_type, property_address, created_at')
      .eq('broker_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data?.length) return '[No clients found]';

    const statusCounts: Record<string, number> = {};
    data.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

    return `CLIENT PORTFOLIO (${data.length} clients):\n` +
      `Status breakdown: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}\n\n` +
      data.map((c, i) => `${i + 1}. ${c.full_name} — ${c.status} | ${c.deal_type || 'N/A'} | ${c.property_address || 'No address'}`).join('\n');
  } catch {
    return '[Could not fetch client data]';
  }
}

async function fetchSubscriptionInfo(userId: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('broker_subscriptions')
      .select('plan_id, tokens_remaining, tokens_used, status, current_period_end, subscription_plans(name, monthly_tokens)')
      .eq('broker_id', userId)
      .single();

    if (error || !data) return '[No subscription found]';

    const plan = (data as Record<string, unknown>).subscription_plans as Record<string, unknown> | null;
    return `SUBSCRIPTION: ${plan?.name || 'Unknown'} plan | Status: ${data.status} | Tokens: ${data.tokens_remaining} remaining / ${data.tokens_used} used | Renews: ${data.current_period_end ? new Date(data.current_period_end).toLocaleDateString() : 'N/A'}`;
  } catch {
    return '[Could not fetch subscription info]';
  }
}

// ─── Intent Detection ──────────────────────────────────────────────────
// Detects what data the user is asking about so we can pre-fetch it

interface DetectedIntent {
  needsMarketData: boolean;
  marketQuery: string | null;
  needsSavedAnalyses: boolean;
  needsClientData: boolean;
  needsSubscription: boolean;
}

function detectIntent(message: string, history: { role: string; content: string }[]): DetectedIntent {
  const lower = message.toLowerCase();
  const fullContext = [message, ...history.slice(-4).map(h => h.content)].join(' ').toLowerCase();

  // Market data patterns — zip codes, city names, market questions
  const zipMatch = message.match(/\b\d{5}\b/);
  const marketKeywords = /\b(market|price|median|listing|inventory|supply|demand|aria|score|mortgage|rate|inflation|cpi|affordab|days on market|dom|home value|property value|real estate market|housing|neighborhood|area|zip|city)/i;
  const locationPattern = /\b(what|how|tell|show|analyze|check|look up|search|find|get)\b.*\b(market|price|area|zip|city|neighborhood|data|stats|score|report)/i;

  let needsMarketData = false;
  let marketQuery: string | null = null;

  if (zipMatch) {
    needsMarketData = true;
    marketQuery = zipMatch[0];
  } else if (locationPattern.test(message) || (marketKeywords.test(message) && /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/.test(message))) {
    needsMarketData = true;
    // Try to extract city/location from the message
    const cityMatch = message.match(/(?:in|for|about|of|at)\s+([A-Z][a-zA-Z\s,]+?)(?:\s*\?|$|\.|,\s+(?:what|how|is|are))/);
    if (cityMatch) marketQuery = cityMatch[1].trim();
    else if (zipMatch) marketQuery = zipMatch[0];
  }

  const needsSavedAnalyses = /\b(saved|previous|past|history|my (?:reports?|analyses|analysis)|portfolio|dashboard)/i.test(lower);
  const needsClientData = /\b(client|clients|deal|deals|onboarding|pipeline|case|cases|portfolio)/i.test(lower);
  const needsSubscription = /\b(subscription|plan|token|tokens|balance|usage|billing|upgrade|downgrade)/i.test(lower);

  return { needsMarketData, marketQuery, needsSavedAnalyses, needsClientData, needsSubscription };
}

// ─── System Prompt ─────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are BROCA AI Assistant, an intelligent assistant for real estate brokers using BrocaAI Studio.

YOU HAVE ACCESS TO LIVE DATA:
When the user asks about a specific market, zip code, or location, the system will automatically fetch real-time data from our APIs and include it in the conversation. You should reference this data directly and give specific, data-backed answers.

Available data sources (fetched automatically when relevant):
• Market Intelligence — Live median prices, inventory, days on market, ARIA scores, mortgage rates, inflation, demographics
• Client Portfolio — The broker's current clients, deal statuses, and pipeline
• Saved Analyses — Previously run market reports
• Subscription Info — Plan details, token balance

WHEN YOU HAVE LIVE DATA:
- Reference specific numbers: "The median home price in 33401 is $485,000 with an ARIA score of 72"
- Compare metrics: "At 3.2 months of supply, this is a seller's market"
- Give actionable recommendations based on the actual data
- If data shows N/A for some fields, work with what's available — don't apologize for missing data

WHEN YOU DON'T HAVE LIVE DATA:
- If the user asks about a specific market but no data was fetched, tell them: "Let me look that up for you — please ask again with the specific zip code or city name and I'll pull live market data."
- For general real estate questions, answer from your knowledge

YOUR CAPABILITIES:
1. Market Analysis — Answer questions about any US market using live API data (prices, inventory, rates, demographics, ARIA scores)
2. Client Management — Help with client onboarding, deal tracking, communication
3. Deal Analysis — Provide insights on specific properties and markets using real data
4. Email Drafting — Help compose professional emails
5. Platform Guidance — Help navigate BrocaAI Studio features

YOUR RESTRICTIONS:
- ONLY answer questions related to real estate, mortgages, property management, and the BrocaAI platform
- If asked about unrelated topics, politely redirect: "I'm BROCA Assistant, focused on real estate and BrocaAI. How can I help with your real estate business?"
- Do NOT provide specific legal, financial, or tax advice — recommend consulting professionals
- Be concise, professional, and data-driven when data is available

RESPONSE FORMAT:
- Lead with the most important data point
- Use bullet points for metrics
- Bold key numbers with **number** syntax
- Keep responses focused and actionable
- When presenting market data, organize by: Overview → Key Metrics → Recommendation`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Get authenticated user for data access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Detect what data the user needs
    const intent = detectIntent(message, conversationHistory);

    // Fetch relevant data in parallel
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const dataPromises: Promise<string>[] = [];
    const dataLabels: string[] = [];

    if (intent.needsMarketData && intent.marketQuery) {
      dataPromises.push(fetchMarketData(intent.marketQuery, baseUrl));
      dataLabels.push('MARKET_DATA');
    }
    if (intent.needsSavedAnalyses && userId) {
      dataPromises.push(fetchSavedAnalyses(userId));
      dataLabels.push('SAVED_ANALYSES');
    }
    if (intent.needsClientData && userId) {
      dataPromises.push(fetchClientData(userId));
      dataLabels.push('CLIENT_DATA');
    }
    if (intent.needsSubscription && userId) {
      dataPromises.push(fetchSubscriptionInfo(userId));
      dataLabels.push('SUBSCRIPTION');
    }

    const dataResults = await Promise.all(dataPromises);

    // Build context injection
    let dataContext = '';
    if (dataResults.length > 0) {
      dataContext = '\n\n--- LIVE DATA (use this to answer the user\'s question) ---\n' +
        dataResults.map((result, i) => `[${dataLabels[i]}]\n${result}`).join('\n\n') +
        '\n--- END LIVE DATA ---\n';
    }

    // Build messages array
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map((msg: ChatMessage) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: dataContext ? `${message}\n${dataContext}` : message },
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';

    return NextResponse.json({
      success: true,
      response: aiResponse,
      dataSourcesUsed: dataLabels,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
      },
    });

  } catch (error) {
    console.error('AI Assistant error:', error);

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process your request. Please try again.' },
      { status: 500 }
    );
  }
}

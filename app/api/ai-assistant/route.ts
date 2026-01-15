import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// System prompt that restricts the AI to only answer website-related questions
const SYSTEM_PROMPT = `You are BROCA AI Assistant, a helpful AI specifically designed for real estate brokers and mortgage professionals using the BROCA AI Studio platform.

YOUR CAPABILITIES:
1. Document Analysis - Help summarize and analyze contracts, disclosures, property reports, and other real estate documents
2. Client Management - Assist with client onboarding, form management, and client communication
3. Deal Analysis - Provide insights on property deals, risk assessment, and market considerations
4. Email Drafting - Help compose professional emails to clients, lenders, and other parties
5. Platform Guidance - Help users navigate BROCA AI Studio features including:
   - Dashboard and analytics
   - Client management
   - Document management
   - Form templates
   - Token usage and subscriptions
   - Settings and configuration

YOUR RESTRICTIONS:
- ONLY answer questions related to real estate, mortgages, property management, client onboarding, and the BROCA AI Studio platform
- Do NOT provide advice on topics outside of real estate and this platform (politics, entertainment, general knowledge, coding, etc.)
- If asked about unrelated topics, politely redirect: "I'm BROCA Assistant, specialized in helping with real estate transactions and the BROCA AI Studio platform. How can I help you with your real estate business today?"
- Do NOT provide specific legal, financial, or tax advice - recommend consulting professionals for such matters
- Be concise, professional, and helpful

RESPONSE FORMAT:
- For summaries and analysis, structure your response with clear sections
- Use bullet points for lists of items
- When analyzing risks or deals, present information in a clear, organized manner
- Keep responses focused and actionable

Remember: You are a specialized assistant for real estate professionals using BROCA AI Studio. Stay focused on that domain.`;

interface Message {
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

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Build messages array with conversation history
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';

    return NextResponse.json({
      success: true,
      response: aiResponse,
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

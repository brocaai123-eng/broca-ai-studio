import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getZipCodeNews } from '@/lib/services/news-rss';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MONITORED_ZIPS = [
  '33470', '33411', '33401', '33413', '33418',
  '33458', '33467', '33328', '33309', '33063',
];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let processed = 0;
  let errors = 0;
  const results: { zip: string; status: string }[] = [];

  for (const zip of MONITORED_ZIPS) {
    try {
      const articles = await getZipCodeNews(zip);

      const rows = articles.map((article) => ({
        zip,
        title: article.title,
        url: article.link,
        source: article.source,
        published_at: article.pubDate,
        snippet: article.snippet,
        sentiment_score: 0, // placeholder — Claude processing pending
        collected_at: new Date().toISOString(),
      }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from('news_signals')
          .upsert(rows, { onConflict: 'url' });
        if (error) throw error;
      }

      processed++;
      results.push({ zip, status: `ok — ${rows.length} articles` });
    } catch (err) {
      errors++;
      results.push({
        zip,
        status: `error: ${err instanceof Error ? err.message : 'unknown'}`,
      });
      console.error(`[collect-news] Failed for zip ${zip}:`, err);
    }
  }

  console.log(`[collect-news] Done: ${processed} processed, ${errors} errors`);

  return NextResponse.json({
    success: true,
    processed,
    errors,
    timestamp: new Date().toISOString(),
    details: results,
  });
}

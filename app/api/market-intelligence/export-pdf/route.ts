import { NextRequest, NextResponse } from 'next/server';
import type { MarketAnalysisResult } from '@/lib/types/market-intelligence';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  return '$' + value.toLocaleString('en-US');
}

function formatNumber(value: number | null): string {
  if (value === null) return 'N/A';
  return value.toLocaleString('en-US');
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getMarketTypeColor(type: string): string {
  switch (type) {
    case 'sellers': return '#10b981';
    case 'buyers': return '#3b82f6';
    default: return '#f59e0b';
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: MarketAnalysisResult = await request.json();

    const scoreColor = getScoreColor(data.ariaScore.total);
    const mtColor = getMarketTypeColor(data.marketType.type);
    const monthsOfSupply = data.rentCast.activeListings && data.rentCast.newListings
      ? (data.rentCast.activeListings / data.rentCast.newListings).toFixed(1)
      : 'N/A';

    const breakdownRows = Object.values(data.ariaScore.breakdown)
      .map(b => `
        <tr>
          <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; color: #374151;">${escapeHtml(b.label)}</td>
          <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="display: inline-block; background: ${getScoreColor(b.score)}20; color: ${getScoreColor(b.score)}; padding: 2px 12px; border-radius: 12px; font-weight: 600;">${b.score}</span>
          </td>
          <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${b.weight}%</td>
        </tr>
      `)
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Market Intelligence Report - ${escapeHtml(data.location)}</title>
  <style>
    @page { size: A4; margin: 40px; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; margin: 0; padding: 40px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #10b981; }
    .logo { font-size: 28px; font-weight: 800; color: #10b981; }
    .logo span { color: #1f2937; }
    .date { color: #6b7280; font-size: 13px; }
    .title { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 32px; }
    .score-section { display: flex; gap: 24px; margin-bottom: 32px; }
    .score-card { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; text-align: center; }
    .score-value { font-size: 48px; font-weight: 800; line-height: 1; }
    .score-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .metric-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .metric-value { font-size: 20px; font-weight: 700; color: #1f2937; }
    .ai-summary { background: linear-gradient(135deg, #ecfdf5, #eff6ff); border: 1px solid #a7f3d0; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .ai-summary h3 { margin: 0 0 12px; color: #065f46; font-size: 16px; }
    .ai-summary p { margin: 0; color: #1f2937; line-height: 1.7; font-size: 14px; }
    .breakdown-table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 32px; }
    .breakdown-table th { background: #f3f4f6; padding: 10px 16px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; text-align: center; }
    .data-sources { display: flex; gap: 8px; justify-content: center; margin-top: 8px; }
    .source-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 10px; }
    .source-active { background: #d1fae5; color: #065f46; }
    .source-inactive { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Broca<span>AI</span></div>
      <div class="date">Market Intelligence Report</div>
    </div>
    <div style="text-align: right;">
      <div class="date">Generated: ${new Date(data.analyzedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div class="date">Powered by ARIA Market Score™</div>
    </div>
  </div>

  <div class="title">📍 ${escapeHtml(data.location)}, ${escapeHtml(data.zipCode)}</div>
  <div class="subtitle">${escapeHtml(data.state || '')} ${data.county ? '• ' + escapeHtml(data.county) : ''}</div>

  <div class="score-section">
    <div class="score-card">
      <div class="score-value" style="color: ${scoreColor};">${data.ariaScore.total}</div>
      <div class="score-label">ARIA Market Score™</div>
    </div>
    <div class="score-card">
      <div class="score-value" style="color: ${mtColor}; font-size: 32px;">🏘️ ${escapeHtml(data.marketType.label)}</div>
      <div class="score-label">Market Type</div>
    </div>
  </div>

  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">Median Price</div>
      <div class="metric-value">${formatCurrency(data.rentCast.medianPrice)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Active Listings</div>
      <div class="metric-value">${formatNumber(data.rentCast.activeListings)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Avg Days on Market</div>
      <div class="metric-value">${data.rentCast.averageDaysOnMarket ?? 'N/A'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Months of Supply</div>
      <div class="metric-value">${monthsOfSupply}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">30yr Mortgage Rate</div>
      <div class="metric-value">${data.fred.currentMortgageRate ? data.fred.currentMortgageRate + '%' : 'N/A'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Median Income</div>
      <div class="metric-value">${formatCurrency(data.census.medianIncome)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Population</div>
      <div class="metric-value">${formatNumber(data.census.population)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Inflation Rate</div>
      <div class="metric-value">${data.bls.inflationRate ? data.bls.inflationRate + '%' : 'N/A'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Price / Sq Ft</div>
      <div class="metric-value">${data.rentCast.medianPricePerSqFt ? '$' + data.rentCast.medianPricePerSqFt.toFixed(0) : 'N/A'}</div>
    </div>
  </div>

  <div class="ai-summary">
    <h3>🤖 AI Market Analysis (Claude)</h3>
    <p>${escapeHtml(data.aiSummary)}</p>
  </div>

  <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 12px;">ARIA Score™ Breakdown</h3>
  <table class="breakdown-table">
    <thead>
      <tr>
        <th>Factor</th>
        <th style="text-align: center;">Score</th>
        <th style="text-align: center;">Weight</th>
      </tr>
    </thead>
    <tbody>${breakdownRows}</tbody>
  </table>

  <div class="footer">
    <p>This report is generated by BrocaAI Market Intelligence powered by ARIA Market Score™.</p>
    <p>Data sourced from RentCast, FRED, US Census Bureau, and Bureau of Labor Statistics.</p>
    <div class="data-sources">
      <span class="source-badge ${data.dataSourceStatus.rentCast ? 'source-active' : 'source-inactive'}">RentCast ${data.dataSourceStatus.rentCast ? '✓' : '✗'}</span>
      <span class="source-badge ${data.dataSourceStatus.fred ? 'source-active' : 'source-inactive'}">FRED ${data.dataSourceStatus.fred ? '✓' : '✗'}</span>
      <span class="source-badge ${data.dataSourceStatus.census ? 'source-active' : 'source-inactive'}">Census ${data.dataSourceStatus.census ? '✓' : '✗'}</span>
      <span class="source-badge ${data.dataSourceStatus.bls ? 'source-active' : 'source-inactive'}">BLS ${data.dataSourceStatus.bls ? '✓' : '✗'}</span>
    </div>
    <p style="margin-top: 12px;">© ${new Date().getFullYear()} BrocaAI. All rights reserved.</p>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="BrocaAI_Market_Report_${data.zipCode}_${new Date().toISOString().split('T')[0]}.html"`,
      },
    });
  } catch (err) {
    console.error('PDF export error:', err);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

export type MotivatedSellerFactor = {
  key: string;
  label: string;
  pts: number;
  active: boolean;
  detail?: string;
};

export type MotivatedSellerResult = {
  score: number; // 0..100
  label: 'LOW' | 'MODERATE' | 'HIGH';
  breakdown: MotivatedSellerFactor[];
};

function yearsBetween(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

/** Points from DOM when listing.daysOnMarket is known (sale listings path). */
function domPoints(daysOnMarket: number | null | undefined): { pts: number; detail?: string } {
  if (daysOnMarket == null || !Number.isFinite(daysOnMarket) || daysOnMarket < 0) {
    return { pts: 0 };
  }
  if (daysOnMarket >= 180) {
    return { pts: 18, detail: `${Math.round(daysOnMarket)} days on market` };
  }
  if (daysOnMarket >= 90) {
    return { pts: 10, detail: `${Math.round(daysOnMarket)} days on market` };
  }
  if (daysOnMarket >= 45) {
    return { pts: 5, detail: `${Math.round(daysOnMarket)} days on market` };
  }
  return { pts: 0 };
}

function codeViolationPoints(count: number | null | undefined): { pts: number; detail?: string } {
  if (count == null || !Number.isFinite(count) || count <= 0) return { pts: 0 };
  const capped = Math.min(3, Math.floor(count));
  return { pts: Math.min(18, capped * 6), detail: `${Math.floor(count)} open / matched violations` };
}

/**
 * Strong equity vs last transfer — long-term owners with large paper gains often have more exit optionality.
 * (Heuristic only; not legal or investment advice.)
 */
function equityMotivationPts(
  lastSalePrice: number | null | undefined,
  avmPrice: number | null | undefined,
  holdYears: number | null,
): { pts: number; detail?: string } {
  if (
    lastSalePrice == null ||
    avmPrice == null ||
    holdYears == null ||
    lastSalePrice <= 0 ||
    avmPrice <= 0
  ) {
    return { pts: 0 };
  }
  if (holdYears < 3) return { pts: 0 };
  const ratio = avmPrice / lastSalePrice;
  if (ratio >= 2.0) {
    return { pts: 16, detail: `AVM ~${Math.round(ratio * 100) / 100}× last sale (${Math.floor(holdYears)} yr hold)` };
  }
  if (ratio >= 1.5) {
    return { pts: 12, detail: `AVM ~${Math.round(ratio * 100) / 100}× last sale (${Math.floor(holdYears)} yr hold)` };
  }
  if (ratio >= 1.35) {
    return { pts: 8, detail: `AVM ~${Math.round(ratio * 100) / 100}× last sale (${Math.floor(holdYears)} yr hold)` };
  }
  return { pts: 0 };
}

export function computeMotivatedSellerScore(input: {
  ownerOccupied?: boolean | null;
  lastSaleDate?: string | null;
  lastSalePrice?: number | null;
  listPrice?: number | null;
  avmPrice?: number | null;
  daysOnMarket?: number | null;
  extendedDomFlag?: boolean | null;
  foreclosure_case?: boolean | null;
  tax_delinquent?: boolean | null;
  probate_case?: boolean | null;
  divorce_case?: boolean | null;
  satellite_condition_flag?: boolean | null;
  code_violations_count?: number | null;
}): MotivatedSellerResult {
  const absentee = input.ownerOccupied === false;
  const holdYears = yearsBetween(input.lastSaleDate);
  const longHold = holdYears != null && holdYears >= 10;

  const avm = input.avmPrice ?? null;
  const lp = input.listPrice ?? null;
  const belowValue = avm != null && lp != null && avm > 0 ? lp <= avm * 0.9 : false;

  const dom = domPoints(input.daysOnMarket);
  const extendedDomBoost =
    input.extendedDomFlag === true && (input.daysOnMarket == null || input.daysOnMarket < 180)
      ? { pts: 12 as const, detail: 'Extended DOM flag (180+ days)' as const }
      : { pts: 0 as const };

  const codePts = codeViolationPoints(input.code_violations_count);
  const equityPts = equityMotivationPts(input.lastSalePrice, avm, holdYears);

  const breakdown: MotivatedSellerFactor[] = [
    {
      key: 'absentee_owner',
      label: 'Absentee owner',
      pts: 18,
      active: absentee,
    },
    { key: 'foreclosure', label: 'Foreclosure / lis pendens (open data match)', pts: 35, active: input.foreclosure_case === true },
    { key: 'probate', label: 'Probate / estate (open data match)', pts: 25, active: input.probate_case === true },
    { key: 'divorce', label: 'Divorce filing (open data match)', pts: 20, active: input.divorce_case === true },
    { key: 'tax', label: 'Tax delinquency / certificate (open data match)', pts: 28, active: input.tax_delinquent === true },
    {
      key: 'code_violations',
      label: 'Code violations (open data match)',
      pts: codePts.pts,
      active: codePts.pts > 0,
      detail: codePts.detail,
    },
    {
      key: 'extended_dom',
      label: 'Stale listing / long DOM',
      pts: Math.max(dom.pts, extendedDomBoost.pts),
      active: dom.pts > 0 || extendedDomBoost.pts > 0,
      detail: dom.detail ?? (extendedDomBoost.pts ? extendedDomBoost.detail : undefined),
    },
    {
      key: 'below_value',
      label: 'Listed 10%+ below AVM',
      pts: 15,
      active: belowValue,
      detail: belowValue && avm != null && lp != null ? `${Math.round(((avm - lp) / avm) * 100)}% below AVM` : undefined,
    },
    {
      key: 'equity_buildup',
      label: 'Long hold + strong AVM vs last sale',
      pts: equityPts.pts,
      active: equityPts.pts > 0,
      detail: equityPts.detail,
    },
    {
      key: 'long_hold',
      label: 'Owned 10+ years',
      pts: 10,
      active: longHold,
      detail: holdYears != null ? `${Math.floor(holdYears)} years` : undefined,
    },
    {
      key: 'satellite',
      label: 'Satellite / condition signal',
      pts: 18,
      active: input.satellite_condition_flag === true,
    },
  ];

  const raw = breakdown.reduce((sum, f) => sum + (f.active ? f.pts : 0), 0);
  const score = Math.max(0, Math.min(100, raw));
  const label: MotivatedSellerResult['label'] = score >= 70 ? 'HIGH' : score >= 40 ? 'MODERATE' : 'LOW';

  return { score, label, breakdown };
}

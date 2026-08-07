/**
 * Full CMS NPPES monthly CSV import (streamed).
 *
 * Usage:
 *   1. Download monthly V.2 ZIP from https://download.cms.gov/nppes/NPI_Files.html
 *   2. Unzip and note the npidata_pfile_*.csv path
 *   3. npx tsx scripts/import-nppes.ts --file "D:/path/npidata_pfile_....csv" [--state FL] [--limit 50000]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env (.env.local).
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      out[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
    }
  }
  return out;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function cleanZip(zip?: string | null): string | null {
  if (!zip) return null;
  const digits = String(zip).replace(/\D/g, '');
  return digits.slice(0, 5) || null;
}

function buildSearchName(row: any): string {
  if (row.entity_type === '2') return (row.provider_org_name || '').trim().toLowerCase();
  return [row.provider_first_name, row.provider_middle_name, row.provider_last_name, row.credentials]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase();
}

function mapCsv(headers: string[], values: string[]) {
  const raw: Record<string, string> = {};
  headers.forEach((h, i) => {
    raw[h] = values[i] ?? '';
  });
  const npi = String(raw['NPI'] || '').trim();
  if (!npi || !/^\d{10}$/.test(npi)) return null;

  const entityType = String(raw['Entity Type Code'] || '1').trim() === '2' ? '2' : '1';
  const deactivated = !!(raw['NPI Deactivation Date'] || '').trim();
  const state = (raw['Provider Business Practice Location Address State Name'] || '').trim().toUpperCase();

  const row = {
    npi,
    entity_type: entityType,
    provider_last_name: raw['Provider Last Name (Legal Name)'] || null,
    provider_first_name: raw['Provider First Name'] || null,
    provider_middle_name: raw['Provider Middle Name'] || null,
    provider_org_name: raw['Provider Organization Name (Legal Business Name)'] || null,
    credentials: raw['Provider Credential Text'] || null,
    gender: raw['Provider Sex Code'] || null,
    primary_taxonomy_code: raw['Healthcare Provider Taxonomy Code_1'] || null,
    primary_taxonomy_desc: null,
    specialty: raw['Healthcare Provider Taxonomy Code_1'] || null,
    practice_address_1: raw['Provider First Line Business Practice Location Address'] || null,
    practice_address_2: raw['Provider Second Line Business Practice Location Address'] || null,
    practice_city: raw['Provider Business Practice Location Address City Name'] || null,
    practice_state: state || null,
    practice_zip: cleanZip(raw['Provider Business Practice Location Address Postal Code']),
    practice_phone: raw['Provider Business Practice Location Address Telephone Number'] || null,
    practice_fax: raw['Provider Business Practice Location Address Fax Number'] || null,
    mailing_address_1: raw['Provider First Line Business Mailing Address'] || null,
    mailing_address_2: raw['Provider Second Line Business Mailing Address'] || null,
    mailing_city: raw['Provider Business Mailing Address City Name'] || null,
    mailing_state: raw['Provider Business Mailing Address State Name'] || null,
    mailing_zip: cleanZip(raw['Provider Business Mailing Address Postal Code']),
    mailing_phone: raw['Provider Business Mailing Address Telephone Number'] || null,
    enumeration_date: raw['Provider Enumeration Date'] || null,
    last_updated: raw['Last Update Date'] || null,
    deactivation_date: raw['NPI Deactivation Date'] || null,
    status: deactivated ? 'deactivated' : 'active',
    search_name: '',
    updated_at: new Date().toISOString(),
  };
  row.search_name = buildSearchName(row);
  return row;
}

async function main() {
  const args = parseArgs();
  const file = args.file;
  if (!file || !fs.existsSync(file)) {
    console.error('Missing --file path to npidata CSV');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing Supabase env vars');
    process.exit(1);
  }

  const stateFilter = (args.state || '').toUpperCase() || null;
  const limit = args.limit ? Number(args.limit) : Infinity;
  const batchSize = 500;
  const supabase = createClient(url, key);

  console.log(`Importing ${file}`);
  if (stateFilter) console.log(`Filter state=${stateFilter}`);
  if (Number.isFinite(limit)) console.log(`Limit=${limit}`);

  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let headers: string[] | null = null;
  let batch: any[] = [];
  let seen = 0;
  let upserted = 0;
  let skipped = 0;

  for await (const line of rl) {
    if (!headers) {
      headers = parseCsvLine(line).map((h) => h.replace(/^\uFEFF/, '').trim());
      continue;
    }
    if (!line.trim()) continue;
    const values = parseCsvLine(line);
    const row = mapCsv(headers, values);
    if (!row) {
      skipped++;
      continue;
    }
    if (stateFilter && row.practice_state !== stateFilter) {
      skipped++;
      continue;
    }

    batch.push(row);
    seen++;

    if (batch.length >= batchSize) {
      const { error } = await supabase.from('nppes_providers').upsert(batch, { onConflict: 'npi' });
      if (error) throw error;
      upserted += batch.length;
      batch = [];
      process.stdout.write(`\rUpserted ${upserted} (seen ${seen}, skipped ${skipped})`);
    }

    if (seen >= limit) break;
  }

  if (batch.length) {
    const { error } = await supabase.from('nppes_providers').upsert(batch, { onConflict: 'npi' });
    if (error) throw error;
    upserted += batch.length;
  }

  console.log(`\nDone. Upserted=${upserted} Seen=${seen} Skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

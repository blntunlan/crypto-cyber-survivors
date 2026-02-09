import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Credentials from .env
const SUPABASE_URL = 'https://dnhfsmvwqjxoextwbebj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7elD3ZGIJyIISCz_58gX_Q_PenWr4V1';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchData() {
  console.log('📡 Fetching historical price data from Supabase...');

  // Fetch a large batch of price logs
  const { data, error } = await supabase
    .from('price_history')
    .select('price, volume, timestamp, metadata')
    .eq('pair', 'BTC')
    .order('timestamp', { ascending: false })
    .limit(5000);

  if (error) {
    console.error('❌ Error fetching data:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.error('❌ No data found in price_history');
    return;
  }

  // Map to common format
  const logs = data
    .map(d => ({
      price: d.price,
      volume: d.volume,
      timestamp: new Date(d.timestamp).getTime(),
      high: d.metadata?.high || d.price,
      low: d.metadata?.low || d.price,
    }))
    .reverse();

  const outputPath = path.join(
    __dirname,
    '../simulation/evolution/historical_data.json'
  );
  fs.writeFileSync(outputPath, JSON.stringify(logs, null, 2));

  console.log(`✅ Saved ${logs.length} data points to ${outputPath}`);
}

fetchData().catch(console.error);

/* eslint-disable */
const https = require('https');

const SUPABASE_URL = 'https://xvvxipcrltzkoijxnwqg.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2dnhpcGNybHR6a29panhud3FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyOTY5NjIsImV4cCI6MjA4MTg3Mjk2Mn0.kAMPp8oF4o6ppff7YUm-Bx2S_07UpYLUY7adbRIQvM4';

const tables = [
  'players',
  'game_sessions',
  'market_state',
  'achievements',
  'shop_items',
  'player_wallets',
  'coin_transactions',
  'withdrawal_requests',
  'performance_metrics',
  'price_logs'
];

async function checkTable(tableName) {
  return new Promise((resolve) => {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=100`;
    const options = {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!Array.isArray(json)) {
             resolve({ table: tableName, error: data });
             return;
          }
          
          if (json.length === 0) {
            resolve({ table: tableName, count: 0, nulls: {} });
            return;
          }

          const nullCounts = {};
          const columns = Object.keys(json[0]);
          columns.forEach(col => nullCounts[col] = 0);

          json.forEach(row => {
            columns.forEach(col => {
              if (row[col] === null) nullCounts[col]++;
            });
          });

          resolve({
            table: tableName,
            count: json.length,
            nulls: nullCounts
          });
        } catch (e) {
          resolve({ table: tableName, error: e.message });
        }
      });
    }).on('error', (e) => {
      resolve({ table: tableName, error: e.message });
    });
  });
}

async function run() {
  console.log('--- DATABASE NULL ANALYSIS ---');
  for (const table of tables) {
    const result = await checkTable(table);
    if (result.error) {
      console.log(`Table ${table}: ERROR - ${result.error}`);
    } else {
      console.log(`Table ${table} (${result.count} records checked):`);
      const emptyCols = Object.entries(result.nulls)
        .filter(([col, count]) => count === result.count)
        .map(([col]) => col);
      
      const partialCols = Object.entries(result.nulls)
        .filter(([col, count]) => count > 0 && count < result.count)
        .map(([col, count]) => `${col} (${count}/${result.count})`);

      if (emptyCols.length > 0) {
        console.log(`  - 100% NULL Columns: ${emptyCols.join(', ')}`);
      }
      if (partialCols.length > 0) {
        console.log(`  - Partially NULL: ${partialCols.join(', ')}`);
      }
      if (emptyCols.length === 0 && partialCols.length === 0) {
        console.log('  - All columns filled.');
      }
    }
    console.log('');
  }
}

run();

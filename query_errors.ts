/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnhfsmvwqjxoextwbebj.supabase.co';
const supabaseAnonKey = 'sb_publishable_7elD3ZGIJyIISCz_58gX_Q_PenWr4V1';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkErrors() {
  console.log('Fetching SupabaseInsertError details...');
  const { data, error } = await supabase
    .from('error_reports')
    .select('*')
    .eq('error_type', 'SupabaseInsertError')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (data && data.length > 0) {
    data.forEach(r => {
      console.log(`\nMessage: ${r.message}`);
      console.log(`Created: ${r.created_at}`);
      console.log(`Context: ${JSON.stringify(r.context_data)}`);
    });
  } else {
    console.log('No SupabaseInsertError found.');
  }
}

void checkErrors();

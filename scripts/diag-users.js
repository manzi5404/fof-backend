require('dotenv').config();
const { supabase } = require('../src/config/supabase');
const { supabaseAdmin } = require('../src/config/supabaseAdmin');

(async () => {
  console.log('--- anon client (what userRepo currently uses) ---');
  const { data: aData, error: aErr } = await supabase.from('users').select('id').limit(1);
  console.log('anon error:', aErr ? JSON.stringify(aErr) : 'none');
  console.log('anon data:', aData);

  console.log('--- admin client (service role) ---');
  const { data: dData, error: dErr } = await supabaseAdmin.from('users').select('id, email, role').limit(5);
  console.log('admin error:', dErr ? JSON.stringify(dErr) : 'none');
  console.log('admin rows:', dData ? dData.length : 0, dData ? dData.map(u => u.email) : '');
})();

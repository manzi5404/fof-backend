const { supabaseAdmin } = require('../config/supabaseAdmin');

async function getSettings() {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('key,value');

  if (error) throw error;

  return (data || []).reduce((acc, row) => {
    // Supabase returns raw strings in `value`
    const v = row.value;
    if (v === 'true') acc[row.key] = true;
    else if (v === 'false') acc[row.key] = false;
    else {
      // attempt JSON arrays/objects
      const trimmed = typeof v === 'string' ? v.trim() : '';
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          acc[row.key] = JSON.parse(trimmed);
          return acc;
        } catch {
          // keep as string
        }
      }
      acc[row.key] = v;
    }
    return acc;
  }, {});
}

async function updateSetting(key, value) {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })
    .select('*');

  if (error) throw error;

  // If rowcount isn't available reliably, treat success if data exists or no error
  return true;
}

module.exports = {
  getSettings,
  updateSetting,
};

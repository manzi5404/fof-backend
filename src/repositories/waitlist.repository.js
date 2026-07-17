const { supabase } = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabaseAdmin');

async function create({ name, email, phone, source }) {
  const { data, error } = await supabase
    .from('waitlist')
    .upsert(
      { name, email, phone, source, notified: false },
      { onConflict: 'email' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function existsByEmail(email) {
  const { data, error } = await supabase
    .from('waitlist')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

async function findUnnotified(limit = 1000) {
  const { data, error } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .eq('notified', false)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function markNotified(ids) {
  if (!ids || ids.length === 0) return 0;

  const { data, error } = await supabaseAdmin
    .from('waitlist')
    .update({ notified: true })
    .in('id', ids)
    .select('id');

  if (error) throw error;
  return data ? data.length : 0;
}

async function findAll() {
  const { data, error } = await supabase
    .from('waitlist')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

module.exports = {
  create,
  existsByEmail,
  findUnnotified,
  markNotified,
  findAll,
};

const { supabaseAdmin } = require('../config/supabaseAdmin');
const { NotFoundError } = require('../utils/errors');

async function findActive() {
  const { data, error } = await supabaseAdmin
    .from('drops')
    .select('*')
    .eq('status', 'live')
    .lte('release_date', new Date().toISOString())
    .or('close_date.is.null,close_date.gt.' + new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findAll(includeAll = false) {
  let query = supabaseAdmin.from('drops').select('*').order('created_at', { ascending: false });

  if (!includeAll) {
    query = query.or('status.eq.live,status.eq.upcoming');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function findById(id) {
  const { data, error } = await supabaseAdmin
    .from('drops')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findBySlug(slug) {
  const { data, error } = await supabaseAdmin
    .from('drops')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findSlugConflict(slug, excludeId = null) {
  let query = supabaseAdmin.from('drops').select('id').eq('slug', slug);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data && data.length > 0;
}

async function demotePreviousNewDrops(excludeId) {
    const { data, error } = await supabaseAdmin
        .from('drops')
        .update({ type: 'recent-drop' })
        .neq('id', excludeId)
        .eq('type', 'new-drop')
        .select('id');

    if (error) throw error;
    return data || [];
}

async function create(data) {
    const { data: row, error } = await supabaseAdmin
        .from('drops')
        .insert(data)
        .select('*')
        .single();

    if (error) throw error;
    return row;
}

async function update(id, data) {
    const { data: row, error } = await supabaseAdmin
        .from('drops')
        .update(data)
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw error;
    return row;
}

async function activate(id) {
    const { data, error } = await supabaseAdmin
        .from('drops')
        .update({ 
            status: 'live',
            release_date: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw error;
    return data;
}

async function remove(id) {
    const { error } = await supabaseAdmin
        .from('drops')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

module.exports = {
  findActive,
  findAll,
  findById,
  findBySlug,
  findSlugConflict,
  create,
  update,
  activate,
  demotePreviousNewDrops,
  remove,
};

const { supabase } = require('../config/supabase');

async function findAll({ includeDrafts = false } = {}) {
  let query = supabase.from('collections').select('*');
  if (!includeDrafts) query = query.eq('status', 'live');
  const { data, error } = await query.order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function findBySlug(slug) {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function create(data) {
  const { data: row, error } = await supabase
    .from('collections')
    .insert(data)
    .select('*')
    .single();
  if (error) throw error;
  return row;
}

async function update(id, data) {
  const { data: row, error } = await supabase
    .from('collections')
    .update(data)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return row;
}

async function remove(id) {
  const { error } = await supabase.from('collections').delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function getDrops(collectionId) {
  const { data, error } = await supabase
    .from('collection_drops')
    .select('sort_order, drops(*)')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({ sort_order: r.sort_order, ...r.drops }));
}

async function addDrop(collectionId, dropId, sortOrder = 0) {
  const { data, error } = await supabase
    .from('collection_drops')
    .upsert(
      { collection_id: collectionId, drop_id: dropId, sort_order: sortOrder },
      { onConflict: 'collection_id,drop_id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function removeDrop(collectionId, dropId) {
  const { error } = await supabase
    .from('collection_drops')
    .delete()
    .eq('collection_id', collectionId)
    .eq('drop_id', dropId);
  if (error) throw error;
  return true;
}

async function countDrops(collectionId) {
  const { count, error } = await supabase
    .from('collection_drops')
    .select('*', { count: 'exact', head: true })
    .eq('collection_id', collectionId);
  if (error) throw error;
  return count || 0;
}

module.exports = {
  findAll,
  findBySlug,
  findById,
  create,
  update,
  remove,
  getDrops,
  addDrop,
  removeDrop,
  countDrops,
};

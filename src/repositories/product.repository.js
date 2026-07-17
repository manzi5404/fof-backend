const { supabase } = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabaseAdmin');
const { NotFoundError, ConflictError } = require('../utils/errors');

async function findByDropId(dropId) {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('drop_id', dropId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function findById(id) {
  // Important: do not select broken relationships here.
  // The frontend PDP fallback relies on this endpoint; selecting `collections(*)`
  // can fail when the relationship is missing from the schema cache.
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*), product_quality_prices(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}


async function findBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findBySlugConflict(slug, excludeId = null) {
  let query = supabase.from('products').select('id').eq('slug', slug);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data && data.length > 0;
}

async function create(data) {
  const { data: row, error } = await supabase
    .from('products')
    .insert(data)
    .select('*, product_variants(*)')
    .single();

  if (error) throw error;
  return row;
}

async function update(id, data) {
  const { data: row, error } = await supabase
    .from('products')
    .update(data)
    .eq('id', id)
    .select('*, product_variants(*)')
    .single();

  if (error) throw error;
  return row;
}

async function softDelete(id) {
  const { data, error } = await supabase
    .from('products')
    .update({ status: 'draft' })
    .eq('id', id)
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

async function deleteVariants(productId) {
  const { error } = await supabaseAdmin
    .from('product_variants')
    .delete()
    .eq('product_id', productId);

  if (error) throw error;
}

module.exports = {
  findByDropId,
  findById,
  findBySlug,
  findBySlugConflict,
  create,
  update,
  softDelete,
  deleteVariants,
};

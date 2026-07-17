const { supabaseAdmin } = require('../config/supabaseAdmin');
const { NotFoundError } = require('../utils/errors');

async function findByProductId(productId) {
  const { data, error } = await supabaseAdmin
    .from('product_quality_prices')
    .select('*')
    .eq('product_id', productId)
    .order('quality_level_id', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function upsert(productId, qualityPrices) {
  if (!qualityPrices || typeof qualityPrices !== 'object') return [];

  const qualityLevels = await supabaseAdmin
    .from('quality_levels')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (qualityLevels.error) throw qualityLevels.error;

  const results = [];
  for (const level of qualityLevels.data) {
    const key = level.name.toLowerCase();
    const price = parseFloat(qualityPrices[key]);
    if (!price || price <= 0) continue;

    const { data, error } = await supabaseAdmin
      .from('product_quality_prices')
      .upsert(
        { product_id: productId, quality_level_id: level.id, price, is_active: true },
        { onConflict: 'product_id,quality_level_id' }
      )
      .select('*')
      .single();

    if (error) throw error;
    results.push(data);
  }

  return results;
}

module.exports = {
  findByProductId,
  upsert,
};

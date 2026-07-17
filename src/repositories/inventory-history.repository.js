const { supabase } = require('../config/supabase');

async function findByVariantId(variantId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('inventory_history')
    .select('*')
    .eq('product_variant_id', variantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

async function findByOrderId(orderId) {
  const { data, error } = await supabase
    .from('inventory_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function findByReason(reason, limit = 100) {
  const { data, error } = await supabase
    .from('inventory_history')
    .select('*')
    .eq('reason', reason)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function findAll(filters = {}, limit = 100, offset = 0) {
  let query = supabase
    .from('inventory_history')
    .select('*, product_variants!inner(color, size, sku, product_id)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.variantId) {
    query = query.eq('product_variant_id', filters.variantId);
  }
  if (filters.orderId) {
    query = query.eq('order_id', filters.orderId);
  }
  if (filters.reason) {
    query = query.eq('reason', filters.reason);
  }
  if (filters.startDate) {
    query = query.gte('created_at', new Date(filters.startDate).toISOString());
  }
  if (filters.endDate) {
    query = query.lte('created_at', new Date(filters.endDate).toISOString());
  }

  const { data, error } = query;
  if (error) throw error;
  return data || [];
}

module.exports = {
  findByVariantId,
  findByOrderId,
  findByReason,
  findAll,
};

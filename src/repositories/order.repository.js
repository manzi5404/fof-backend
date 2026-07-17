const { supabase } = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabaseAdmin');

async function create(orderData) {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function createOrderItem(orderId, itemData) {
  const { data, error } = await supabase
    .from('order_items')
    .insert({ order_id: orderId, ...itemData })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findByUserId(userId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

async function findAllAdmin(filters = {}) {
  let query = supabase
    .from('orders')
    .select('*, order_items(*), users(id, name, email)')
    .order('created_at', { ascending: false });

  const { status, startDate, endDate } = filters;

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (startDate) {
    query = query.gte('created_at', new Date(startDate).toISOString());
  }

  if (endDate) {
    query = query.lte('created_at', new Date(endDate).toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function updateStatus(id, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select('id')
    .single();

  if (error) throw error;
  return data !== null;
}

async function findPendingPayment() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

module.exports = {
  create,
  createOrderItem,
  findById,
  findByUserId,
  findAllAdmin,
  updateStatus,
  findPendingPayment,
};

const { supabase } = require('../config/supabase');

async function create(verificationData) {
  const { data, error } = await supabase
    .from('payment_verifications')
    .insert({
      order_id: verificationData.orderId,
      verified_by: verificationData.verifiedBy,
      proof_url: verificationData.proofUrl || null,
      notes: verificationData.notes || null,
      status: verificationData.status || 'verified',
      verified_at: verificationData.verifiedAt || new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { exists: true, data: null };
    }
    throw error;
  }
  return { exists: false, data };
}

async function findByOrderId(orderId) {
  const { data, error } = await supabase
    .from('payment_verifications')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from('payment_verifications')
    .select('*, orders(*), users!payment_verifications_verified_by_fkey(name, email)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findByAdmin(adminId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('payment_verifications')
    .select('*, orders(*)')
    .eq('verified_by', adminId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

async function findAll(filters = {}, limit = 100, offset = 0) {
  let query = supabase
    .from('payment_verifications')
    .select('*, orders(*), users!payment_verifications_verified_by_fkey(name, email)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.orderId) {
    query = query.eq('order_id', filters.orderId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.verifiedBy) {
    query = query.eq('verified_by', filters.verifiedBy);
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
  create,
  findByOrderId,
  findById,
  findByAdmin,
  findAll,
};

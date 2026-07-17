const { supabase } = require('../config/supabase');
const { NotFoundError, AuthError } = require('../utils/errors');

async function findById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, google_id, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, google_id, created_at')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function create(authUserId, { name, email, role = 'customer', googleId = null }) {
  if (!authUserId || typeof authUserId !== 'string' || authUserId.trim() === '') {
    throw new AuthError('Auth user ID is required and must not be null or empty');
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: authUserId,
      name: name || null,
      email: email || null,
      role,
      google_id: googleId,
    })
    .select('id, email, name, role, google_id, created_at')
    .single();

  if (error) throw error;
  return data;
}

async function updateRole(id, role) {
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id)
    .select('id, email, name, role')
    .single();

  if (error) throw error;
  return data;
}

async function findAdmins() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('role', 'admin');

  if (error) throw error;
  return data || [];
}

module.exports = {
  findById,
  findByEmail,
  create,
  updateRole,
  findAdmins,
};

const { supabaseAdmin } = require('../config/supabaseAdmin');
const { NotFoundError } = require('../utils/errors');

async function getAll(status = '') {
  let query = supabaseAdmin
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getById(id) {
  const { data, error } = await supabaseAdmin
    .from('contact_messages')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError('Message not found');
  return data;
}

async function updateStatus(id, status) {
  const { data, error } = await supabaseAdmin
    .from('contact_messages')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function create(data) {
  const { data: row, error } = await supabaseAdmin
    .from('contact_messages')
    .insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
      status: 'unread'
    })
    .select('*')
    .single();

  if (error) throw error;
  return row;
}

module.exports = {
  getAll,
  getById,
  updateStatus,
  create,
};

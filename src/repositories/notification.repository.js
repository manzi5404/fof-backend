const { supabase } = require('../config/supabase');

async function create(userId, type, message) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: type || null,
      message,
      is_read: false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function findByUserId(userId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

async function markRead(id, userId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error) throw error;
  return data !== null;
}

async function markAllRead(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select('id');

  if (error) throw error;
  return data ? data.length : 0;
}

async function unreadCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

async function findByUserIdAndUnread(userId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

module.exports = {
  create,
  findByUserId,
  findByUserIdAndUnread,
  markRead,
  markAllRead,
  unreadCount,
};

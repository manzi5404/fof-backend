const { supabase } = require('../config/supabase');

async function create(auditData) {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: auditData.userId || null,
      action: auditData.action,
      entity_type: auditData.entityType,
      entity_id: auditData.entityId || null,
      old_values: auditData.oldValues || null,
      new_values: auditData.newValues || null,
      ip_address: auditData.ipAddress || null,
      user_agent: auditData.userAgent || null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create audit log:', error);
    return null;
  }
  return data;
}

async function findByUser(userId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

async function findByEntity(entityType, entityId, limit = 50) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function findByAction(action, limit = 50) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', action)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function findAll(filters = {}, limit = 100, offset = 0) {
  let query = supabase
    .from('audit_logs')
    .select('*, users!audit_logs_user_id_fkey(name, email)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters.action) {
    query = query.eq('action', filters.action);
  }
  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
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
  findByUser,
  findByEntity,
  findByAction,
  findAll,
};

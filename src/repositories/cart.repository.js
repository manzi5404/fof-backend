const { supabase } = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabaseAdmin');

async function findByUserId(userId) {
  const { data, error } = await supabase
    .from('carts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findBySessionId(sessionId) {
  const { data, error } = await supabase
    .from('carts')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findOrCreateByUserId(userId) {
  let cart = await findByUserId(userId);
  if (!cart) {
    const { data, error } = await supabase
      .from('carts')
      .insert({ user_id: userId })
      .select('*')
      .single();

    if (error) throw error;
    cart = data;
  }
  return cart;
}

async function findOrCreateBySessionId(sessionId) {
  let cart = await findBySessionId(sessionId);
  if (!cart) {
    const { data, error } = await supabase
      .from('carts')
      .insert({ session_id: sessionId })
      .select('*')
      .single();

    if (error) throw error;
    cart = data;
  }
  return cart;
}

async function findOrCreate(userId, sessionId) {
  if (userId) {
    return findOrCreateByUserId(userId);
  }
  if (sessionId) {
    return findOrCreateBySessionId(sessionId);
  }
  throw new Error('Either userId or sessionId is required');
}

async function addItem(cartId, variantId, quantity) {
  const { data, error } = await supabase
    .from('cart_items')
    .upsert(
      {
        cart_id: cartId,
        product_variant_id: variantId,
        quantity,
      },
      {
        onConflict: 'cart_id,product_variant_id',
        count: 'exact',
      }
    )
    .select('*');

  if (error) throw error;
  return data;
}

async function getCartWithItems(cartId) {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      *,
      product_variants(*)
    `)
    .eq('cart_id', cartId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function updateItemQuantity(cartId, variantId, quantity) {
  if (quantity <= 0) {
    return removeItem(cartId, variantId);
  }

  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('cart_id', cartId)
    .eq('product_variant_id', variantId)
    .select('*');

  if (error) throw error;
  return data;
}

async function removeItem(cartId, variantId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cartId)
    .eq('product_variant_id', variantId);

  if (error) throw error;
}

async function clearCart(cartId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cartId);

  if (error) throw error;
}

module.exports = {
  findByUserId,
  findBySessionId,
  findOrCreateByUserId,
  findOrCreateBySessionId,
  findOrCreate,
  addItem,
  getCartWithItems,
  updateItemQuantity,
  removeItem,
  clearCart,
};

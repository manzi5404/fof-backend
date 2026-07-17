require('dotenv').config();
const { supabaseAdmin } = require('../src/config/supabaseAdmin');

(async () => {
  const productId = '7fbf4ca6-5735-4190-94f8-e16dab619e6d';

  const { data: existing } = await supabaseAdmin
    .from('collections')
    .select('id')
    .eq('slug', 'essentials')
    .maybeSingle();

  let collectionId = existing?.id;
  if (!collectionId) {
    const { data: created, error } = await supabaseAdmin
      .from('collections')
      .insert({
        slug: 'essentials',
        title: 'Essentials',
        description: 'The everyday staples — timeless pieces built to last.',
        status: 'live',
        sort_order: 1,
        featured: true,
      })
      .select('id')
      .single();
    if (error) { console.error('insert collection failed', error); process.exit(1); }
    collectionId = created.id;
    console.log('Created collection', collectionId);
  } else {
    console.log('Collection already exists', collectionId);
  }

  const { error: linkErr } = await supabaseAdmin
    .from('collection_products')
    .upsert({ collection_id: collectionId, product_id: productId, sort_order: 1 }, { onConflict: 'collection_id,product_id' });

  if (linkErr) { console.error('link failed', linkErr); process.exit(1); }
  console.log('Linked product', productId, 'to collection', collectionId);
})();

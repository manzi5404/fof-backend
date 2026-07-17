require('dotenv').config();
const { supabaseAdmin } = require('../src/config/supabaseAdmin');

async function seedDrops() {
  try {
    // Clean up previous seed data
    console.log('Cleaning up previous seed data...');
    
    // Delete products from seeded drops
    const { data: seededDrops } = await supabaseAdmin
      .from('drops')
      .select('id')
      .like('title', '%Origins Summer%');
    
    if (seededDrops && seededDrops.length > 0) {
      const dropIds = seededDrops.map(d => d.id);
      await supabaseAdmin.from('products').delete().in('drop_id', dropIds);
      await supabaseAdmin.from('drops').delete().in('id', dropIds);
      console.log(`Cleaned up ${seededDrops.length} seeded drops`);
    }

    // Delete lookbook drops
    const { data: lookbookDropsData } = await supabaseAdmin
      .from('drops')
      .select('id')
      .in('title', ['Heritage Collection', 'Street Essentials', 'Winter Drop']);
    
    if (lookbookDropsData && lookbookDropsData.length > 0) {
      const lookbookIds = lookbookDropsData.map(d => d.id);
      await supabaseAdmin.from('products').delete().in('drop_id', lookbookIds);
      await supabaseAdmin.from('drops').delete().in('id', lookbookIds);
      console.log(`Cleaned up ${lookbookDropsData.length} lookbook drops`);
    }

    // 1. Create "New Arrival" drop with products
    const { data: newDrop, error: newDropError } = await supabaseAdmin
      .from('drops')
      .insert({
        title: 'Origins Summer 2026',
        slug: 'origins-summer-2026',
        description: 'The latest drop — lightweight tees and hoodies for the season.',
        image_url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600',
        release_date: new Date().toISOString(),
        status: 'live',
        type: 'new-drop',
      })
      .select('*')
      .single();

    if (newDropError) throw new Error(`Failed to create new-drop: ${newDropError.message}`);
    console.log('Created new-drop:', newDrop.id, newDrop.title);

    // Demote any other new-drops to recent-drop
    const { error: demoteError } = await supabaseAdmin
      .from('drops')
      .update({ type: 'recent-drop' })
      .neq('id', newDrop.id)
      .eq('type', 'new-drop');

    if (demoteError) console.warn('Demotion warning:', demoteError.message);
    console.log('Demoted previous new-drops to recent-drop');

    const products = [
      { name: 'Origins Tee', slug: 'origins-tee', description: 'Premium heavyweight tee', base_price: 15000, images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'], status: 'live' },
      { name: 'Origins Hoodie', slug: 'origins-hoodie', description: '400GSM heavyweight hoodie', base_price: 35000, images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400'], status: 'live' },
      { name: 'Origins Cap', slug: 'origins-cap', description: 'Embroidered structured cap', base_price: 12000, images: ['https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=400'], status: 'live' },
      { name: 'Origins Joggers', slug: 'origins-joggers', description: 'Relaxed-fit joggers', base_price: 28000, images: ['https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400'], status: 'live' },
    ];

    for (const product of products) {
      const { error: productError } = await supabaseAdmin
        .from('products')
        .insert({
          ...product,
          drop_id: newDrop.id,
        });

      if (productError) throw new Error(`Failed to create product: ${productError.message}`);
    }
    console.log(`Added ${products.length} products to new-drop`);

    // 2. Create "Lookbook" drops with products
    const lookbookDrops = [
      { title: 'Heritage Collection', slug: 'heritage-collection', description: 'Timeless pieces rooted in tradition.', image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600', status: 'live', type: 'recent-drop' },
      { title: 'Street Essentials', slug: 'street-essentials', description: 'Core pieces for the everyday wardrobe.', image_url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600', status: 'live', type: 'recent-drop' },
      { title: 'Winter Drop', slug: 'winter-drop', description: 'Cold-weather essentials for the bold.', image_url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600', status: 'live', type: 'recent-drop' },
    ];

    for (const dropData of lookbookDrops) {
      const { data: lookbookDrop, error: dropError } = await supabaseAdmin
        .from('drops')
        .insert(dropData)
        .select('*')
        .single();

      if (dropError) throw new Error(`Failed to create lookbook drop: ${dropError.message}`);
      console.log('Created lookbook drop:', lookbookDrop.id, lookbookDrop.title);

      const lookbookProducts = [
        { name: `${dropData.title} Tee`, slug: `${dropData.slug}-tee`, description: 'Classic fit tee', base_price: 18000, images: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400'], status: 'live' },
        { name: `${dropData.title} Cap`, slug: `${dropData.slug}-cap`, description: 'Structured cap', base_price: 12000, images: ['https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=400'], status: 'live' },
        { name: `${dropData.title} Hoodie`, slug: `${dropData.slug}-hoodie`, description: 'Heavyweight hoodie', base_price: 32000, images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400'], status: 'live' },
        { name: `${dropData.title} Shorts`, slug: `${dropData.slug}-shorts`, description: 'Relaxed-fit shorts', base_price: 20000, images: ['https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400'], status: 'live' },
      ];

      for (const product of lookbookProducts) {
        const { error: productError } = await supabaseAdmin
          .from('products')
          .insert({
            ...product,
            drop_id: lookbookDrop.id,
          });

        if (productError) throw new Error(`Failed to create product: ${productError.message}`);
      }
      console.log(`Added ${lookbookProducts.length} products to ${dropData.title}`);
    }

    console.log('\nSeed completed successfully!');
    console.log('- 1 new-drop (New Arrivals) with 4 products');
    console.log('- 3 recent-drops (Lookbook) with 4 products each');
    console.log('\nAutomatic promotion logic: any future new-drop creation will demote previous new-drops to recent-drops.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seedDrops();

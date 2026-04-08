const { addDrop, getDrops, editDrop, deleteDrop } = require('../models/drop');
const productService = require('../models/product');
const userModel = require('../models/user');
const emailUtils = require('../utils/email');
const announcementModel = require('../models/announcement');
const appEmitter = require('../utils/events');

async function createDrop(req, res) {
  try {
    const { products, ...rest } = req.body;
    
    // Map frontend's 'name' field to 'title' if present
    const dropData = {
      title: rest.name || rest.title,
      ...rest
    };
    
    // Remove the original 'name' field to avoid confusion
    delete dropData.name;
    
    // Validate required title
    if (!dropData.title || dropData.title.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required. Please provide a drop title.' 
      });
    }
    
    const dropId = await addDrop(dropData);
    console.log(`✅ [CREATE_DROP] Drop saved to DB with ID: ${dropId}`);

    // Create products if any
    if (products && Array.isArray(products)) {
      for (const product of products) {
        await productService.createProduct({ ...product, drop_id: dropId });
      }
    }

    // Trigger notifications - using await but non-blocking (fire and forget with internal logging)
    console.log("🚀 [CREATE_DROP] EMAIL FUNCTION TRIGGERED");
    (async () => {
      try {
        const emails = await userModel.getAllUserEmails();
        if (emails && emails.length > 0) {
          // Provide metadata for email template
          const dropMeta = {
             title: dropData.title,
             description: dropData.description,
             release_date: dropData.release_date,
             image_url: dropData.image_url || (products && products[0]?.image_urls?.[0])
          };
          console.log(`[DROP_NOTIFICATION] Notifying ${emails.length} users about new drop: ${dropData.title}`);
          await emailUtils.notifyNewDrop(emails, dropMeta);
        }
      } catch (notifyErr) {
        console.error('❌ [DROP_NOTIFICATION] Email worker failed:', notifyErr.message);
      }
    })();
    
    // UI BROADCAST: Automatically update the live announcement banner for this new drop
    try {
        const announcementData = {
          title: `NEW DROP: ${dropData.title}`,
          message: dropData.description || `The ${dropData.title} collection is now available.`,
          image_url: dropData.image_url || (products && products[0]?.image_urls[0]),
          status: 'live',
          is_enabled: 1
        };
        const updatedAnn = await announcementModel.updateAnnouncement(announcementData);
        appEmitter.emit('announcement_update', updatedAnn);
        console.log(`✅ [AUTO_ANNOUNCEMENT] Broadcasted new drop: ${dropData.title}`);
    } catch (annError) {
        console.warn('⚠️  [AUTO_ANNOUNCEMENT] Failed to auto-update banner:', annError.message);
    }

    res.json({ success: true, dropId });
  } catch (err) {
    console.error('❌ [CREATE_DROP] Controller failed:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
}

async function listDrops(req, res) {
  try {
    let statusFilter = req.query.status || req.query.active;
    // If the filter is 'false', 'all', or undefined, treat as no filter
    if (statusFilter === 'false' || statusFilter === 'all' || !statusFilter) {
      statusFilter = null;
    }

    const includeProducts = req.query.includeProducts === 'true' || req.query.includeProducts === '1';
    const drops = await getDrops(statusFilter, includeProducts);

    let priceByDrop = {};
    if (drops.length > 0) {
      const dropIds = drops.map((drop) => drop.id);
      const [priceRows] = await require('../db/connection').pool.query(
        'SELECT drop_id, MIN(price) AS min_price FROM products WHERE drop_id IN (?) GROUP BY drop_id',
        [dropIds]
      );
      priceByDrop = Object.fromEntries(priceRows.map((row) => [row.drop_id, row.min_price]));
    }

    console.log("RAW DROPS:", drops);

    // --- Helper: normalize any image field into a single usable URL or null ---
    const resolveImageUrl = (imageField, fallbackProducts) => {
      // Case 1: valid non-JSON string URL
      if (typeof imageField === 'string' && imageField.trim() !== '') {
        // Case 1a: stringified JSON array e.g. '["https://..."]'
        if (imageField.startsWith('[')) {
          try {
            const parsed = JSON.parse(imageField);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
              return parsed[0];
            }
          } catch (_) {
            // Not valid JSON, treat as raw URL
          }
        }
        return imageField; // plain URL string
      }

      // Case 2: actual JS array
      if (Array.isArray(imageField) && imageField.length > 0) {
        return imageField[0];
      }

      // Case 3: fall through to products
      if (fallbackProducts && Array.isArray(fallbackProducts)) {
        for (const p of fallbackProducts) {
          const urls = p.image_urls;
          if (Array.isArray(urls) && urls.length > 0) return urls[0];
          if (typeof urls === 'string' && urls.startsWith('[')) {
            try {
              const parsed = JSON.parse(urls);
              if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
            } catch (_) {}
          }
        }
      }

      return null;
    };

    // Normalize drops for the frontend
    const normalizedDrops = drops.map(item => ({
      id: item.id,
      title: (item.title || item.name || '').trim() || 'Untitled Drop',
      name: item.title || item.name || '',
      type: item.type || 'new-drop',
      description: item.description || '',
      image: resolveImageUrl(item.image_url || item.images, item.products),
      status: item.status || (item.is_active ? 'live' : 'upcoming'),
      products: item.products || [],
      price: item.price != null
        ? item.price
        : priceByDrop[item.id] != null
          ? Number(priceByDrop[item.id])
          : (item.products?.length ? Math.min(...item.products.map(p => parseFloat(p.price) || 0)) : 0)
    }));

    res.json({ success: true, drops: normalizedDrops });
    console.log(`📦 [ADMIN] Fetched and normalized ${normalizedDrops.length} drops`);
  } catch (err) {
    console.error('❌ [LIST_DROPS] Controller failed:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
}

async function updateDrop(req, res) {
  try {
    const { products, ...dropData } = req.body;
    const dropId = req.params.id;
    
    // Map 'name' to 'title' for updates as well
    if (dropData.name && !dropData.title) {
      dropData.title = dropData.name;
      delete dropData.name;
    }
    
    // Check old status to see if it just flipped to live
    const oldDrops = await getDrops(null);
    const oldDrop = oldDrops.find(d => d.id == dropId);
    const wasLive = oldDrop && oldDrop.status === 'live';
    const isNowLive = dropData.status === 'live' || (dropData.status === undefined && dropData.is_active);

    const updated = await editDrop(dropId, dropData);

    // If status changed to live, send notification
    if (!wasLive && isNowLive) {
      (async () => {
        try {
          const emails = await userModel.getAllUserEmails();
          if (emails && emails.length > 0) {
            const dropMeta = { ...oldDrop, ...dropData };
            // Ensure title is consistent
            dropMeta.title = dropMeta.title || dropMeta.name; 
            
            console.log(`[LIVE_NOTIFICATION] Notifying ${emails.length} users: ${dropMeta.title} IS LIVE!`);
            await emailUtils.notifyLiveDrop(emails, dropMeta);
          }
        } catch (notifyErr) {
          console.error('❌ [LIVE_NOTIFICATION] Email worker failed:', notifyErr.message);
        }
      })();
      
      // UI BROADCAST: Automatically update the live announcement banner if this drop went live
      try {
          const announcementData = {
            title: `LIVE NOW: ${dropData.title || oldDrop.title}`,
            message: dropData.description || oldDrop.description,
            image_url: dropData.image_url || oldDrop.image_url,
            status: 'live',
            is_enabled: 1
          };
          const updatedAnn = await announcementModel.updateAnnouncement(announcementData);
          appEmitter.emit('announcement_update', updatedAnn);
          console.log(`✅ [AUTO_ANNOUNCEMENT] Broadcasted live update: ${dropData.title || oldDrop.title}`);
      } catch (annError) {
          console.warn('⚠️  [AUTO_ANNOUNCEMENT] Failed to auto-update banner on live shift:', annError.message);
      }
    }

    if (products && Array.isArray(products)) {
      const currentProducts = await productService.getProductsByDropId(dropId);
      const incomingIds = products.filter(p => p.id).map(p => p.id);

      for (const p of currentProducts) {
        if (!incomingIds.includes(p.id)) {
          await productService.deleteProduct(p.id);
        }
      }

      for (const product of products) {
        if (product.id) {
          await productService.updateProduct(product.id, product);
        } else {
          await productService.createProduct({ ...product, drop_id: dropId });
        }
      }
    }

    res.json({ success: updated });
    console.log(`🔄 [ADMIN] Updated drop ID: ${dropId}`);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function removeDrop(req, res) {
  try {
    const removed = await deleteDrop(req.params.id);
    res.json({ success: removed });
    console.log(`🗑️ [ADMIN] Deleted drop ID: ${req.params.id}`);
  } catch (err) {
    console.error("CREATE DROP ERROR:", err);
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = { createDrop, listDrops, updateDrop, removeDrop };
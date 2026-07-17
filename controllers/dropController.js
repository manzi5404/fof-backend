const { addDrop, getDrops, getDropById, editDrop, deleteDrop } = require('../models/drop');
const productService = require('../models/product');
const userModel = require('../models/user');
const emailUtils = require('../utils/email');
const announcementModel = require('../models/announcement');
const appEmitter = require('../utils/events');

const ALLOWED_DROP_FIELDS = [
  'title',
  'description',
  'image_url',
  'release_date',
  'status'
];

function sanitizeDropInput(body) {
  const drop = {};
  ALLOWED_DROP_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      drop[field] = body[field];
    }
  });
  return drop;
}

async function createDrop(req, res) {
  try {
    const { products } = req.body;

    let dropData = sanitizeDropInput(req.body);

    if (req.body.name && !dropData.title) {
      dropData.title = req.body.name;
    }

    if (!dropData.title || dropData.title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title is required. Please provide a drop title.'
      });
    }

    dropData.status = dropData.status || 'upcoming';

    const dropId = await addDrop(dropData);
    console.log(`✅ [CREATE_DROP] Drop saved to DB with ID: ${dropId}`);

    if (products && Array.isArray(products)) {
      for (const product of products) {
        await productService.createProduct({ ...product, drop_id: dropId });
      }
    }

    console.log("🚀 [CREATE_DROP] EMAIL FUNCTION TRIGGERED");
    (async () => {
      try {
        const emails = await userModel.getAllUserEmails();
        if (emails && emails.length > 0) {
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

    if (statusFilter === 'false' || statusFilter === 'all' || !statusFilter) {
      statusFilter = null;
    }

    const includeProducts = req.query.includeProducts === 'true' || req.query.includeProducts === '1';
    const drops = await getDrops(statusFilter, includeProducts);

    let priceByDrop = {};
    if (drops.length > 0) {
      const dropIds = drops.map((drop) => drop.id);
      const placeholders = dropIds.map((_, i) => `$${i + 1}`).join(',');
      const priceResult = await require('../db/connection').pool.query(
        `SELECT drop_id, MIN(price) AS min_price FROM products WHERE drop_id IN (${placeholders}) GROUP BY drop_id`,
        dropIds
      );
      priceByDrop = Object.fromEntries(priceResult.rows.map((row) => [row.drop_id, row.min_price]));
    }

    console.log("RAW DROPS:", drops);

    const resolveImageUrl = (imageField, fallbackProducts) => {
      if (typeof imageField === 'string' && imageField.trim() !== '') {
        if (imageField.startsWith('[')) {
          try {
            const parsed = JSON.parse(imageField);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
              return parsed[0];
            }
          } catch (_) {}
        }
        return imageField;
      }

      if (Array.isArray(imageField) && imageField.length > 0) {
        return imageField[0];
      }

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

    const normalizedDrops = drops.map((item) => ({
      id: item.id,
      title: (item.title || '').trim() || 'Untitled Drop',
      description: item.description || '',
      image: resolveImageUrl(item.image_url, item.products),
      status: item.status || 'upcoming',
      products: item.products || [],
      price: item.price != null
        ? item.price
        : priceByDrop[item.id] != null
          ? Number(priceByDrop[item.id])
          : (item.products?.length ? Math.min(...item.products.map((p) => parseFloat(p.price) || 0)) : 0)
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
    const { products } = req.body;
    const dropId = req.params.id;

    let dropData = sanitizeDropInput(req.body);

    if (req.body.name && !dropData.title) {
      dropData.title = req.body.name;
    }

    const oldDrop = await getDropById(dropId);
    const wasLive = oldDrop && oldDrop.status === 'live';
    const isNowLive = dropData.status === 'live';

    const updated = await editDrop(dropId, dropData);

    if (!wasLive && isNowLive) {
      (async () => {
        try {
          const emails = await userModel.getAllUserEmails();
          if (emails && emails.length > 0) {
            const dropMeta = { ...oldDrop, ...dropData };
            dropMeta.title = dropMeta.title || 'Untitled Drop';

            console.log(`[LIVE_NOTIFICATION] Notifying ${emails.length} users: ${dropMeta.title} IS LIVE!`);
            await emailUtils.notifyLiveDrop(emails, dropMeta);
          }
        } catch (notifyErr) {
          console.error('❌ [LIVE_NOTIFICATION] Email worker failed:', notifyErr.message);
        }
      })();

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
      const incomingIds = products.filter((p) => p.id).map((p) => p.id);

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

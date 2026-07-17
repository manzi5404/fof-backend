const { pool } = require('../db/connection');
const productService = require('./product');

async function addDrop(drop) {
  const {
    title,
    description,
    image_url,
    release_date,
    status,
    type
  } = drop;

  const result = await pool.query(
    `INSERT INTO drops
      (title, description, image_url, release_date, status, type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      title,
      description || null,
      image_url || null,
      release_date || null,
      status || 'upcoming',
      type || 'new-drop'
    ]
  );
  return result.rows[0].id;
}

async function getDrops(statusFilter = null, includeProducts = false) {
  let sql = 'SELECT id, title, description, image_url, release_date, status, type, created_at, updated_at FROM drops';
  const params = [];

  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'active' || statusFilter === 'true') {
      sql += " WHERE status = 'live'";
    } else {
      sql += ' WHERE status = $1';
      params.push(statusFilter);
    }
  }

  sql += ' ORDER BY created_at DESC';

  const result = await pool.query(sql, params);
  let rows = result.rows;

  if (includeProducts && rows.length > 0) {
    const productsByDrop = await Promise.all(rows.map(row => productService.getProductsByDropId(row.id)));
    rows.forEach((row, index) => {
      row.products = productsByDrop[index] || [];
    });
  }

  return rows;
}

async function getDropById(id) {
  const result = await pool.query(
    'SELECT id, title, description, image_url, release_date, status, type, created_at, updated_at FROM drops WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function editDrop(id, drop) {
  const allowedFields = [
    'title',
    'description',
    'image_url',
    'release_date',
    'status',
    'type'
  ];

  const updates = [];
  const params = [];
  let paramIndex = 1;

  allowedFields.forEach((field) => {
    if (drop[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      params.push(drop[field]);
      paramIndex++;
    }
  });

  if (updates.length === 0) {
    return false;
  }

  params.push(id);
  const result = await pool.query(
    `UPDATE drops SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    params
  );
  return result.rowCount > 0;
}

async function deleteDrop(id) {
  const result = await pool.query('DELETE FROM drops WHERE id = $1', [id]);
  return result.rowCount > 0;
}

module.exports = { addDrop, getDrops, editDrop, deleteDrop };

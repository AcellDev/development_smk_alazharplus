import { pool } from '../../database/pool.js';

const GALLERY_COLUMNS = `id, title, category, description, image_url AS "imageUrl",
  activity_date::text AS "activityDate", created_at AS "createdAt"`;

export async function listGalleries() {
  const result = await pool.query(`SELECT ${GALLERY_COLUMNS} FROM galleries
    ORDER BY category, activity_date DESC NULLS LAST, created_at DESC, title`);
  return result.rows;
}

export async function createGallery(item) {
  const result = await pool.query(
    `INSERT INTO galleries (title, category, description, image_url, activity_date)
     VALUES ($1,$2,$3,$4,$5) RETURNING ${GALLERY_COLUMNS}`,
    [item.title, item.category, item.description, item.imageUrl, item.activityDate],
  );
  return result.rows[0];
}

export async function updateGallery(id, item) {
  const result = await pool.query(
    `UPDATE galleries SET title=$1, category=$2, description=$3, image_url=$4, activity_date=$5
     WHERE id=$6 RETURNING ${GALLERY_COLUMNS}`,
    [item.title, item.category, item.description, item.imageUrl, item.activityDate, id],
  );
  return result.rows[0] ?? null;
}

export async function deleteGallery(id) {
  const result = await pool.query('DELETE FROM galleries WHERE id=$1', [id]);
  return result.rowCount > 0;
}

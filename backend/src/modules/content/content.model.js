import { pool } from '../../database/pool.js';

const PROFILE_COLUMNS = 'id, slug, title, content, media_asset_id AS "mediaAssetId", updated_at AS "updatedAt"';
const PROGRAM_COLUMNS = 'id, slug, name, summary, description, media_asset_id AS "mediaAssetId", display_order AS "displayOrder", created_at AS "createdAt", updated_at AS "updatedAt"';
const NEWS_COLUMNS = 'id, slug, title, summary, body, media_asset_id AS "mediaAssetId", published_at AS "publishedAt", created_at AS "createdAt", updated_at AS "updatedAt"';
const EVENT_COLUMNS = 'id, title, description, location, starts_at AS "startsAt", ends_at AS "endsAt", media_asset_id AS "mediaAssetId", created_at AS "createdAt", updated_at AS "updatedAt"';
const CONTACT_COLUMNS = 'address, phone, email, website_url AS "websiteUrl", map_url AS "mapUrl", updated_at AS "updatedAt"';

export async function getHomeContent() {
  const [profile, programs, news, events, contact] = await Promise.all([
    pool.query(`SELECT ${PROFILE_COLUMNS} FROM school_profiles WHERE slug = 'beranda' AND is_published = true LIMIT 1`),
    pool.query(`SELECT ${PROGRAM_COLUMNS} FROM programs WHERE is_published = true ORDER BY display_order, name LIMIT 6`),
    pool.query(`SELECT ${NEWS_COLUMNS} FROM news WHERE published_at IS NOT NULL AND published_at <= now() ORDER BY published_at DESC LIMIT 3`),
    pool.query(`SELECT ${EVENT_COLUMNS} FROM events WHERE is_published = true AND (starts_at IS NULL OR starts_at >= now()) ORDER BY starts_at ASC NULLS LAST LIMIT 3`),
    pool.query(`SELECT ${CONTACT_COLUMNS} FROM school_contacts WHERE id = true`),
  ]);
  return { profile: profile.rows[0] ?? null, programs: programs.rows, news: news.rows, events: events.rows, contact: contact.rows[0] ?? null };
}

export async function getPublicCollection(resource) {
  const queries = {
    profiles: [`SELECT ${PROFILE_COLUMNS} FROM school_profiles WHERE is_published = true ORDER BY title`, []],
    programs: [`SELECT ${PROGRAM_COLUMNS} FROM programs WHERE is_published = true ORDER BY display_order, name`, []],
    news: [`SELECT ${NEWS_COLUMNS} FROM news WHERE published_at IS NOT NULL AND published_at <= now() ORDER BY published_at DESC`, []],
    events: [`SELECT ${EVENT_COLUMNS} FROM events WHERE is_published = true ORDER BY starts_at DESC NULLS LAST`, []],
  };
  const [sql, values] = queries[resource];
  const result = await pool.query(sql, values);
  return result.rows;
}

export async function getPublicDetail(resource, slug) {
  const queries = {
    profiles: [`SELECT ${PROFILE_COLUMNS} FROM school_profiles WHERE is_published = true AND slug = $1`, [slug]],
    programs: [`SELECT ${PROGRAM_COLUMNS} FROM programs WHERE is_published = true AND slug = $1`, [slug]],
    news: [`SELECT ${NEWS_COLUMNS} FROM news WHERE published_at IS NOT NULL AND published_at <= now() AND slug = $1`, [slug]],
  };
  if (!queries[resource]) return null;
  const [sql, values] = queries[resource];
  const result = await pool.query(sql, values);
  return result.rows[0] ?? null;
}

export async function getPublicContact() {
  const result = await pool.query(`SELECT ${CONTACT_COLUMNS} FROM school_contacts WHERE id = true`);
  return result.rows[0] ?? null;
}

export async function getAdminCollection(resource) {
  const queries = {
    profiles: `SELECT ${PROFILE_COLUMNS}, is_published AS "isPublished" FROM school_profiles ORDER BY title`,
    programs: `SELECT ${PROGRAM_COLUMNS}, is_published AS "isPublished" FROM programs ORDER BY display_order, name`,
    news: `SELECT ${NEWS_COLUMNS}, (published_at IS NOT NULL) AS "isPublished" FROM news ORDER BY created_at DESC`,
    events: `SELECT ${EVENT_COLUMNS}, is_published AS "isPublished" FROM events ORDER BY starts_at DESC NULLS LAST`,
  };
  if (resource === 'contact') return (await getPublicContact()) ?? {};
  const result = await pool.query(queries[resource]);
  return result.rows;
}

export async function createContent(resource, item, userId) {
  const queries = {
    profiles: {
      sql: `INSERT INTO school_profiles (slug, title, content, media_asset_id, is_published, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${PROFILE_COLUMNS}, is_published AS "isPublished"`,
      values: [item.slug, item.title, item.body, item.mediaAssetId, item.isPublished, userId],
    },
    programs: {
      sql: `INSERT INTO programs (slug, name, summary, description, media_asset_id, display_order, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${PROGRAM_COLUMNS}, is_published AS "isPublished"`,
      values: [item.slug, item.title, item.summary, item.body, item.mediaAssetId, item.displayOrder, item.isPublished],
    },
    news: {
      sql: `INSERT INTO news (slug, title, summary, body, media_asset_id, published_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${NEWS_COLUMNS}`,
      values: [item.slug, item.title, item.summary, item.body, item.mediaAssetId, item.isPublished ? new Date() : null, userId],
    },
    events: {
      sql: `INSERT INTO events (title, description, location, starts_at, ends_at, media_asset_id, is_published, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${EVENT_COLUMNS}, is_published AS "isPublished"`,
      values: [item.title, item.body, item.location, item.startsAt, item.endsAt, item.mediaAssetId, item.isPublished, userId],
    },
  };
  if (resource === 'contact') return saveContact(item, userId);
  const query = queries[resource];
  const result = await pool.query(query.sql, query.values);
  return result.rows[0];
}

export async function updateContent(resource, id, item, userId) {
  const queries = {
    profiles: {
      sql: `UPDATE school_profiles SET slug=$1, title=$2, content=$3, media_asset_id=$4, is_published=$5, updated_by=$6, updated_at=now()
        WHERE id=$7 RETURNING ${PROFILE_COLUMNS}, is_published AS "isPublished"`,
      values: [item.slug, item.title, item.body, item.mediaAssetId, item.isPublished, userId, id],
    },
    programs: {
      sql: `UPDATE programs SET slug=$1, name=$2, summary=$3, description=$4, media_asset_id=$5, display_order=$6, is_published=$7, updated_at=now()
        WHERE id=$8 RETURNING ${PROGRAM_COLUMNS}, is_published AS "isPublished"`,
      values: [item.slug, item.title, item.summary, item.body, item.mediaAssetId, item.displayOrder, item.isPublished, id],
    },
    news: {
      sql: `UPDATE news SET slug=$1, title=$2, summary=$3, body=$4, media_asset_id=$5, published_at=$6, updated_at=now()
        WHERE id=$7 RETURNING ${NEWS_COLUMNS}`,
      values: [item.slug, item.title, item.summary, item.body, item.mediaAssetId, item.isPublished ? new Date() : null, id],
    },
    events: {
      sql: `UPDATE events SET title=$1, description=$2, location=$3, starts_at=$4, ends_at=$5, media_asset_id=$6, is_published=$7, updated_at=now()
        WHERE id=$8 RETURNING ${EVENT_COLUMNS}, is_published AS "isPublished"`,
      values: [item.title, item.body, item.location, item.startsAt, item.endsAt, item.mediaAssetId, item.isPublished, id],
    },
  };
  if (resource === 'contact') return saveContact(item, userId);
  const query = queries[resource];
  const result = await pool.query(query.sql, query.values);
  return result.rows[0] ?? null;
}

export async function deleteContent(resource, id) {
  const tables = { profiles: 'school_profiles', programs: 'programs', news: 'news', events: 'events' };
  const result = await pool.query(`DELETE FROM ${tables[resource]} WHERE id = $1 RETURNING id`, [id]);
  return result.rowCount > 0;
}

async function saveContact(item, userId) {
  const result = await pool.query(
    `INSERT INTO school_contacts (id, address, phone, email, website_url, map_url, updated_by)
     VALUES (true, $1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET address=EXCLUDED.address, phone=EXCLUDED.phone, email=EXCLUDED.email,
       website_url=EXCLUDED.website_url, map_url=EXCLUDED.map_url, updated_by=EXCLUDED.updated_by, updated_at=now()
     RETURNING ${CONTACT_COLUMNS}`,
    [item.address, item.phone, item.email, item.websiteUrl, item.mapUrl, userId],
  );
  return result.rows[0];
}

export async function isPublicMedia(mediaId) {
  const result = await pool.query(
    `SELECT media_assets.storage_key AS "storageKey", media_assets.media_type AS "mediaType"
     FROM media_assets WHERE media_assets.id = $1 AND (
       EXISTS (SELECT 1 FROM school_profiles WHERE media_asset_id = media_assets.id AND is_published = true)
       OR EXISTS (SELECT 1 FROM programs WHERE media_asset_id = media_assets.id AND is_published = true)
       OR EXISTS (SELECT 1 FROM news WHERE media_asset_id = media_assets.id AND published_at IS NOT NULL AND published_at <= now())
       OR EXISTS (SELECT 1 FROM events WHERE media_asset_id = media_assets.id AND is_published = true)
     )`, [mediaId],
  );
  return result.rows[0] ?? null;
}

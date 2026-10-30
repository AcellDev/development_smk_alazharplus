const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ValidationError extends Error {
  constructor(message) { super(message); this.status = 400; this.code = 'VALIDATION_ERROR'; }
}

export function validateContentId(id) {
  if (!uuidPattern.test(id)) throw new ValidationError('ID konten tidak valid.');
}

export function validateContent(resource, body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('Isi permintaan harus berupa objek.');
  if (resource === 'contact') {
    const address = cleanText(body.address, 'Alamat', 500, false);
    const phone = cleanText(body.phone, 'Telepon', 50, false);
    const email = cleanText(body.email, 'Email', 254, false);
    const websiteUrl = validateUrl(body.websiteUrl, 'Website');
    const mapUrl = validateUrl(body.mapUrl, 'Peta');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Format email kontak tidak valid.');
    return { address, phone, email, websiteUrl, mapUrl };
  }
  const title = cleanText(body.title, 'Judul', 160, true);
  const text = cleanText(body.body, 'Isi konten', 30000, resource !== 'contact');
  const mediaAssetId = body.mediaAssetId === '' || body.mediaAssetId == null ? null : String(body.mediaAssetId);
  if (mediaAssetId && !uuidPattern.test(mediaAssetId)) throw new ValidationError('Aset media tidak valid.');

  const slug = resource === 'events' ? undefined : slugify(body.slug || title);
  if (resource !== 'events' && !slugPattern.test(slug)) throw new ValidationError('Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.');
  const isPublished = body.isPublished === true || body.isPublished === 'true';
  const summary = cleanText(body.summary, 'Ringkasan', 500, false);

  if (resource === 'profiles') {
    return { slug, title, body: text, isPublished, mediaAssetId };
  }
  if (resource === 'programs') {
    const displayOrder = body.displayOrder == null || body.displayOrder === '' ? 0 : Number(body.displayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 10000) throw new ValidationError('Urutan tampil harus berupa bilangan bulat 0–10000.');
    return { slug, title, summary, body: text, isPublished, mediaAssetId, displayOrder };
  }
  if (resource === 'news') return { slug, title, summary, body: text, isPublished, mediaAssetId };
  if (resource === 'events') {
    const startsAt = parseDate(body.startsAt, 'Waktu mulai');
    const endsAt = parseDate(body.endsAt, 'Waktu selesai');
    if (startsAt && endsAt && endsAt < startsAt) throw new ValidationError('Waktu selesai harus setelah waktu mulai.');
    return { title, body: text, location: cleanText(body.location, 'Lokasi', 250, false), startsAt, endsAt, isPublished, mediaAssetId };
  }
  throw new ValidationError('Jenis konten tidak didukung.');
}

function cleanText(value, label, maxLength, required) {
  if (typeof value !== 'string') {
    if (required) throw new ValidationError(`${label} wajib diisi.`);
    return null;
  }
  const result = value.trim();
  if (required && !result) throw new ValidationError(`${label} wajib diisi.`);
  if (result.length > maxLength) throw new ValidationError(`${label} maksimal ${maxLength} karakter.`);
  return result || null;
}

function slugify(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150).replace(/-+$/g, '');
}

function validateUrl(value, label) {
  const raw = cleanText(value, label, 1000, false);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new ValidationError(`${label} harus berupa URL http atau https yang valid.`);
  }
}

function parseDate(value, label) {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${label} tidak valid.`);
  return date.toISOString();
}

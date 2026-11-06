export const GALLERY_CATEGORIES = [
  'Kegiatan belajar',
  'Laboratorium & praktik',
  'Ekstrakurikuler',
  'Acara sekolah',
];

export class GalleryValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'GalleryValidationError';
    this.status = status;
  }
}

export function validateGalleryId(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new GalleryValidationError('ID galeri tidak valid.');
  }
}

export function validateGallery(input = {}) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const category = typeof input.category === 'string' ? input.category.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const imageUrl = typeof input.imageUrl === 'string' ? input.imageUrl.trim() : '';
  const activityDate = input.activityDate == null || input.activityDate === '' ? null : input.activityDate;

  if (!title || title.length > 180) throw new GalleryValidationError('Judul wajib diisi dan maksimal 180 karakter.');
  if (!GALLERY_CATEGORIES.includes(category)) throw new GalleryValidationError('Pilih kategori kegiatan yang tersedia.');
  if (!description || description.length > 3000) throw new GalleryValidationError('Deskripsi wajib diisi dan maksimal 3.000 karakter.');
  if (imageUrl.length > 2048) throw new GalleryValidationError('URL gambar maksimal 2.048 karakter.');
  if (imageUrl) {
    let parsedUrl;
    try { parsedUrl = new URL(imageUrl); } catch { throw new GalleryValidationError('URL gambar tidak valid.'); }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new GalleryValidationError('URL gambar harus menggunakan HTTP atau HTTPS.');
  }
  if (activityDate !== null) {
    const parsedDate = typeof activityDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(activityDate)
      ? new Date(`${activityDate}T00:00:00.000Z`) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== activityDate) {
      throw new GalleryValidationError('Tanggal kegiatan tidak valid.');
    }
  }

  return { title, category, description, imageUrl, activityDate };
}

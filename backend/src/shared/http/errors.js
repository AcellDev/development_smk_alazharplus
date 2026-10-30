export function notFoundHandler(_request, response) {
  response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rute tidak ditemukan.' } });
}

export function errorHandler(error, _request, response, _next) {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return response.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Ukuran gambar melebihi batas yang diizinkan.' } });
  }
  if (error?.name === 'MulterError') {
    return response.status(400).json({ error: { code: 'INVALID_UPLOAD', message: 'Permintaan unggah gambar tidak valid.' } });
  }
  if (error?.type === 'entity.parse.failed') {
    return response.status(400).json({ error: { code: 'INVALID_JSON', message: 'Format data JSON tidak valid.' } });
  }
  if (error?.code === '23505') {
    if (error.constraint === 'users_email_key') {
      return response.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'Email sudah terdaftar. Gunakan email lain atau masuk ke akun Anda.' } });
    }
    if (error.constraint?.includes('slug')) {
      return response.status(409).json({ error: { code: 'DUPLICATE_SLUG', message: 'Slug sudah digunakan. Ubah judul atau slug lalu coba lagi.' } });
    }
    return response.status(409).json({ error: { code: 'DUPLICATE_VALUE', message: 'Data bertabrakan dengan data yang sudah tersimpan.' } });
  }
  if (error?.code === '23503') {
    if (error.constraint === 'applicants_period_id_fkey') {
      return response.status(409).json({ error: { code: 'PERIOD_HAS_APPLICATIONS', message: 'Periode tidak dapat dihapus karena sudah memiliki pendaftar.' } });
    }
    if (error.constraint === 'application_documents_requirement_id_fkey') {
      return response.status(409).json({ error: { code: 'REQUIREMENT_IN_USE', message: 'Persyaratan tidak dapat dihapus karena sudah digunakan oleh dokumen pendaftar.' } });
    }
    return response.status(400).json({ error: { code: 'INVALID_REFERENCE', message: 'Referensi data tidak ditemukan.' } });
  }
  console.error('Request failed:', error?.name ?? 'Error');
  response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server.' } });
}

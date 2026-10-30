export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export async function requestJson(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? 'Permintaan gagal. Coba lagi.');
  return data;
}

export function mediaUrl(mediaAssetId) {
  return mediaAssetId ? `${API_URL}/content/media/${mediaAssetId}` : null;
}

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const privateDirectory = path.resolve(process.env.PRIVATE_UPLOAD_DIR ?? path.join(process.cwd(), 'var', 'private-uploads'));
const mimeExtensions = new Map([
  ['application/pdf', 'pdf'], ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
]);

export async function writePrivateFile(buffer, mimeType) {
  const extension = mimeExtensions.get(mimeType);
  if (!extension) throw new Error('Unsupported private file type');
  const key = `${randomUUID()}.${extension}`;
  await mkdir(privateDirectory, { recursive: true });
  await writeFile(path.join(privateDirectory, key), buffer, { flag: 'wx', mode: 0o600 });
  return key;
}

export async function removePrivateFile(key) {
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(key)) return;
  await unlink(path.join(privateDirectory, key)).catch(() => {});
}

export async function readPrivateFile(key) {
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(key)) return null;
  return readFile(path.join(privateDirectory, key));
}

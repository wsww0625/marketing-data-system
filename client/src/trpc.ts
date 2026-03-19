import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import type { AppRouter } from '../../server/src/routers/index.js';

export const trpc = createTRPCReact<AppRouter>();

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/trpc',
        headers() {
          const token = getToken();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

// API helper for file uploads
export async function uploadFile(file: File): Promise<{ filePath: string; fileName: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (!res.ok) throw new Error('上传失败');
  return res.json();
}

export async function uploadFiles(files: File[]): Promise<Array<{ filePath: string; fileName: string }>> {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const res = await fetch('/api/upload-multiple', {
    method: 'POST',
    headers: { authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (!res.ok) throw new Error('上传失败');
  return res.json();
}

export function getDownloadUrl(fileName: string): string {
  return `/api/download/${fileName}?token=${getToken()}`;
}

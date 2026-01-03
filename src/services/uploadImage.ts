// src/services/uploadImage.ts
import { toast } from 'sonner';

export async function uploadTemplateImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/upload-template', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Upload failed');
  }

  return data.url as string;
}

// src/components/inventory-v2/usePhotoUpload.tsx
// Camera/file picker → POST /api/upload (Vercel Blob) → public URL via callback.
// No `capture` attr on purpose: iOS then offers Take Photo / Photo Library / Choose File.
import { useRef, useState } from 'react';
import { toast } from 'sonner';

export function usePhotoUpload(onUploaded: (url: string) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = (await res.json()) as { url: string };
      onUploaded(url);
      toast.success('Photo uploaded');
    } catch (err) {
      console.error('[Upload] failed:', err);
      toast.error('Photo upload failed — previous photo kept');
    } finally {
      setUploading(false);
    }
  };

  /** Render once near the trigger button. */
  const input = (
    <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
  );

  return { pick, uploading, input };
}

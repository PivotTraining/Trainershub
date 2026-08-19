import { supabase } from './supabase';

const AVATAR_BUCKET = 'avatars';

function chooseImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/heic';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      input.remove();
      resolve(file);
    };
    input.oncancel = () => {
      input.remove();
      resolve(null);
    };
    document.body.appendChild(input);
    input.click();
  });
}

export async function pickAndUploadProfilePhoto(userId: string): Promise<string | null> {
  const file = await chooseImageFile();
  if (!file) return null;
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile photos must be 5 MB or smaller.');

  const path = `${userId}/profile`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      contentType: file.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeProfilePhoto(userId: string): Promise<void> {
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([`${userId}/profile`]);
  if (error && !error.message.toLowerCase().includes('not found')) throw new Error(error.message);
}

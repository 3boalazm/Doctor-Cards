export const PORTRAIT_MAX_EDGE = 512;
export const PORTRAIT_MAX_BYTES = 150 * 1024;

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('تعذر قراءة الصورة'));
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.readAsDataURL(blob);
  });
}

export async function resizePortrait(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('اختار ملف صورة.');
  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, PORTRAIT_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const qualities = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46];
    for (let dimensionAttempt = 0; dimensionAttempt < 8; dimensionAttempt += 1) {
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('المتصفح لا يدعم معالجة الصور.');
      context.drawImage(bitmap, 0, 0, width, height);
      for (const quality of qualities) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= PORTRAIT_MAX_BYTES) return await blobAsDataUrl(blob);
      }
      scale *= 0.82;
    }
    throw new Error('الصورة لا يمكن ضغطها لأقل من 150 KB.');
  } finally { bitmap.close(); }
}

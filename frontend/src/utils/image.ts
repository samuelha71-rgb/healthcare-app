// 업로드 전 이미지 압축 — 가로 최대 1024px, JPEG 품질 0.82
// → 보통 200KB 내외로 줄어들어 DB에 저장 가능
export async function compressImage(
  file: File,
  maxWidth = 1024,
  quality = 0.82,
): Promise<{ data: string; mime: string }> {
  const img = await loadImage(file);
  const ratio = Math.min(1, maxWidth / img.width);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, w, h);

  const mime = 'image/jpeg';
  const data = canvas.toDataURL(mime, quality);
  return { data, mime };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

// Export utilities for Brand Text Generator

export async function exportToPng(
  canvas: HTMLCanvasElement,
  transparent: boolean = false
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create PNG blob'));
      }
    }, 'image/png');
  });
}

export async function copyToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  try {
    const blob = await exportToPng(canvas, false);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
  } catch (error) {
    console.error('Clipboard write failed:', error);
    throw new Error('Clipboard access denied. Use Download instead.');
  }
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function generateFilename(
  templateId: string,
  text: string,
  transparent: boolean = false
): string {
  const timestamp = Date.now();
  const textSlug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const suffix = transparent ? '-transparent' : '';
  return `${templateId}-${textSlug}${suffix}-${timestamp}.png`;
}

export async function exportAndDownload(
  canvas: HTMLCanvasElement,
  templateId: string,
  text: string,
  transparent: boolean = false
): Promise<void> {
  const blob = await exportToPng(canvas, transparent);
  const filename = generateFilename(templateId, text, transparent);
  downloadFile(blob, filename);
}

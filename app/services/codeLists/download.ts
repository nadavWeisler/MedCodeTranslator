import { Platform } from 'react-native';

export function canUseFiles(): boolean {
  return Platform.OS === 'web' && typeof document !== 'undefined';
}

export function downloadBytes(filename: string, bytes: Uint8Array, mime: string): boolean {
  if (!canUseFiles()) return false;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

export function downloadText(filename: string, text: string, mime: string): boolean {
  return downloadBytes(filename, new TextEncoder().encode(text), mime);
}

export function pickBinaryFile(accept: string): Promise<{ name: string; data: ArrayBuffer } | null> {
  if (!canUseFiles()) return Promise.resolve(null);
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.arrayBuffer().then(data => resolve({ name: file.name, data })).catch(() => resolve(null));
    };
    input.click();
  });
}

export function pickTextFile(accept: string): Promise<string | null> {
  if (!canUseFiles()) return Promise.resolve(null);
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then(resolve).catch(() => resolve(null));
    };
    input.click();
  });
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

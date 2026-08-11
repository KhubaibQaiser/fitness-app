import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Write a Blob to a cache file and open the native share sheet.
 * Used for credentials / diet-plan PDFs on coach mobile.
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  void (async () => {
    const safeName = filename.replace(/[^\w.\-]+/g, '_');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const file = new File(Paths.cache, safeName);
    file.create({ overwrite: true });
    file.write(bytes);

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      console.warn('Sharing is not available on this device');
      return;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: blob.type || 'application/octet-stream',
      dialogTitle: safeName,
    });
  })();
};

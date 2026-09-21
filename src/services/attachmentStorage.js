// IndexedDB storage service for file attachments (audio, video, image, PDF, docs)
// Prevents localStorage quota exceeded crashes while supporting large files.

const DB_NAME = 'flux_attachment_storage_v1';
const STORE_NAME = 'attachments';
const DB_VERSION = 1;

// In-memory cache of blob URLs for fast previews
const objectUrlCache = new Map();

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAttachmentFile(id, file) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        blob: file, // Store native Blob/File directly
        updatedAt: Date.now()
      };

      const req = store.put(record);
      req.onsuccess = () => {
        // Cache object URL
        try {
          const blobUrl = URL.createObjectURL(file);
          objectUrlCache.set(id, blobUrl);
        } catch {
          // ignore
        }
        resolve(true);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao salvar anexo no IndexedDB:', err);
    return false;
  }
}

export async function getAttachmentBlob(id) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Erro ao ler anexo do IndexedDB:', err);
    return null;
  }
}

export async function getAttachmentUrl(attachmentOrId) {
  if (!attachmentOrId) return null;
  if (typeof attachmentOrId === 'object') {
    if (attachmentOrId.publicUrl) return attachmentOrId.publicUrl;
    if (attachmentOrId.fileUrl) return attachmentOrId.fileUrl;
    if (attachmentOrId.dataUrl) return attachmentOrId.dataUrl;
    if (attachmentOrId.id) return getAttachmentUrl(attachmentOrId.id);
    return null;
  }
  const id = attachmentOrId;
  if (objectUrlCache.has(id)) {
    return objectUrlCache.get(id);
  }
  const blob = await getAttachmentBlob(id);
  if (blob) {
    const blobUrl = URL.createObjectURL(blob);
    objectUrlCache.set(id, blobUrl);
    return blobUrl;
  }
  return null;
}

export async function deleteAttachmentFile(id) {
  if (objectUrlCache.has(id)) {
    try {
      URL.revokeObjectURL(objectUrlCache.get(id));
    } catch {
      // ignore
    }
    objectUrlCache.delete(id);
  }
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Triggers browser download for an attached file.
 * Checks IndexedDB first, then fallback to dataUrl if available.
 */
export async function triggerFileDownload(attachment) {
  if (!attachment) return;

  const filename = attachment.name || 'arquivo_anexo';

  try {
    // 0. If Supabase publicUrl exists, fetch or open direct download
    if (attachment.publicUrl) {
      try {
        const resp = await fetch(attachment.publicUrl);
        const blob = await resp.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
        return true;
      } catch {
        window.open(attachment.publicUrl, '_blank');
        return true;
      }
    }

    // 1. Try fetching blob from IndexedDB
    let blob = null;
    if (attachment.id) {
      blob = await getAttachmentBlob(attachment.id);
    }

    if (blob) {
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
      return true;
    }

    // 2. Fallback: if attachment has dataUrl
    if (attachment.dataUrl) {
      const a = document.createElement('a');
      a.href = attachment.dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    alert(`Arquivo "${filename}" não encontrado no cache local. Por favor, anexe o arquivo novamente.`);
    return false;
  } catch (err) {
    console.error('Falha ao baixar arquivo:', err);
    alert('Erro ao realizar o download do arquivo.');
    return false;
  }
}

/**
 * Generates an image thumbnail (capa do vídeo) from a video file/blob.
 * Creates an in-memory video element and captures a frame using HTML5 Canvas.
 */
export function generateVideoThumbnail(file) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const blobUrl = URL.createObjectURL(file);
      video.src = blobUrl;

      let isResolved = false;

      const cleanup = () => {
        try {
          URL.revokeObjectURL(blobUrl);
          video.src = '';
          video.remove();
        } catch {
          // ignore
        }
      };

      video.onloadeddata = () => {
        // Seek to 0.5s or 25% of duration for a meaningful thumbnail frame
        video.currentTime = Math.min(0.5, (video.duration || 1) / 3);
      };

      video.onseeked = () => {
        if (isResolved) return;
        isResolved = true;
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 540;
          let w = video.videoWidth || 480;
          let h = video.videoHeight || 270;

          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }

          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, w, h);
          const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          cleanup();
          resolve(thumbDataUrl);
        } catch (err) {
          console.warn('Falha ao extrair capa do vídeo no canvas:', err);
          cleanup();
          resolve(null);
        }
      };

      video.onerror = () => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve(null);
        }
      };

      // Fallback timeout in case video loading or decoding hangs
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve(null);
        }
      }, 3500);
    } catch {
      resolve(null);
    }
  });
}


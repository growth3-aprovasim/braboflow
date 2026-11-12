import { supabase } from './supabase';
import { uploadAttachmentToSupabase } from './supabaseService';

// IndexedDB storage service for file attachments (audio, video, image, PDF, docs)
// Prevents localStorage quota exceeded crashes while supporting large files up to 100MB.

export const MAX_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_ATTACHMENT_SIZE_LABEL = '100 MB';

export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

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

export function isRemoteUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

/**
 * Extracts bucket and path if a URL matches Supabase Storage patterns.
 * e.g. https://...supabase.co/storage/v1/object/public/midia/copymetrix/...
 */
export function parseSupabaseStorageUrl(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;

  const match = urlOrPath.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
  if (match) {
    const bucket = decodeURIComponent(match[1]);
    const rawPath = match[2].split('?')[0];
    return {
      bucket,
      path: decodeURIComponent(rawPath)
    };
  }

  return null;
}

/**
 * Resolves the primary remote URL from an attachment object if present.
 */
export function resolveAttachmentRemoteUrl(attachment) {
  if (!attachment) return null;
  if (typeof attachment === 'string' && isRemoteUrl(attachment)) {
    return attachment;
  }
  if (typeof attachment === 'object') {
    const candidates = [
      attachment.publicUrl,
      attachment.url,
      attachment.fileUrl,
      attachment.previewUrl
    ];
    for (const cand of candidates) {
      if (typeof cand === 'string' && isRemoteUrl(cand)) {
        return cand;
      }
    }
  }
  return null;
}

export async function getAttachmentUrl(attachmentOrId) {
  if (!attachmentOrId) return null;

  if (typeof attachmentOrId === 'object') {
    // 1. Direct remote URL (publicUrl, url, fileUrl, or remote previewUrl)
    const remoteUrl = resolveAttachmentRemoteUrl(attachmentOrId);
    if (remoteUrl) return remoteUrl;

    // 2. Storage Path on Supabase
    if (attachmentOrId.storagePath) {
      try {
        const bucket = attachmentOrId.bucket || 'bflow-attachments';
        const { data } = supabase.storage.from(bucket).getPublicUrl(attachmentOrId.storagePath);
        if (data?.publicUrl) return data.publicUrl;
      } catch (err) {
        console.warn('Erro ao obter publicUrl do storagePath:', err);
      }
    }

    // 3. Local dataUrl
    if (attachmentOrId.dataUrl) return attachmentOrId.dataUrl;

    // 4. Local blob previewUrl
    if (attachmentOrId.previewUrl && typeof attachmentOrId.previewUrl === 'string') {
      return attachmentOrId.previewUrl;
    }

    // 5. Lookup by ID in IndexedDB
    if (attachmentOrId.id) return getAttachmentUrl(attachmentOrId.id);
    return null;
  }

  const id = attachmentOrId;
  if (typeof id === 'string' && isRemoteUrl(id)) {
    return id;
  }
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

async function triggerDirectBlobDownload(blob, filename) {
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    try {
      URL.revokeObjectURL(downloadUrl);
    } catch {
      // ignore
    }
  }, 10000);
}

/**
 * Triggers browser download for an attached file.
 * Prioritizes downloading from Supabase Storage / Remote URL first,
 * falling back to IndexedDB local cache or dataUrl.
 */
export async function triggerFileDownload(attachment) {
  if (!attachment) return false;

  let att = attachment;
  if (typeof att === 'string') {
    if (isRemoteUrl(att)) {
      att = { url: att };
    } else {
      att = { id: att };
    }
  }

  // Determine a sensible filename
  let filename = att.name;
  if (!filename) {
    const candUrl = resolveAttachmentRemoteUrl(att) || att.storagePath || '';
    if (candUrl) {
      const cleanPath = candUrl.split('?')[0].split('#')[0];
      const parts = cleanPath.split('/');
      filename = parts[parts.length - 1];
    }
  }
  if (!filename || filename.trim() === '') {
    filename = att.type === 'video' ? 'video.mp4' : att.type === 'image' ? 'imagem.png' : 'arquivo_anexo';
  }

  try {
    const remoteUrl = resolveAttachmentRemoteUrl(att);

    // 1. Supabase Storage download via Supabase Client (.download())
    // Handles custom auth, private buckets, and avoids browser CORS blocks
    let storageInfo = null;
    if (att.storagePath) {
      storageInfo = {
        bucket: att.bucket || 'bflow-attachments',
        path: att.storagePath
      };
    } else if (remoteUrl) {
      storageInfo = parseSupabaseStorageUrl(remoteUrl);
    }

    if (storageInfo && storageInfo.bucket && storageInfo.path) {
      try {
        const { data: blob, error } = await supabase.storage
          .from(storageInfo.bucket)
          .download(storageInfo.path);

        if (!error && blob && blob.size > 0) {
          await triggerDirectBlobDownload(blob, filename);
          return true;
        }
      } catch (storageErr) {
        console.warn('Supabase storage .download() falhou, tentando fallback por URL/fetch:', storageErr);
      }
    }

    // 2. Fetch remote URL directly (if available)
    if (remoteUrl) {
      try {
        const resp = await fetch(remoteUrl, { mode: 'cors' });
        if (resp.ok) {
          const blob = await resp.blob();
          await triggerDirectBlobDownload(blob, filename);
          return true;
        }
      } catch (fetchErr) {
        console.warn('Fetch direto falhou (provável restrição de CORS). Tentando link direto:', fetchErr);
      }

      // If fetch failed due to CORS or network, open directly / simulate download link
      try {
        const a = document.createElement('a');
        a.href = remoteUrl;
        a.download = filename;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return true;
      } catch {
        window.open(remoteUrl, '_blank');
        return true;
      }
    }

    // 3. Try fetching blob from IndexedDB (local browser cache)
    if (att.id) {
      const blob = await getAttachmentBlob(att.id);
      if (blob) {
        await triggerDirectBlobDownload(blob, filename);
        return true;
      }
    }

    // 4. Fallback: if attachment has dataUrl
    if (att.dataUrl) {
      const a = document.createElement('a');
      a.href = att.dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    // 5. Fallback: previewUrl (e.g. blob:...)
    if (att.previewUrl && typeof att.previewUrl === 'string') {
      const a = document.createElement('a');
      a.href = att.previewUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    alert(`Não foi possível localizar o arquivo "${filename}" no servidor Supabase ou localmente.`);
    return false;
  } catch (err) {
    console.error('Falha ao baixar arquivo:', err);
    alert('Erro ao realizar o download do arquivo. Por favor, tente novamente.');
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

/**
 * Validates and processes a single file (image, video, audio, doc).
 * Strictly enforces maximum 100MB size limit.
 * Saves locally in IndexedDB and uploads to Supabase Storage if configured.
 */
export async function processAttachmentFile(file, recordId = null) {
  if (!file) throw new Error('Nenhum arquivo fornecido.');

  // Check 100MB size limit
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`O arquivo "${file.name}" possui ${sizeMb} MB e ultrapassa o limite máximo permitido de ${MAX_ATTACHMENT_SIZE_LABEL}.`);
  }

  const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  let type = 'document';
  if (file.type.startsWith('image/')) type = 'image';
  else if (file.type.startsWith('video/')) type = 'video';
  else if (file.type.startsWith('audio/')) type = 'audio';

  // 1. Salvar binário localmente no IndexedDB
  await saveAttachmentFile(attachmentId, file);
  const blobUrl = await getAttachmentUrl(attachmentId);

  // 2. Upload assíncrono para o Supabase Storage se configurado
  let publicUrl = null;
  let storagePath = null;
  try {
    const storageResult = await uploadAttachmentToSupabase(file, recordId || attachmentId);
    if (storageResult) {
      publicUrl = storageResult.publicUrl;
      storagePath = storageResult.storagePath;
    }
  } catch (err) {
    console.warn('Storage upload fallback:', err);
  }

  // 3. Extrair capa se for vídeo ou usar preview se for imagem
  let thumbnailUrl = null;
  if (type === 'video') {
    try {
      thumbnailUrl = await generateVideoThumbnail(file);
    } catch {
      thumbnailUrl = null;
    }
  } else if (type === 'image') {
    thumbnailUrl = publicUrl || blobUrl;
  }

  return {
    id: attachmentId,
    name: file.name,
    size: formatFileSize(file.size),
    type,
    position: 'before',
    previewUrl: publicUrl || blobUrl,
    publicUrl,
    storagePath,
    thumbnailUrl: thumbnailUrl || (type === 'image' ? (publicUrl || blobUrl) : null)
  };
}

/**
 * Processes a list of files with 100MB limit check.
 * Returns { items: Array, errors: Array }
 */
export async function processAttachmentFiles(files, recordId = null) {
  const fileList = Array.from(files || []);
  const items = [];
  const errors = [];

  for (const file of fileList) {
    try {
      const item = await processAttachmentFile(file, recordId);
      items.push(item);
    } catch (err) {
      errors.push(err.message || `Erro ao processar o arquivo "${file.name}".`);
    }
  }

  return { items, errors };
}


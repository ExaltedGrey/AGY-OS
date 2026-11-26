const DB_NAME = 'fieldnotes_sqlite_store';
const DB_VERSION = 1;
const STORE_NAME = 'database_blobs';
const BLOB_KEY = 'primary_sqlite_db';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function loadDatabaseBytes(): Promise<Uint8Array | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openIDB();
    return await new Promise<Uint8Array | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(BLOB_KEY);
      req.onsuccess = () => {
        const result = req.result;
        if (result instanceof Uint8Array) {
          resolve(result);
        } else if (result instanceof ArrayBuffer) {
          resolve(new Uint8Array(result));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error ?? new Error('Failed to read database from IndexedDB'));
    });
  } catch (err) {
    console.warn('Could not load SQLite bytes from IndexedDB:', err);
    return null;
  }
}

export async function saveDatabaseBytes(bytes: Uint8Array): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(bytes, BLOB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save database to IndexedDB'));
    });
  } catch (err) {
    console.warn('Could not persist SQLite bytes to IndexedDB:', err);
  }
}

export async function clearDatabaseBytes(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(BLOB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to clear IndexedDB'));
    });
  } catch (err) {
    console.warn('Could not clear IndexedDB:', err);
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      return await navigator.storage.persist();
    }
  } catch {
    // Ignore unsupported environments
  }
  return false;
}

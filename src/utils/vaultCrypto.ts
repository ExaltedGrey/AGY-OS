/**
 * Zero-server AES-256-GCM encrypted vault format (.fnvault)
 *
 * Binary layout:
 * [0..3]   Magic header: "FNV1" (4 bytes)
 * [4..19]  Random PBKDF2 salt (16 bytes)
 * [20..31] Random AES-GCM IV (12 bytes)
 * [32..]   AES-256-GCM ciphertext + 16-byte authentication tag
 */

const MAGIC = new Uint8Array([0x46, 0x4e, 0x56, 0x31]); // "FNV1"
const SALT_LEN = 16;
const IV_LEN = 12;
const HEADER_LEN = MAGIC.length + SALT_LEN + IV_LEN;
const PBKDF2_ITERATIONS = 250_000;

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptVault(
  sqliteBytes: Uint8Array,
  passphrase: string
): Promise<Uint8Array> {
  const trimmed = passphrase.trim();
  if (trimmed.length < 4) {
    throw new Error('Please enter a passphrase of at least 4 characters.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveAesKey(trimmed, salt);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    sqliteBytes as BufferSource
  );

  const ciphertext = new Uint8Array(encryptedBuffer);
  const output = new Uint8Array(HEADER_LEN + ciphertext.length);
  output.set(MAGIC, 0);
  output.set(salt, MAGIC.length);
  output.set(iv, MAGIC.length + SALT_LEN);
  output.set(ciphertext, HEADER_LEN);
  return output;
}

export async function decryptVault(
  vaultBytes: Uint8Array,
  passphrase: string
): Promise<Uint8Array> {
  if (vaultBytes.length < MAGIC.length) {
    throw new Error('Unrecognized file format. Expected a Fieldnotes (.fnvault) backup file.');
  }

  for (let i = 0; i < MAGIC.length; i++) {
    if (vaultBytes[i] !== MAGIC[i]) {
      throw new Error('Unrecognized file format. Expected a Fieldnotes (.fnvault) backup file.');
    }
  }

  if (vaultBytes.length <= HEADER_LEN + 16) {
    throw new Error('This file is too small to be a valid Fieldnotes encrypted vault.');
  }

  const trimmed = passphrase.trim();
  if (!trimmed) {
    throw new Error('Please enter the passphrase used when creating this backup.');
  }

  const salt = vaultBytes.slice(MAGIC.length, MAGIC.length + SALT_LEN);
  const iv = vaultBytes.slice(MAGIC.length + SALT_LEN, HEADER_LEN);
  const ciphertext = vaultBytes.slice(HEADER_LEN);

  const key = await deriveAesKey(trimmed, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
    return new Uint8Array(decryptedBuffer);
  } catch {
    throw new Error('Incorrect passphrase or corrupted backup file.');
  }
}

export function isEncryptedVaultBytes(bytes: Uint8Array): boolean {
  if (bytes.length < MAGIC.length) return false;
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) return false;
  }
  return true;
}

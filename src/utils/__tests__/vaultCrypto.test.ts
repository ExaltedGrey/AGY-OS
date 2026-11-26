import { describe, expect, it } from 'vitest';
import { decryptVault, encryptVault, isEncryptedVaultBytes } from '../vaultCrypto';

describe('vaultCrypto', () => {
  it('round-trips binary data identically with AES-256-GCM', async () => {
    const sample = new Uint8Array([1, 2, 3, 4, 5, 42, 99, 255, 0, 17]);
    const encrypted = await encryptVault(sample, 'my-secret-passphrase');

    expect(isEncryptedVaultBytes(encrypted)).toBe(true);
    expect(encrypted.byteLength).toBeGreaterThan(sample.byteLength + 32);

    const decrypted = await decryptVault(encrypted, 'my-secret-passphrase');
    expect(Array.from(decrypted)).toEqual(Array.from(sample));
  });

  it('rejects an incorrect passphrase cleanly', async () => {
    const sample = new TextEncoder().encode('SQLite format 3\0test payload');
    const encrypted = await encryptVault(sample, 'correct-pass');

    await expect(decryptVault(encrypted, 'wrong-pass')).rejects.toThrow(
      /Incorrect passphrase|corrupted/i
    );
  });

  it('rejects non-vault files safely', async () => {
    const plain = new TextEncoder().encode('not a valid vault file at all, just plain text');
    expect(isEncryptedVaultBytes(plain)).toBe(false);

    await expect(decryptVault(plain, 'some-pass')).rejects.toThrow(/Unrecognized file format/i);
  });

  it('enforces minimum passphrase length on export', async () => {
    const sample = new Uint8Array([1, 2, 3]);
    await expect(encryptVault(sample, '12')).rejects.toThrow(/at least 4 characters/i);
  });
});

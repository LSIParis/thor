import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from './crypto'

describe('crypto', () => {
  it('encrypts and decrypts a string', () => {
    const original = 'my-secret-api-key'
    const encrypted = encrypt(original)
    expect(encrypted).not.toBe(original)
    expect(decrypt(encrypted)).toBe(original)
  })

  it('produces different ciphertext each call (IV randomness)', () => {
    const a = encrypt('same')
    const b = encrypt('same')
    expect(a).not.toBe(b)
  })
})

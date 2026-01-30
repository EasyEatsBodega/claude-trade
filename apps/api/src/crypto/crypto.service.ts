import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM

@Injectable()
export class CryptoService {
  private masterKey: Buffer;

  constructor(private config: ConfigService) {
    const keyHex = this.config.getOrThrow<string>('MASTER_ENCRYPTION_KEY');
    this.masterKey = Buffer.from(keyHex, 'hex');
    if (this.masterKey.length !== 32) {
      throw new Error('MASTER_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    }
  }

  encrypt(plaintext: string): {
    ciphertext: Buffer;
    iv: Buffer;
    authTag: Buffer;
  } {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return {
      ciphertext: encrypted,
      iv,
      authTag: cipher.getAuthTag(),
    };
  }

  decrypt(ciphertext: Buffer, iv: Buffer, authTag: Buffer): string {
    const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}

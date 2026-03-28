/**
 * Secure credential storage service.
 *
 * Encrypts ENSAM credentials using AES-256-GCM with a master key from env.
 * Stores encrypted credentials in PostgreSQL via Prisma.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { prisma } from "./prisma";
import type { ENSAMCredentials } from "../types";

const ENCRYPTION_KEY = process.env.CREDENTIALS_MASTER_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 16) {
  console.warn(
    "[credentials] WARNING: CREDENTIALS_MASTER_KEY not set or too short. " +
      "Set a strong 32+ character key in environment."
  );
}

// Derive a 32-byte key from the master key
function getKey(): Buffer {
  const key = ENCRYPTION_KEY || "default-insecure-key-do-not-use";
  return scryptSync(key, "ensam-salt", 32);
}

const ALGORITHM = "aes-256-gcm";

interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

function encrypt(text: string): EncryptedData {
  const iv = randomBytes(16);
  const key = getKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(data: EncryptedData): string {
  const key = getKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(data.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(data.authTag, "base64"));

  let decrypted = decipher.update(data.encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// Store format: base64(authTag):base64(iv):base64(encrypted)
function serializeEncrypted(data: EncryptedData): string {
  return `${data.authTag}:${data.iv}:${data.encrypted}`;
}

function parseEncrypted(serialized: string): EncryptedData {
  const [authTag, iv, encrypted] = serialized.split(":");
  return { authTag, iv, encrypted };
}

/**
 * Store (or update) encrypted credentials for a user.
 */
export async function storeCredentials(
  userId: string,
  credentials: ENSAMCredentials
): Promise<void> {
  const encryptedUsername = encrypt(credentials.username);
  const encryptedPassword = encrypt(credentials.password);

  await prisma.userCredentials.upsert({
    where: { userId },
    create: {
      userId,
      username: serializeEncrypted(encryptedUsername),
      password: serializeEncrypted(encryptedPassword),
      iv: encryptedUsername.iv, // stored for reference
    },
    update: {
      username: serializeEncrypted(encryptedUsername),
      password: serializeEncrypted(encryptedPassword),
      iv: encryptedUsername.iv,
    },
  });
}

/**
 * Retrieve and decrypt credentials for a user.
 * Returns null if no credentials found.
 */
export async function getCredentials(
  userId: string
): Promise<ENSAMCredentials | null> {
  const record = await prisma.userCredentials.findUnique({
    where: { userId },
  });

  if (!record) {
    return null;
  }

  try {
    const username = decrypt(parseEncrypted(record.username));
    const password = decrypt(parseEncrypted(record.password));

    return { username, password };
  } catch (err) {
    console.error("[credentials] Failed to decrypt credentials for user:", userId);
    throw new Error("Failed to decrypt stored credentials - master key may have changed");
  }
}

/**
 * Check if credentials exist for a user.
 */
export async function hasCredentials(userId: string): Promise<boolean> {
  const count = await prisma.userCredentials.count({ where: { userId } });
  return count > 0;
}

/**
 * Delete stored credentials for a user.
 */
export async function deleteCredentials(userId: string): Promise<void> {
  await prisma.userCredentials.deleteMany({ where: { userId } });
}

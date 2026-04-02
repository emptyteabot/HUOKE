"use client";

const STORAGE_KEY = "leadpulse_client_user_id";

function createFallbackUserId() {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) {
    return `guest_${cryptoApi.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }

  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateClientUserId() {
  if (typeof window === "undefined") {
    return "guest_demo";
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.trim()) {
      return existing.trim();
    }

    const nextId = createFallbackUserId();
    window.localStorage.setItem(STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return createFallbackUserId();
  }
}

const STORAGE_KEY = "leadpulse_user_id";

export function getOrCreateClientUserId(): string {
  if (typeof window === "undefined") return "guest_demo";

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.trim()) return existing.trim();

    let id = "";
    if (typeof window.crypto !== "undefined" && typeof window.crypto.randomUUID === "function") {
      id = `u_${window.crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    } else {
      id = `u_${Math.random().toString(36).slice(2, 14)}${Date.now().toString(36).slice(-6)}`;
    }

    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return "guest_demo";
  }
}

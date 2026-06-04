import { Token, User } from "./types";

export const BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("melitta_token");
}

export function setAuth(data: Token) {
  localStorage.setItem("melitta_token", data.access_token);
  localStorage.setItem("melitta_user", JSON.stringify(data.user));
}

export function clearAuth() {
  localStorage.removeItem("melitta_token");
  localStorage.removeItem("melitta_user");
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem("melitta_user");
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch (e) {
    console.error("Failed to parse stored user", e);
    localStorage.removeItem("melitta_user");
    localStorage.removeItem("melitta_token");
    return null;
  }
}

export async function authFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    throw new Error("Unauthorized");
  }
  return res;
}

export function renderStars(n: number): string {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

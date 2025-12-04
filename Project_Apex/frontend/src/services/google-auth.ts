import { setAccessToken } from "@/api/client-config";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export interface GoogleLoginResponse {
  access_token: string;
  role: string;
}

export async function loginWithGoogle(idToken: string): Promise<GoogleLoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/login/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) {
    let msg = `Google login failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) msg = String(body.detail);
    } catch {}
    throw new Error(msg);
  }
  const data = (await res.json()) as GoogleLoginResponse;
  setAccessToken(data.access_token);
  return data;
}


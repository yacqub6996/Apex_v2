import { OpenAPI } from "./core/OpenAPI";

const sanitizeBase = (value: string | undefined | null): string | undefined => {
    if (!value) return undefined;
    return value.replace(/\s/g, "").replace(/\/+$/, "");
};

const inferLocalApiBase = (): string | undefined => {
    if (typeof window === "undefined") return undefined;

    try {
        const origin = window.location.origin;
        if (!origin) return undefined;

        const url = new URL(origin);

        // Align with FastAPI default port when the frontend runs on Vite dev server.
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
            url.port = url.port && url.port !== "5173" ? url.port : "8000";
            return url.origin;
        }

        return undefined;
    } catch {
        return undefined;
    }
};

const API_BASE_URL = sanitizeBase(import.meta.env.VITE_API_URL) ?? sanitizeBase(inferLocalApiBase()) ?? "";
const ACCESS_TOKEN_KEY = "access_token";

let inMemoryToken: string | undefined;

const readTokenFromStorage = (): string | undefined => {
    if (typeof window === "undefined") {
        return inMemoryToken;
    }

    try {
        const stored = window.localStorage.getItem(ACCESS_TOKEN_KEY);
        inMemoryToken = stored ?? undefined;
    } catch (error) {
        inMemoryToken = undefined;
    }

    return inMemoryToken;
};

export const getAccessToken = (): string | undefined => {
    return readTokenFromStorage();
};

export const setAccessToken = (token: string | null | undefined): void => {
    inMemoryToken = token ?? undefined;

    if (typeof window !== "undefined") {
        try {
            if (inMemoryToken) {
                window.localStorage.setItem(ACCESS_TOKEN_KEY, inMemoryToken);
            } else {
                window.localStorage.removeItem(ACCESS_TOKEN_KEY);
            }
        } catch (error) {
            inMemoryToken = token ?? undefined;
        }
    }
};

export const clearAccessToken = (): void => {
    setAccessToken(undefined);
};

export const syncAccessTokenFromStorage = (): string | undefined => {
    return readTokenFromStorage();
};

OpenAPI.BASE = API_BASE_URL;
OpenAPI.TOKEN = async () => readTokenFromStorage() ?? "";
OpenAPI.WITH_CREDENTIALS = false;
OpenAPI.CREDENTIALS = "include";

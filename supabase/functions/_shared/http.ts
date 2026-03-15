const PROD_DEFAULT_ORIGIN = "https://www.italianexp.com";

function getAllowedOrigin(requestOrigin: string | null): string {
  const envOrigin = (Deno.env.get("ALLOWED_ORIGIN") || "").trim();
  const baseAllowed = envOrigin || PROD_DEFAULT_ORIGIN;

  if (!requestOrigin) return baseAllowed;

  try {
    const url = new URL(requestOrigin);
    const isLocalhost =
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      (url.protocol === "http:" || url.protocol === "https:");

    if (isLocalhost) {
      return `${url.protocol}//${url.host}`;
    }
  } catch {
  }

  return baseAllowed;
}

export const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": PROD_DEFAULT_ORIGIN,
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

export function jsonResponse(
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
  req?: Request,
): Response {
  const originHeader = getAllowedOrigin(req?.headers.get("origin"));

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      "access-control-allow-origin": originHeader,
      ...extraHeaders,
    },
  });
}

export function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

/** Client IP for Turnstile remoteip (CF-Connecting-IP or first X-Forwarded-For). */
export function getClientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return first || null;
}

const MAX_JSON_BODY_BYTES = 1024 * 1024; // 1 MB

export async function readJsonBody(req: Request): Promise<unknown> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Expected application/json");
  }
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const len = parseInt(contentLength, 10);
    if (!Number.isFinite(len) || len < 0 || len > MAX_JSON_BODY_BYTES) {
      throw new Error("Request body too large");
    }
  }
  const blob = await req.blob();
  if (blob.size > MAX_JSON_BODY_BYTES) {
    throw new Error("Request body too large");
  }
  return await blob.slice(0, MAX_JSON_BODY_BYTES).json();
}


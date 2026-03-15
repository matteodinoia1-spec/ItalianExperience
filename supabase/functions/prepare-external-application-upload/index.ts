/// <reference path="./deno.d.ts" />
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import {
  CORS_HEADERS,
  getClientIp,
  jsonResponse,
  readJsonBody,
} from "../_shared/http.ts";

type FileKind = "resume" | "photo";

interface UploadRequestBody {
  file_kind?: unknown;
  filename?: unknown;
  content_type?: unknown;
  size_bytes?: unknown;
  captcha_token?: unknown;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function asStringOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function asPositiveNumberOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function sanitizeFilename(raw: string): { safeName: string; ext: string | null } {
  const lower = raw.toLowerCase().trim();
  const lastDot = lower.lastIndexOf(".");
  let base = lastDot > 0 ? lower.slice(0, lastDot) : lower;
  const ext = lastDot > 0 ? lower.slice(lastDot) : null;

  base = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!base) base = "file";

  return { safeName: ext ? `${base}${ext}` : base, ext };
}

const BUCKET_NAME = "external-candidate-submissions";
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      405,
      {
        ok: false,
        error: { message: "Method not allowed", code: "method_not_allowed" },
      },
      {},
      req,
    );
  }

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await readJsonBody(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Request body too large") {
      return jsonResponse(
        400,
        {
          ok: false,
          error: { message: "Request body too large", code: "body_too_large" },
        },
        {},
        req,
      );
    }
    return jsonResponse(
      400,
      {
        ok: false,
        error: {
          message: "Invalid or missing JSON body",
          code: "invalid_json",
        },
      },
      {},
      req,
    );
  }

  if (!isRecord(bodyUnknown)) {
    return jsonResponse(
      400,
      {
        ok: false,
        error: { message: "Invalid JSON body", code: "bad_request" },
      },
      {},
      req,
    );
  }

  const body = bodyUnknown as UploadRequestBody;

  const captchaTokenRaw = asStringOrNull(body.captcha_token);
  if (!captchaTokenRaw) {
    return jsonResponse(
      400,
      {
        ok: false,
        error: {
          message: "captcha_token is required",
          code: "captcha_missing",
        },
      },
      {},
      req,
    );
  }

  const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!TURNSTILE_SECRET) {
    return jsonResponse(
      502,
      {
        ok: false,
        error: {
          message: "CAPTCHA verification is unavailable",
          code: "captcha_verification_error",
        },
      },
      {},
      req,
    );
  }

  let verifyResponse: Response;
  try {
    const formData = new URLSearchParams();
    formData.append("secret", TURNSTILE_SECRET);
    formData.append("response", captchaTokenRaw);
    const remoteIp = getClientIp(req);
    if (remoteIp) formData.append("remoteip", remoteIp);

    verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
  } catch {
    return jsonResponse(
      502,
      {
        ok: false,
        error: {
          message: "Failed to verify CAPTCHA",
          code: "captcha_verification_error",
        },
      },
      {},
      req,
    );
  }

  if (!verifyResponse.ok) {
    return jsonResponse(
      502,
      {
        ok: false,
        error: {
          message: "CAPTCHA verification service error",
          code: "captcha_verification_error",
        },
      },
      {},
      req,
    );
  }

  let verifyJson: unknown;
  try {
    verifyJson = await verifyResponse.json();
  } catch {
    return jsonResponse(
      502,
      {
        ok: false,
        error: {
          message: "Invalid CAPTCHA verification response",
          code: "captcha_verification_error",
        },
      },
      {},
      req,
    );
  }

  const verifyData = isRecord(verifyJson) ? verifyJson : {};
  const successField = verifyData.success;
  const success = typeof successField === "boolean"
    ? successField
    : successField === "true";
  if (!success) {
    return jsonResponse(403, {
      ok: false,
      error: { message: "Invalid CAPTCHA token", code: "captcha_invalid" },
    });
  }

  const fileKindRaw = asStringOrNull(body.file_kind);
  const filenameRaw = asStringOrNull(body.filename);
  const contentType = asStringOrNull(body.content_type);
  const sizeBytes = asPositiveNumberOrNull(body.size_bytes);

  if (!fileKindRaw) {
    return jsonResponse(
      400,
      {
        ok: false,
        error: {
          message: "file_kind is required",
          code: "missing_file_kind",
        },
      },
      {},
      req,
    );
  }
  if (!filenameRaw) {
    return jsonResponse(
      400,
      {
        ok: false,
        error: {
          message: "filename is required",
          code: "missing_filename",
        },
      },
      {},
      req,
    );
  }
  if (!contentType) {
    return jsonResponse(
      400,
      {
        ok: false,
        error: {
          message: "content_type is required",
          code: "missing_content_type",
        },
      },
      {},
      req,
    );
  }
  if (sizeBytes == null) {
    return jsonResponse(
      400,
      {
        ok: false,
        error: {
          message: "size_bytes must be a positive number",
          code: "invalid_size_bytes",
        },
      },
      {},
      req,
    );
  }

  const allowedKinds: FileKind[] = ["resume", "photo"];
  if (!allowedKinds.includes(fileKindRaw as FileKind)) {
    return jsonResponse(
      400,
      {
        ok: false,
        error: { message: "Invalid file_kind", code: "invalid_file_kind" },
      },
      {},
      req,
    );
  }

  const fileKind = fileKindRaw as FileKind;
  const { safeName, ext } = sanitizeFilename(filenameRaw);

  if (!ext) {
    return jsonResponse(
      400,
      {
        ok: false,
        error: {
          message: "Filename must include a valid extension",
          code: "missing_extension",
        },
      },
      {},
      req,
    );
  }

  let maxSize = 0;
  if (fileKind === "resume") {
    const allowedExt = [".pdf"];
    const allowedContentTypes = ["application/pdf"];
    if (!allowedExt.includes(ext)) {
      return jsonResponse(
        400,
        {
          ok: false,
          error: {
            message: "Unsupported resume file extension",
            code: "invalid_resume_extension",
          },
        },
        {},
        req,
      );
    }
    if (!allowedContentTypes.includes(contentType)) {
      return jsonResponse(
        400,
        {
          ok: false,
          error: {
            message: "Unsupported resume content_type",
            code: "invalid_resume_content_type",
          },
        },
        {},
        req,
      );
    }
    maxSize = MAX_RESUME_BYTES;
  } else {
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
    const allowedContentTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowedExt.includes(ext)) {
      return jsonResponse(
        400,
        {
          ok: false,
          error: {
            message: "Unsupported photo file extension",
            code: "invalid_photo_extension",
          },
        },
        {},
        req,
      );
    }
    if (!allowedContentTypes.includes(contentType)) {
      return jsonResponse(
        400,
        {
          ok: false,
          error: {
            message: "Unsupported photo content_type",
            code: "invalid_photo_content_type",
          },
        },
        {},
        req,
      );
    }
    maxSize = MAX_PHOTO_BYTES;
  }

  if (sizeBytes > maxSize) {
    return jsonResponse(
      400,
      {
        ok: false,
        error: {
          message: "File size exceeds allowed maximum",
          code: "file_too_large",
        },
      },
      {},
      req,
    );
  }

  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).slice(2, 8);
  const objectPath = `${fileKind}-${timestamp}-${randomPart}-${safeName}`;

  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(objectPath, {
      contentType,
    });

  if (error || !data) {
    return jsonResponse(
      500,
      {
        ok: false,
        error: {
          message: error?.message ?? "Failed to create signed upload URL",
          code: "signed_upload_url_failed",
        },
      },
      {},
      req,
    );
  }

  // createSignedUploadUrl returns { path, token, signedUrl }; client uses path + token for uploadToSignedUrl()
  const token = (data as { token?: string }).token ?? null;

  return jsonResponse(
    200,
    {
      ok: true,
      bucket: BUCKET_NAME,
      object_path: objectPath,
      upload_token: token,
      signed_upload_url: data.signedUrl ?? null,
      content_type: contentType,
      max_size_bytes: maxSize,
    },
    {},
    req,
  );
});


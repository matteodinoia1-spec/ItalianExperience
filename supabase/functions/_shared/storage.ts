/**
 * Validates that a path matches the object path format produced by
 * prepare-external-application-upload for the external submission flow.
 * Format: {kind}-{13-digit timestamp}-{6 alphanumeric}-{safeName}.{ext}
 */
const MAX_PATH_LENGTH = 512;
const RESUME_SUFFIX = /^\d{13}-[a-z0-9]{6}-[a-z0-9\-]+\.pdf$/i;
const PHOTO_SUFFIX = /^\d{13}-[a-z0-9]{6}-[a-z0-9\-]+\.(jpg|jpeg|png|webp)$/i;

export function isValidSubmissionObjectPath(
  path: string | null,
  kind: "resume" | "photo",
): path is string {
  if (path == null || typeof path !== "string") return false;
  const trimmed = path.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_PATH_LENGTH) return false;
  if (trimmed.includes("..") || trimmed.startsWith("/")) return false;
  const prefix = kind === "resume" ? "resume-" : "photo-";
  if (!trimmed.startsWith(prefix)) return false;
  const suffix = trimmed.slice(prefix.length);
  return kind === "resume"
    ? RESUME_SUFFIX.test(suffix)
    : PHOTO_SUFFIX.test(suffix);
}

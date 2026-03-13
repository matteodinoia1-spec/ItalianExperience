export const SOURCE_VALUES = [
  "public_form",
  "linkedin",
  "facebook",
  "direct_email",
  "job_application",
  "manual_internal",
  "other",
] as const;

export type SourceValue = (typeof SOURCE_VALUES)[number];

export const SOURCE_LABELS: Record<SourceValue, string> = {
  public_form: "Public Form",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  direct_email: "Direct Email",
  job_application: "Job Application",
  manual_internal: "Manual Internal",
  other: "Other",
};

function normalizeRawString(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  return s;
}

/**
 * Normalize legacy / free-text source values into canonical SourceValue.
 * Unknown or empty values are mapped to "other".
 */
export function normalizeSource(raw: unknown): SourceValue {
  const normalized = normalizeRawString(raw);
  if (!normalized) return "other";

  // If already one of the canonical values, keep it.
  if ((SOURCE_VALUES as readonly string[]).includes(normalized)) {
    return normalized as SourceValue;
  }

  // Treat underscores and multiple spaces as equivalent.
  const key = normalized.replace(/[_\s]+/g, " ").trim();

  switch (key) {
    // Public form / website
    case "website public form":
    case "website form":
    case "website":
    case "public form":
      return "public_form";

    // Direct email
    case "email":
    case "direct email":
      return "direct_email";

    // Social
    case "linkedin":
      return "linkedin";
    case "facebook":
    case "instagram":
      return "facebook";

    // Job application
    case "job application":
      return "job_application";

    // Manual / internal
    case "manual":
    case "internal":
    case "manual internal":
      return "manual_internal";

    default:
      return "other";
  }
}

/**
 * Map a source (canonical or legacy) to a polished UI label.
 * Unknown / null values are shown as "Other".
 */
export function sourceToLabel(raw: unknown): string {
  const normalized = normalizeSource(raw);
  return SOURCE_LABELS[normalized] ?? "Other";
}


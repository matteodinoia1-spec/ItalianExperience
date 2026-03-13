import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import {
  CORS_HEADERS,
  jsonResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { normalizeSource } from "../_shared/source.ts";

type SubmissionType = "spontaneous" | "job_offer";

function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function asStringOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function normalizeJsonArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function isValidEmail(email: string): boolean {
  // Simple sanity check, not a full RFC validator
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      error: { message: "Method not allowed", code: "method_not_allowed" },
    });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const userAgent = req.headers.get("user-agent") ?? null;

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await readJsonBody(req);
  } catch {
    return jsonResponse(400, {
      ok: false,
      error: { message: "Invalid or missing JSON body", code: "invalid_json" },
    });
  }

  if (!isRecord(bodyUnknown)) {
    return jsonResponse(400, {
      ok: false,
      error: { message: "Invalid JSON body", code: "bad_request" },
    });
  }

  const main = isRecord(bodyUnknown.main) ? bodyUnknown.main : {};
  const profileChildren = isRecord(bodyUnknown.profile_children)
    ? bodyUnknown.profile_children
    : {};
  const context = isRecord(bodyUnknown.context) ? bodyUnknown.context : {};
  const privacy = isRecord(bodyUnknown.privacy) ? bodyUnknown.privacy : {};
  const files = isRecord(bodyUnknown.files) ? bodyUnknown.files : {};

  const honeypotTop = asStringOrNull(
    (bodyUnknown as Record<string, unknown>).website,
  );
  const honeypotPrivacy = asStringOrNull(
    (privacy as Record<string, unknown>).website,
  );

  const meta = isRecord(bodyUnknown.meta) ? bodyUnknown.meta : {};
  const formStartedAt =
    typeof (meta as Record<string, unknown>).form_started_at === "number"
      ? ((meta as Record<string, unknown>).form_started_at as number)
      : null;
  if (formStartedAt != null) {
    const elapsedMs = Date.now() - formStartedAt;
    if (elapsedMs < 5000) {
      return jsonResponse(400, {
        ok: false,
        error: {
          message:
            "Submission was sent too quickly. Please take your time filling the form and try again.",
          code: "submission_too_fast",
        },
      });
    }
  }

  const firstName = asStringOrNull(main.first_name);
  const lastName = asStringOrNull(main.last_name);
  const email = asStringOrNull(main.email);
  const phone = asStringOrNull(main.phone);

  if (honeypotTop || honeypotPrivacy) {
    return jsonResponse(400, {
      ok: false,
      error: {
        message: "Submission rejected as spam.",
        code: "spam_detected",
      },
    });
  }

  if (!firstName) {
    return jsonResponse(400, {
      ok: false,
      error: {
        message: "main.first_name is required",
        code: "missing_first_name",
      },
    });
  }
  if (!lastName) {
    return jsonResponse(400, {
      ok: false,
      error: {
        message: "main.last_name is required",
        code: "missing_last_name",
      },
    });
  }

  if (!email && !phone) {
    return jsonResponse(400, {
      ok: false,
      error: {
        message: "At least one contact (email or phone) is required",
        code: "missing_contact",
      },
    });
  }

  if (email && !isValidEmail(email)) {
    return jsonResponse(400, {
      ok: false,
      error: {
        message: "Invalid email address format",
        code: "invalid_email",
      },
    });
  }

  const consentPrivacy = privacy.consent_privacy === true;
  if (!consentPrivacy) {
    return jsonResponse(400, {
      ok: false,
      error: {
        message: "Privacy consent is required",
        code: "privacy_consent_required",
      },
    });
  }

  const submissionTypeRaw = asStringOrNull(context.submission_type);
  if (!submissionTypeRaw) {
    return jsonResponse(400, {
      ok: false,
      error: {
        message: "context.submission_type is required",
        code: "missing_submission_type",
      },
    });
  }

  const allowedTypes: SubmissionType[] = ["spontaneous", "job_offer"];
  if (!allowedTypes.includes(submissionTypeRaw as SubmissionType)) {
    return jsonResponse(400, {
      ok: false,
      error: {
        message: "Invalid submission_type",
        code: "invalid_submission_type",
      },
    });
  }

  const submissionType = submissionTypeRaw as SubmissionType;

  let jobOfferId: string | null = null;
  const jobOfferIdRaw = context.job_offer_id;

  if (submissionType === "job_offer") {
    const jobOfferIdStr = asStringOrNull(jobOfferIdRaw);
    if (!jobOfferIdStr) {
      return jsonResponse(400, {
        ok: false,
        error: {
          message: "job_offer_id is required when submission_type = job_offer",
          code: "missing_job_offer_id",
        },
      });
    }
    jobOfferId = jobOfferIdStr;

    const { data: jobOffer, error: jobOfferErr } = await supabaseAdmin
      .from("job_offers")
      .select("id")
      .eq("id", jobOfferId)
      .maybeSingle();

    if (jobOfferErr) {
      return jsonResponse(500, {
        ok: false,
        error: {
          message: jobOfferErr.message,
          code: "job_offer_lookup_failed",
        },
      });
    }
    if (!jobOffer) {
      return jsonResponse(400, {
        ok: false,
        error: {
          message: "job_offer_id does not reference an existing job offer",
          code: "invalid_job_offer_id",
        },
      });
    }
  } else {
    jobOfferId = null;
  }

  const position = asStringOrNull(main.position);
  const summary = asStringOrNull(main.summary);
  const linkedinUrl = asStringOrNull(main.linkedin_url);
  const address = asStringOrNull(main.address);
  const dateOfBirth = asStringOrNull(main.date_of_birth);

  const experience = normalizeJsonArray(profileChildren.experience);
  const education = normalizeJsonArray(profileChildren.education);
  const skills = normalizeJsonArray(profileChildren.skills);
  const languages = normalizeJsonArray(profileChildren.languages);
  const certifications = normalizeJsonArray(profileChildren.certifications);
  const hobbies = normalizeJsonArray(profileChildren.hobbies);

  const resumePath = asStringOrNull(files.resume_path);
  const photoPath = asStringOrNull(files.photo_path);

  const source = normalizeSource(context.source);

  // Soft duplicate check (pending_review on email / phone)
  if (email) {
    const { data: existingByEmail, error: dupErrEmail } = await supabaseAdmin
      .from("external_candidate_submissions")
      .select("id")
      .eq("status", "pending_review")
      .eq("email", email)
      .limit(1);

    if (dupErrEmail) {
      return jsonResponse(500, {
        ok: false,
        error: {
          message: dupErrEmail.message,
          code: "duplicate_lookup_failed",
        },
      });
    }
    if (existingByEmail && existingByEmail.length > 0) {
      return jsonResponse(409, {
        ok: false,
        error: {
          message:
            "A pending submission already exists for this email address.",
          code: "duplicate_pending_submission",
        },
      });
    }
  }

  if (phone) {
    const { data: existingByPhone, error: dupErrPhone } = await supabaseAdmin
      .from("external_candidate_submissions")
      .select("id")
      .eq("status", "pending_review")
      .eq("phone", phone)
      .limit(1);

    if (dupErrPhone) {
      return jsonResponse(500, {
        ok: false,
        error: {
          message: dupErrPhone.message,
          code: "duplicate_lookup_failed",
        },
      });
    }
    if (existingByPhone && existingByPhone.length > 0) {
      return jsonResponse(409, {
        ok: false,
        error: {
          message:
            "A pending submission already exists for this phone number.",
          code: "duplicate_pending_submission",
        },
      });
    }
  }

  // Throttle extremely recent repeated submissions (same email or phone, any status)
  const recentSince = new Date(Date.now() - 60 * 1000).toISOString();
  if (email) {
    const { data: recentByEmail, error: recentErrEmail } = await supabaseAdmin
      .from("external_candidate_submissions")
      .select("id")
      .eq("email", email)
      .gte("created_at", recentSince)
      .limit(1);

    if (recentErrEmail) {
      return jsonResponse(500, {
        ok: false,
        error: {
          message: recentErrEmail.message,
          code: "duplicate_lookup_failed",
        },
      });
    }
    if (recentByEmail && recentByEmail.length > 0) {
      return jsonResponse(429, {
        ok: false,
        error: {
          message:
            "A submission with this email was sent very recently. Please wait a moment before submitting again.",
          code: "duplicate_recent_submission",
        },
      });
    }
  }
  if (phone) {
    const { data: recentByPhone, error: recentErrPhone } = await supabaseAdmin
      .from("external_candidate_submissions")
      .select("id")
      .eq("phone", phone)
      .gte("created_at", recentSince)
      .limit(1);

    if (recentErrPhone) {
      return jsonResponse(500, {
        ok: false,
        error: {
          message: recentErrPhone.message,
          code: "duplicate_lookup_failed",
        },
      });
    }
    if (recentByPhone && recentByPhone.length > 0) {
      return jsonResponse(429, {
        ok: false,
        error: {
          message:
            "A submission with this phone number was sent very recently. Please wait a moment before submitting again.",
          code: "duplicate_recent_submission",
        },
      });
    }
  }

  const insertPayload = {
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    position,
    summary,
    linkedin_url: linkedinUrl,
    address,
    date_of_birth: dateOfBirth,
    submission_type: submissionType,
    job_offer_id: jobOfferId,
    status: "pending_review" as const,
    source,
    experience_json: experience,
    education_json: education,
    skills_json: skills,
    languages_json: languages,
    certifications_json: certifications,
    hobbies_json: hobbies,
    resume_path: resumePath,
    photo_path: photoPath,
  };

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("external_candidate_submissions")
    .insert(insertPayload)
    .select("id, status")
    .single();

  if (insertErr) {
    return jsonResponse(500, {
      ok: false,
      error: {
        message: insertErr.message,
        code: "submission_insert_failed",
      },
    });
  }

  const submissionId = inserted?.id ?? null;
  const submissionStatus = inserted?.status ?? "pending_review";

  if (!submissionId) {
    return jsonResponse(500, {
      ok: false,
      error: {
        message: "Failed to determine created submission id",
        code: "missing_submission_id",
      },
    });
  }

  const { error: privacyInsertErr } = await supabaseAdmin.from(
    "privacy_consents",
  ).insert({
    candidate_id: null,
    external_submission_id: submissionId,
    consent_type: "privacy_policy",
    consent_given: true,
    policy_version: null,
    consent_text_snapshot: null,
    source,
    ip_address: null,
    user_agent: userAgent,
  });

  if (privacyInsertErr) {
    await supabaseAdmin
      .from("external_candidate_submissions")
      .delete()
      .eq("id", submissionId);

    return jsonResponse(500, {
      ok: false,
      error: {
        message: privacyInsertErr.message,
        code: "privacy_consent_insert_failed",
      },
    });
  }

  return jsonResponse(201, {
    ok: true,
    submission_id: submissionId,
    submission_status: submissionStatus,
    message: "Application submitted successfully.",
  });
});


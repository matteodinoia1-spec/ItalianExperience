import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import {
  CORS_HEADERS,
  getBearerToken,
  jsonResponse,
  readJsonBody,
} from "../_shared/http.ts";
import { requireAdmin } from "../_shared/admin.ts";

type Action =
  | "approve_new_candidate"
  | "link_existing_candidate"
  | "reject_submission";

type SubmissionStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "linked_existing"
  | "converted";

function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function asStringOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function normalizeArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function parseJsonArrayField(v: unknown): unknown[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeSkillItems(v: unknown): Array<{ skill: string | null }> {
  return parseJsonArrayField(v)
    .map((item) => {
      if (typeof item === "string") return { skill: item.trim() || null };
      if (isRecord(item)) return { skill: asStringOrNull(item.skill) };
      return { skill: null };
    })
    .filter((x) => x.skill);
}

function normalizeHobbyItems(v: unknown): Array<{ hobby: string | null }> {
  return parseJsonArrayField(v)
    .map((item) => {
      if (typeof item === "string") return { hobby: item.trim() || null };
      if (isRecord(item)) return { hobby: asStringOrNull(item.hobby) };
      return { hobby: null };
    })
    .filter((x) => x.hobby);
}

function normalizeLanguageItems(
  v: unknown,
): Array<{ language: string | null; level: string | null }> {
  return parseJsonArrayField(v)
    .map((raw) => {
      if (!isRecord(raw)) return { language: null, level: null };
      const language = asStringOrNull(raw.language);
      const level =
        asStringOrNull(raw.level) ?? asStringOrNull(raw.proficiency);
      return { language, level };
    })
    .filter((x) => x.language);
}

function normalizeExperienceItems(v: unknown): Array<Record<string, unknown>> {
  return parseJsonArrayField(v)
    .map((raw) => (isRecord(raw) ? raw : {}))
    .filter((x) => Object.keys(x).length > 0);
}

function normalizeEducationItems(v: unknown): Array<Record<string, unknown>> {
  return parseJsonArrayField(v)
    .map((raw) => (isRecord(raw) ? raw : {}))
    .filter((x) => Object.keys(x).length > 0);
}

function normalizeCertificationItems(
  v: unknown,
): Array<Record<string, unknown>> {
  return parseJsonArrayField(v)
    .map((raw) => (isRecord(raw) ? raw : {}))
    .filter((x) => Object.keys(x).length > 0);
}

function deriveYear(cert: Record<string, unknown>): number | null {
  const yearRaw = cert.year;
  if (yearRaw != null && String(yearRaw).trim() !== "") {
    const n = Number(yearRaw);
    return Number.isFinite(n) ? n : null;
  }
  const issueDate = cert.issue_date;
  if (!issueDate) return null;
  const d = new Date(String(issueDate));
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear();
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

  try {
    const jwt = getBearerToken(req);
    if (!jwt) {
      return jsonResponse(401, {
        ok: false,
        error: { message: "Missing bearer token", code: "missing_auth" },
      });
    }

    console.log("AUTH_HEADER_PRESENT", !!req.headers.get("authorization"));
    console.log("JWT_LENGTH", jwt?.length);

    const admin = await requireAdmin(supabaseAdmin, jwt);

    const body = await readJsonBody(req);
    if (!isRecord(body)) {
      return jsonResponse(400, {
        ok: false,
        error: { message: "Invalid JSON body", code: "bad_request" },
      });
    }

    const submissionId = asStringOrNull(body.submission_id);
    const action = asStringOrNull(body.action) as Action | null;
    const reviewNotes = asStringOrNull(body.review_notes);
    const existingCandidateId = asStringOrNull(body.existing_candidate_id);
    const bodyJobOfferId = asStringOrNull(body.job_offer_id);
    const createApplication = body.create_application === true;

    const allowedActions: Action[] = [
      "approve_new_candidate",
      "link_existing_candidate",
      "reject_submission",
    ];
    if (!submissionId) {
      return jsonResponse(400, {
        ok: false,
        error: {
          message: "submission_id is required",
          code: "missing_submission_id",
        },
      });
    }
    if (!action || !allowedActions.includes(action)) {
      return jsonResponse(400, {
        ok: false,
        error: { message: "Invalid action", code: "invalid_action" },
      });
    }
    if (action === "link_existing_candidate" && !existingCandidateId) {
      return jsonResponse(400, {
        ok: false,
        error: {
          message:
            "existing_candidate_id is required for link_existing_candidate",
          code: "missing_existing_candidate_id",
        },
      });
    }

    const { data: submissionRow, error: submissionErr } = await supabaseAdmin
      .from("external_candidate_submissions")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionErr) {
      return jsonResponse(500, {
        ok: false,
        error: {
          message: submissionErr.message,
          code: "submission_lookup_failed",
        },
      });
    }
    if (!submissionRow) {
      return jsonResponse(404, {
        ok: false,
        error: {
          message: "Submission not found",
          code: "submission_not_found",
        },
      });
    }

    const submission = submissionRow as Record<string, unknown> & {
      status?: SubmissionStatus;
    };

    if (submission.status !== "pending_review") {
      return jsonResponse(400, {
        ok: false,
        error: {
          message: "Submission is not in pending_review state",
          code: "invalid_submission_state",
        },
        current_status: submission.status ?? null,
      });
    }

    const reviewedAt = new Date().toISOString();

    let linkedCandidateId: string | null = null;
    let createdCandidateId: string | null = null;
    let createdAssociationId: string | null = null;
    let submissionStatus: SubmissionStatus;

    if (action === "reject_submission") {
      submissionStatus = "rejected";
      const { error: updErr } = await supabaseAdmin
        .from("external_candidate_submissions")
        .update({
          linked_candidate_id: null,
          status: submissionStatus,
          reviewed_by: admin.userId,
          reviewed_at: reviewedAt,
          review_notes: reviewNotes,
        })
        .eq("id", submissionId);

      if (updErr) {
        return jsonResponse(500, {
          ok: false,
          error: {
            message: updErr.message,
            code: "submission_update_failed",
          },
        });
      }

      return jsonResponse(200, {
        ok: true,
        action,
        submission_id: submissionId,
        submission_status: submissionStatus,
        linked_candidate_id: null,
        created_candidate_id: null,
        created_association_id: null,
      });
    }

    const submissionEmail = asStringOrNull(submission.email);
    const submissionPhone = asStringOrNull(submission.phone);

    if (action === "approve_new_candidate") {
      // Minimal duplicate candidate check by email / phone
      if (submissionEmail) {
        const { data: existingByEmail, error: dupErr } = await supabaseAdmin
          .from("candidates")
          .select("id")
          .eq("email", submissionEmail)
          .maybeSingle();
        if (dupErr) {
          return jsonResponse(500, {
            ok: false,
            error: {
              message: dupErr.message,
              code: "duplicate_lookup_failed",
            },
          });
        }
        if (existingByEmail) {
          return jsonResponse(409, {
            ok: false,
            error: {
              message: "Possible duplicate candidate found (email match).",
              code: "candidate_possible_duplicate",
            },
            duplicate_candidate_id: existingByEmail.id,
          });
        }
      } else if (submissionPhone) {
        const { data: existingByPhone, error: dupErr } = await supabaseAdmin
          .from("candidates")
          .select("id")
          .eq("phone", submissionPhone)
          .maybeSingle();
        if (dupErr) {
          return jsonResponse(500, {
            ok: false,
            error: {
              message: dupErr.message,
              code: "duplicate_lookup_failed",
            },
          });
        }
        if (existingByPhone) {
          return jsonResponse(409, {
            ok: false,
            error: {
              message: "Possible duplicate candidate found (phone match).",
              code: "candidate_possible_duplicate",
            },
            duplicate_candidate_id: existingByPhone.id,
          });
        }
      }

      submissionStatus = "converted";

      const candidateInsert = {
        created_by: admin.userId,
        first_name: asStringOrNull(submission.first_name) ?? "",
        last_name: asStringOrNull(submission.last_name) ?? "",
        position: asStringOrNull(submission.position),
        address: asStringOrNull(submission.address),
        status: "approved" as const,
        source: asStringOrNull(submission.source),
        notes: null as string | null,
        email: submissionEmail,
        phone: submissionPhone,
        linkedin_url: asStringOrNull(submission.linkedin_url),
        date_of_birth: submission.date_of_birth ?? null,
        summary: asStringOrNull(submission.summary),
        is_archived: false,
      };

      const { data: newCandidate, error: newCandErr } = await supabaseAdmin
        .from("candidates")
        .insert(candidateInsert)
        .select("id")
        .single();

      if (newCandErr) {
        return jsonResponse(500, {
          ok: false,
          error: {
            message: newCandErr.message,
            code: "candidate_create_failed",
          },
        });
      }

      createdCandidateId = newCandidate?.id ? String(newCandidate.id) : null;
      linkedCandidateId = createdCandidateId;

      const skills = normalizeSkillItems(submission.skills_json);
      if (skills.length && createdCandidateId) {
        const { error } = await supabaseAdmin.from("candidate_skills").insert(
          skills.map((s) => ({
            candidate_id: createdCandidateId,
            skill: s.skill,
            created_by: admin.userId,
          })),
        );
        if (error) {
          return jsonResponse(500, {
            ok: false,
            error: {
              message: error.message,
              code: "skills_insert_failed",
            },
          });
        }
      }

      const languages = normalizeLanguageItems(submission.languages_json);
      if (languages.length && createdCandidateId) {
        const { error } = await supabaseAdmin
          .from("candidate_languages")
          .insert(
            languages.map((l) => ({
              candidate_id: createdCandidateId,
              language: l.language,
              level: l.level,
              created_by: admin.userId,
            })),
          );
        if (error) {
          return jsonResponse(500, {
            ok: false,
            error: {
              message: error.message,
              code: "languages_insert_failed",
            },
          });
        }
      }

      const experience = normalizeExperienceItems(submission.experience_json);
      if (experience.length && createdCandidateId) {
        const rows = experience.map((exp) => ({
          candidate_id: createdCandidateId,
          title: asStringOrNull(exp.title),
          company: asStringOrNull(exp.company),
          location: asStringOrNull(exp.location),
          start_date: exp.start_date ?? null,
          end_date: exp.end_date ?? null,
          description: asStringOrNull(exp.description),
        }));
        const { error } = await supabaseAdmin
          .from("candidate_experience")
          .insert(rows);
        if (error) {
          return jsonResponse(500, {
            ok: false,
            error: {
              message: error.message,
              code: "experience_insert_failed",
            },
          });
        }
      }

      const education = normalizeEducationItems(submission.education_json);
      if (education.length && createdCandidateId) {
        const rows = education.map((edu) => ({
          candidate_id: createdCandidateId,
          created_by: admin.userId,
          institution: asStringOrNull(edu.institution),
          degree: asStringOrNull(edu.degree),
          start_year:
            edu.start_year != null ? Number(edu.start_year) || null : null,
          end_year:
            edu.end_year != null ? Number(edu.end_year) || null : null,
          description: asStringOrNull(edu.description),
        }));
        const { error } = await supabaseAdmin
          .from("candidate_education")
          .insert(rows);
        if (error) {
          return jsonResponse(500, {
            ok: false,
            error: {
              message: error.message,
              code: "education_insert_failed",
            },
          });
        }
      }

      const certs = normalizeCertificationItems(submission.certifications_json);
      if (certs.length && createdCandidateId) {
        const rows = certs.map((c) => ({
          candidate_id: createdCandidateId,
          created_by: admin.userId,
          name: asStringOrNull(c.name),
          issuer: asStringOrNull(c.issuer),
          year: deriveYear(c),
        }));
        const { error } = await supabaseAdmin
          .from("candidate_certifications")
          .insert(rows);
        if (error) {
          return jsonResponse(500, {
            ok: false,
            error: {
              message: error.message,
              code: "certifications_insert_failed",
            },
          });
        }
      }

      const hobbies = normalizeHobbyItems(submission.hobbies_json);
      if (hobbies.length && createdCandidateId) {
        const { error } = await supabaseAdmin
          .from("candidate_hobbies")
          .insert(
            hobbies.map((h) => ({
              candidate_id: createdCandidateId,
              hobby: h.hobby,
              created_by: admin.userId,
            })),
          );
        if (error) {
          return jsonResponse(500, {
            ok: false,
            error: {
              message: error.message,
              code: "hobbies_insert_failed",
            },
          });
        }
      }

      if (createApplication && createdCandidateId) {
        const submissionJobOfferId = asStringOrNull(submission.job_offer_id);
        const effectiveJobOfferId =
          submissionJobOfferId ?? bodyJobOfferId ?? null;
        if (!effectiveJobOfferId) {
          return jsonResponse(400, {
            ok: false,
            error: {
              message:
                "job_offer_id is required when create_application = true",
              code: "missing_job_offer_id",
            },
          });
        }

        const { data: existingAssoc, error: assocCheckErr } = await supabaseAdmin
          .from("candidate_job_associations")
          .select("id, status")
          .eq("candidate_id", createdCandidateId)
          .eq("job_offer_id", effectiveJobOfferId)
          .not("status", "in", "(rejected,withdrawn,not_selected)")
          .maybeSingle();

        if (assocCheckErr) {
          return jsonResponse(500, {
            ok: false,
            error: {
              message: assocCheckErr.message,
              code: "association_duplicate_check_failed",
            },
          });
        }
        if (existingAssoc) {
          return jsonResponse(409, {
            ok: false,
            error: {
              message:
                "This candidate already has an active application for this job offer.",
              code: "DUPLICATE_APPLICATION",
            },
          });
        }

        const { data: assoc, error: assocErr } = await supabaseAdmin
          .from("candidate_job_associations")
          .insert({
            candidate_id: createdCandidateId,
            job_offer_id: effectiveJobOfferId,
            status: "applied",
            notes: null,
            created_by: admin.userId,
          })
          .select("id")
          .single();

        if (assocErr) {
          return jsonResponse(500, {
            ok: false,
            error: {
              message: assocErr.message,
              code: "association_create_failed",
            },
          });
        }
        createdAssociationId = assoc?.id ? String(assoc.id) : null;
      }

      const { error: submissionUpdateErr } = await supabaseAdmin
        .from("external_candidate_submissions")
        .update({
          linked_candidate_id: createdCandidateId,
          status: submissionStatus,
          reviewed_by: admin.userId,
          reviewed_at: reviewedAt,
          review_notes: reviewNotes,
        })
        .eq("id", submissionId);

      if (submissionUpdateErr) {
        return jsonResponse(500, {
          ok: false,
          error: {
            message: submissionUpdateErr.message,
            code: "submission_update_failed",
          },
        });
      }

      return jsonResponse(200, {
        ok: true,
        action,
        submission_id: submissionId,
        submission_status: submissionStatus,
        linked_candidate_id: linkedCandidateId,
        created_candidate_id: createdCandidateId,
        created_association_id: createdAssociationId,
      });
    }

    // link_existing_candidate
    const { data: candidateRow, error: candErr } = await supabaseAdmin
      .from("candidates")
      .select("id")
      .eq("id", existingCandidateId!)
      .maybeSingle();

    if (candErr) {
      return jsonResponse(500, {
        ok: false,
        error: {
          message: candErr.message,
          code: "candidate_lookup_failed",
        },
      });
    }
    if (!candidateRow) {
      return jsonResponse(404, {
        ok: false,
        error: { message: "Candidate not found", code: "candidate_not_found" },
      });
    }

    linkedCandidateId = String(candidateRow.id);
    submissionStatus = "linked_existing";

    if (createApplication) {
      const submissionJobOfferId = asStringOrNull(submission.job_offer_id);
      const effectiveJobOfferId =
        submissionJobOfferId ?? bodyJobOfferId ?? null;
      if (!effectiveJobOfferId) {
        return jsonResponse(400, {
          ok: false,
          error: {
            message: "job_offer_id is required when create_application = true",
            code: "missing_job_offer_id",
          },
        });
      }

      const { data: existingAssoc, error: assocCheckErr } = await supabaseAdmin
        .from("candidate_job_associations")
        .select("id, status")
        .eq("candidate_id", linkedCandidateId)
        .eq("job_offer_id", effectiveJobOfferId)
        .not("status", "in", "(rejected,withdrawn,not_selected)")
        .maybeSingle();

      if (assocCheckErr) {
        return jsonResponse(500, {
          ok: false,
          error: {
            message: assocCheckErr.message,
            code: "association_duplicate_check_failed",
          },
        });
      }
      if (existingAssoc) {
        return jsonResponse(409, {
          ok: false,
          error: {
            message:
              "This candidate already has an active application for this job offer.",
            code: "DUPLICATE_APPLICATION",
          },
        });
      }

      const { data: assoc, error: assocErr } = await supabaseAdmin
        .from("candidate_job_associations")
        .insert({
          candidate_id: linkedCandidateId,
          job_offer_id: effectiveJobOfferId,
          status: "applied",
          notes: null,
          created_by: admin.userId,
        })
        .select("id")
        .single();

      if (assocErr) {
        return jsonResponse(500, {
          ok: false,
          error: {
            message: assocErr.message,
            code: "association_create_failed",
          },
        });
      }
      createdAssociationId = assoc?.id ? String(assoc.id) : null;
    }

    const { error: updErr } = await supabaseAdmin
      .from("external_candidate_submissions")
      .update({
        linked_candidate_id: linkedCandidateId,
        status: submissionStatus,
        reviewed_by: admin.userId,
        reviewed_at: reviewedAt,
        review_notes: reviewNotes,
      })
      .eq("id", submissionId);

    if (updErr) {
      return jsonResponse(500, {
        ok: false,
        error: {
          message: updErr.message,
          code: "submission_update_failed",
        },
      });
    }

    return jsonResponse(200, {
      ok: true,
      action,
      submission_id: submissionId,
      submission_status: submissionStatus,
      linked_candidate_id: linkedCandidateId,
      created_candidate_id: null,
      created_association_id: createdAssociationId,
    });
  } catch (e) {
    const err = e as { message?: string; status?: number };
    const status =
      err?.status && Number.isFinite(err.status) ? (err.status as number) : 500;
    const message = err?.message || "Unexpected error";
    return jsonResponse(status, {
      ok: false,
      error: { message, code: "unexpected_error" },
    });
  }
});


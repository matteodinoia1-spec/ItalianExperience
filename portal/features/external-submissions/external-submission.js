(function () {
  "use strict";

  function getParamId() {
    var params = new URLSearchParams(window.location.search || "");
    var id = params.get("id");
    return id ? id.toString() : null;
  }

  function formatDateTime(value) {
    if (
      window.ExternalSubmissionFormatters &&
      typeof window.ExternalSubmissionFormatters.formatDateTime === "function"
    ) {
      return window.ExternalSubmissionFormatters.formatDateTime(value) || "";
    }
    if (!value) return "";
    try {
      var d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("it-IT");
    } catch (_) {
      return "";
    }
  }

  function formatStatus(status) {
    var s = (status || "").toString().toLowerCase();
    if (!s) return "pending_review";
    return s;
  }

  function formatStatusLabel(status) {
    var s = formatStatus(status);
    switch (s) {
      case "pending_review":
        return "Pending Review";
      case "rejected":
        return "Rejected";
      case "linked_existing":
        return "Linked to Existing";
      case "converted":
        return "Converted";
      default:
        return s;
    }
  }

  function getStatusBadgeClass(status) {
    var s = formatStatus(status);
    if (s === "pending_review") return "badge-open";
    if (s === "converted") return "badge-hired";
    if (s === "linked_existing") return "badge-inprogress";
    if (s === "rejected") return "badge-rejected";
    return "badge-open";
  }

  /**
   * Human-readable label for title/breadcrumb: "FirstName LastName" if either
   * first_name or last_name exists; otherwise "Submission <id>".
   */
  function getSubmissionDisplayLabel(submission) {
    if (!submission) return "Submission";
    var first = (submission.first_name || "").toString().trim();
    var last = (submission.last_name || "").toString().trim();
    var name = (first + " " + last).trim();
    if (name) return name;
    var id = submission.id != null ? String(submission.id) : "";
    return id ? "Submission " + id : "Submission";
  }

  function buildJobOfferBadge(submission) {
    var jobOfferId = submission && submission.job_offer_id;
    if (!jobOfferId) {
      return '<span class="ie-text-muted text-xs">No offer attached</span>';
    }
    var href;
    if (
      window.IEPortal &&
      window.IEPortal.links &&
      typeof window.IEPortal.links.offerView === "function"
    ) {
      href = window.IEPortal.links.offerView(jobOfferId);
    } else {
      href =
        "job-offer.html?id=" + encodeURIComponent(String(jobOfferId));
    }
    return (
      '<a href="' +
      href +
      '" class="badge badge-open inline-flex items-center gap-1 text-xs" data-action="open-job-offer" data-id="' +
      String(jobOfferId) +
      '">Job Offer<span class="hidden sm:inline">#' +
      String(jobOfferId) +
      "</span></a>"
    );
  }

  function renderHeader(submission) {
    var displayLabel = getSubmissionDisplayLabel(submission);
    var headerNameEl = document.querySelector(
      "[data-field=\"submission-name\"]"
    );
    if (headerNameEl) {
      headerNameEl.textContent = displayLabel;
    }
    var fullName = submission.full_name_computed || "—";

    var statusNorm = formatStatus(submission.status);
    var statusLabel = formatStatusLabel(statusNorm);
    var statusBadgeEl = document.querySelector(
      "[data-field=\"submission-status-badge\"]"
    );
    var statusLabelEl = document.querySelector(
      "[data-field=\"submission-status-label\"]"
    );
    if (statusBadgeEl && statusLabelEl) {
      var cls =
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border " +
        (statusNorm === "pending_review"
          ? "bg-amber-50 text-amber-800 border-amber-100"
          : statusNorm === "rejected"
          ? "bg-rose-50 text-rose-800 border-rose-100"
          : "bg-emerald-50 text-emerald-800 border-emerald-100");
      statusBadgeEl.className = cls;
      statusLabelEl.textContent = statusLabel;
    }

    var createdAtEl = document.querySelector(
      "[data-field=\"submission-created-at\"]"
    );
    if (createdAtEl) {
      createdAtEl.textContent = formatDateTime(submission.created_at) || "—";
    }

    var typeLabelEl = document.querySelector(
      "[data-field=\"submission-type-label\"]"
    );
    if (typeLabelEl) {
      typeLabelEl.textContent =
        submission.submission_type ||
        submission.submission_source ||
        "External submission";
    }

    var sourceLineEl = document.querySelector(
      "[data-field=\"submission-source-line\"]"
    );
    if (sourceLineEl) {
      var sourceLabel = (submission.source || "—").toString();
      sourceLineEl.textContent = "Source: " + sourceLabel;
    }

    var fullNameField = document.querySelector(
      "[data-field=\"full_name\"]"
    );
    if (fullNameField) {
      fullNameField.textContent = fullName;
    }

    var emailLink = document.querySelector(
      "[data-field=\"email-link\"]"
    );
    if (emailLink) {
      var email = (submission.email || "").toString().trim();
      if (email) {
        emailLink.href = "mailto:" + email;
        emailLink.textContent = email;
      } else {
        emailLink.removeAttribute("href");
        emailLink.textContent = "No email provided";
      }
    }

    var phoneEl = document.querySelector("[data-field=\"phone\"]");
    if (phoneEl) {
      var phone = (submission.phone || "").toString().trim();
      phoneEl.textContent = phone || "No phone number";
    }

    var linkedinEl = document.querySelector(
      "[data-field=\"linkedin-url\"]"
    );
    if (linkedinEl) {
      var linkedin = (submission.linkedin_url || "").toString().trim();
      if (linkedin && /^https?:\/\//i.test(linkedin)) {
        linkedinEl.href = linkedin;
        linkedinEl.textContent = linkedin;
      } else if (linkedin) {
        linkedinEl.removeAttribute("href");
        linkedinEl.textContent = linkedin;
      } else {
        linkedinEl.removeAttribute("href");
        linkedinEl.textContent = "No LinkedIn provided";
      }
    }

    var sourceEl = document.querySelector("[data-field=\"source\"]");
    if (sourceEl) {
      sourceEl.textContent = submission.source || "—";
    }

    var typeEl = document.querySelector(
      "[data-field=\"submission_type\"]"
    );
    if (typeEl) {
      typeEl.textContent =
        submission.submission_type || submission.submission_source || "—";
    }

    var jobOfferBadgeEl = document.querySelector(
      "[data-field=\"job-offer-badge\"]"
    );
    if (jobOfferBadgeEl) {
      jobOfferBadgeEl.innerHTML = buildJobOfferBadge(submission);
    }

    var summaryEl = document.querySelector("[data-field=\"summary\"]");
    if (summaryEl) {
      summaryEl.textContent = submission.summary || "—";
    }

    var reviewMetaContainer = document.querySelector(
      "[data-field=\"review-meta\"]"
    );
    var readOnlyBadge = document.querySelector(
      "[data-field=\"read-only-badge\"]"
    );
    var reviewedAtEl = document.querySelector(
      "[data-field=\"reviewed-at\"]"
    );
    var reviewedByLabelEl = document.querySelector(
      "[data-field=\"reviewed-by-label\"]"
    );
    var reviewNotesLine = document.querySelector(
      "[data-field=\"review-notes-line\"]"
    );

    var reviewedAt = submission.reviewed_at || null;
    var reviewedBy = submission.reviewed_by || null;
    var reviewNotes = submission.review_notes || null;

    var isPending = statusNorm === "pending_review";

    if (isPending) {
      if (reviewMetaContainer) {
        reviewMetaContainer.hidden = !reviewedAt && !reviewNotes;
      }
      if (readOnlyBadge) {
        readOnlyBadge.classList.add("hidden");
      }
    } else {
      if (reviewMetaContainer) {
        reviewMetaContainer.hidden = false;
      }
      if (readOnlyBadge) {
        readOnlyBadge.classList.remove("hidden");
      }
    }

    if (reviewedAtEl) {
      reviewedAtEl.textContent =
        reviewedAt ? formatDateTime(reviewedAt) : "—";
    }
    if (reviewedByLabelEl) {
      reviewedByLabelEl.textContent = reviewedBy
        ? "(by admin)"
        : "(review origin not tracked)";
    }
    if (reviewNotesLine) {
      if (reviewNotes) {
        reviewNotesLine.textContent = reviewNotes;
        reviewNotesLine.classList.remove("text-gray-400", "italic");
      } else {
        reviewNotesLine.textContent = "No review notes recorded.";
        reviewNotesLine.classList.add("text-gray-400", "italic");
      }
    }
  }

  function renderStructuredSections(submission) {
    var fmt = window.ExternalSubmissionFormatters;
    if (!fmt) return;

    function renderItems(sectionName, items, renderer) {
      var container = document.querySelector(
        '[data-section="' + sectionName + '"]'
      );
      var emptyEl = document.querySelector(
        '[data-empty="' + sectionName + '"]'
      );
      if (!container || !emptyEl) return;
      container.innerHTML = "";
      var list = Array.isArray(items) ? items : [];
      if (!list.length) {
        emptyEl.style.display = "";
        return;
      }
      emptyEl.style.display = "none";
      list.forEach(function (item) {
        var el = renderer(item);
        if (el) container.appendChild(el);
      });
    }

    var expItems = fmt.formatExperienceItems(submission.experience_json);
    renderItems("experience", expItems, function (item) {
      var card = document.createElement("div");
      card.className =
        "border border-gray-100 rounded-2xl p-4 space-y-1 text-xs text-gray-800";
      var titleRow = document.createElement("div");
      titleRow.className =
        "flex flex-wrap items-baseline justify-between gap-2";

      var left = document.createElement("div");
      var titleEl = document.createElement("p");
      titleEl.className = "font-semibold text-sm text-gray-900";
      titleEl.textContent = item.title || "Role";
      left.appendChild(titleEl);
      if (item.company) {
        var companyEl = document.createElement("p");
        companyEl.className = "text-xs text-gray-500";
        companyEl.textContent = item.company;
        left.appendChild(companyEl);
      }

      var right = document.createElement("div");
      right.className = "text-xs text-gray-500 text-right space-y-1";
      if (item.location) {
        var locEl = document.createElement("p");
        locEl.textContent = item.location;
        right.appendChild(locEl);
      }

      if (item.start_date || item.end_date) {
        var datesEl = document.createElement("p");
        var start = item.start_date || "";
        var end = item.end_date || "";
        datesEl.textContent =
          start && end ? start + " → " + end : start || end;
        right.appendChild(datesEl);
      }

      titleRow.appendChild(left);
      titleRow.appendChild(right);
      card.appendChild(titleRow);

      if (item.description) {
        var descEl = document.createElement("p");
        descEl.className = "text-xs text-gray-700 whitespace-pre-line";
        descEl.textContent = item.description;
        card.appendChild(descEl);
      }

      return card;
    });

    var eduItems = fmt.formatEducationItems(submission.education_json);
    renderItems("education", eduItems, function (item) {
      var card = document.createElement("div");
      card.className =
        "border border-gray-100 rounded-2xl p-4 space-y-1 text-xs text-gray-800";
      var titleRow = document.createElement("div");
      titleRow.className =
        "flex flex-wrap items-baseline justify-between gap-2";

      var left = document.createElement("div");
      var instEl = document.createElement("p");
      instEl.className = "font-semibold text-sm text-gray-900";
      instEl.textContent = item.institution || "Institution";
      left.appendChild(instEl);

      var degreeParts = [];
      if (item.degree) degreeParts.push(item.degree);
      if (item.field_of_study) degreeParts.push(item.field_of_study);
      if (degreeParts.length) {
        var degEl = document.createElement("p");
        degEl.className = "text-xs text-gray-500";
        degEl.textContent = degreeParts.join(" • ");
        left.appendChild(degEl);
      }

      var right = document.createElement("div");
      right.className = "text-xs text-gray-500 text-right";
      if (item.start_year || item.end_year) {
        var yearsEl = document.createElement("p");
        yearsEl.textContent =
          item.start_year && item.end_year
            ? item.start_year + " → " + item.end_year
            : item.start_year || item.end_year;
        right.appendChild(yearsEl);
      }

      titleRow.appendChild(left);
      titleRow.appendChild(right);
      card.appendChild(titleRow);

      return card;
    });

    var skills = fmt.formatSkills(submission.skills_json);
    (function () {
      var container = document.querySelector('[data-section="skills"]');
      var emptyEl = document.querySelector('[data-empty="skills"]');
      if (!container || !emptyEl) return;
      container.innerHTML = "";
      if (!skills.length) {
        emptyEl.style.display = "";
        return;
      }
      emptyEl.style.display = "none";
      skills.forEach(function (skill) {
        var li = document.createElement("li");
        li.textContent = skill;
        container.appendChild(li);
      });
    })();

    var languages = fmt.formatLanguages(submission.languages_json);
    (function () {
      var container = document.querySelector(
        '[data-section="languages"]'
      );
      var emptyEl = document.querySelector('[data-empty="languages"]');
      if (!container || !emptyEl) return;
      container.innerHTML = "";
      if (!languages.length) {
        emptyEl.style.display = "";
        return;
      }
      emptyEl.style.display = "none";
      languages.forEach(function (lang) {
        var li = document.createElement("li");
        if (lang.language && lang.level) {
          li.textContent = lang.language + " — " + lang.level;
        } else {
          li.textContent = lang.language || lang.level || "";
        }
        container.appendChild(li);
      });
    })();

    var certs = fmt.formatCertifications(submission.certifications_json);
    (function () {
      var container = document.querySelector(
        '[data-section="certifications"]'
      );
      var emptyEl = document.querySelector(
        '[data-empty="certifications"]'
      );
      if (!container || !emptyEl) return;
      container.innerHTML = "";
      if (!certs.length) {
        emptyEl.style.display = "";
        return;
      }
      emptyEl.style.display = "none";
      certs.forEach(function (cert) {
        var li = document.createElement("li");
        var parts = [];
        if (cert.name) parts.push(cert.name);
        if (cert.issuer) parts.push(cert.issuer);
        if (cert.year) parts.push(String(cert.year));
        li.textContent = parts.join(" • ") || "";
        container.appendChild(li);
      });
    })();

    var hobbies = fmt.formatHobbies(submission.hobbies_json);
    (function () {
      var container = document.querySelector('[data-section="hobbies"]');
      var emptyEl = document.querySelector('[data-empty="hobbies"]');
      if (!container || !emptyEl) return;
      container.innerHTML = "";
      if (!hobbies.length) {
        emptyEl.style.display = "";
        return;
      }
      emptyEl.style.display = "none";
      hobbies.forEach(function (hobby) {
        var li = document.createElement("li");
        li.textContent = hobby;
        container.appendChild(li);
      });
    })();
  }

  async function renderFiles(submission) {
    var cvContainer = document.querySelector('[data-field="file-cv"]');
    var extraContainer = document.querySelector(
      '[data-field="file-extra"]'
    );
    if (!cvContainer || !extraContainer) return;

    function makeLink(url, label) {
      var a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "ie-btn ie-btn-primary ie-btn-xs";
      a.textContent = label;
      return a;
    }

    var resumePath = submission.resume_path || null;
    var photoPath = submission.photo_path || null;

    cvContainer.innerHTML = "";
    extraContainer.innerHTML = "";

    if (
      resumePath &&
      window.ExternalSubmissionsApi &&
      typeof window.ExternalSubmissionsApi.createSignedFileUrl === "function"
    ) {
      var resumeUrl =
        (await window.ExternalSubmissionsApi.createSignedFileUrl(
          resumePath
        )) || null;
      if (resumeUrl) {
        cvContainer.appendChild(makeLink(resumeUrl, "Open CV"));
      } else {
        var cvEmpty = document.createElement("p");
        cvEmpty.className = "text-sm text-gray-400 italic";
        cvEmpty.textContent = "No CV file detected";
        cvContainer.appendChild(cvEmpty);
      }
    } else {
      var cvEmpty = document.createElement("p");
      cvEmpty.className = "text-sm text-gray-400 italic";
      cvEmpty.textContent = "No CV file detected";
      cvContainer.appendChild(cvEmpty);
    }

    if (
      photoPath &&
      window.ExternalSubmissionsApi &&
      typeof window.ExternalSubmissionsApi.createSignedFileUrl === "function"
    ) {
      var photoUrl =
        (await window.ExternalSubmissionsApi.createSignedFileUrl(
          photoPath
        )) || null;
      if (photoUrl) {
        extraContainer.appendChild(
          makeLink(photoUrl, "Open Attachment")
        );
      } else {
        var extraEmpty = document.createElement("p");
        extraEmpty.className = "text-sm text-gray-400 italic";
        extraEmpty.textContent = "No additional file detected";
        extraContainer.appendChild(extraEmpty);
      }
    } else {
      var extraEmpty = document.createElement("p");
      extraEmpty.className = "text-sm text-gray-400 italic";
      extraEmpty.textContent = "No additional file detected";
      extraContainer.appendChild(extraEmpty);
    }
  }

  function renderDuplicates(submission, state) {
    var container = document.querySelector("[data-duplicate-list]");
    var emptyEl = document.querySelector("[data-duplicate-empty]");
    if (!container || !emptyEl) return;
    container.innerHTML = "";
    var email = (submission.email || "").toString().trim();
    var phone = (submission.phone || "").toString().trim();

    if (!email && !phone) {
      emptyEl.textContent =
        "Submission has no email or phone — cannot search for duplicates.";
      emptyEl.classList.remove("hidden");
      container.appendChild(emptyEl);
      return;
    }

    emptyEl.textContent = "Searching for possible duplicates…";
    emptyEl.classList.remove("hidden");
    container.appendChild(emptyEl);

    if (
      !window.ExternalSubmissionsApi ||
      typeof window.ExternalSubmissionsApi.searchDuplicateCandidates !==
        "function"
    ) {
      emptyEl.textContent =
        "Duplicate search is not available in this environment.";
      return;
    }

    window.ExternalSubmissionsApi.searchDuplicateCandidates({
      email: email,
      phone: phone,
    }).then(function (result) {
      container.innerHTML = "";
      var rows = Array.isArray(result.data) ? result.data : [];
      if (!rows.length) {
        emptyEl.textContent =
          "No possible duplicates found by email or phone.";
        emptyEl.classList.remove("hidden");
        container.appendChild(emptyEl);
        return;
      }

      emptyEl.classList.add("hidden");

      rows.forEach(function (candidate) {
        var card = document.createElement("button");
        card.type = "button";
        card.className =
          "w-full text-left border border-gray-200 rounded-2xl px-3 py-2.5 text-xs flex items-start justify-between gap-2 hover:border-emerald-300 hover:bg-emerald-50/40 transition";
        card.dataset.candidateId = String(candidate.id);

        function syncSelectionClass() {
          var isSelected =
            state.selectedCandidateId &&
            String(state.selectedCandidateId) === String(candidate.id);
          if (isSelected) {
            card.classList.add(
              "ring-1",
              "ring-emerald-400",
              "bg-emerald-50/70"
            );
          } else {
            card.classList.remove(
              "ring-1",
              "ring-emerald-400",
              "bg-emerald-50/70"
            );
          }
        }

        syncSelectionClass();

        card.addEventListener("click", function () {
          state.selectedCandidateId = String(candidate.id);
          var siblings = container.querySelectorAll(
            "[data-candidate-id]"
          );
          siblings.forEach(function (el) {
            el.classList.remove(
              "ring-1",
              "ring-emerald-400",
              "bg-emerald-50/70"
            );
          });
          syncSelectionClass();
        });

        var main = document.createElement("div");
        main.className = "space-y-0.5";
        var nameEl = document.createElement("p");
        nameEl.className = "font-semibold text-gray-900";
        nameEl.textContent =
          [candidate.first_name, candidate.last_name]
            .filter(Boolean)
            .join(" ") || "—";
        main.appendChild(nameEl);

        if (candidate.email) {
          var emailEl = document.createElement("p");
          emailEl.className = "text-gray-700";
          emailEl.textContent = candidate.email;
          main.appendChild(emailEl);
        }
        if (candidate.phone) {
          var phoneEl = document.createElement("p");
          phoneEl.className = "text-gray-500";
          phoneEl.textContent = candidate.phone;
          main.appendChild(phoneEl);
        }

        var side = document.createElement("div");
        side.className = "flex flex-col items-end gap-1";
        var status = (candidate.status || "").toString().toLowerCase();
        if (status) {
          var badge = document.createElement("span");
          badge.className =
            "badge text-[10px] " +
            (status === "approved"
              ? "badge-hired"
              : status === "pending_review"
              ? "badge-open"
              : "badge-inprogress");
          badge.textContent = status;
          side.appendChild(badge);
        }

        var link = document.createElement("a");
        link.className = "text-[11px] text-[#1b4332] underline";

        var href;
        if (
          window.IEPortal &&
          window.IEPortal.links &&
          typeof window.IEPortal.links.candidateView === "function"
        ) {
          href = window.IEPortal.links.candidateView(candidate.id);
        } else {
          href =
            "candidate.html?id=" +
            encodeURIComponent(String(candidate.id));
        }
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open profile";
        side.appendChild(link);

        card.appendChild(main);
        card.appendChild(side);
        container.appendChild(card);
      });
    });
  }

  function setReadOnlyMode(isReadOnly) {
    var actionsSection = document.getElementById(
      "externalSubmissionActions"
    );
    var reviewNotesInput = document.querySelector(
      "[data-field=\"review-notes-input\"]"
    );
    var createAppToggle = document.querySelector(
      "[data-field=\"create-application-toggle\"]"
    );

    var buttons = actionsSection
      ? actionsSection.querySelectorAll("[data-action]")
      : [];

    if (isReadOnly) {
      if (actionsSection) {
        actionsSection.classList.add("opacity-60");
      }
      if (reviewNotesInput) {
        reviewNotesInput.disabled = true;
      }
      if (createAppToggle) {
        createAppToggle.disabled = true;
      }
      buttons.forEach(function (btn) {
        btn.disabled = true;
      });
    } else {
      if (actionsSection) {
        actionsSection.classList.remove("opacity-60");
      }
      if (reviewNotesInput) {
        reviewNotesInput.disabled = false;
      }
      if (createAppToggle) {
        createAppToggle.disabled = false;
      }
      buttons.forEach(function (btn) {
        btn.disabled = false;
      });
    }
  }

  function wireActions(submission, state) {
    var reviewNotesInput = document.querySelector(
      "[data-field=\"review-notes-input\"]"
    );
    var createAppToggle = document.querySelector(
      "[data-field=\"create-application-toggle\"]"
    );
    var approveBtn = document.querySelector(
      "[data-action=\"approve-new-candidate\"]"
    );
    var linkBtn = document.querySelector(
      "[data-action=\"link-existing-candidate\"]"
    );
    var rejectBtn = document.querySelector(
      "[data-action=\"reject-submission\"]"
    );
    var errorEl = document.querySelector(
      "[data-field=\"actions-error\"]"
    );
    var successEl = document.querySelector(
      "[data-field=\"actions-success\"]"
    );

    var hasJobOffer = !!(submission && submission.job_offer_id);

    if (createAppToggle) {
      if (!hasJobOffer) {
        createAppToggle.checked = false;
        createAppToggle.disabled = true;
        var flexRow = createAppToggle.parentElement;
        var description =
          flexRow && flexRow.nextElementSibling
            ? flexRow.nextElementSibling
            : null;
        var existingHelper =
          description && description.parentNode
            ? Array.prototype.find.call(
                description.parentNode.childNodes,
                function (node) {
                  return (
                    node.nodeType === Node.ELEMENT_NODE &&
                    node.textContent ===
                      "This submission is not attached to a job offer, so an application cannot be created."
                  );
                }
              )
            : null;
        if (!existingHelper) {
          var helper = document.createElement("p");
          helper.className = "mt-1 text-[11px] text-amber-700";
          helper.textContent =
            "This submission is not attached to a job offer, so an application cannot be created.";
          if (description && description.parentNode) {
            description.parentNode.insertBefore(helper, description.nextSibling);
          } else if (flexRow && flexRow.parentNode) {
            flexRow.parentNode.appendChild(helper);
          }
        }
      } else {
        createAppToggle.disabled = false;
      }
    }

    function setMessage(kind, text) {
      if (errorEl) {
        errorEl.classList.add("hidden");
        errorEl.textContent = "";
      }
      if (successEl) {
        successEl.classList.add("hidden");
        successEl.textContent = "";
      }
      if (kind === "error" && errorEl) {
        errorEl.textContent = text;
        errorEl.classList.remove("hidden");
      }
      if (kind === "success" && successEl) {
        successEl.textContent = text;
        successEl.classList.remove("hidden");
      }
    }

    function setSubmitting(isSubmitting) {
      state.isSubmitting = isSubmitting;
      var buttons = [approveBtn, linkBtn, rejectBtn];
      buttons.forEach(function (btn) {
        if (!btn) return;
        btn.disabled = isSubmitting;
      });
      if (reviewNotesInput) {
        reviewNotesInput.disabled = isSubmitting;
      }
      if (createAppToggle) {
        createAppToggle.disabled = isSubmitting || !hasJobOffer;
      }
    }

    function getReviewNotes() {
      return reviewNotesInput && !reviewNotesInput.disabled
        ? reviewNotesInput.value || ""
        : "";
    }

    function getCreateApplicationFlag() {
      if (!hasJobOffer) return false;
      if (!createAppToggle || createAppToggle.disabled) return false;
      return !!createAppToggle.checked;
    }

    async function refreshSubmission() {
      if (
        !window.ExternalSubmissionsApi ||
        typeof window.ExternalSubmissionsApi.fetchSubmissionById !==
          "function"
      ) {
        return;
      }
      var result =
        await window.ExternalSubmissionsApi.fetchSubmissionById(
          submission.id
        );
      if (result && result.data) {
        submission = result.data;
        renderHeader(submission);
        renderStructuredSections(submission);
        await renderFiles(submission);
        renderDuplicates(submission, state);
        var displayLabel = getSubmissionDisplayLabel(submission);
        window.pageMeta = window.pageMeta || {};
        window.pageMeta.title = displayLabel;
        window.pageMeta.subtitle = "Review external candidate submission";
        window.pageMeta.breadcrumbs = [
          { label: "Dashboard", entity: "dashboard" },
          { label: "External Submissions", entity: "external-submissions" },
          { label: displayLabel },
        ];
        document.title = displayLabel + " | External Submission | Italian Experience Recruitment";
        if (window.IEPortal && typeof window.IEPortal.mountPageHeader === "function") {
          window.IEPortal.mountPageHeader();
        }
        var isPending = formatStatus(submission.status) === "pending_review";
        setReadOnlyMode(!isPending);
      }
      try {
        document.body.style.visibility = "visible";
      } catch (_) {}
    }

    if (approveBtn) {
      approveBtn.addEventListener("click", function () {
        if (
          !window.ExternalSubmissionsApi ||
          typeof window.ExternalSubmissionsApi.promoteSubmission !==
            "function"
        ) {
          return;
        }
        setMessage(null, "");
        var payload = {
          submission_id: submission.id,
          action: "approve_new_candidate",
          review_notes: getReviewNotes() || null,
          create_application: hasJobOffer ? getCreateApplicationFlag() : false,
        };
        setSubmitting(true);
        window.ExternalSubmissionsApi.promoteSubmission(payload)
          .then(function (result) {
            if (result.error) {
              setMessage(
                "error",
                (result.error.message ||
                  "Error while approving submission.") + ""
              );
              if (
                window.IESupabase &&
                typeof window.IESupabase.showError === "function"
              ) {
                window.IESupabase.showError(
                  result.error.message ||
                    "Error while approving submission.",
                  "externalSubmissionApprove"
                );
              }
              return;
            }
            setMessage(
              "success",
              "Submission approved and promoted successfully."
            );
            if (
              window.IESupabase &&
              typeof window.IESupabase.showSuccess === "function"
            ) {
              window.IESupabase.showSuccess(
                "Submission approved and promoted successfully."
              );
            }
            refreshSubmission();
          })
          .finally(function () {
            setSubmitting(false);
          });
      });
    }

    if (linkBtn) {
      linkBtn.addEventListener("click", function () {
        if (!state.selectedCandidateId) {
          setMessage(
            "error",
            "Select a candidate from the Possible Duplicates panel before linking."
          );
          return;
        }
        if (
          !window.ExternalSubmissionsApi ||
          typeof window.ExternalSubmissionsApi.promoteSubmission !==
            "function"
        ) {
          return;
        }
        setMessage(null, "");
        var payload = {
          submission_id: submission.id,
          action: "link_existing_candidate",
          existing_candidate_id: state.selectedCandidateId,
          review_notes: getReviewNotes() || null,
          create_application: hasJobOffer ? getCreateApplicationFlag() : false,
        };
        setSubmitting(true);
        window.ExternalSubmissionsApi.promoteSubmission(payload)
          .then(function (result) {
            if (result.error) {
              setMessage(
                "error",
                (result.error.message ||
                  "Error while linking submission to candidate.") + ""
              );
              if (
                window.IESupabase &&
                typeof window.IESupabase.showError === "function"
              ) {
                window.IESupabase.showError(
                  result.error.message ||
                    "Error while linking submission to candidate.",
                  "externalSubmissionLink"
                );
              }
              return;
            }
            setMessage(
              "success",
              "Submission linked to existing candidate successfully."
            );
            if (
              window.IESupabase &&
              typeof window.IESupabase.showSuccess === "function"
            ) {
              window.IESupabase.showSuccess(
                "Submission linked to existing candidate successfully."
              );
            }
            refreshSubmission();
          })
          .finally(function () {
            setSubmitting(false);
          });
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener("click", function () {
        var notes = getReviewNotes();
        if (!notes || !notes.trim()) {
          setMessage(
            "error",
            "Review notes are required when rejecting a submission."
          );
          return;
        }
        if (
          !window.ExternalSubmissionsApi ||
          typeof window.ExternalSubmissionsApi.promoteSubmission !==
            "function"
        ) {
          return;
        }
        setMessage(null, "");
        var payload = {
          submission_id: submission.id,
          action: "reject_submission",
          review_notes: notes,
        };
        setSubmitting(true);
        window.ExternalSubmissionsApi.promoteSubmission(payload)
          .then(function (result) {
            if (result.error) {
              setMessage(
                "error",
                (result.error.message ||
                  "Error while rejecting submission.") + ""
              );
              if (
                window.IESupabase &&
                typeof window.IESupabase.showError === "function"
              ) {
                window.IESupabase.showError(
                  result.error.message ||
                    "Error while rejecting submission.",
                  "externalSubmissionReject"
                );
              }
              return;
            }
            setMessage(
              "success",
              "Submission rejected successfully."
            );
            if (
              window.IESupabase &&
              typeof window.IESupabase.showSuccess === "function"
            ) {
              window.IESupabase.showSuccess(
                "Submission rejected successfully."
              );
            }
            refreshSubmission();
          })
          .finally(function () {
            setSubmitting(false);
          });
      });
    }
  }

  async function loadExternalSubmission() {
    var id = getParamId();
    if (!id) {
      if (
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        window.IERouter.navigateTo("external-submissions.html");
      } else {
        window.location.href = "external-submissions.html";
      }
      return;
    }

    if (
      window.ExternalSubmissionsApi &&
      typeof window.ExternalSubmissionsApi.ensureAuth === "function"
    ) {
      var user =
        await window.ExternalSubmissionsApi.ensureAuth();
      if (!user) return;
    }

    if (
      !window.ExternalSubmissionsApi ||
      typeof window.ExternalSubmissionsApi.fetchSubmissionById !==
        "function"
    ) {
      console.error(
        "[ExternalSubmissionPage] ExternalSubmissionsApi not available"
      );
      try {
        document.body.style.visibility = "visible";
      } catch (_) {}
      return;
    }

    var result =
      await window.ExternalSubmissionsApi.fetchSubmissionById(id);
    if (result.error) {
      console.error(
        "[ExternalSubmissionPage] fetchSubmissionById error:",
        result.error
      );
      try {
        document.body.style.visibility = "visible";
      } catch (_) {}
      return;
    }
    if (!result.data) {
      var root = document.getElementById(
        "externalSubmissionPageRoot"
      );
      if (root) {
        root.innerHTML =
          '<section class="ie-card glass-card p-8 rounded-3xl flex flex-col items-center text-center space-y-4">' +
          '<h2 class="serif text-2xl font-bold text-[#1b4332]">Submission not found</h2>' +
          '<p class="text-sm text-gray-500">The requested external submission could not be found or is not accessible.</p>' +
          '<button type="button" class="ie-btn ie-btn-secondary" data-action="back-to-list">Back to submissions</button>' +
          "</section>";
        var backBtn = root.querySelector("[data-action=\"back-to-list\"]");
        if (backBtn) {
          backBtn.addEventListener("click", function () {
            if (
              window.IERouter &&
              typeof window.IERouter.navigateTo === "function"
            ) {
              window.IERouter.navigateTo("external-submissions.html");
            } else {
              window.location.href = "external-submissions.html";
            }
          });
        }
      }
      try {
        document.body.style.visibility = "visible";
      } catch (_) {}
      return;
    }

    var submission = result.data;
    var state = {
      selectedCandidateId: null,
      isSubmitting: false,
    };

    renderHeader(submission);
    renderStructuredSections(submission);
    await renderFiles(submission);
    renderDuplicates(submission, state);

    var displayLabel = getSubmissionDisplayLabel(submission);
    window.pageMeta = {
      title: displayLabel,
      subtitle: "Review external candidate submission",
      breadcrumbs: [
        { label: "Dashboard", entity: "dashboard" },
        { label: "External Submissions", entity: "external-submissions" },
        { label: displayLabel },
      ],
    };
    document.title = displayLabel + " | External Submission | Italian Experience Recruitment";
    if (window.IEPortal && typeof window.IEPortal.mountPageHeader === "function") {
      window.IEPortal.mountPageHeader();
    }

    var isPending = formatStatus(submission.status) === "pending_review";
    setReadOnlyMode(!isPending);
    if (isPending) {
      wireActions(submission, state);
    }

    try {
      document.body.style.visibility = "visible";
    } catch (_) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadExternalSubmission().catch(function (err) {
      console.error(
        "[ExternalSubmissionPage] loadExternalSubmission exception:",
        err
      );
      try {
        document.body.style.visibility = "visible";
      } catch (_) {}
    });
  });
})();


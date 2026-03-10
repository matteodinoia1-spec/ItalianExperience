(function () {
  "use strict";

  function getRoot() {
    return document.getElementById("candidateProfileRoot");
  }

  function safeString(value) {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function escapeHtml(str) {
    if (str == null) return "";
    var s = String(str);
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function setField(name, value) {
    var elements = document.querySelectorAll('[data-field="' + name + '"]');
    var text = safeString(value).trim() || "—";
    elements.forEach(function (el) {
      if ("value" in el) {
        el.value = text;
      } else {
        el.textContent = text;
      }
    });
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      var d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("it-IT");
    } catch (_) {
      return "";
    }
  }

  function formatMonth(value) {
    if (!value) return "";
    // Expecting YYYY-MM or full ISO. Fallback to date parsing.
    var asDate;
    if (/^\d{4}-\d{2}$/.test(value)) {
      asDate = new Date(value + "-01T00:00:00Z");
    } else {
      asDate = new Date(value);
    }
    if (Number.isNaN(asDate.getTime())) return "";
    return asDate.toLocaleDateString("it-IT", { month: "2-digit", year: "numeric" });
  }

  function formatYear(value) {
    if (!value) return "";
    var n = Number(value);
    if (!n) return safeString(value);
    return String(n);
  }

  function getStatusBadgeClasses(status) {
    var base =
      "px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center justify-center ";
    switch ((status || "").toString()) {
      case "new":
        return (
          base +
          "bg-blue-50 text-blue-700 border-blue-100"
        );
      case "interview":
        return (
          base +
          "bg-amber-50 text-amber-800 border-amber-100"
        );
      case "hired":
        return (
          base +
          "bg-emerald-50 text-emerald-800 border-emerald-100"
        );
      case "rejected":
        return (
          base +
          "bg-rose-50 text-rose-800 border-rose-100"
        );
      default:
        return (
          base +
          "bg-gray-50 text-gray-700 border-gray-200"
        );
    }
  }

  function navigateToCandidates() {
    if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
      window.IERouter.navigateTo("candidates.html");
    } else {
      window.location.href = "candidates.html";
    }
  }

  function renderNotFound() {
    var root = getRoot();
    if (!root) return;
    root.innerHTML = "";
    var card = document.createElement("section");
    card.className = "ie-card glass-card p-8 rounded-3xl flex flex-col items-center text-center space-y-4";
    var title = document.createElement("h2");
    title.className = "serif text-2xl font-bold text-[#1b4332]";
    title.textContent = "Candidate not found";
    var message = document.createElement("p");
    message.className = "text-sm text-gray-500";
    message.textContent =
      "The requested candidate could not be found or is not accessible.";
    var button = document.createElement("button");
    button.type = "button";
    button.className = "ie-btn ie-btn-secondary";
    button.textContent = "Back to candidates";
    button.addEventListener("click", function () {
      navigateToCandidates();
    });
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(button);
    root.appendChild(card);
  }

  async function loadCandidateCore(candidateId) {
    if (!window.IESupabase || !window.IESupabase.getCandidateById) {
      console.error("[Candidate] IESupabase.getCandidateById not available");
      return { candidate: null };
    }
    try {
      var result = await window.IESupabase.getCandidateById(candidateId);
      if (result.error) {
        console.error("[Candidate] getCandidateById error:", result.error);
        if (window.IESupabase.showError) {
          window.IESupabase.showError(
            result.error.message || "Error loading candidate.",
            "candidateProfile"
          );
        }
        return { candidate: null };
      }
      return { candidate: result.data || null };
    } catch (err) {
      console.error("[Candidate] getCandidateById exception:", err);
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError(
          "Unexpected error while loading candidate.",
          "candidateProfile"
        );
      }
      return { candidate: null };
    }
  }

  function renderCandidateCore(candidate, candidateId) {
    var fullName =
      safeString(candidate.first_name).trim() +
      (candidate.last_name ? " " + safeString(candidate.last_name).trim() : "");
    var candidateName = fullName || "Candidate";
    setField("full-name", candidateName || "—");
    window.pageMeta = {
      title: candidateName,
      subtitle: "Candidate profile",
      breadcrumbs: [
        { label: "Dashboard", entity: "dashboard" },
        { label: "Candidates", entity: "candidates" },
        { label: candidateName }
      ]
    };
    if (window.IEPortal && typeof window.IEPortal.mountPageHeader === "function") {
      window.IEPortal.mountPageHeader();
    }
    setField("position", candidate.position || "");
    setField("email", candidate.email || "");
    setField("phone", candidate.phone || "");
    setField("linkedin_url", candidate.linkedin_url || "");
    setField("address", candidate.address || "");
    setField("summary", candidate.summary || "");
    // Internal notes (separate from activity log)
    setField("notes", candidate.notes || "");

    var dobText = candidate.date_of_birth ? formatDate(candidate.date_of_birth) : "";
    setField("date_of_birth", dobText || "");

    // Pipeline status (new / interview / hired / rejected), not availability
    var pipelineStatus = (candidate.status || "new").toString().toLowerCase();
    var statusLabels = { new: "New", interview: "Interview", hired: "Hired", rejected: "Rejected" };
    setField("status-text", statusLabels[pipelineStatus] || pipelineStatus.charAt(0).toUpperCase() + pipelineStatus.slice(1));

    // Buttons
    var editBtn = document.querySelector('[data-action="edit-candidate"]');
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        var target;
        if (window.IEPortal && window.IEPortal.links && window.IEPortal.links.candidateEdit) {
          target = window.IEPortal.links.candidateEdit(candidateId);
        } else {
          target =
            "add-candidate.html?id=" + encodeURIComponent(candidateId) + "&mode=edit";
        }
        if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
          window.IERouter.navigateTo(target);
        } else {
          window.location.href = target;
        }
      });
    }

    var backBtn = document.querySelector('[data-action="back-to-list"]');
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        navigateToCandidates();
      });
    }
  }

  function applyAvailabilityToHeader(availability) {
    var value = (availability || "available").toString();
    var badge = document.querySelector('[data-field="status-badge"]');
    // Only update the hero badge; "Status" in Candidate Information is pipeline status (set in renderCandidateCore)
    if (badge) {
      if ("value" in badge) {
        badge.value = value;
      } else {
        badge.textContent = value;
      }
      badge.className =
        "form-input px-3 py-1 rounded-full text-xs font-semibold w-auto inline-block " +
        (value === "working"
          ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
          : value === "in_process"
          ? "bg-amber-50 text-amber-800 border border-amber-100"
          : "bg-gray-50 text-gray-700 border border-gray-200");
    }
  }

  async function renderDocuments(candidate) {
    if (!candidate) return;
    var photoEl = document.querySelector("[data-doc-photo]");
    var photoEmptyEl = document.querySelector('[data-doc-empty="photo"]');
    var cvLinkEl = document.querySelector('[data-doc-link="cv"]');
    var cvEmptyEl = document.querySelector('[data-doc-empty="cv"]');

    // CV
    if (cvLinkEl && cvEmptyEl) {
      if (candidate.cv_url && window.IESupabase && window.IESupabase.createSignedCandidateUrl) {
        try {
          var signedCv = await window.IESupabase.createSignedCandidateUrl(candidate.cv_url);
          if (signedCv) {
            cvLinkEl.href = signedCv;
            cvLinkEl.classList.remove("hidden");
            cvEmptyEl.style.display = "none";
          }
        } catch (err) {
          console.error("[Candidate] CV signed URL error:", err);
        }
      }
    }

    // Photo
    if (photoEl && photoEmptyEl) {
      var hasPhoto = !!candidate.photo_url;
      var fallbackName =
        (candidate.first_name || "") + " " + (candidate.last_name || "");
      if (hasPhoto && window.IESupabase && window.IESupabase.createSignedCandidateUrl) {
        try {
          var signedPhoto = await window.IESupabase.createSignedCandidateUrl(
            candidate.photo_url
          );
          if (signedPhoto) {
            photoEl.src = signedPhoto;
            photoEmptyEl.style.display = "none";
          }
        } catch (err2) {
          console.error("[Candidate] Photo signed URL error:", err2);
        }
      } else if (fallbackName.trim()) {
        photoEl.src =
          "https://ui-avatars.com/api/?name=" +
          encodeURIComponent(fallbackName.trim()) +
          "&background=1b4332&color=fff";
      }
    }
  }

  async function loadCandidateProfileSections(candidateId) {
    if (!window.IESupabase) return;
    var api = window.IESupabase;

    try {
      var results = await Promise.all([
        api.getCandidateSkills ? api.getCandidateSkills(candidateId) : { data: [] },
        api.getCandidateLanguages ? api.getCandidateLanguages(candidateId) : { data: [] },
        api.getCandidateCertifications
          ? api.getCandidateCertifications(candidateId)
          : { data: [] },
        api.getCandidateExperience
          ? api.getCandidateExperience(candidateId)
          : { data: [] },
        api.getCandidateEducation
          ? api.getCandidateEducation(candidateId)
          : { data: [] },
        api.getCandidateHobbies ? api.getCandidateHobbies(candidateId) : { data: [] },
      ]);

      var skills = (results[0] && results[0].data) || [];
      var languages = (results[1] && results[1].data) || [];
      var certs = (results[2] && results[2].data) || [];
      var experience = (results[3] && results[3].data) || [];
      var education = (results[4] && results[4].data) || [];
      var hobbies = (results[5] && results[5].data) || [];

      renderSimpleList("skills", skills, function (item) {
        return safeString(item.skill || "").trim();
      });

      renderSimpleList("languages", languages, function (item) {
        var name = safeString(item.language || "").trim();
        var level = safeString(item.level || "").trim();
        if (name && level) return name + " — " + level;
        return name || level;
      });

      renderSimpleList("certifications", certs, function (item) {
        var name = safeString(item.name || "").trim();
        var issuer = safeString(item.issuer || "").trim();
        var issueDate = item.issue_date ? formatDate(item.issue_date) : "";
        var expiryDate = item.expiry_date ? formatDate(item.expiry_date) : "";
        var parts = [];
        if (name) parts.push(name);
        if (issuer) parts.push(" — " + issuer);
        var dates = "";
        if (issueDate && expiryDate) {
          dates = issueDate + " → " + expiryDate;
        } else if (issueDate) {
          dates = issueDate;
        } else if (expiryDate) {
          dates = "until " + expiryDate;
        }
        if (dates) parts.push(" (" + dates + ")");
        return parts.join("");
      });

      renderExperience(experience);
      renderEducation(education);
      renderSimpleList("hobbies", hobbies, function (item) {
        return safeString(item.hobby || "").trim();
      });
    } catch (err) {
      console.error("[Candidate] loadCandidateProfileSections exception:", err);
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError(
          "Impossibile caricare tutte le sezioni del profilo candidato.",
          "candidateProfileSections"
        );
      }
    }
  }

  function renderSimpleList(sectionName, items, formatter) {
    var listEl = document.querySelector('[data-list="' + sectionName + '"]');
    var emptyEl = document.querySelector('[data-empty="' + sectionName + '"]');
    if (!listEl || !emptyEl) return;

    listEl.innerHTML = "";
    var data = Array.isArray(items) ? items : [];
    if (!data.length) {
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";

    data.forEach(function (item) {
      var text = formatter(item);
      if (!text) return;
      var li = document.createElement("li");
      li.textContent = text;
      listEl.appendChild(li);
    });

    if (!listEl.children.length) {
      emptyEl.style.display = "";
    }
  }

  function renderExperience(items) {
    var container = document.querySelector('[data-list="experience"]');
    var emptyEl = document.querySelector('[data-empty="experience"]');
    if (!container || !emptyEl) return;
    container.innerHTML = "";
    var data = Array.isArray(items) ? items : [];
    if (!data.length) {
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";

    data.forEach(function (item) {
      var card = document.createElement("div");
      card.className = "border border-gray-100 rounded-2xl p-4 space-y-2";

      var titleRow = document.createElement("div");
      titleRow.className = "flex flex-wrap items-baseline justify-between gap-2";

      var left = document.createElement("div");
      var roleTitle = document.createElement("p");
      roleTitle.className = "font-semibold text-sm text-gray-900";
      roleTitle.textContent = safeString(item.title || "Role").trim();
      var company = document.createElement("p");
      company.className = "text-xs text-gray-500";
      company.textContent = safeString(item.company || "").trim();
      left.appendChild(roleTitle);
      if (company.textContent) {
        left.appendChild(company);
      }

      var right = document.createElement("div");
      right.className = "text-xs text-gray-500 text-right space-y-1";
      var location = safeString(item.location || "").trim();
      if (location) {
        var locEl = document.createElement("p");
        locEl.textContent = location;
        right.appendChild(locEl);
      }
      var start = item.start_date ? formatMonth(item.start_date) : "";
      var end = item.end_date ? formatMonth(item.end_date) : "";
      if (start || end) {
        var datesEl = document.createElement("p");
        datesEl.textContent = start && end ? start + " → " + end : start || end;
        right.appendChild(datesEl);
      }

      titleRow.appendChild(left);
      titleRow.appendChild(right);
      card.appendChild(titleRow);

      var desc = safeString(item.description || "").trim();
      if (desc) {
        var descEl = document.createElement("p");
        descEl.className = "text-xs text-gray-700 whitespace-pre-line";
        descEl.textContent = desc;
        card.appendChild(descEl);
      }

      container.appendChild(card);
    });

    if (!container.children.length) {
      emptyEl.style.display = "";
    }
  }

  function renderEducation(items) {
    var container = document.querySelector('[data-list="education"]');
    var emptyEl = document.querySelector('[data-empty="education"]');
    if (!container || !emptyEl) return;
    container.innerHTML = "";
    var data = Array.isArray(items) ? items : [];
    if (!data.length) {
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";

    data.forEach(function (item) {
      var card = document.createElement("div");
      card.className = "border border-gray-100 rounded-2xl p-4 space-y-2";

      var titleRow = document.createElement("div");
      titleRow.className = "flex flex-wrap items-baseline justify-between gap-2";

      var left = document.createElement("div");
      var institution = document.createElement("p");
      institution.className = "font-semibold text-sm text-gray-900";
      institution.textContent = safeString(item.institution || "Institution").trim();
      var degree = document.createElement("p");
      degree.className = "text-xs text-gray-500";
      var degreeParts = [];
      if (item.degree) degreeParts.push(safeString(item.degree).trim());
      if (item.field_of_study) {
        degreeParts.push(safeString(item.field_of_study).trim());
      }
      degree.textContent = degreeParts.join(" • ");
      left.appendChild(institution);
      if (degree.textContent) {
        left.appendChild(degree);
      }

      var right = document.createElement("div");
      right.className = "text-xs text-gray-500 text-right";
      var startYear = item.start_year ? formatYear(item.start_year) : "";
      var endYear = item.end_year ? formatYear(item.end_year) : "";
      if (startYear || endYear) {
        var yearsEl = document.createElement("p");
        yearsEl.textContent =
          startYear && endYear ? startYear + " → " + endYear : startYear || endYear;
        right.appendChild(yearsEl);
      }

      titleRow.appendChild(left);
      titleRow.appendChild(right);
      card.appendChild(titleRow);

      container.appendChild(card);
    });

    if (!container.children.length) {
      emptyEl.style.display = "";
    }
  }

  function setDerivedAvailabilityFromAssociations(applications) {
    var label = "Available";
    if (window.IEPortal && typeof window.IEPortal.computeDerivedAvailability === "function") {
      var state = window.IEPortal.computeDerivedAvailability(applications);
      label = window.IEPortal.formatAvailabilityLabel && typeof window.IEPortal.formatAvailabilityLabel === "function"
        ? window.IEPortal.formatAvailabilityLabel(state)
        : (state === "working" ? "Working" : state === "in_process" ? "In process" : "Available");
    }
    setField("availability-text", label);
  }

  async function renderAssociatedOffers(candidateId) {
    var listEl = document.querySelector('[data-list="associated-offers"]');
    var emptyEl = document.querySelector('[data-empty="associated-offers"]');
    if (!listEl || !emptyEl) return;
    listEl.innerHTML = "";

    if (!window.IESupabase || !window.IESupabase.fetchJobHistoryForCandidate) {
      emptyEl.style.display = "";
      setDerivedAvailabilityFromAssociations([]);
      return;
    }

    try {
      var result = await window.IESupabase.fetchJobHistoryForCandidate(candidateId);
      if (result.error) {
        console.error("[Candidate] fetchJobHistoryForCandidate error:", result.error);
        emptyEl.style.display = "";
        setDerivedAvailabilityFromAssociations([]);
        return;
      }
      var rows = (result.data || []).slice();
      if (!rows.length) {
        emptyEl.style.display = "";
        setDerivedAvailabilityFromAssociations([]);
        return;
      }
      emptyEl.style.display = "none";

      var applications = rows.map(function (row) {
        var assoc = row.association || row;
        return { status: assoc && assoc.status ? assoc.status : null };
      });
      setDerivedAvailabilityFromAssociations(applications);

      rows.forEach(function (row) {
        var assoc = row.association || row; // fallback if already flat
        var offer = row.job_offer || null;

        var tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50/70 cursor-pointer";
        tr.dataset.associationId = assoc && assoc.id ? String(assoc.id) : "";

        var tdOffer = document.createElement("td");
        tdOffer.className = "px-4 py-2 align-top";
        var title = safeString(offer && offer.title ? offer.title : "").trim();
        var position = safeString(offer && offer.position ? offer.position : "").trim();
        var label = title || position || "—";

        if (offer && offer.id) {
          var href;
          if (
            window.IEPortal &&
            window.IEPortal.links &&
            window.IEPortal.links.offerView
          ) {
            href = window.IEPortal.links.offerView(offer.id);
          } else {
            href =
              "add-job-offer.html?id=" + encodeURIComponent(offer.id) + "&mode=view";
          }

          var a = document.createElement("a");
          a.href = href;
          a.className = "text-[#1b4332] font-semibold hover:underline";
          a.textContent = label;

          a.addEventListener("click", function (e) {
            if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
              e.preventDefault();
              window.IERouter.navigateTo(href);
            }
          });

          tdOffer.appendChild(a);
        } else {
          tdOffer.textContent = label;
        }

        var tdClient = document.createElement("td");
        tdClient.className = "px-4 py-2 align-top text-gray-700";
        tdClient.textContent =
          safeString(offer && offer.client_name ? offer.client_name : "").trim() || "—";

        var tdStatus = document.createElement("td");
        tdStatus.className = "px-4 py-2 align-top";
        var rawStatus = (assoc && assoc.status) || (offer && offer.status) || "";
        var badge = document.createElement("span");
        if (window.IEPortal && typeof window.IEPortal.getApplicationStatusBadgeClass === "function") {
          var normalized = window.IEPortal.normalizeApplicationStatusForDisplay(rawStatus || "applied");
          badge.className = "badge " + window.IEPortal.getApplicationStatusBadgeClass(normalized);
          badge.textContent = window.IEPortal.formatApplicationStatusLabel(normalized);
        } else {
          badge.className = getStatusBadgeClasses(rawStatus || "new");
          badge.textContent = rawStatus || "new";
        }
        tdStatus.appendChild(badge);

        var tdDate = document.createElement("td");
        tdDate.className = "px-4 py-2 align-top text-gray-700";
        var applied = assoc && assoc.created_at ? formatDate(assoc.created_at) : "";
        tdDate.textContent = applied || "—";

        tr.appendChild(tdOffer);
        tr.appendChild(tdClient);
        tr.appendChild(tdStatus);
        tr.appendChild(tdDate);

        tr.addEventListener("click", function (event) {
          var target = event.target;
          if (target.closest("a, button")) {
            return;
          }
          var id = tr.dataset.associationId;
          if (!id) return;
          var href = "application.html?id=" + encodeURIComponent(id);
          if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
            window.IERouter.navigateTo(href);
          } else {
            window.location.href = href;
          }
        });

        listEl.appendChild(tr);
      });
    } catch (err) {
      console.error("[Candidate] renderAssociatedOffers exception:", err);
      emptyEl.style.display = "";
    }
  }

  async function loadCandidateLogs(candidateId) {
    if (!candidateId) return;

    var list = document.getElementById("candidateLogList");
    var empty = document.getElementById("candidateLogEmpty");
    if (!list) return;

    list.innerHTML = "";
    if (empty) {
      empty.classList.add("hidden");
    }

    if (typeof window === "undefined" || !window.IESupabase) {
      return;
    }

    var logs = [];
    try {
      if (typeof window.IESupabase.fetchEntityLogs === "function") {
        var result = await window.IESupabase.fetchEntityLogs("candidate", candidateId);
        logs = (result && result.data) || [];
      } else if (typeof window.IESupabase.fetchLogs === "function") {
        var result2 = await window.IESupabase.fetchLogs("candidate", candidateId, { full: true });
        logs = (result2 && result2.data && result2.data.logs) || [];
      } else {
        return;
      }
    } catch (err) {
      console.error("[Candidate] loadCandidateLogs exception:", err);
      return;
    }

    if (!Array.isArray(logs) || !logs.length) {
      if (empty) {
        empty.classList.remove("hidden");
      }
      return;
    }

    function safeToLocaleString(isoDateString) {
      if (!isoDateString) return "";
      try {
        return new Date(isoDateString).toLocaleString();
      } catch (_) {
        return String(isoDateString);
      }
    }

    function getDisplayNameForLog(log) {
      if (!log) return "—";
      var p = log.created_by_profile;
      if (p && (p.first_name || p.last_name)) {
        var name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
        if (name) return name;
      }
      if (log.created_by) return String(log.created_by).slice(0, 8) + "…";
      return "—";
    }

    logs.forEach(function (log) {
      var item = document.createElement("div");
      item.className = "activity-item";

      var dot = document.createElement("div");
      dot.className = "activity-item__dot";
      item.appendChild(dot);

      var content = document.createElement("div");
      content.className = "activity-item__content";

      var headerRow = document.createElement("div");
      headerRow.className = "activity-item__headerRow";

      var who = document.createElement("span");
      who.className = "activity-item__who";
      who.textContent = getDisplayNameForLog(log);
      headerRow.appendChild(who);

      var ts = document.createElement("span");
      ts.className = "activity-item__timestamp";
      ts.textContent = safeToLocaleString(log && log.created_at);
      headerRow.appendChild(ts);

      content.appendChild(headerRow);

      var message = document.createElement("div");
      message.className = "activity-item__message";
      message.textContent = (log && log.message) || "";
      content.appendChild(message);

      var actions = document.createElement("div");
      actions.className = "activity-item__actions";
      content.appendChild(actions);

      item.appendChild(content);
      list.appendChild(item);
    });
  }

  async function loadCandidatePage(candidateId) {
    var core = await loadCandidateCore(candidateId);
    var candidate = core.candidate;
    if (!candidate) {
      renderNotFound();
      return;
    }

    renderCandidateCore(candidate, candidateId);

    // Load applications for availability and associated offers
    var applicationsForAvailability = [];
    try {
      if (
        window.IEQueries &&
        window.IEQueries.applications &&
        typeof window.IEQueries.applications.getApplicationsByCandidate === "function"
      ) {
        var appsResult =
          await window.IEQueries.applications.getApplicationsByCandidate(candidateId);
        if (!appsResult.error && Array.isArray(appsResult.data)) {
          applicationsForAvailability = appsResult.data;
        }
      }
    } catch (err) {
      console.error("[Candidate] getApplicationsByCandidate exception:", err);
    }

    try {
      if (
        window.IEQueries &&
        window.IEQueries.candidates &&
        typeof window.IEQueries.candidates.deriveAvailabilityFromApplications ===
          "function"
      ) {
        var availability =
          window.IEQueries.candidates.deriveAvailabilityFromApplications(
            applicationsForAvailability
          );
        applyAvailabilityToHeader(availability);
      } else {
        applyAvailabilityToHeader("available");
      }
    } catch (err2) {
      console.error("[Candidate] availability derivation exception:", err2);
      applyAvailabilityToHeader("available");
    }

    // Lifecycle toolbar wiring for candidate profile (view mode only)
    try {
      var lifecycleStatus = candidate && candidate.is_archived ? "archived" : "active";

      function onEdit() {
        var target;
        if (
          window.IEPortal &&
          window.IEPortal.links &&
          typeof window.IEPortal.links.candidateEdit === "function"
        ) {
          target = window.IEPortal.links.candidateEdit(candidateId);
        } else {
          target =
            "add-candidate.html?id=" + encodeURIComponent(candidateId) + "&mode=edit";
        }
        if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
          window.IERouter.navigateTo(target);
        } else {
          window.location.href = target;
        }
      }

      async function onArchive() {
        if (!window.IESupabase || !window.IESupabase.archiveCandidate) return;
        var res = await window.IESupabase.archiveCandidate(candidateId);
        if (!res || res.error) return;

        if (
          typeof window !== "undefined" &&
          window.IESupabase &&
          typeof window.IESupabase.createAutoLog === "function"
        ) {
          window.IESupabase
            .createAutoLog("candidate", candidateId, {
              event_type: "system_event",
              message: "Candidate archived",
              metadata: null,
            })
            .catch(function () {});
        }

        if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
          window.IERouter.navigateTo("candidates.html");
        } else {
          window.location.href = "candidates.html";
        }
      }

      async function onReopen() {
        if (!window.IESupabase || !window.IESupabase.unarchiveCandidate) return;
        var res = await window.IESupabase.unarchiveCandidate(candidateId);
        if (!res || res.error) return;

        candidate.is_archived = false;

        if (
          typeof window !== "undefined" &&
          window.IESupabase &&
          typeof window.IESupabase.createAutoLog === "function"
        ) {
          window.IESupabase
            .createAutoLog("candidate", candidateId, {
              event_type: "system_event",
              message: "Candidate restored",
              metadata: null,
            })
            .catch(function () {});
        }

        if (typeof renderEntityToolbar === "function") {
          renderEntityToolbar({
            entityType: "candidate",
            entityId: candidateId,
            status: "active",
            mode: "view",
            containerId: "candidateActions",
            onEdit: onEdit,
            onArchive: onArchive,
            onReopen: onReopen,
          });
        }
      }

      if (typeof renderEntityToolbar === "function") {
        renderEntityToolbar({
          entityType: "candidate",
          entityId: candidateId,
          status: lifecycleStatus,
          mode: "view",
          containerId: "candidateActions",
          onEdit: onEdit,
          onArchive: onArchive,
          onReopen: onReopen,
        });
      }
    } catch (err) {
      console.error("[Candidate] renderEntityToolbar error:", err);
    }

    await Promise.all([
      loadCandidateProfileSections(candidateId),
      renderAssociatedOffers(candidateId),
      renderDocuments(candidate),
      loadCandidateLogs(candidateId),
    ]);
  }

  async function initCandidateProfilePage() {
    var params = new URLSearchParams(window.location.search || "");
    var candidateId = params.get("id");
    if (!candidateId) {
      navigateToCandidates();
      return;
    }

    if (!window.IESupabase) {
      console.error("[Candidate] window.IESupabase not available");
      if (window.IEAuth && typeof window.IEAuth.redirectToLogin === "function") {
        window.IEAuth.redirectToLogin();
      } else if (
        window.IESupabase &&
        typeof window.IESupabase.redirectToLogin === "function"
      ) {
        window.IESupabase.redirectToLogin();
      }
      return;
    }

    // Require authentication before loading any data
    if (typeof window.IESupabase.requireAuth === "function") {
      var user = await window.IESupabase.requireAuth();
      if (!user) {
        // requireAuth handles redirect
        return;
      }
    } else if (window.IESupabase.supabase && window.IESupabase.supabase.auth) {
      try {
        var sessionResult = await window.IESupabase.supabase.auth.getSession();
        if (!sessionResult || !sessionResult.data || !sessionResult.data.session) {
          if (typeof window.IESupabase.redirectToLogin === "function") {
            window.IESupabase.redirectToLogin();
          } else if (window.IEAuth && typeof window.IEAuth.redirectToLogin === "function") {
            window.IEAuth.redirectToLogin();
          }
          return;
        }
      } catch (err) {
        console.error("[Candidate] auth guard exception:", err);
        if (typeof window.IESupabase.redirectToLogin === "function") {
          window.IESupabase.redirectToLogin();
        } else if (window.IEAuth && typeof window.IEAuth.redirectToLogin === "function") {
          window.IEAuth.redirectToLogin();
        }
        return;
      }
    }

    await loadCandidatePage(candidateId);

    try {
      bindCandidateActivityLog(candidateId);
    } catch (err) {
      console.error("[Candidate] bindCandidateActivityLog exception:", err);
    }

    try {
      var addAppBtn = document.querySelector('[data-action="add-application"]');
      if (addAppBtn && !addAppBtn._ieBound) {
        addAppBtn._ieBound = true;
        addAppBtn.addEventListener("click", function () {
          if (!window.IEPortal || !window.IEPortal.ui || !window.IEPortal.ui.openModal) {
            return;
          }
          window.IEPortal.ui.openModal({
            title: "Add Application",
            render: function (bodyEl) {
              var container = document.createElement("div");
              container.className = "space-y-4";

              var help = document.createElement("p");
              help.className = "text-sm text-gray-600";
              help.textContent = "Select a job offer to create a new application for this candidate.";
              container.appendChild(help);

              var selectWrapper = document.createElement("div");
              selectWrapper.className = "space-y-2";
              var label = document.createElement("label");
              label.className = "form-label";
              label.textContent = "Job Offer";
              selectWrapper.appendChild(label);

              var select = document.createElement("select");
              select.className = "form-input";
              select.innerHTML =
                '<option value="">Select a job offer...</option>';
              selectWrapper.appendChild(select);
              container.appendChild(selectWrapper);

              var errorEl = document.createElement("p");
              errorEl.className = "text-sm text-red-600 hidden";
              container.appendChild(errorEl);

              var actions = document.createElement("div");
              actions.className = "flex justify-end gap-2 pt-4";
              var cancelBtn = document.createElement("button");
              cancelBtn.type = "button";
              cancelBtn.className = "ie-btn ie-btn-secondary";
              cancelBtn.textContent = "Cancel";
              cancelBtn.addEventListener("click", function () {
                if (window.IEPortal && window.IEPortal.ui && window.IEPortal.ui.closeModal) {
                  window.IEPortal.ui.closeModal();
                }
              });
              var createBtn = document.createElement("button");
              createBtn.type = "button";
              createBtn.className = "ie-btn ie-btn-primary";
              createBtn.textContent = "Create Application";
              actions.appendChild(cancelBtn);
              actions.appendChild(createBtn);
              container.appendChild(actions);

              bodyEl.appendChild(container);

              // Load active offers into the select
              (async function loadOffers() {
                try {
                  if (
                    window.IESupabase &&
                    typeof window.IESupabase.searchActiveJobOffersForAssociation ===
                      "function"
                  ) {
                    var res =
                      await window.IESupabase.searchActiveJobOffersForAssociation(
                        { term: "", limit: 50 }
                      );
                    if (!res.error && Array.isArray(res.data)) {
                      res.data.forEach(function (offer) {
                        var opt = document.createElement("option");
                        opt.value = offer.id;
                        opt.textContent =
                          offer.title ||
                          offer.position ||
                          "Offer " + String(offer.id);
                        select.appendChild(opt);
                      });
                    }
                  }
                } catch (err) {
                  console.error(
                    "[Candidate] load offers for Add Application modal error:",
                    err
                  );
                }
              })();

              createBtn.addEventListener("click", async function () {
                if (!candidateId) return;
                var jobOfferId = select.value || "";
                if (!jobOfferId) {
                  errorEl.textContent = "Please select a job offer.";
                  errorEl.classList.remove("hidden");
                  return;
                }
                createBtn.disabled = true;
                errorEl.classList.add("hidden");
                try {
                  if (
                    !window.IEQueries ||
                    !window.IEQueries.applications ||
                    typeof window.IEQueries.applications.createApplication !==
                      "function"
                  ) {
                    throw new Error("Application creation API not available");
                  }
                  var result =
                    await window.IEQueries.applications.createApplication(
                      candidateId,
                      jobOfferId,
                      {}
                    );
                  if (result.error) {
                    var msg =
                      result.error.code === "DUPLICATE_APPLICATION"
                        ? "This candidate already has an application for this job offer."
                        : result.error.message || "Error creating application.";
                    errorEl.textContent = msg;
                    errorEl.classList.remove("hidden");
                    createBtn.disabled = false;
                    return;
                  }
                  if (window.IEPortal && window.IEPortal.ui && window.IEPortal.ui.closeModal) {
                    window.IEPortal.ui.closeModal();
                  }
                  // Reload offers section and availability
                  await renderAssociatedOffers(candidateId);
                  // Recompute availability from fresh applications
                  try {
                    if (
                      window.IEQueries &&
                      window.IEQueries.applications &&
                      typeof window.IEQueries.applications.getApplicationsByCandidate ===
                        "function" &&
                      window.IEQueries.candidates &&
                      typeof window.IEQueries.candidates.deriveAvailabilityFromApplications ===
                        "function"
                    ) {
                      var apps =
                        await window.IEQueries.applications.getApplicationsByCandidate(
                          candidateId
                        );
                      if (!apps.error && Array.isArray(apps.data)) {
                        var availability =
                          window.IEQueries.candidates.deriveAvailabilityFromApplications(
                            apps.data
                          );
                        applyAvailabilityToHeader(availability);
                      }
                    }
                  } catch (e2) {
                    console.error(
                      "[Candidate] availability refresh after application creation error:",
                      e2
                    );
                  }
                } catch (err) {
                  console.error(
                    "[Candidate] createApplication error from modal:",
                    err
                  );
                  errorEl.textContent =
                    "Error creating application. Please try again.";
                  errorEl.classList.remove("hidden");
                  createBtn.disabled = false;
                }
              });
            },
          });
        });
      }
    } catch (err) {
      console.error("[Candidate] Add Application button wiring error:", err);
    }

    // Reveal the page once data loading has at least been attempted.
    try {
      document.body.style.visibility = "visible";
    } catch (_) {}
  }

  function bindCandidateActivityLog(candidateId) {
    if (!candidateId) return;

    var addBtn = document.getElementById("candidateAddLogBtn");
    var textarea = document.getElementById("candidateLogInput");
    if (!addBtn || !textarea) return;
    if (addBtn._ieBound === true) return;
    addBtn._ieBound = true;

    addBtn.addEventListener("click", function () {
      if (!window.IESupabase) return;

      var raw = textarea.value || "";
      var message = raw.trim();
      if (!message) return;

      addBtn.disabled = true;

      var done = function () {
        addBtn.disabled = false;
      };

      var promise;
      if (typeof window.IESupabase.insertEntityLog === "function") {
        promise = window.IESupabase.insertEntityLog({
          entity_type: "candidate",
          entity_id: candidateId,
          message: message,
        });
      } else if (typeof window.IESupabase.createLog === "function") {
        promise = window.IESupabase.createLog("candidate", candidateId, message);
      }

      if (!promise || typeof promise.then !== "function") {
        done();
        return;
      }

      promise
        .then(function (result) {
          if (!result || result.error || !result.data) {
            return;
          }
          textarea.value = "";
          return loadCandidateLogs(candidateId);
        })
        .catch(function (err) {
          console.error("[Candidate] add note error:", err);
        })
        .finally(done);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initCandidateProfilePage().catch(function (err) {
      console.error("[Candidate] initCandidateProfilePage exception:", err);
      try {
        document.body.style.visibility = "visible";
      } catch (_) {}
    });
  });
})();


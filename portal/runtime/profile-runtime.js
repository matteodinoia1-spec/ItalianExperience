// ============================================================================
// Italian Experience Recruitment Portal - Profile Runtime
// ----------------------------------------------------------------------------
// Manages current user profile, header user block, and avatar sync.
// Profile orchestration only; Supabase queries remain in core/supabase.js.
// ============================================================================

(function () {
  "use strict";

  // Profile state (shared with app-shell via globals for getCurrentUserDisplayName etc.)
  if (typeof window.IE_CURRENT_PROFILE === "undefined") {
    window.IE_CURRENT_PROFILE = null;
  }
  if (typeof window.IE_CURRENT_USER_EMAIL === "undefined") {
    window.IE_CURRENT_USER_EMAIL = null;
  }

  function getCurrentUserDisplayName() {
    var profile = window.IE_CURRENT_PROFILE;
    if (profile) {
      var first = (profile.first_name || "").trim();
      var last = (profile.last_name || "").trim();
      if (first || last) return (first + " " + last).trim();
      if (profile.full_name) return profile.full_name;
      if (profile.email) return profile.email;
    }
    if (window.IE_CURRENT_USER_EMAIL) return window.IE_CURRENT_USER_EMAIL;
    return "User";
  }

  function getCurrentUserRole() {
    var profile = window.IE_CURRENT_PROFILE;
    return profile && profile.role ? String(profile.role) : "—";
  }

  async function loadCurrentUserProfile() {
    if (!window.IEAuth) return;
    try {
      var sessionResult = null;
      if (
        window.IESessionReady &&
        typeof window.IESessionReady.getSessionReady === "function"
      ) {
        sessionResult = await window.IESessionReady.getSessionReady();
      }
      if (!sessionResult && typeof window.IEAuth.getSession === "function") {
        sessionResult = await window.IEAuth.getSession();
      }
      var user = (sessionResult && sessionResult.data && sessionResult.data.user) || null;
      window.IE_CURRENT_USER_EMAIL = (user && user.email) || null;

      var result = await window.IESupabase.getProfile();
      var data = result && result.data;
      var error = result && result.error;

      if (error) {
        console.error("[Profile] Failed to load profile in header:", error);
        window.IE_CURRENT_PROFILE = null;
        return;
      }
      window.IE_CURRENT_PROFILE = data || null;
      if (typeof window.debugLog === "function") {
        window.debugLog("[Profile] Loaded profile");
      }
    } catch (e) {
      console.error("[Profile] loadCurrentUserProfile exception:", e);
      window.IE_CURRENT_PROFILE = null;
    }
  }

  function updateHeaderUserBlock() {
    if (!window.IESupabase) return;
    var displayName = getCurrentUserDisplayName();
    var roleLabel = getCurrentUserRole();
    var nameEl = document.querySelector("header .text-right p.text-sm");
    var roleEl = document.querySelector("header .text-right p:nth-of-type(2)");
    var avatarEl = document.querySelector("header .w-10.h-10.rounded-full img");
    if (nameEl) nameEl.textContent = displayName || "—";
    if (roleEl) roleEl.textContent = roleLabel;
    if (avatarEl && displayName) {
      avatarEl.setAttribute(
        "src",
        "https://ui-avatars.com/api/?name=" +
          encodeURIComponent(displayName.replace(/\s+/g, "+")) +
          "&background=1b4332&color=fff"
      );
      avatarEl.setAttribute("alt", displayName);
    }
  }

  function ensureHeaderAvatarLinksToProfile() {
    var textBlock = document.querySelector("header .text-right");
    var avatarBlock = document.querySelector("header .w-10.h-10.rounded-full");
    if (!textBlock || !avatarBlock || !avatarBlock.querySelector("img")) return;

    var userBlock = textBlock.parentElement;
    if (!userBlock || userBlock.tagName !== "DIV") return;
    if (userBlock.parentElement && userBlock.parentElement.tagName === "A") return;

    var avatarParent = avatarBlock.parentElement;
    if (avatarParent && avatarParent.tagName === "A") {
      avatarParent.parentNode.insertBefore(avatarBlock, avatarParent);
      avatarParent.remove();
    }

    var base =
      window.IERouter && typeof window.IERouter.derivePortalBasePath === "function"
        ? window.IERouter.derivePortalBasePath()
        : "";
    var link = document.createElement("a");
    link.setAttribute("href", base + "profile.html");
    link.setAttribute("aria-label", "Vai al profilo");
    link.className =
      "flex items-center space-x-3 border-l pl-6 border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#c5a059] focus:ring-offset-2 rounded";
    userBlock.parentNode.insertBefore(link, userBlock);
    link.appendChild(userBlock);
  }

  // ---------------------------------------------------------------------------
  // Profile - My Activity section
  // ---------------------------------------------------------------------------

  async function initProfileMyActivitySection() {
    const form = document.getElementById("profileForm");
    if (!form) return;

    let container = document.getElementById("my-activity-section");
    if (!container) {
      const wrapper = document.createElement("section");
      wrapper.className = "entity-activity profile-my-activity ie-card glass-card";

      const header = document.createElement("h3");
      header.className = "entity-activity__title";
      header.textContent = "My Activity";

      container = document.createElement("div");
      container.id = "my-activity-section";
      container.className = "entity-activity__list";

      wrapper.appendChild(header);
      wrapper.appendChild(container);

      const contentWrapper = form.parentElement;
      if (contentWrapper && contentWrapper.parentElement) {
        contentWrapper.parentElement.insertBefore(wrapper, contentWrapper.nextSibling);
      } else if (contentWrapper) {
        contentWrapper.appendChild(wrapper);
      } else {
        form.appendChild(wrapper);
      }
    }

    if (container.__ieProfileActivityBound !== true) {
      container.addEventListener("click", function (event) {
        const editBtn = event.target.closest("[data-action='my-activity-edit']");
        if (editBtn) {
          event.preventDefault();
          const id = editBtn.getAttribute("data-id");
          if (id) {
            handleProfileActivityEdit(id, container);
          }
          return;
        }
        const deleteBtn = event.target.closest("[data-action='my-activity-delete']");
        if (deleteBtn) {
          event.preventDefault();
          const id = deleteBtn.getAttribute("data-id");
          if (id) {
            handleProfileActivityDelete(id, container);
          }
        }
      });
      container.__ieProfileActivityBound = true;
    }

    await loadProfileActivityData(container);
  }

  async function loadProfileActivityData(container) {
    if (!container) return;

    container.innerHTML =
      '<p class="activity-log-loading text-sm text-gray-500">Loading your activity...</p>';

    if (!window.IESupabase || typeof window.IESupabase.fetchMyActivityLogs !== "function") {
      container.innerHTML =
        '<p class="activity-log-error text-sm text-gray-500">Activity not available.</p>';
      return;
    }

    try {
      const result = await window.IESupabase.fetchMyActivityLogs();
      if (result.error) {
        console.error("[Profile] fetchMyActivityLogs error:", result.error);
        container.innerHTML =
          '<p class="activity-log-error text-sm text-gray-500">Unable to load your activity right now.</p>';
        return;
      }

      const rawLogs = Array.isArray(result.data) ? result.data : [];
      if (!rawLogs.length) {
        IE_PROFILE_ACTIVITY_LOGS = [];
        renderMyActivityList(container, IE_PROFILE_ACTIVITY_LOGS);
        return;
      }

      const viewModels = await buildProfileActivityViewModels(rawLogs);
      IE_PROFILE_ACTIVITY_LOGS = viewModels;
      renderMyActivityList(container, IE_PROFILE_ACTIVITY_LOGS);
    } catch (error) {
      console.error("[Profile] loadProfileActivityData exception:", error);
      container.innerHTML =
        '<p class="activity-log-error text-sm text-gray-500">Your activity could not be loaded right now.</p>';
    }
  }

  async function buildProfileActivityViewModels(logs) {
    const candidateIds = new Set();
    const jobOfferIds = new Set();
    const clientIds = new Set();

    logs.forEach(function (log) {
      if (!log || !log.entity_type || !log.entity_id) return;
      if (log.entity_type === "candidate") {
        candidateIds.add(log.entity_id);
      } else if (log.entity_type === "job_offer") {
        jobOfferIds.add(log.entity_id);
      } else if (log.entity_type === "client") {
        clientIds.add(log.entity_id);
      }
    });

    const supabaseClient = window.IESupabase && window.IESupabase.supabase;
    if (!supabaseClient) {
      console.error("[Profile] Supabase client not available for My Activity entity resolution.");
      return [];
    }

    const candidateIdArray = Array.from(candidateIds);
    const jobOfferIdArray = Array.from(jobOfferIds);
    const clientIdArray = Array.from(clientIds);

    try {
      const promises = [];

      if (candidateIdArray.length) {
        promises.push(
          supabaseClient
            .from("candidates")
            .select("id, first_name, last_name")
            .in("id", candidateIdArray)
        );
      } else {
        promises.push(Promise.resolve({ data: [], error: null }));
      }

      if (jobOfferIdArray.length) {
        promises.push(
          supabaseClient.from("job_offers").select("id, title").in("id", jobOfferIdArray)
        );
      } else {
        promises.push(Promise.resolve({ data: [], error: null }));
      }

      if (clientIdArray.length) {
        promises.push(
          supabaseClient.from("clients").select("id, name").in("id", clientIdArray)
        );
      } else {
        promises.push(Promise.resolve({ data: [], error: null }));
      }

      const [candidatesRes, jobOffersRes, clientsRes] = await Promise.all(promises);

      if (candidatesRes.error || jobOffersRes.error || clientsRes.error) {
        console.error("[Profile] My Activity entity fetch error:", {
          candidatesError: candidatesRes.error || null,
          jobOffersError: jobOffersRes.error || null,
          clientsError: clientsRes.error || null,
        });
        throw new Error("Failed to resolve activity entities");
      }

      const candidateMap = (candidatesRes.data || []).reduce(function (acc, row) {
        if (row && row.id) {
          const first = (row.first_name || "").toString().trim();
          const last = (row.last_name || "").toString().trim();
          const fullName = [first, last].filter(Boolean).join(" ").trim() || "—";
          acc[row.id] = fullName;
        }
        return acc;
      }, {});

      const jobOfferMap = (jobOffersRes.data || []).reduce(function (acc, row) {
        if (row && row.id) {
          acc[row.id] = (row.title || "—").toString();
        }
        return acc;
      }, {});

      const clientMap = (clientsRes.data || []).reduce(function (acc, row) {
        if (row && row.id) {
          acc[row.id] = (row.name || "—").toString();
        }
        return acc;
      }, {});

      const viewModels = logs
        .map(function (log) {
          if (!log) return null;
          let entityLabel = null;
          if (log.entity_type === "candidate") {
            entityLabel = candidateMap[log.entity_id];
          } else if (log.entity_type === "job_offer") {
            entityLabel = jobOfferMap[log.entity_id];
          } else if (log.entity_type === "client") {
            entityLabel = clientMap[log.entity_id];
          }
          if (!entityLabel) return null;

          return {
            id: log.id,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            event_type: log.event_type,
            message: log.message,
            created_at: log.created_at,
            updated_at: log.updated_at,
            updated_by: log.updated_by,
            entityLabel: entityLabel,
          };
        })
        .filter(Boolean);

      viewModels.sort(function (a, b) {
        const aTime = a && a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b && b.created_at ? new Date(b.created_at).getTime() : 0;
        if (aTime === bTime) {
          return String(b.id || "").localeCompare(String(a.id || ""));
        }
        return bTime - aTime;
      });

      return viewModels;
    } catch (error) {
      console.error("[Profile] buildProfileActivityViewModels exception:", error);
      return [];
    }
  }

  function renderMyActivityList(container, logs) {
    if (!container) return;

    container.innerHTML = "";

    if (!logs || !logs.length) {
      const empty = document.createElement("p");
      empty.className = "entity-activity__empty";
      empty.textContent = "You don’t have any activity yet.";
      container.appendChild(empty);
      return;
    }

    logs.forEach(function (log) {
      const row = document.createElement("div");
      row.className = "activity-item";
      row.setAttribute("data-log-id", String(log.id || ""));
      row.setAttribute("data-entity-type", String(log.entity_type || ""));
      row.setAttribute("data-event-type", String(log.event_type || ""));

      const dot = document.createElement("span");
      dot.className = "activity-item__dot";
      row.appendChild(dot);

      const content = document.createElement("div");
      content.className = "activity-item__content";

      const headerRow = document.createElement("div");
      headerRow.className = "activity-item__headerRow";

      const badge = document.createElement("span");
      badge.className = "activity-entity-badge";
      let badgeLabel = "";
      if (log.entity_type === "candidate") {
        badge.className += " activity-entity-badge--candidate";
        badgeLabel = "Candidate";
      } else if (log.entity_type === "job_offer") {
        badge.className += " activity-entity-badge--job-offer";
        badgeLabel = "Job Offer";
      } else if (log.entity_type === "client") {
        badge.className += " activity-entity-badge--client";
        badgeLabel = "Client";
      } else {
        badgeLabel = "Activity";
      }
      badge.textContent = badgeLabel;

      const who = document.createElement("span");
      who.className = "activity-item__who";
      who.textContent = log.entityLabel || "—";

      headerRow.appendChild(badge);
      headerRow.appendChild(who);

      var createdText = "";
      if (log.created_at) {
        try {
          createdText = new Date(log.created_at).toLocaleString("it-IT");
        } catch (e) {
          createdText = String(log.created_at);
        }
      }
      var metaText = createdText ? "Created on " + createdText : "";
      if (log.updated_at && log.updated_at !== log.created_at) {
        var updatedText;
        try {
          updatedText = new Date(log.updated_at).toLocaleString("it-IT");
        } catch (e2) {
          updatedText = String(log.updated_at);
        }
        metaText += metaText ? " – Edited on " + updatedText : "Edited on " + updatedText;
      }

      const timeWrap = document.createElement("span");
      timeWrap.className = "activity-item__timeWrap";
      const ts = document.createElement("span");
      ts.className = "activity-item__timestamp";
      ts.textContent = metaText;
      timeWrap.appendChild(ts);
      headerRow.appendChild(timeWrap);

      content.appendChild(headerRow);

      const messageEl = document.createElement("p");
      messageEl.className = "activity-item__message";
      messageEl.textContent = log.message || "";
      content.appendChild(messageEl);

      const actions = document.createElement("div");
      actions.className = "activity-item__actions";

      if (log.event_type === "manual_note") {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "ie-btn ie-btn-primary activity-item__actionBtn";
        editBtn.setAttribute("data-action", "my-activity-edit");
        editBtn.setAttribute("data-id", String(log.id || ""));
        editBtn.textContent = "Edit";

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className =
          "ie-btn ie-btn-danger activity-item__actionBtn activity-item__actionBtn--danger";
        deleteBtn.setAttribute("data-action", "my-activity-delete");
        deleteBtn.setAttribute("data-id", String(log.id || ""));
        deleteBtn.textContent = "Delete";

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
      }

      content.appendChild(actions);
      row.appendChild(content);
      container.appendChild(row);
    });
  }

  function canEditManualLog(log) {
    return !!log && log.event_type === "manual_note";
  }

  async function handleProfileActivityEdit(id, container) {
    const log =
      IE_PROFILE_ACTIVITY_LOGS &&
      IE_PROFILE_ACTIVITY_LOGS.find(function (item) {
        return String(item.id) === String(id);
      });
    if (!log || !canEditManualLog(log)) {
      return;
    }

    const row = container.querySelector('[data-log-id="' + String(id) + '"]');
    if (!row) return;

    const messageEl = row.querySelector(".activity-item__message");
    if (!messageEl) return;

    const existingEditor = row.querySelector(".activity-log-editor");
    if (existingEditor) {
      return;
    }

    const originalText = messageEl.textContent || "";
    messageEl.style.display = "none";

    const editor = document.createElement("div");
    editor.className = "activity-log-editor";

    const textarea = document.createElement("textarea");
    textarea.className = "activity-log-editor-input";
    textarea.value = originalText;

    const controls = document.createElement("div");
    controls.className = "activity-log-editor-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "ie-btn ie-btn-primary activity-log-action activity-log-action-save";
    saveBtn.textContent = "Save";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className =
      "ie-btn ie-btn-secondary activity-log-action activity-log-action-cancel";
    cancelBtn.textContent = "Cancel";

    controls.appendChild(saveBtn);
    controls.appendChild(cancelBtn);

    const errorEl = document.createElement("p");
    errorEl.className = "activity-log-editor-error text-xs text-red-600";
    errorEl.style.display = "none";

    editor.appendChild(textarea);
    editor.appendChild(controls);
    editor.appendChild(errorEl);

    row.appendChild(editor);

    cancelBtn.addEventListener("click", function () {
      row.removeChild(editor);
      messageEl.style.display = "";
    });

    saveBtn.addEventListener("click", async function () {
      const value = textarea.value.trim();
      if (!value) {
        errorEl.textContent = "Message cannot be empty.";
        errorEl.style.display = "";
        return;
      }

      errorEl.style.display = "none";
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      saveBtn.textContent = "Saving…";

      try {
        if (
          !window.IESupabase ||
          typeof window.IESupabase.updateMyManualLog !== "function"
        ) {
          throw new Error("Activity API not available");
        }

        const result = await window.IESupabase.updateMyManualLog(id, { message: value });
        if (result.error) {
          console.error("[Profile] updateMyManualLog error:", result.error);
          errorEl.textContent =
            result.error.message || "Unable to save this note. Please try again.";
          errorEl.style.display = "";
          return;
        }

        await loadProfileActivityData(container);
      } catch (error) {
        console.error("[Profile] handleProfileActivityEdit exception:", error);
        errorEl.textContent = "Unable to save this note. Please try again.";
        errorEl.style.display = "";
      } finally {
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        saveBtn.textContent = "Save";
      }
    });
  }

  async function handleProfileActivityDelete(id, container) {
    const log =
      IE_PROFILE_ACTIVITY_LOGS &&
      IE_PROFILE_ACTIVITY_LOGS.find(function (item) {
        return String(item.id) === String(id);
      });
    if (!log || !canEditManualLog(log)) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );
    if (!confirmed) return;

    try {
      if (
        !window.IESupabase ||
        typeof window.IESupabase.deleteMyManualLog !== "function"
      ) {
        throw new Error("Activity API not available");
      }

      const result = await window.IESupabase.deleteMyManualLog(id);
      if (result.error) {
        console.error("[Profile] deleteMyManualLog error:", result.error);
        const message =
          result.error.message || "Unable to delete this note. Please try again.";
        console.error("[Profile] deleteMyManualLog:", message);
        return;
      }

      await loadProfileActivityData(container);
    } catch (error) {
      console.error("[Profile] handleProfileActivityDelete exception:", error);
    }
  }

  window.IEProfileRuntime = {
    loadCurrentUserProfile: loadCurrentUserProfile,
    updateHeaderUserBlock: updateHeaderUserBlock,
    ensureHeaderAvatarLinksToProfile: ensureHeaderAvatarLinksToProfile,
    initProfileMyActivitySection: initProfileMyActivitySection,
    loadProfileActivityData: loadProfileActivityData,
  };
})();

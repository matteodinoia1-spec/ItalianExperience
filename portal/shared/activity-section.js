;(function () {
  "use strict";

  function isAllowedEntityType(entityType) {
    return (
      entityType === "candidate" ||
      entityType === "job_offer" ||
      entityType === "client" ||
      entityType === "application"
    );
  }

  function escapeText(value) {
    if (value == null) return "";
    return String(value);
  }

  function safeToLocaleString(isoDateString) {
    if (!isoDateString) return "";
    try {
      return new Date(isoDateString).toLocaleString();
    } catch (_) {
      return String(isoDateString);
    }
  }

  function getDisplayNameForLog(log, currentUserId) {
    if (!log) return "—";
    if (currentUserId && log.created_by === currentUserId) return "You";

    var p = log.created_by_profile;
    if (p && (p.first_name || p.last_name)) {
      var name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      if (name) return name;
    }

    if (log.created_by) {
      var id = String(log.created_by);
      if (id.length <= 10) return id;
      return id.slice(0, 6) + "…" + id.slice(-4);
    }

    return "—";
  }

  function getBadgeInfo(eventType) {
    var t = (eventType || "").toString().toLowerCase();
    if (!t || t === "manual_note") return null;

    var label = t.replace(/_/g, " ");
    if (t === "status_change") label = "status";
    if (t === "salary_update") label = "salary";
    if (t === "system_event") label = "system";

    return { type: t, label: label };
  }

  function buildEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function escapeSelectorAttrValue(value) {
    // Enough for selectors like: [data-log-id="..."]
    return String(value == null ? "" : value)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\A ");
  }

  function findTimelineItem(timelineEl, logId) {
    if (!timelineEl || logId == null) return null;
    var escaped = escapeSelectorAttrValue(logId);
    return timelineEl.querySelector('[data-log-id="' + escaped + '"]');
  }

  function render(state) {
    var container = state.container;
    if (!container) return;

    var section = buildEl("section", "entity-activity");

    var header = buildEl("div", "entity-activity__header");
    var title = buildEl("h3", "entity-activity__title serif", "Activity");
    var subtitle = buildEl(
      "p",
      "entity-activity__subtitle",
      "Compact timeline (latest first)"
    );
    header.appendChild(title);
    header.appendChild(subtitle);

    var composer = buildEl("div", "entity-activity__composer");
    var textarea = document.createElement("textarea");
    textarea.className = "entity-activity__textarea";
    textarea.rows = 2;
    textarea.placeholder = "Add a note…";
    textarea.maxLength = 500;
    textarea.setAttribute("aria-label", "New activity log message");

    var composerRow = buildEl("div", "entity-activity__composerRow");
    var error = buildEl("div", "entity-activity__error");
    error.setAttribute("role", "status");
    error.setAttribute("aria-live", "polite");

    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "ie-btn ie-btn-primary entity-activity__addBtn";
    addBtn.textContent = "Add Log";

    composerRow.appendChild(addBtn);
    composer.appendChild(textarea);
    composer.appendChild(error);
    composer.appendChild(composerRow);

    var timeline = buildEl("div", "entity-activity__timeline");
    var footer = buildEl("div", "entity-activity__footer");

    section.appendChild(header);
    section.appendChild(composer);
    section.appendChild(timeline);
    section.appendChild(footer);
    container.appendChild(section);

    state._els = {
      section: section,
      textarea: textarea,
      addBtn: addBtn,
      error: error,
      timeline: timeline,
      footer: footer,
    };

    bindEvents(state);
    renderTimeline(state);
    renderFooter(state);
  }

  function setError(state, message) {
    if (!state || !state._els || !state._els.error) return;
    state._els.error.textContent = message ? String(message) : "";
    if (message) state._els.error.classList.add("is-visible");
    else state._els.error.classList.remove("is-visible");
  }

  function setAddLoading(state, loading) {
    if (!state || !state._els || !state._els.addBtn) return;
    state._isAdding = !!loading;
    state._els.addBtn.disabled = !!loading;
    if (loading) state._els.addBtn.classList.add("is-loading");
    else state._els.addBtn.classList.remove("is-loading");
  }

  function bindEvents(state) {
    var els = state._els;
    if (!els) return;

    els.addBtn.addEventListener("click", function () {
      if (state._isAdding) return;
      var raw = els.textarea.value || "";
      var message = raw.trim();
      if (!message) {
        setError(state, "Message is required.");
        return;
      }
      setError(state, "");
      setAddLoading(state, true);

      window.IESupabase
        .createLog(state.entityType, state.entityId, message)
        .then(function (res) {
          if (!res || res.error) {
            setError(state, (res && res.error && res.error.message) ? res.error.message : "Unable to add log.");
            return;
          }
          var created = res.data || null;
          if (!created) return;

          var newLog = Object.assign({}, created, {
            created_by_profile: created.created_by_profile || null,
          });

          state.logs = [newLog].concat(state.logs || []);
          els.textarea.value = "";
          renderTimeline(state);
          renderFooter(state);
        })
        .catch(function () {
          setError(state, "Unable to add log.");
        })
        .finally(function () {
          setAddLoading(state, false);
        });
    });

    els.timeline.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      var logId = btn.getAttribute("data-log-id");
      if (!logId) return;

      if (action === "edit") {
        beginInlineEdit(state, logId);
        return;
      }
      if (action === "delete") {
        handleDelete(state, logId);
        return;
      }
      if (action === "save") {
        handleSaveEdit(state, logId);
        return;
      }
      if (action === "cancel") {
        cancelInlineEdit(state, logId);
        return;
      }
    });

    els.footer.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-action='show-all']");
      if (!btn) return;
      if (!state.hasMore || state.isFull) return;
      btn.disabled = true;
      btn.classList.add("is-loading");

      window.IESupabase
        .fetchLogs(state.entityType, state.entityId, { full: true })
        .then(function (res) {
          if (!res || res.error) {
            return;
          }
          var data = res.data || null;
          var logs = data && Array.isArray(data.logs) ? data.logs : [];
          state.logs = logs;
          state.hasMore = false;
          state.isFull = true;
          renderTimeline(state);
          renderFooter(state);
        })
        .catch(function () {})
        .finally(function () {
          btn.disabled = false;
          btn.classList.remove("is-loading");
        });
    });
  }

  function renderFooter(state) {
    var footer = state && state._els && state._els.footer;
    if (!footer) return;
    footer.innerHTML = "";

    if (state.hasMore && !state.isFull) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ie-btn ie-btn-secondary entity-activity__showAllBtn";
      btn.setAttribute("data-action", "show-all");
      btn.textContent = "Show all";
      footer.appendChild(btn);
      return;
    }
  }

  function renderTimeline(state) {
    var timeline = state && state._els && state._els.timeline;
    if (!timeline) return;

    timeline.innerHTML = "";
    var logs = Array.isArray(state.logs) ? state.logs : [];

    if (!logs.length) {
      var empty = buildEl("div", "entity-activity__empty", "No activity yet.");
      timeline.appendChild(empty);
      return;
    }

    var list = buildEl("div", "entity-activity__list");
    logs.forEach(function (log) {
      list.appendChild(renderLogItem(state, log));
    });
    timeline.appendChild(list);
  }

  function renderLogItem(state, log) {
    var item = buildEl("div", "activity-item");
    item.setAttribute("data-log-id", escapeText(log && log.id));

    var dot = buildEl("div", "activity-item__dot");
    var content = buildEl("div", "activity-item__content");

    var headerRow = buildEl("div", "activity-item__headerRow");
    var who = buildEl("span", "activity-item__who", getDisplayNameForLog(log, state.currentUserId));

    var badgeInfo = getBadgeInfo(log && log.event_type);
    var badge = null;
    if (badgeInfo) {
      badge = buildEl(
        "span",
        "activity-badge activity-badge--" + badgeInfo.type,
        badgeInfo.label.toUpperCase()
      );
    }

    var timeWrap = buildEl("span", "activity-item__timeWrap");
    var ts = buildEl("span", "activity-item__timestamp", safeToLocaleString(log && log.created_at));
    timeWrap.appendChild(ts);
    if (log && log.updated_at && log.created_at && String(log.updated_at) !== String(log.created_at)) {
      var edited = buildEl("span", "activity-item__edited", "Edited");
      timeWrap.appendChild(edited);
    }

    headerRow.appendChild(who);
    if (badge) headerRow.appendChild(badge);
    headerRow.appendChild(timeWrap);

    var message = buildEl("div", "activity-item__message");
    message.textContent = (log && log.message) ? String(log.message) : "";

    var actions = buildEl("div", "activity-item__actions");
    var isOwner = !!(state.currentUserId && log && log.created_by === state.currentUserId);
    if (isOwner) {
      var editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "ie-btn ie-btn-primary activity-item__actionBtn";
      editBtn.setAttribute("data-action", "edit");
      editBtn.setAttribute("data-log-id", escapeText(log.id));
      editBtn.textContent = "Edit";

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "ie-btn ie-btn-danger activity-item__actionBtn activity-item__actionBtn--danger";
      delBtn.setAttribute("data-action", "delete");
      delBtn.setAttribute("data-log-id", escapeText(log.id));
      delBtn.textContent = "Delete";

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
    }

    content.appendChild(headerRow);
    content.appendChild(message);
    content.appendChild(actions);

    item.appendChild(dot);
    item.appendChild(content);
    return item;
  }

  function findLogById(state, logId) {
    var logs = Array.isArray(state.logs) ? state.logs : [];
    for (var i = 0; i < logs.length; i++) {
      if (logs[i] && String(logs[i].id) === String(logId)) return logs[i];
    }
    return null;
  }

  function beginInlineEdit(state, logId) {
    var timeline = state && state._els && state._els.timeline;
    if (!timeline) return;
    var item = findTimelineItem(timeline, logId);
    if (!item) return;

    var log = findLogById(state, logId);
    if (!log) return;

    cancelAllInlineEdits(state);

    var messageEl = item.querySelector(".activity-item__message");
    var actionsEl = item.querySelector(".activity-item__actions");
    if (!messageEl || !actionsEl) return;

    var previous = messageEl.textContent || "";
    item.dataset.editing = "true";
    item.dataset.previousMessage = previous;

    var ta = document.createElement("textarea");
    ta.className = "activity-item__editTextarea";
    ta.rows = 2;
    ta.maxLength = 500;
    ta.value = previous;

    messageEl.innerHTML = "";
    messageEl.appendChild(ta);
    ta.focus();
    try {
      ta.setSelectionRange(ta.value.length, ta.value.length);
    } catch (_) {}

    actionsEl.innerHTML = "";
    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "ie-btn ie-btn-primary activity-item__actionBtn";
    saveBtn.setAttribute("data-action", "save");
    saveBtn.setAttribute("data-log-id", escapeText(logId));
    saveBtn.textContent = "Save";

    var cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "ie-btn ie-btn-secondary activity-item__actionBtn";
    cancelBtn.setAttribute("data-action", "cancel");
    cancelBtn.setAttribute("data-log-id", escapeText(logId));
    cancelBtn.textContent = "Cancel";

    actionsEl.appendChild(saveBtn);
    actionsEl.appendChild(cancelBtn);
  }

  function cancelAllInlineEdits(state) {
    var timeline = state && state._els && state._els.timeline;
    if (!timeline) return;
    var editing = timeline.querySelectorAll("[data-editing='true']");
    for (var i = 0; i < editing.length; i++) {
      var node = editing[i];
      var id = node.getAttribute("data-log-id");
      if (id) cancelInlineEdit(state, id);
    }
  }

  function cancelInlineEdit(state, logId) {
    if (!logId) return;
    var timeline = state && state._els && state._els.timeline;
    if (!timeline) return;
    var item = findTimelineItem(timeline, logId);
    if (!item) return;
    if (item.dataset.editing !== "true") return;

    var messageEl = item.querySelector(".activity-item__message");
    var actionsEl = item.querySelector(".activity-item__actions");
    if (!messageEl || !actionsEl) return;

    var previous = item.dataset.previousMessage || "";
    item.dataset.editing = "false";
    item.dataset.previousMessage = "";

    messageEl.textContent = previous;

    actionsEl.innerHTML = "";
    var log = findLogById(state, logId);
    var isOwner = !!(state.currentUserId && log && log.created_by === state.currentUserId);
    if (isOwner) {
      var editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "ie-btn ie-btn-primary activity-item__actionBtn";
      editBtn.setAttribute("data-action", "edit");
      editBtn.setAttribute("data-log-id", escapeText(logId));
      editBtn.textContent = "Edit";

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "ie-btn ie-btn-danger activity-item__actionBtn activity-item__actionBtn--danger";
      delBtn.setAttribute("data-action", "delete");
      delBtn.setAttribute("data-log-id", escapeText(logId));
      delBtn.textContent = "Delete";

      actionsEl.appendChild(editBtn);
      actionsEl.appendChild(delBtn);
    }
  }

  function handleSaveEdit(state, logId) {
    var timeline = state && state._els && state._els.timeline;
    if (!timeline) return;
    var item = findTimelineItem(timeline, logId);
    if (!item) return;

    var ta = item.querySelector("textarea.activity-item__editTextarea");
    if (!ta) return;
    var next = (ta.value || "").trim();
    if (!next) {
      setError(state, "Message is required.");
      return;
    }
    setError(state, "");

    var saveBtn = item.querySelector("button[data-action='save']");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.classList.add("is-loading");
    }

    window.IESupabase
      .updateLog(logId, next)
      .then(function (res) {
        if (!res || res.error) {
          setError(state, (res && res.error && res.error.message) ? res.error.message : "Unable to save.");
          return;
        }
        var updated = res.data || null;
        if (!updated) return;

        var logs = Array.isArray(state.logs) ? state.logs : [];
        state.logs = logs.map(function (l) {
          if (!l || String(l.id) !== String(logId)) return l;
          return Object.assign({}, l, updated, {
            created_by_profile: l.created_by_profile || updated.created_by_profile || null,
          });
        });

        renderTimeline(state);
        renderFooter(state);
      })
      .catch(function () {
        setError(state, "Unable to save.");
      })
      .finally(function () {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.classList.remove("is-loading");
        }
      });
  }

  function handleDelete(state, logId) {
    if (!logId) return;
    var ok = false;
    try {
      ok = window.confirm("Delete this log?");
    } catch (_) {
      ok = false;
    }
    if (!ok) return;

    window.IESupabase
      .deleteLog(logId)
      .then(function (res) {
        if (!res || res.error || !res.data || res.data.success !== true) {
          setError(state, "Unable to delete.");
          return;
        }
        var logs = Array.isArray(state.logs) ? state.logs : [];
        state.logs = logs.filter(function (l) {
          return l && String(l.id) !== String(logId);
        });
        renderTimeline(state);
        renderFooter(state);
      })
      .catch(function () {
        setError(state, "Unable to delete.");
      });
  }

  function init(config) {
    try {
      if (!config || !config.container) return;
      var container = config.container;
      if (!container || typeof container.innerHTML !== "string") return;
      var entityType = config.entityType;
      var entityId = config.entityId;

      if (!entityId) {
        // Guard: create-mode pages may have no ID yet.
        return;
      }

      if (!isAllowedEntityType(entityType)) return;
      if (!window.IESupabase || typeof window.IESupabase.fetchLogs !== "function") return;

      // Mandatory container reset to prevent duplicate mounts/listeners.
      container.innerHTML = "";

      var state = {
        entityType: entityType,
        entityId: String(entityId),
        logs: [],
        hasMore: false,
        isFull: false,
        currentUserId: null,
        container: container,
        _els: null,
        _isAdding: false,
      };

      render(state);

      // Load session (for ownership checks) and initial logs.
      var sessionPromise = (typeof window.IESupabase.getSession === "function")
        ? window.IESupabase.getSession()
        : Promise.resolve({ data: { user: null } });

      Promise.all([
        sessionPromise.catch(function () {
          return { data: { user: null }, error: null };
        }),
        window.IESupabase.fetchLogs(entityType, String(entityId)).catch(function () {
          return { data: { logs: [], hasMore: false }, error: null };
        }),
      ])
        .then(function (parts) {
          var sessionRes = parts[0];
          var logsRes = parts[1];

          state.currentUserId = sessionRes && sessionRes.data && sessionRes.data.user && sessionRes.data.user.id
            ? String(sessionRes.data.user.id)
            : null;

          if (logsRes && logsRes.data) {
            state.logs = Array.isArray(logsRes.data.logs) ? logsRes.data.logs : [];
            state.hasMore = !!logsRes.data.hasMore;
            state.isFull = false;
          } else {
            state.logs = [];
            state.hasMore = false;
            state.isFull = false;
          }

          renderTimeline(state);
          renderFooter(state);
        })
        .catch(function () {
          // Silent: avoid breaking the host page.
        });
    } catch (_) {
      // Silent: avoid breaking the host page.
    }
  }

  window.ActivitySection = { init: init };
})();


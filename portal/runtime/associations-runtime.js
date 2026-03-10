// ============================================================================
// Italian Experience Recruitment Portal - Associations Runtime
// ----------------------------------------------------------------------------
// Centralizes entity association orchestration:
// - candidate ↔ job offers (link, unlink, render available offers)
// - job offer ↔ candidates (render associated candidates, add panel)
// - client ↔ job offers (render client positions)
// Data fetching delegates to IESupabase. Inline row/badge helpers live here.
// ============================================================================

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Inline association UI helpers (moved from app-shell.js)
  // ---------------------------------------------------------------------------

  function debounce(fn, delayMs) {
    var t = null;
    return function () {
      var ctx = this;
      var args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () {
        t = null;
        fn.apply(ctx, args);
      }, delayMs);
    };
  }

  function createInlineBadge(label, badgeClass) {
    var el = document.createElement("span");
    el.className = "badge " + (badgeClass || "");
    el.textContent = label || "—";
    return el;
  }

  function renderInlineCandidateRow(candidate, opts) {
    if (!candidate) return null;
    if (window.IEStatusRuntime && window.IEStatusRuntime.isCandidateHired(candidate)) return null;

    var fullName =
      ((candidate.first_name || "") + " " + (candidate.last_name || "")).trim() || "—";
    var position = (candidate.position || "").toString().trim();
    var status = (candidate.status || "new").toString().toLowerCase();
    var availability =
      window.IEStatusRuntime && typeof window.IEStatusRuntime.computeCandidateAvailability === "function"
        ? window.IEStatusRuntime.computeCandidateAvailability(candidate)
        : "available";

    var row = document.createElement("button");
    row.type = "button";
    row.className =
      "ie-btn ie-btn-secondary w-full text-left px-4 py-3 hover:bg-emerald-50 transition flex items-center justify-between gap-4";
    row.setAttribute("data-id", candidate.id || "");

    var left = document.createElement("div");
    left.className = "min-w-0";
    var nameEl = document.createElement("div");
    nameEl.className = "font-semibold text-gray-800 text-sm truncate";
    nameEl.textContent = fullName;
    left.appendChild(nameEl);
    if (position) {
      var posEl = document.createElement("div");
      posEl.className = "text-xs text-gray-500 truncate";
      posEl.textContent = position;
      left.appendChild(posEl);
    }

    var right = document.createElement("div");
    right.className = "flex items-center gap-2 flex-shrink-0";
    right.appendChild(
      createInlineBadge(
        window.IEStatusRuntime ? window.IEStatusRuntime.formatCandidateStatusLabel(status) : status,
        window.IEStatusRuntime ? window.IEStatusRuntime.getCandidateStatusBadgeClass(status) : ""
      )
    );
    right.appendChild(
      createInlineBadge(
        window.IEStatusRuntime ? window.IEStatusRuntime.formatAvailabilityLabel(availability) : availability,
        window.IEStatusRuntime ? window.IEStatusRuntime.getAvailabilityBadgeClass(availability) : ""
      )
    );

    row.appendChild(left);
    row.appendChild(right);

    row.addEventListener("click", function () {
      if (opts && typeof opts.onClick === "function") opts.onClick(candidate);
    });

    return row;
  }

  function renderInlineOfferRow(offer, opts) {
    if (!offer) return null;
    var title = (offer.title || "—").toString();
    var clientName = (offer.client_name || "—").toString();
    var status = offer.status || "open";
    var required = offer.positions_required != null ? Number(offer.positions_required) : null;
    if (!Number.isFinite(required)) {
      required = offer.positions != null ? Number(offer.positions) : null;
    }
    if (!Number.isFinite(required)) required = 1;

    var row = document.createElement("button");
    row.type = "button";
    row.className =
      "ie-btn ie-btn-secondary w-full text-left px-4 py-3 hover:bg-emerald-50 transition flex items-center justify-between gap-4";
    row.setAttribute("data-id", offer.id || "");

    var left = document.createElement("div");
    left.className = "min-w-0";
    var titleEl = document.createElement("div");
    titleEl.className = "font-semibold text-gray-800 text-sm truncate";
    titleEl.textContent = title;
    left.appendChild(titleEl);
    var clientEl = document.createElement("div");
    clientEl.className = "text-xs text-gray-500 truncate";
    clientEl.textContent = clientName;
    left.appendChild(clientEl);

    var right = document.createElement("div");
    right.className = "flex items-center gap-3 flex-shrink-0";
    right.appendChild(
      createInlineBadge(
        window.IEStatusRuntime ? window.IEStatusRuntime.formatOfferStatusLabel(status) : status,
        window.IEStatusRuntime ? window.IEStatusRuntime.getOfferStatusBadgeClass(status) : ""
      )
    );
    var count = document.createElement("div");
    count.className = "text-xs font-semibold text-gray-600";
    count.textContent = "— / " + String(required);
    right.appendChild(count);

    row.appendChild(left);
    row.appendChild(right);

    row.addEventListener("click", function () {
      if (opts && typeof opts.onClick === "function") opts.onClick(offer);
    });

    return row;
  }

  // ---------------------------------------------------------------------------
  // Entity metadata block (moved from app-shell.js)
  // ---------------------------------------------------------------------------

  function formatDate(value) {
    if (!value) return null;
    try {
      return new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (_) {
      return value;
    }
  }

  function getFullName(profile) {
    if (!profile) return "";
    var first = (profile.first_name || "").toString().trim();
    var last = (profile.last_name || "").toString().trim();
    var parts = [];
    if (first) parts.push(first);
    if (last) parts.push(last);
    return parts.join(" ");
  }

  function renderEntityMetadata(entity) {
    if (!entity) return "";

    var createdDate = formatDate(entity.created_at);
    var createdName = getFullName(entity.created_by_profile);
    var createdParts = [];
    if (createdDate) createdParts.push(createdDate);
    if (createdName) createdParts.push(createdName);
    var createdText = createdParts.length ? createdParts.join(" \u2022 ") : "\u2014";

    var updatedDate = formatDate(entity.updated_at);
    var updatedName = getFullName(entity.updated_by_profile);
    var updatedParts = [];
    if (updatedDate) updatedParts.push(updatedDate);
    if (updatedName) updatedParts.push(updatedName);
    var updatedText = updatedParts.length ? updatedParts.join(" \u2022 ") : "\u2014";

    var html =
      '<div class="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-400 space-y-1">' +
      '<div><strong>Created:</strong> ' +
      createdText +
      "</div>" +
      '<div><strong>Updated:</strong> ' +
      updatedText +
      "</div>" +
      "</div>"
    ;

    return html;
  }

  window.IEAssociationsRuntimeHelpers = Object.assign({}, window.IEAssociationsRuntimeHelpers || {}, {
    debounce: debounce,
    createInlineBadge: createInlineBadge,
    renderInlineCandidateRow: renderInlineCandidateRow,
    renderInlineOfferRow: renderInlineOfferRow,
    renderEntityMetadata: renderEntityMetadata,
  });

  function helpers() {
    return window.IEAssociationsRuntimeHelpers || {};
  }

  // ---------------------------------------------------------------------------
  // Data wrapper APIs (delegate to IESupabase, no query changes)
  // ---------------------------------------------------------------------------

  async function linkCandidateToJobOffer(candidateId, offerId) {
    if (!window.IESupabase || typeof window.IESupabase.linkCandidateToJob !== "function") {
      return { data: null, error: new Error("Link API not available") };
    }
    return window.IESupabase.linkCandidateToJob({
      candidate_id: candidateId,
      job_offer_id: offerId,
    });
  }

  async function unlinkCandidateFromJobOffer(associationId) {
    if (!window.IESupabase || typeof window.IESupabase.removeCandidateFromJob !== "function") {
      return { data: null, error: new Error("Unlink API not available") };
    }
    return window.IESupabase.removeCandidateFromJob(associationId);
  }

  async function getCandidatesForJobOffer(offerId) {
    if (!window.IESupabase || typeof window.IESupabase.fetchCandidatesForJobOffer !== "function") {
      return { data: [], error: new Error("API not available") };
    }
    return window.IESupabase.fetchCandidatesForJobOffer(offerId);
  }

  async function getClientJobOffers(clientId) {
    if (!window.IESupabase || typeof window.IESupabase.fetchJobOffersPaginated !== "function") {
      return { data: [], error: new Error("API not available") };
    }
    return window.IESupabase.fetchJobOffersPaginated({
      filters: {
        archived: "active",
        excludeArchivedStatus: true,
        clientId: clientId,
      },
      page: 1,
      limit: 20,
    });
  }

  // ---------------------------------------------------------------------------
  // Render: Candidate Available Offers Section
  // ---------------------------------------------------------------------------

  function renderCandidateAvailableOffersSection(opts) {
    var candidateId = opts && opts.candidateId ? String(opts.candidateId) : "";
    var candidate = opts && opts.candidate ? opts.candidate : null;
    var mode = opts && opts.mode ? String(opts.mode) : "view";
    var isArchived = !!(opts && opts.isArchived);
    var insertAfterEl = opts && opts.insertAfterEl ? opts.insertAfterEl : null;

    var existing = document.getElementById("candidateAvailableOffersSection");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    if (!candidateId || !candidate || mode !== "view" || isArchived) {
      return;
    }

    var h = helpers();
    var renderInlineOfferRow = h.renderInlineOfferRow;
    var renderEntityMetadata = h.renderEntityMetadata;
    var debounceFn = h.debounce;
    if (!renderInlineOfferRow || !debounceFn) return;

    var wrapper = document.createElement("section");
    wrapper.id = "candidateAvailableOffersSection";
    wrapper.className = "mt-8";

    var card = document.createElement("div");
    card.className = "ie-card glass-card p-6 rounded-3xl";

    var header = document.createElement("div");
    header.className = "flex items-center justify-between gap-4 mb-4";
    var title = document.createElement("h3");
    title.className = "serif text-xl font-bold text-[#1b4332] section-title";
    title.textContent = "Available Offers";
    header.appendChild(title);
    card.appendChild(header);

    var searchWrap = document.createElement("div");
    searchWrap.className = "mb-3";
    var input = document.createElement("input");
    input.type = "text";
    input.className = "form-input text-sm";
    input.placeholder = "Search offers by title...";
    input.setAttribute("autocomplete", "off");
    searchWrap.appendChild(input);
    card.appendChild(searchWrap);

    var list = document.createElement("div");
    list.className = "max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white divide-y divide-gray-50";
    card.appendChild(list);

    wrapper.appendChild(card);

    if (insertAfterEl && insertAfterEl.parentNode) {
      if (insertAfterEl.nextSibling) {
        insertAfterEl.parentNode.insertBefore(wrapper, insertAfterEl.nextSibling);
      } else {
        insertAfterEl.parentNode.appendChild(wrapper);
      }
    } else {
      var activity = document.getElementById("activity-container");
      if (activity && activity.parentNode) {
        activity.parentNode.insertBefore(wrapper, activity);
      } else {
        document.body.appendChild(wrapper);
      }
    }

    var reqSeq = 0;
    var lastTerm = "";

    function getAssociatedOfferIds() {
      var assocs = candidate && Array.isArray(candidate.candidate_job_associations)
        ? candidate.candidate_job_associations
        : [];
      var set = {};
      assocs.forEach(function (a) {
        if (a && a.job_offer_id) set[String(a.job_offer_id)] = true;
      });
      return set;
    }

    async function loadOffers(term) {
      lastTerm = term || "";
      reqSeq += 1;
      var thisReq = reqSeq;

      if (!window.IESupabase || typeof window.IESupabase.fetchJobOffersPaginated !== "function") {
        list.innerHTML =
          '<div class="px-4 py-4 text-sm text-gray-400">Offers API not available.</div>';
        return;
      }

      list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">Loading...</div>';

      var filters = {
        archived: "active",
        offerStatus: "active",
        excludeArchivedStatus: true,
        title: (term || "").toString(),
      };

      try {
        var result = await window.IESupabase.fetchJobOffersPaginated({
          filters: filters,
          page: 1,
          limit: 20,
        });
        if (thisReq !== reqSeq) return;
        if (!result || result.error) {
          list.innerHTML =
            '<div class="px-4 py-4 text-sm text-red-500">Unable to load offers.</div>';
          return;
        }

        var rows = Array.isArray(result.data) ? result.data : [];
        var associated = getAssociatedOfferIds();
        var filtered = rows.filter(function (o) {
          if (!o || !o.id) return false;
          if (associated[String(o.id)]) return false;
          return true;
        });

        list.innerHTML = "";
        if (!filtered.length) {
          list.innerHTML =
            '<div class="px-4 py-4 text-sm text-gray-400">No offers available.</div>';
          return;
        }

        filtered.slice(0, 20).forEach(function (offer) {
          var row = renderInlineOfferRow(offer, {
            onClick: async function (o) {
              if (!o || !o.id) return;
              row.disabled = true;
              row.classList.add("opacity-60", "cursor-not-allowed");
              try {
                var linkRes = await linkCandidateToJobOffer(candidateId, o.id);
                if (linkRes && linkRes.error) {
                  if (window.IESupabase && window.IESupabase.showError) {
                    window.IESupabase.showError(linkRes.error.message || "Linking error.");
                  }
                  return;
                }

                if (window.IESupabase && typeof window.IESupabase.getCandidateById === "function") {
                  var fresh = await window.IESupabase.getCandidateById(candidateId);
                  if (fresh && !fresh.error && fresh.data) {
                    candidate = fresh.data;
                    var meta = document.getElementById("candidateMetadata");
                    if (meta && renderEntityMetadata) meta.innerHTML = renderEntityMetadata(candidate);
                  }
                }

                await loadOffers(lastTerm);
              } catch (e) {
                if (window.IESupabase && window.IESupabase.showError) {
                  window.IESupabase.showError(e && e.message ? e.message : "Error.");
                }
              } finally {
                row.disabled = false;
                row.classList.remove("opacity-60", "cursor-not-allowed");
              }
            },
          });
          if (row) list.appendChild(row);
        });
      } catch (e) {
        if (thisReq !== reqSeq) return;
        console.error("[ItalianExperience] Candidate Available Offers load error:", e);
        list.innerHTML =
          '<div class="px-4 py-4 text-sm text-red-500">Unable to load offers.</div>';
      }
    }

    input.addEventListener(
      "input",
      debounceFn(function () {
        loadOffers((input.value || "").trim());
      }, 250)
    );

    loadOffers("");
  }

  // ---------------------------------------------------------------------------
  // Render: Client Positions Section
  // ---------------------------------------------------------------------------

  function renderClientPositionsSection(opts) {
    var clientId = opts && opts.clientId ? String(opts.clientId) : "";
    var client = opts && opts.client ? opts.client : null;
    var mode = opts && opts.mode ? String(opts.mode) : "view";
    var isArchived = !!(opts && opts.isArchived);
    var insertAfterEl = opts && opts.insertAfterEl ? opts.insertAfterEl : null;

    var existing = document.getElementById("clientPositionsSection");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    if (!clientId || !client || mode !== "view" || isArchived) {
      return;
    }

    var h = helpers();
    var renderInlineOfferRow = h.renderInlineOfferRow;
    var renderInlineCandidateRow = h.renderInlineCandidateRow;
    var debounceFn = h.debounce;
    var createInlineBadge = h.createInlineBadge;
    if (!renderInlineOfferRow || !renderInlineCandidateRow || !debounceFn) return;

    var wrapper = document.createElement("section");
    wrapper.id = "clientPositionsSection";
    wrapper.className = "mt-8";

    var card = document.createElement("div");
    card.className = "ie-card glass-card p-6 rounded-3xl";
    wrapper.appendChild(card);

    var header = document.createElement("div");
    header.className = "flex items-center justify-between gap-4 mb-4";
    var title = document.createElement("h3");
    title.className = "serif text-xl font-bold text-[#1b4332] section-title";
    title.textContent = "Client Positions";
    header.appendChild(title);
    card.appendChild(header);

    var content = document.createElement("div");
    card.appendChild(content);

    if (insertAfterEl && insertAfterEl.parentNode) {
      if (insertAfterEl.nextSibling) {
        insertAfterEl.parentNode.insertBefore(wrapper, insertAfterEl.nextSibling);
      } else {
        insertAfterEl.parentNode.appendChild(wrapper);
      }
    } else {
      var activity = document.getElementById("activity-container");
      if (activity && activity.parentNode) {
        activity.parentNode.insertBefore(wrapper, activity);
      } else {
        document.body.appendChild(wrapper);
      }
    }

    var state = {
      expandedOfferId: null,
      offerSearchTerms: {},
    };

    function getRequiredPositions(offer) {
      var required = offer && offer.positions_required != null ? Number(offer.positions_required) : null;
      if (!Number.isFinite(required)) required = offer && offer.positions != null ? Number(offer.positions) : null;
      if (!Number.isFinite(required)) required = 1;
      return required;
    }

    function getAssociatedCandidateIdSet(offer) {
      var assocs = offer && Array.isArray(offer.candidate_job_associations) ? offer.candidate_job_associations : [];
      var set = {};
      assocs.forEach(function (a) {
        if (!a) return;
        if (a.candidate_id) set[String(a.candidate_id)] = true;
      });
      return set;
    }

    async function loadOffers() {
      if (!window.IESupabase || typeof window.IESupabase.fetchJobOffersPaginated !== "function") {
        content.innerHTML = '<div class="text-sm text-gray-400">Offers API not available.</div>';
        return;
      }
      content.innerHTML = '<div class="text-sm text-gray-400 py-2">Loading client offers...</div>';

      try {
        var result = await getClientJobOffers(clientId);
        if (!result || result.error) {
          content.innerHTML = '<div class="text-sm text-red-500">Unable to load client offers.</div>';
          return;
        }

        var rows = Array.isArray(result.data) ? result.data : [];
        var active = [];
        var closed = [];
        rows.forEach(function (o) {
          var s =
            window.IEStatusRuntime && typeof window.IEStatusRuntime.normalizeOfferStatus === "function"
              ? window.IEStatusRuntime.normalizeOfferStatus(o && o.status)
              : (o && o.status ? String(o.status).toLowerCase() : "");
          if (s === "closed") closed.push(o);
          else active.push(o);
        });

        content.innerHTML = "";
        if (!active.length && !closed.length) {
          content.innerHTML = '<div class="text-sm text-gray-400">No job offers found for this client.</div>';
          return;
        }

        function renderDivider(label) {
          var div = document.createElement("div");
          div.className = "my-4 flex items-center gap-3";
          var line1 = document.createElement("div");
          line1.className = "flex-1 h-px bg-gray-200";
          var text = document.createElement("div");
          text.className = "text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold";
          text.textContent = label;
          var line2 = document.createElement("div");
          line2.className = "flex-1 h-px bg-gray-200";
          div.appendChild(line1);
          div.appendChild(text);
          div.appendChild(line2);
          return div;
        }

        function renderOfferCard(offer) {
          var offerId = offer && offer.id ? String(offer.id) : "";
          if (!offerId) return null;

          var outer = document.createElement("div");
          outer.className = "rounded-2xl border border-gray-100 bg-white";
          outer.setAttribute("data-offer-card", offerId);

          var headerBtn = document.createElement("button");
          headerBtn.type = "button";
          headerBtn.className = "ie-btn ie-btn-secondary w-full text-left px-4 py-4 flex items-center justify-between gap-4";

          var left = document.createElement("div");
          left.className = "min-w-0";
          var t = document.createElement("div");
          t.className = "font-semibold text-gray-800 truncate";
          t.textContent = offer.title || "—";
          left.appendChild(t);

          var meta = document.createElement("div");
          meta.className = "mt-1 text-xs text-gray-500 flex items-center gap-2 flex-wrap";
          meta.appendChild(
            createInlineBadge(
              window.IEStatusRuntime ? window.IEStatusRuntime.formatOfferStatusLabel(offer.status) : offer.status,
              window.IEStatusRuntime ? window.IEStatusRuntime.getOfferStatusBadgeClass(offer.status) : ""
            )
          );
          var req = getRequiredPositions(offer);
          var count = document.createElement("span");
          count.className = "text-xs font-semibold text-gray-600";
          count.textContent = "— / " + String(req);
          meta.appendChild(count);
          left.appendChild(meta);

          var chevron = document.createElement("div");
          chevron.className = "text-gray-400 flex-shrink-0 transition-transform transform";
          chevron.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>';

          headerBtn.appendChild(left);
          headerBtn.appendChild(chevron);
          outer.appendChild(headerBtn);

          var expand = document.createElement("div");
          expand.className = "px-4 pb-4 hidden";
          outer.appendChild(expand);

          function setExpanded(expanded) {
            if (expanded) {
              expand.classList.remove("hidden");
              chevron.classList.add("rotate-180");
            } else {
              expand.classList.add("hidden");
              chevron.classList.remove("rotate-180");
            }
          }

          headerBtn.addEventListener("click", function () {
            var isOpen = state.expandedOfferId === offerId;
            state.expandedOfferId = isOpen ? null : offerId;
            loadOffers();
          });

          if (state.expandedOfferId === offerId) {
            setExpanded(true);

            var sectionTitle = document.createElement("div");
            sectionTitle.className = "mt-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400";
            sectionTitle.textContent = "Available Candidates";
            expand.appendChild(sectionTitle);

            var input = document.createElement("input");
            input.type = "text";
            input.className = "form-input text-sm mt-3";
            input.placeholder = "Search candidate by name...";
            input.setAttribute("autocomplete", "off");
            input.value = state.offerSearchTerms[offerId] || "";
            expand.appendChild(input);

            var list = document.createElement("div");
            list.className = "mt-3 max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white divide-y divide-gray-50";
            expand.appendChild(list);

            var excluded = getAssociatedCandidateIdSet(offer);
            var reqSeq = 0;

            async function loadCandidates(term) {
              state.offerSearchTerms[offerId] = term || "";
              reqSeq += 1;
              var thisReq = reqSeq;

              if (!window.IESupabase || typeof window.IESupabase.fetchCandidatesPaginated !== "function") {
                list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">Candidates API not available.</div>';
                return;
              }

              list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">Loading...</div>';

              try {
                var res = await window.IESupabase.fetchCandidatesPaginated({
                  filters: { archived: "active", name: (term || "").toString() },
                  page: 1,
                  limit: 20,
                });
                if (thisReq !== reqSeq) return;
                if (!res || res.error) {
                  list.innerHTML = '<div class="px-4 py-4 text-sm text-red-500">Unable to load candidates.</div>';
                  return;
                }
                var rows = Array.isArray(res.data) ? res.data : [];
                var filtered = rows.filter(function (c) {
                  if (!c || !c.id) return false;
                  if (excluded[String(c.id)]) return false;
                  if (window.IEStatusRuntime && window.IEStatusRuntime.isCandidateHired(c)) return false;
                  return window.IEStatusRuntime && window.IEStatusRuntime.computeCandidateAvailability(c) === "available";
                });

                list.innerHTML = "";
                if (!filtered.length) {
                  list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">No candidates available.</div>';
                  return;
                }

                filtered.slice(0, 20).forEach(function (c) {
                  var row = renderInlineCandidateRow(c, {
                    onClick: async function (cand) {
                      if (!cand || !cand.id) return;
                      row.disabled = true;
                      row.classList.add("opacity-60", "cursor-not-allowed");
                      try {
                        var linkRes = await linkCandidateToJobOffer(cand.id, offerId);
                        if (linkRes && linkRes.error) {
                          if (window.IESupabase && window.IESupabase.showError) {
                            window.IESupabase.showError(linkRes.error.message || "Linking error.");
                          }
                          return;
                        }
                        excluded[String(cand.id)] = true;
                        await loadOffers();
                      } catch (e) {
                        if (window.IESupabase && window.IESupabase.showError) {
                          window.IESupabase.showError(e && e.message ? e.message : "Error.");
                        }
                      } finally {
                        row.disabled = false;
                        row.classList.remove("opacity-60", "cursor-not-allowed");
                      }
                    },
                  });
                  if (row) list.appendChild(row);
                });
              } catch (e) {
                if (thisReq !== reqSeq) return;
                console.error("[ItalianExperience] Client offer candidates load error:", e);
                list.innerHTML = '<div class="px-4 py-4 text-sm text-red-500">Unable to load candidates.</div>';
              }
            }

            input.addEventListener(
              "input",
              debounceFn(function () {
                loadCandidates((input.value || "").trim());
              }, 250)
            );

            loadCandidates((input.value || "").trim());
          } else {
            setExpanded(false);
          }

          return outer;
        }

        active.forEach(function (o) {
          var cardEl = renderOfferCard(o);
          if (cardEl) content.appendChild(cardEl);
        });

        if (active.length && closed.length) {
          content.appendChild(renderDivider("Closed offers"));
        }

        closed.forEach(function (o) {
          var cardEl = renderOfferCard(o);
          if (cardEl) content.appendChild(cardEl);
        });
      } catch (e) {
        console.error("[ItalianExperience] Client Positions load error:", e);
        content.innerHTML = '<div class="text-sm text-red-500">Unable to load client offers.</div>';
      }
    }

    loadOffers();
  }

  // ---------------------------------------------------------------------------
  // Render: Job Offer Associated Candidates (requires callbacks from job offer page)
  // ---------------------------------------------------------------------------

  async function renderAssociatedCandidates(jobOfferId, offer, callbacks) {
    if (!window.IESupabase || !window.IESupabase.fetchCandidatesForJobOffer) return;
    var result = await getCandidatesForJobOffer(jobOfferId);
    if (result.error) {
      console.error("[ItalianExperience] fetchCandidatesForJobOffer error:", result.error);
      return;
    }
    var list = result.data || [];
    var associatedCandidateIds = list.map(function (item) {
      var c = item.candidates;
      return c && c.id ? c.id : null;
    }).filter(Boolean);

    var h = helpers();
    var openAssociationRejectionModal = h.openAssociationRejectionModal;
    var openReopenOfferModal = h.openReopenOfferModal;
    var populateFormFromOffer = callbacks && callbacks.populateFormFromOffer;
    var renderActionButtons = callbacks && callbacks.renderActionButtons;

    var container = document.getElementById("associated-candidates-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "associated-candidates-container";
      container.className = "mt-8";
      var formActions = document.getElementById("form-action-buttons");
      if (formActions && formActions.nextSibling) {
        formActions.parentNode.insertBefore(container, formActions.nextSibling);
      } else if (formActions) {
        formActions.parentNode.appendChild(container);
      } else {
        var form = document.getElementById("jobOfferForm");
        if (form) form.appendChild(container);
      }
    }
    container.innerHTML = "";

    if (list.length === 0) {
      var emptyMsg = document.createElement("p");
      emptyMsg.className = "text-gray-500 text-sm";
      emptyMsg.textContent = "No candidates associated yet.";
      container.appendChild(emptyMsg);
    } else {
      var glassCard = document.createElement("div");
      glassCard.className = "ie-card glass-card p-6 rounded-3xl overflow-x-auto";
      var table = document.createElement("table");
      table.className = "w-full text-left border-collapse";
      var thead = document.createElement("thead");
      var headerRow = document.createElement("tr");
      ["Name", "Position", "Status", "Change", "Remove"].forEach(function (label) {
        var th = document.createElement("th");
        th.className = "pb-3 text-sm font-semibold text-gray-700 border-b border-gray-200";
        th.textContent = label;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      var tbody = document.createElement("tbody");

      var STATUS_OPTIONS =
        window.IEStatusRuntime && window.IEStatusRuntime.APPLICATION_STATUS_CANONICAL
          ? window.IEStatusRuntime.APPLICATION_STATUS_CANONICAL
          : [];

      list.forEach(function (item) {
        var c = item.candidates || {};
        var candidateId = c && c.id ? c.id : null;
        var name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
        var position = (c.position && c.position.toString()) || "—";
        var status =
          window.IEStatusRuntime && typeof window.IEStatusRuntime.normalizeApplicationStatusForDisplay === "function"
            ? window.IEStatusRuntime.normalizeApplicationStatusForDisplay(
                (item.status && item.status.toString()) || "applied"
              )
            : ((item.status && item.status.toString()) || "applied");
        var rejectionReason = item.rejection_reason || null;
        var tr = document.createElement("tr");
        tr.className = "border-b border-gray-100";
        tr.setAttribute("data-row-association-id", item.id);
        var tdName = document.createElement("td");
        tdName.className = "py-3 text-sm";
        if (candidateId) {
          var nameLink = document.createElement("a");
          nameLink.href = window.IEPortal.links.candidateView(candidateId);
          nameLink.className = "text-[#1b4332] font-semibold hover:underline";
          nameLink.textContent = name;
          tdName.appendChild(nameLink);
        } else {
          tdName.textContent = name;
        }
        tr.appendChild(tdName);
        var tdPosition = document.createElement("td");
        tdPosition.className = "py-3 text-sm text-gray-600";
        tdPosition.textContent = position;
        tr.appendChild(tdPosition);
        var tdStatus = document.createElement("td");
        tdStatus.className = "py-3 text-sm text-gray-600 status-cell";
        var badge = document.createElement("span");
        badge.className =
          "badge " +
          (window.IEStatusRuntime && typeof window.IEStatusRuntime.getApplicationStatusBadgeClass === "function"
            ? window.IEStatusRuntime.getApplicationStatusBadgeClass(status)
            : "badge-applied");
        badge.textContent =
          window.IEStatusRuntime && typeof window.IEStatusRuntime.formatApplicationStatusLabel === "function"
            ? window.IEStatusRuntime.formatApplicationStatusLabel(status)
            : String(status || "Applied");
        tdStatus.innerHTML = "";
        tdStatus.appendChild(badge);
        tr.appendChild(tdStatus);
        var tdChange = document.createElement("td");
        tdChange.className = "py-3";
        var select = document.createElement("select");
        select.className = "form-input appearance-none text-sm py-2 pr-8";
        select.setAttribute("data-association-id", item.id);
        STATUS_OPTIONS.forEach(function (opt) {
          var option = document.createElement("option");
          option.value = opt;
          option.textContent =
            window.IEStatusRuntime && typeof window.IEStatusRuntime.formatApplicationStatusLabel === "function"
              ? window.IEStatusRuntime.formatApplicationStatusLabel(opt)
              : String(opt || "Applied");
          if (opt === status) option.selected = true;
          select.appendChild(option);
        });
        var previousStatus = status;

        var rejectionBtn = null;
        function ensureRejectionButton() {
          if (rejectionBtn) return;
          rejectionBtn = document.createElement("button");
          rejectionBtn.type = "button";
          rejectionBtn.className = "mt-2 text-xs text-[#1b4332] font-semibold hover:underline block text-left";
          rejectionBtn.textContent = rejectionReason ? "View / Edit rejection reason" : "Add rejection reason";
          rejectionBtn.addEventListener("click", function () {
            if (openAssociationRejectionModal) {
              openAssociationRejectionModal({
                associationId: item.id,
                candidateName: name,
                jobTitle: offer && offer.title ? String(offer.title) : "this job",
                initialReason: rejectionReason,
                onSaved: function (newReason) {
                  rejectionReason = newReason;
                  if (rejectionBtn) {
                    rejectionBtn.textContent = newReason ? "View / Edit rejection reason" : "Add rejection reason";
                  }
                  previousStatus = "rejected";
                  select.value = "rejected";
                  var statusCell = tr.querySelector(".status-cell");
                  if (statusCell) {
                    statusCell.innerHTML = "";
                    var badgeEl = document.createElement("span");
                    badgeEl.className =
                      "badge " +
                      (window.IEStatusRuntime && typeof window.IEStatusRuntime.getApplicationStatusBadgeClass === "function"
                        ? window.IEStatusRuntime.getApplicationStatusBadgeClass("rejected")
                        : "badge-applied");
                    badgeEl.textContent =
                      window.IEStatusRuntime && typeof window.IEStatusRuntime.formatApplicationStatusLabel === "function"
                        ? window.IEStatusRuntime.formatApplicationStatusLabel("rejected")
                        : "Rejected";
                    statusCell.appendChild(badgeEl);
                  }
                },
              });
            }
          });
          tdChange.appendChild(rejectionBtn);
        }

        function removeRejectionButton() {
          if (rejectionBtn && rejectionBtn.parentNode) {
            rejectionBtn.parentNode.removeChild(rejectionBtn);
          }
          rejectionBtn = null;
        }

        if (status === "rejected") {
          ensureRejectionButton();
        }

        select.addEventListener("change", async function () {
          var associationId = select.getAttribute("data-association-id");
          var newStatus = select.value;

          if (newStatus === "rejected") {
            select.value = previousStatus;
            if (openAssociationRejectionModal) {
              openAssociationRejectionModal({
                associationId: associationId,
                candidateName: name,
                jobTitle: offer && offer.title ? String(offer.title) : "this job",
                initialReason: rejectionReason,
                onSaved: function (newReason) {
                  rejectionReason = newReason;
                  previousStatus = "rejected";
                  select.value = "rejected";
                  var statusCell = tr.querySelector(".status-cell");
                  if (statusCell) {
                    statusCell.innerHTML = "";
                    var badgeEl = document.createElement("span");
                    badgeEl.className =
                      "badge " +
                      (window.IEStatusRuntime && typeof window.IEStatusRuntime.getApplicationStatusBadgeClass === "function"
                        ? window.IEStatusRuntime.getApplicationStatusBadgeClass("rejected")
                        : "badge-applied");
                    badgeEl.textContent =
                      window.IEStatusRuntime && typeof window.IEStatusRuntime.formatApplicationStatusLabel === "function"
                        ? window.IEStatusRuntime.formatApplicationStatusLabel("rejected")
                        : "Rejected";
                    statusCell.appendChild(badgeEl);
                  }
                  ensureRejectionButton();
                  if (rejectionBtn) {
                    rejectionBtn.textContent = newReason ? "View / Edit rejection reason" : "Add rejection reason";
                  }
                },
              });
            }
            return;
          }

          var statusSelect = document.querySelector('#jobOfferForm [name="status"]');
          var normalizedOfferStatus = statusSelect
            ? (window.IEToolbar && typeof window.IEToolbar.normalizeStatus === "function"
              ? window.IEToolbar.normalizeStatus(statusSelect.value)
              : statusSelect.value)
            : "active";
          if (normalizedOfferStatus === "closed" && newStatus === "hired") {
            select.value = previousStatus;
            if (openReopenOfferModal) {
              openReopenOfferModal(jobOfferId, offer, {
                onConfirm: async function (updatedOffer) {
                  if (populateFormFromOffer) populateFormFromOffer(updatedOffer);
                  if (renderActionButtons) renderActionButtons("view", jobOfferId, updatedOffer);
                  if (!window.IESupabase || !window.IESupabase.updateCandidateAssociationStatus) return;
                  var hireRes = await window.IESupabase.updateCandidateAssociationStatus(associationId, "hired");
                  if (hireRes.error) {
                    if (window.IESupabase.showError) window.IESupabase.showError(hireRes.error.message || "Error updating status.");
                    throw new Error(hireRes.error.message || "Error updating status.");
                  }
                  await renderAssociatedCandidates(jobOfferId, updatedOffer, callbacks);
                },
              });
            }
            return;
          }
          if (!window.IESupabase || !window.IESupabase.updateCandidateAssociationStatus) return;
          var res = await window.IESupabase.updateCandidateAssociationStatus(associationId, newStatus);
          if (res.error) {
            if (window.IESupabase.showError) window.IESupabase.showError(res.error.message || "Error updating status.");
            return;
          }
          var statusCell = tr.querySelector(".status-cell");
          if (statusCell) {
            statusCell.innerHTML = "";
            var badge = document.createElement("span");
            badge.className =
              "badge " +
              (window.IEStatusRuntime && typeof window.IEStatusRuntime.getApplicationStatusBadgeClass === "function"
                ? window.IEStatusRuntime.getApplicationStatusBadgeClass(newStatus)
                : "badge-applied");
            badge.textContent =
              window.IEStatusRuntime && typeof window.IEStatusRuntime.formatApplicationStatusLabel === "function"
                ? window.IEStatusRuntime.formatApplicationStatusLabel(newStatus)
                : String(newStatus || "Applied");
            statusCell.appendChild(badge);
          }
          previousStatus = newStatus;
          if (newStatus !== "rejected") {
            removeRejectionButton();
          }
        });
        tdChange.appendChild(select);
        tr.appendChild(tdChange);
        var tdRemove = document.createElement("td");
        tdRemove.className = "py-3";
        var removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-all";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", async function () {
          if (!window.confirm("Remove this candidate from the job offer?")) return;
          var associationId = tr.getAttribute("data-row-association-id");
          var result = await unlinkCandidateFromJobOffer(associationId);
          if (!result.error) {
            await renderAssociatedCandidates(jobOfferId, offer, callbacks);
          } else {
            if (window.IESupabase.showError) window.IESupabase.showError(result.error.message || "Error removing.");
          }
        });
        tdRemove.appendChild(removeBtn);
        tr.appendChild(tdRemove);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      glassCard.appendChild(table);
      container.appendChild(glassCard);
    }

    var addCandidateWrap = document.createElement("div");
    addCandidateWrap.className = "mt-4";
    var addCandidateBtn = document.createElement("button");
    addCandidateBtn.type = "button";
    addCandidateBtn.className = "px-4 py-2.5 rounded-xl border border-[#1b4332] text-[#1b4332] font-semibold text-sm hover:bg-[#1b4332]/5 transition-all flex items-center gap-2";
    addCandidateBtn.innerHTML = "<span class=\"text-lg leading-none\">+</span> Add Candidate";
    addCandidateBtn.addEventListener("click", function () {
      var existingWrap = container.querySelector("[data-assoc-inline-wrap='joboffer-add-candidate']");
      if (existingWrap) {
        existingWrap.remove();
        addCandidateBtn.setAttribute("aria-expanded", "false");
        return;
      }
      showAddCandidateInlinePanel(container, addCandidateBtn, jobOfferId, associatedCandidateIds, function () {
        renderAssociatedCandidates(jobOfferId, offer, callbacks);
      }, callbacks);
      addCandidateBtn.setAttribute("aria-expanded", "true");
    });
    addCandidateWrap.appendChild(addCandidateBtn);
    container.appendChild(addCandidateWrap);
  }

  function showAddCandidateInlinePanel(container, triggerBtn, jobOfferId, associatedCandidateIds, onLinked, callbacks) {
    var h = helpers();
    var renderInlineCandidateRow = h.renderInlineCandidateRow;
    var debounceFn = h.debounce;
    if (!renderInlineCandidateRow || !debounceFn) return;

    var wrap = document.createElement("div");
    wrap.className = "mt-3 p-4 rounded-2xl border border-gray-200 bg-white shadow-sm";
    wrap.setAttribute("data-assoc-inline-wrap", "joboffer-add-candidate");

    var inputRow = document.createElement("div");
    inputRow.className = "flex flex-col sm:flex-row gap-2 sm:items-center";

    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search candidate by name...";
    input.className = "form-input flex-1 text-sm";
    input.setAttribute("autocomplete", "off");

    var cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all";
    cancelBtn.textContent = "Cancel";

    inputRow.appendChild(input);
    inputRow.appendChild(cancelBtn);
    wrap.appendChild(inputRow);

    var list = document.createElement("div");
    list.className = "mt-3 max-h-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white divide-y divide-gray-50";
    wrap.appendChild(list);

    var excluded = {};
    (associatedCandidateIds || []).forEach(function (id) {
      if (id) excluded[String(id)] = true;
    });

    var reqSeq = 0;
    var lastTerm = "";

    function close() {
      if (triggerBtn) triggerBtn.setAttribute("aria-expanded", "false");
      wrap.remove();
    }

    cancelBtn.addEventListener("click", close);

    async function loadCandidates(term) {
      lastTerm = (term || "").toString();
      reqSeq += 1;
      var thisReq = reqSeq;

      if (!window.IESupabase || typeof window.IESupabase.fetchCandidatesPaginated !== "function") {
        list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">Candidates API not available.</div>';
        return;
      }

      list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">Loading...</div>';

      try {
        var result = await window.IESupabase.fetchCandidatesPaginated({
          filters: { archived: "active", name: lastTerm },
          page: 1,
          limit: 20,
        });
        if (thisReq !== reqSeq) return;
        if (!result || result.error) {
          list.innerHTML = '<div class="px-4 py-4 text-sm text-red-500">Unable to load candidates.</div>';
          return;
        }

        var rows = Array.isArray(result.data) ? result.data : [];
        var filtered = rows.filter(function (c) {
          if (!c || !c.id) return false;
          if (excluded[String(c.id)]) return false;
          if (window.IEStatusRuntime && window.IEStatusRuntime.isCandidateHired(c)) return false;
          return window.IEStatusRuntime && window.IEStatusRuntime.computeCandidateAvailability(c) === "available";
        });

        list.innerHTML = "";
        if (!filtered.length) {
          list.innerHTML = '<div class="px-4 py-4 text-sm text-gray-400">No candidates available.</div>';
          return;
        }

        filtered.slice(0, 20).forEach(function (c) {
          var row = renderInlineCandidateRow(c, {
            onClick: async function (candidate) {
              if (!candidate || !candidate.id) return;
              row.disabled = true;
              row.classList.add("opacity-60", "cursor-not-allowed");
              try {
                var res = await linkCandidateToJobOffer(candidate.id, jobOfferId);
                if (res && res.error) {
                  if (window.IESupabase && window.IESupabase.showError) {
                    window.IESupabase.showError(res.error.message || "Linking error.");
                  }
                  return;
                }
                excluded[String(candidate.id)] = true;
                if (typeof onLinked === "function") onLinked();
                await loadCandidates(lastTerm);
              } catch (e) {
                if (window.IESupabase && window.IESupabase.showError) {
                  window.IESupabase.showError(e && e.message ? e.message : "Error.");
                }
              } finally {
                row.disabled = false;
                row.classList.remove("opacity-60", "cursor-not-allowed");
              }
            },
          });
          if (row) list.appendChild(row);
        });
      } catch (e) {
        if (thisReq !== reqSeq) return;
        console.error("[ItalianExperience] Add Candidate panel load error:", e);
        list.innerHTML = '<div class="px-4 py-4 text-sm text-red-500">Unable to load candidates.</div>';
      }
    }

    input.addEventListener(
      "input",
      debounceFn(function () {
        loadCandidates((input.value || "").trim());
      }, 250)
    );

    triggerBtn.parentNode.insertBefore(wrap, triggerBtn.nextSibling);
    setTimeout(function () { input.focus(); }, 50);
    loadCandidates("");
  }

  window.IEAssociationsRuntime = {
    linkCandidateToJobOffer: linkCandidateToJobOffer,
    unlinkCandidateFromJobOffer: unlinkCandidateFromJobOffer,
    getCandidatesForJobOffer: getCandidatesForJobOffer,
    getClientJobOffers: getClientJobOffers,
    renderCandidateAvailableOffersSection: renderCandidateAvailableOffersSection,
    renderClientPositionsSection: renderClientPositionsSection,
    renderAssociatedCandidates: renderAssociatedCandidates,
    showAddCandidateInlinePanel: showAddCandidateInlinePanel,
  };
})();

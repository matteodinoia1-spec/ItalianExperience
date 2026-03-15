// ============================================================================
// Job Postings list page – load and render
// ============================================================================

(function () {
  "use strict";

  function getPublicPostingUrl(slug) {
    if (!slug || !String(slug).trim()) return null;
    if (!window.IEConfig || !window.IEConfig.BASE_PATH) {
      console.error(
        "[ItalianExperience] IEConfig.BASE_PATH is required for public job posting URLs (job-postings list)."
      );
      return null;
    }
    var base = window.IEConfig.BASE_PATH;
    base = String(base).replace(/\/$/, "");
    return window.location.origin + base + "/recruitment/jobs/?slug=" + encodeURIComponent(String(slug).trim());
  }

  /**
   * Build the portal URL for the internal job posting detail page.
   * @param {string} postingId - job_postings.id
   * @returns {string|null}
   */
  function getPostingDetailUrl(postingId) {
    if (!postingId || String(postingId).trim() === "") return null;
    var base = "";
    if (window.IERouter && typeof window.IERouter.derivePortalBasePath === "function") {
      base = window.IERouter.derivePortalBasePath();
    } else {
      try {
        base = new URL(".", window.location.href).href;
      } catch (_) {}
    }
    return base + "job-posting.html?id=" + encodeURIComponent(String(postingId).trim());
  }

  /**
   * Build the portal URL to view the linked job offer (internal).
   * Uses job_offer_id only; never posting.id. Prefers base path so the link
   * resolves correctly from any portal subpath.
   */
  function getOfferViewUrl(jobOfferId) {
    if (jobOfferId == null || String(jobOfferId).trim() === "") return null;
    var id = String(jobOfferId).trim();
    var base = "";
    if (window.IERouter && typeof window.IERouter.derivePortalBasePath === "function") {
      base = window.IERouter.derivePortalBasePath();
    } else {
      try {
        base = new URL(".", window.location.href).href;
      } catch (_) {}
    }
    return base + "job-offer.html?id=" + encodeURIComponent(id) + "&mode=view";
  }

  function formatDate(value) {
    if (window.IEFormatters && typeof window.IEFormatters.formatDate === "function") {
      return window.IEFormatters.formatDate(value, { locale: "en-GB", day: "2-digit", month: "short", year: "numeric", fallback: "—" });
    }
    if (!value) return "—";
    try {
      var d = new Date(value);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch (_) {
      return "—";
    }
  }

  function publicStatusLabel(posting) {
    if (!posting) return "—";
    if (!posting.is_published) return "Draft";
    return "Published";
  }

  function applyStatusLabel(posting) {
    if (!posting) return "—";
    if (!posting.is_published) return "—";
    var deadlineStr = posting.apply_deadline || null;
    var deadlinePassed = window.IEJobPostingDeadline && typeof window.IEJobPostingDeadline.isApplyDeadlinePassed === "function"
      ? window.IEJobPostingDeadline.isApplyDeadlinePassed(deadlineStr)
      : (function () {
          if (!deadlineStr) return false;
          var d = new Date(deadlineStr);
          return !isNaN(d.getTime()) && d.getTime() < Date.now();
        })();
    if (!posting.apply_enabled) return "Closed";
    if (deadlinePassed) return "Closed (deadline)";
    return "Open";
  }

  function escapeHtml(text) {
    if (window.IEFormatters && typeof window.IEFormatters.escapeHtml === "function") {
      return window.IEFormatters.escapeHtml(text);
    }
    var div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  function initJobPostingsListPage() {
    var tbody = document.querySelector("[data-ie-jobpostings-body]");
    var summaryEl = document.querySelector("[data-ie-jobpostings-summary]");
    if (!tbody) return;

    if (!window.IESupabase || typeof window.IESupabase.listJobPostings !== "function") {
      tbody.innerHTML = '<tr><td colspan="8" class="ie-table-td text-center text-amber-700 py-8">Job postings data not available.</td></tr>';
      if (summaryEl) summaryEl.textContent = "0 postings";
      document.body.style.visibility = "visible";
      return;
    }

    window.IESupabase
      .listJobPostings()
      .then(function (result) {
        if (result && result.error) {
          tbody.innerHTML = '<tr><td colspan="8" class="ie-table-td text-center text-red-600 py-8">Error loading postings.</td></tr>';
          if (summaryEl) summaryEl.textContent = "0 postings";
          document.body.style.visibility = "visible";
          return;
        }

        var postings = Array.isArray(result.data) ? result.data : [];
        var offerIds = [];
        postings.forEach(function (p) {
          if (p && p.job_offer_id) offerIds.push(p.job_offer_id);
        });
        var uniqueIds = Array.from(new Set(offerIds));
        var offerMap = {};

        function loadOffersThenRender() {
          Promise.all(
            uniqueIds.map(function (id) {
              return window.IESupabase.getJobOfferById && window.IESupabase.getJobOfferById(id);
            })
          ).then(function (offerResults) {
            uniqueIds.forEach(function (id, i) {
              var res = offerResults[i];
              if (res && !res.error && res.data) {
                offerMap[id] = res.data;
              }
            });
            renderRows(postings, offerMap);
          }).catch(function () {
            renderRows(postings, offerMap);
          });
        }

        function renderRows(list, offersById) {
          tbody.innerHTML = "";
          if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="ie-table-td text-center text-gray-500 py-8">No job postings yet. Create one from a job offer detail.</td></tr>';
          } else {
            list.forEach(function (p) {
              var offer = (p && p.job_offer_id && offersById[p.job_offer_id]) || null;
              var offerTitle = offer && offer.title ? String(offer.title).trim() : (p.job_offer_id ? "—" : "—");
              var pubStatus = publicStatusLabel(p);
              var applyStatus = applyStatusLabel(p);
              var deadlineText = p.apply_deadline ? formatDate(p.apply_deadline) : "—";
              var updatedText = p.updated_at ? formatDate(p.updated_at) : "—";
              var slug = (p.slug && String(p.slug).trim()) || "—";
              var publicUrl = getPublicPostingUrl(p.slug);
              var detailUrl = getPostingDetailUrl(p.id);
              var titleCellHtml = detailUrl
                ? "<a href=\"" + escapeHtml(detailUrl) + "\" class=\"text-[#1b4332] hover:underline font-medium\">" + escapeHtml(p.public_title || "—") + "</a>"
                : escapeHtml(p.public_title || "—");

              var tr = document.createElement("tr");
              tr.className = "hover:bg-gray-50/50 cursor-pointer";
              if (detailUrl) tr.setAttribute("data-ie-posting-detail-url", detailUrl);
              tr.innerHTML =
                "<td class=\"ie-table-td text-gray-900\">" + titleCellHtml + "</td>" +
                "<td class=\"ie-table-td font-mono text-xs text-gray-600\">" + escapeHtml(slug) + "</td>" +
                "<td class=\"ie-table-td\">" +
                  (getOfferViewUrl(p.job_offer_id)
                    ? "<a href=\"" + escapeHtml(getOfferViewUrl(p.job_offer_id)) + "\" class=\"text-[#1b4332] hover:underline\">" + escapeHtml(offerTitle) + "</a>"
                    : escapeHtml(offerTitle)) +
                "</td>" +
                "<td class=\"ie-table-td\"><span class=\"inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold " +
                  (p.is_published ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700") + "\">" + escapeHtml(pubStatus) + "</span></td>" +
                "<td class=\"ie-table-td\"><span class=\"inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold " +
                  (applyStatus === "Open" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800") + "\">" + escapeHtml(applyStatus) + "</span></td>" +
                "<td class=\"ie-table-td text-gray-600\">" + escapeHtml(deadlineText) + "</td>" +
                "<td class=\"ie-table-td text-gray-600\">" + escapeHtml(updatedText) + "</td>" +
                "<td class=\"ie-table-td\"><div class=\"flex flex-wrap items-center justify-center gap-2\">" +
                  (getOfferViewUrl(p.job_offer_id)
                    ? "<a href=\"" + escapeHtml(getOfferViewUrl(p.job_offer_id)) + "\" class=\"ie-btn ie-btn-secondary text-xs py-1.5 px-2.5\" title=\"Open linked job offer\">Offer</a>"
                    : "") +
                  (publicUrl
                    ? "<a href=\"" + escapeHtml(publicUrl) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"ie-btn ie-btn-secondary text-xs py-1.5 px-2.5\" title=\"Open public page\">Public</a>" +
                      "<button type=\"button\" class=\"ie-btn ie-btn-secondary text-xs py-1.5 px-2.5 copy-link-btn\" data-url=\"" + escapeHtml(publicUrl) + "\" title=\"Copy apply link\">Copy</button>"
                    : "") +
                "</div></td>";
              tbody.appendChild(tr);

              // Row click: navigate to posting detail; actions and first-column link must not trigger it
              if (detailUrl) {
                tr.addEventListener("click", function (e) {
                  if (e.target.closest("td:last-child")) return;
                  var firstLink = tr.querySelector("td:first-child a");
                  if (firstLink && firstLink.contains(e.target)) return;
                  window.location.href = detailUrl;
                });
                var actionsTd = tr.querySelector("td:last-child");
                if (actionsTd) {
                  actionsTd.addEventListener("click", function (e) {
                    e.stopPropagation();
                  });
                }
                var titleLink = tr.querySelector("td:first-child a");
                if (titleLink) {
                  titleLink.addEventListener("click", function (e) {
                    e.stopPropagation();
                  });
                }
              }
            });

            tbody.querySelectorAll(".copy-link-btn").forEach(function (btn) {
              var url = btn.getAttribute("data-url");
              if (!url) return;
              btn.addEventListener("click", function () {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(url).then(
                    function () {
                      if (window.IESupabase && window.IESupabase.showSuccess) {
                        window.IESupabase.showSuccess("Link copied to clipboard.");
                      }
                    },
                    function () {}
                  );
                }
              });
            });
          }

          if (summaryEl) {
            summaryEl.textContent = list.length === 1 ? "1 posting" : list.length + " postings";
          }
          document.body.style.visibility = "visible";
        }

        if (uniqueIds.length === 0) {
          renderRows(postings, offerMap);
        } else {
          loadOffersThenRender();
        }
      })
      .catch(function () {
        tbody.innerHTML = '<tr><td colspan="8" class="ie-table-td text-center text-red-600 py-8">Error loading postings.</td></tr>';
        if (summaryEl) summaryEl.textContent = "0 postings";
        document.body.style.visibility = "visible";
      });
  }

  // List init is owned by page-bootstrap.runDataViews("job-postings").
  // Do not self-init here to avoid double init.
  window.IEJobPostingsListRuntime = {
    initJobPostingsListPage: initJobPostingsListPage,
  };
})();

// ============================================================================
// Job Posting detail page – load by job_posting.id, hero, content, mini dashboard, pipeline
// ----------------------------------------------------------------------------
// Internal page: portal/job-posting.html?id=<job_posting_id>
// Data: job_postings by id, then linked job_offer by job_offer_id.
// Pipeline and counts use the linked job offer (same as job-offer page).
// ============================================================================

(function () {
  "use strict";

  function getPublicPostingUrl(slug) {
    if (!slug || !String(slug).trim()) return null;
    var base = (window.IEConfig && window.IEConfig.BASE_PATH) || "/ItalianExperience";
    base = String(base).replace(/\/$/, "");
    return window.location.origin + base + "/recruitment/jobs/?slug=" + encodeURIComponent(String(slug).trim());
  }

  function getOfferViewUrl(jobOfferId) {
    if (jobOfferId == null || String(jobOfferId).trim() === "") return null;
    var base = "";
    if (window.IERouter && typeof window.IERouter.derivePortalBasePath === "function") {
      base = window.IERouter.derivePortalBasePath();
    } else {
      try {
        base = new URL(".", window.location.href).href;
      } catch (_) {}
    }
    return base + "job-offer.html?id=" + encodeURIComponent(String(jobOfferId).trim()) + "&mode=view";
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

  /**
   * Uses the same effective state as the Public Job Posting card (job-offer-runtime).
   * Applications Open is only true when offer is open, posting is published, apply_enabled, and deadline not passed.
   */
  function getLifecycleState(offer, posting) {
    if (typeof window.computeEffectiveApplyState !== "function") {
      return {
        isPublished: posting ? !!posting.is_published : false,
        applyEnabled: posting ? !!posting.apply_enabled : false,
        applyOpen: posting ? !!posting.apply_enabled && !!posting.is_published : false,
        blockedByOffer: false,
      };
    }
    return window.computeEffectiveApplyState(offer || null, posting || null);
  }

  function wireHeroSwitches(posting, offer, onUpdate) {
    if (!posting || !posting.id) return;
    var publishToggle = document.querySelector("[data-ie-posting-hero-publish-toggle]");
    var applyToggle = document.querySelector("[data-ie-posting-hero-apply-toggle]");
    var applyDisabledReason = document.querySelector("[data-ie-posting-hero-apply-disabled-reason]");
    var lifecycle = getLifecycleState(offer, posting);
    var isPublished = lifecycle.isPublished;
    var blockedByOffer = !!lifecycle.blockedByOffer;

    if (publishToggle) {
      publishToggle.checked = !!isPublished;
      publishToggle.disabled = false;
      publishToggle.onchange = null;
      publishToggle.onchange = function () {
        if (!window.IESupabase || typeof window.IESupabase.updateJobPosting !== "function") return;
        var nextPublished = !!publishToggle.checked;
        var payload = { is_published: nextPublished };
        if (nextPublished && !posting.published_at) {
          payload.published_at = new Date().toISOString();
        }
        publishToggle.disabled = true;
        window.IESupabase.updateJobPosting(posting.id, payload).then(function (result) {
          publishToggle.disabled = false;
          if (result && result.error) {
            if (window.IESupabase.showError) {
              window.IESupabase.showError(result.error.message || "Error updating publication status.");
            }
            publishToggle.checked = !!isPublished;
            return;
          }
          var updated = (result && result.data) || Object.assign({}, posting, payload);
          if (window.IESupabase.showSuccess) {
            window.IESupabase.showSuccess(nextPublished ? "Posting published." : "Posting unpublished.");
          }
          if (posting.job_offer_id && typeof window.IESupabase.createAutoLog === "function") {
            window.IESupabase.createAutoLog("job_offer", posting.job_offer_id, {
              event_type: "system_event",
              message: nextPublished ? "Public posting published" : "Public posting unpublished",
              metadata: { action: nextPublished ? "posting_published" : "posting_unpublished", job_posting_id: posting.id },
            }).catch(function () {});
          }
          if (onUpdate) onUpdate(updated);
        }).catch(function (e) {
          publishToggle.disabled = false;
          publishToggle.checked = !!isPublished;
          if (window.IESupabase && window.IESupabase.showError) {
            window.IESupabase.showError(e && e.message ? e.message : "Error updating publication status.");
          }
        });
      };
    }

    if (applyToggle) {
      applyToggle.checked = !!lifecycle.applyOpen;
      var applyDisabled = !isPublished || blockedByOffer;
      applyToggle.disabled = applyDisabled;
      if (applyDisabledReason) {
        if (applyDisabled) {
          applyDisabledReason.textContent = !isPublished
            ? "Publish the posting first to open applications."
            : "The linked job offer is not open. Open the job offer to allow applications.";
          applyDisabledReason.classList.remove("hidden");
        } else {
          applyDisabledReason.textContent = "";
          applyDisabledReason.classList.add("hidden");
        }
      }
      applyToggle.onchange = null;
      applyToggle.onchange = function () {
        if (applyToggle.disabled) return;
        if (!window.IESupabase || typeof window.IESupabase.updateJobPosting !== "function") return;
        var nextApplyEnabled = !!applyToggle.checked;
        var payload = { apply_enabled: nextApplyEnabled };
        applyToggle.disabled = true;
        window.IESupabase.updateJobPosting(posting.id, payload).then(function (result) {
          applyToggle.disabled = false;
          if (result && result.error) {
            if (window.IESupabase.showError) {
              window.IESupabase.showError(result.error.message || "Error updating apply status.");
            }
            applyToggle.checked = !!lifecycle.applyOpen;
            return;
          }
          var updated = (result && result.data) || Object.assign({}, posting, payload);
          if (window.IESupabase.showSuccess) {
            window.IESupabase.showSuccess(nextApplyEnabled ? "Apply opened." : "Apply closed.");
          }
          if (posting.job_offer_id && typeof window.IESupabase.createAutoLog === "function") {
            window.IESupabase.createAutoLog("job_offer", posting.job_offer_id, {
              event_type: "system_event",
              message: nextApplyEnabled ? "Applications opened for public posting" : "Applications closed for public posting",
              metadata: { action: nextApplyEnabled ? "posting_apply_opened" : "posting_apply_closed", job_posting_id: posting.id },
            }).catch(function () {});
          }
          if (onUpdate) onUpdate(updated);
        }).catch(function (e) {
          applyToggle.disabled = false;
          applyToggle.checked = !!lifecycle.applyOpen;
          if (window.IESupabase && window.IESupabase.showError) {
            window.IESupabase.showError(e && e.message ? e.message : "Error updating apply status.");
          }
        });
      };
    }
  }

  function renderHero(posting, offer) {
    var hero = document.querySelector("[data-ie-jobposting-hero]");
    var actionsEl = document.querySelector("[data-ie-jobposting-hero-actions]");
    if (!hero || !actionsEl) return;

    var title = (posting && posting.public_title) ? String(posting.public_title).trim() : "—";
    var slug = (posting && posting.slug) ? String(posting.slug).trim() : "—";
    var offerTitle = (offer && offer.title) ? String(offer.title).trim() : (posting && posting.job_offer_id ? "—" : "—");
    var offerUrl = getOfferViewUrl(posting && posting.job_offer_id);
    var pubStatus = publicStatusLabel(posting);
    var applyStatus = applyStatusLabel(posting);
    var deadlineText = (posting && posting.apply_deadline) ? formatDate(posting.apply_deadline) : "—";

    hero.querySelector("[data-ie-posting-title]").textContent = title;
    hero.querySelector("[data-ie-posting-slug]").textContent = slug;
    var offerLink = hero.querySelector("[data-ie-posting-offer-link]");
    if (offerLink) {
      offerLink.textContent = offerTitle;
      if (offerUrl) {
        offerLink.href = offerUrl;
      } else {
        offerLink.removeAttribute("href");
      }
    }
    var pubEl = hero.querySelector("[data-ie-posting-public-status]");
    if (pubEl) {
      pubEl.innerHTML = "";
      var pubSpan = document.createElement("span");
      pubSpan.className = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold " +
        (posting && posting.is_published ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700");
      pubSpan.textContent = pubStatus;
      pubEl.appendChild(pubSpan);
    }
    var applyEl = hero.querySelector("[data-ie-posting-apply-status]");
    if (applyEl) {
      applyEl.innerHTML = "";
      var applySpan = document.createElement("span");
      applySpan.className = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold " +
        (applyStatus === "Open" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800");
      applySpan.textContent = applyStatus;
      applyEl.appendChild(applySpan);
    }
    hero.querySelector("[data-ie-posting-deadline]").textContent = deadlineText;

    actionsEl.innerHTML = "";
    if (offerUrl) {
      var offerBtn = document.createElement("a");
      offerBtn.href = offerUrl;
      offerBtn.className = "ie-btn ie-btn-secondary text-xs py-1.5 px-2.5";
      offerBtn.textContent = "Open job offer";
      actionsEl.appendChild(offerBtn);
    }
    var publicUrl = getPublicPostingUrl(posting && posting.slug);
    if (publicUrl) {
      var publicBtn = document.createElement("a");
      publicBtn.href = publicUrl;
      publicBtn.target = "_blank";
      publicBtn.rel = "noopener noreferrer";
      publicBtn.className = "ie-btn ie-btn-secondary text-xs py-1.5 px-2.5";
      publicBtn.textContent = "Open public page";
      actionsEl.appendChild(publicBtn);
      var copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "ie-btn ie-btn-secondary text-xs py-1.5 px-2.5";
      copyBtn.textContent = "Copy public link";
      copyBtn.addEventListener("click", function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(publicUrl).then(
            function () {
              if (window.IESupabase && window.IESupabase.showSuccess) {
                window.IESupabase.showSuccess("Link copied to clipboard.");
              }
            },
            function () {}
          );
        }
      });
      actionsEl.appendChild(copyBtn);
    }

    wireHeroSwitches(posting, offer, function (updated) {
      renderHero(updated, offer);
      renderContentSummary(updated);
    });
  }

  function renderContentSummary(posting) {
    var set = function (sel, value) {
      var el = document.querySelector(sel);
      if (!el) return;
      var v = value != null && String(value).trim() !== "" ? String(value).trim() : "—";
      if (el.tagName === "DIV" && el.getAttribute("data-ie-content-public-description") !== null ||
          el.getAttribute("data-ie-content-public-requirements") !== null ||
          el.getAttribute("data-ie-content-public-benefits") !== null) {
        el.textContent = v;
      } else {
        el.textContent = v;
      }
    };
    set("[data-ie-content-public-title]", posting && posting.public_title);
    set("[data-ie-content-public-location]", posting && posting.public_location);
    set("[data-ie-content-public-description]", posting && posting.public_description);
    set("[data-ie-content-public-requirements]", posting && posting.public_requirements);
    set("[data-ie-content-public-benefits]", posting && posting.public_benefits);
  }

  function renderMiniDashboard(jobOfferId) {
    var totalEl = document.querySelector("[data-ie-count-total]");
    var byStatusEl = document.querySelector("[data-ie-jobposting-counts-by-status]");
    if (!totalEl) return;

    if (!jobOfferId || !window.IEQueries || !window.IEQueries.applications ||
        typeof window.IEQueries.applications.getApplicationsByJob !== "function") {
      totalEl.textContent = "0";
      if (byStatusEl) byStatusEl.innerHTML = "";
      return;
    }

    window.IEQueries.applications
      .getApplicationsByJob(jobOfferId)
      .then(function (result) {
        if (result.error) {
          totalEl.textContent = "0";
          if (byStatusEl) byStatusEl.innerHTML = "";
          return;
        }
        var apps = Array.isArray(result.data) ? result.data : [];
        totalEl.textContent = String(apps.length);

        var byStatus = {};
        apps.forEach(function (app) {
          var s = (app.status || "applied").toString().toLowerCase();
          if (s === "new") s = "applied";
          if (s === "offered") s = "offer";
          byStatus[s] = (byStatus[s] || 0) + 1;
        });
        var order = ["applied", "screening", "interview", "offer", "hired", "rejected", "withdrawn", "not_selected"];
        if (byStatusEl) {
          byStatusEl.innerHTML = "";
          order.forEach(function (statusKey) {
            var n = byStatus[statusKey];
            if (n == null || n === 0) return;
            var label = statusKey.replace(/_/g, " ");
            label = label.charAt(0).toUpperCase() + label.slice(1);
            var span = document.createElement("span");
            span.className = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700";
            span.textContent = label + ": " + n;
            byStatusEl.appendChild(span);
          });
        }
      })
      .catch(function () {
        totalEl.textContent = "0";
        if (byStatusEl) byStatusEl.innerHTML = "";
      });
  }

  function redirectToList() {
    var base = "";
    if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
      window.IERouter.navigateTo("job-postings");
      return;
    }
    if (window.IERouter && typeof window.IERouter.derivePortalBasePath === "function") {
      base = window.IERouter.derivePortalBasePath();
    } else {
      try {
        base = new URL(".", window.location.href).href;
      } catch (_) {}
    }
    window.location.href = base + "job-postings.html";
  }

  function initJobPostingPage() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    if (!id || !String(id).trim()) {
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError("Missing job posting id.");
      }
      redirectToList();
      return;
    }

    if (!window.IESupabase || typeof window.IESupabase.getJobPostingById !== "function") {
      document.body.style.visibility = "visible";
      if (window.IESupabase && window.IESupabase.showError) {
        window.IESupabase.showError("Job postings data not available.");
      }
      return;
    }

    window.IESupabase
      .getJobPostingById(id.trim())
      .then(function (postingResult) {
        if (postingResult.error || !postingResult.data) {
          if (window.IESupabase.showError) {
            window.IESupabase.showError("Job posting not found.");
          }
          redirectToList();
          return;
        }
        var posting = postingResult.data;
        var jobOfferId = posting.job_offer_id;

        if (!jobOfferId || !window.IESupabase.getJobOfferById) {
          renderHero(posting, null);
          renderContentSummary(posting);
          renderMiniDashboard(null);
          document.body.style.visibility = "visible";
          return;
        }

        window.IESupabase
          .getJobOfferById(jobOfferId)
          .then(function (offerResult) {
            var offer = (offerResult && !offerResult.error && offerResult.data) ? offerResult.data : null;
            renderHero(posting, offer);
            renderContentSummary(posting);
            renderMiniDashboard(jobOfferId);

            var renderPipeline = window.IEJobOfferRuntime && typeof window.IEJobOfferRuntime.renderCompactApplicationsPipeline === "function"
              ? window.IEJobOfferRuntime.renderCompactApplicationsPipeline
              : null;
            if (renderPipeline) {
              renderPipeline(jobOfferId);
            }
            if (window.IEAssociationsRuntime && typeof window.IEAssociationsRuntime.renderAssociatedCandidates === "function") {
              window.IEAssociationsRuntime.renderAssociatedCandidates(jobOfferId, offer, {
                onPipelineRefresh: function () {
                  if (renderPipeline) renderPipeline(jobOfferId);
                  renderMiniDashboard(jobOfferId);
                },
              });
            }

            var pageTitle = (posting.public_title && String(posting.public_title).trim()) || "Job Posting";
            if (window.pageMeta) {
              window.pageMeta.title = pageTitle;
              var bc = window.pageMeta.breadcrumbs;
              if (Array.isArray(bc) && bc.length > 0) {
                bc[bc.length - 1] = { label: pageTitle };
              }
            }
            document.body.style.visibility = "visible";
          })
          .catch(function (err) {
            console.error("[JobPosting] getJobOfferById error:", err);
            renderHero(posting, null);
            renderContentSummary(posting);
            renderMiniDashboard(null);
            document.body.style.visibility = "visible";
          });
      })
      .catch(function (err) {
        console.error("[JobPosting] getJobPostingById error:", err);
        if (window.IESupabase && window.IESupabase.showError) {
          window.IESupabase.showError("Error loading job posting.");
        }
        redirectToList();
      });
  }

  window.IEJobPostingRuntime = {
    initJobPostingPage: initJobPostingPage,
  };
})();

// -----------------------------------------------------------------------------
// Italian Experience Recruitment Portal - Preview Helpers (Job Offers)
// -----------------------------------------------------------------------------

(function () {
  "use strict";

  var JOB_OFFER_PREVIEW_MODAL = null;
  var JOB_OFFER_PREVIEW_PREV_OVERFLOW = "";

  function ensureJobOfferPreviewModal() {
    if (JOB_OFFER_PREVIEW_MODAL) return JOB_OFFER_PREVIEW_MODAL;

    var root = document.createElement("div");
    root.className =
      "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm hidden";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");

    root.innerHTML = [
      '<div class="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">',
      '  <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">',
      '    <h2 class="text-lg font-semibold text-[#1b4332]" data-ie-joboffer-preview-title></h2>',
      '    <button type="button" data-ie-joboffer-preview-close class="ie-btn ie-btn-secondary !py-2 !px-2 min-w-0 rounded-full" aria-label="Close preview">',
      '      <span class="block text-xl leading-none">&times;</span>',
      "    </button>",
      "  </div>",
      '  <div class="px-6 py-4 space-y-3 text-sm">',
      '    <p class="text-gray-500" data-ie-joboffer-preview-loading>Loading job offer...</p>',
      '    <p class="text-sm text-red-500 hidden" data-ie-joboffer-preview-error></p>',
      '    <div class="space-y-2 hidden" data-ie-joboffer-preview-content>',
      '      <div class="flex justify-between gap-4">',
      '        <span class="text-gray-400 uppercase tracking-widest text-[10px] font-semibold">Position</span>',
      '        <span class="text-gray-800 font-medium" data-ie-joboffer-preview-position></span>',
      "      </div>",
      '      <div class="flex justify-between gap-4">',
      '        <span class="text-gray-400 uppercase tracking-widest text-[10px] font-semibold">Client</span>',
      '        <span class="text-gray-800" data-ie-joboffer-preview-client></span>',
      "      </div>",
      '      <div class="flex justify-between gap-4">',
      '        <span class="text-gray-400 uppercase tracking-widest text-[10px] font-semibold">Location</span>',
      '        <span class="text-gray-800" data-ie-joboffer-preview-location></span>',
      "      </div>",
      '      <div class="flex justify-between gap-4">',
      '        <span class="text-gray-400 uppercase tracking-widest text-[10px] font-semibold">Status</span>',
      '        <span class="text-gray-800" data-ie-joboffer-preview-status></span>',
      "      </div>",
      '      <div class="flex justify-between gap-4">',
      '        <span class="text-gray-400 uppercase tracking-widest text-[10px] font-semibold">Created</span>',
      '        <span class="text-gray-800" data-ie-joboffer-preview-created></span>',
      "      </div>",
      "    </div>",
      "  </div>",
      '  <div class="px-6 py-4 bg-gray-50 flex items-center justify-end border-t border-gray-100">',
      '    <button type="button" data-ie-joboffer-preview-open-full class="ie-btn ie-btn-success">',
      "      Open Full Page",
      "    </button>",
      "  </div>",
      "</div>",
    ].join("");

    document.body.appendChild(root);

    var titleEl = root.querySelector("[data-ie-joboffer-preview-title]");
    var loadingEl = root.querySelector("[data-ie-joboffer-preview-loading]");
    var errorEl = root.querySelector("[data-ie-joboffer-preview-error]");
    var contentEl = root.querySelector("[data-ie-joboffer-preview-content]");
    var positionEl = root.querySelector("[data-ie-joboffer-preview-position]");
    var clientEl = root.querySelector("[data-ie-joboffer-preview-client]");
    var locationEl = root.querySelector("[data-ie-joboffer-preview-location]");
    var statusEl = root.querySelector("[data-ie-joboffer-preview-status]");
    var createdEl = root.querySelector("[data-ie-joboffer-preview-created]");
    var closeBtn = root.querySelector("[data-ie-joboffer-preview-close]");
    var openFullBtn = root.querySelector("[data-ie-joboffer-preview-open-full]");

    var state = {
      currentOfferId: null,
    };

    function setLoading(isLoading) {
      if (!loadingEl || !contentEl || !errorEl) return;
      if (isLoading) {
        loadingEl.classList.remove("hidden");
        contentEl.classList.add("hidden");
        errorEl.classList.add("hidden");
      } else {
        loadingEl.classList.add("hidden");
      }
    }

    function setError(message) {
      if (!errorEl || !contentEl || !loadingEl) return;
      loadingEl.classList.add("hidden");
      contentEl.classList.add("hidden");
      errorEl.textContent = message || "Error loading job offer.";
      errorEl.classList.remove("hidden");
    }

    function setData(offer) {
      if (!offer) {
        setError("Offerta non trovata.");
        return;
      }
      if (titleEl) titleEl.textContent = offer.title || "Job Offer";
      if (positionEl) positionEl.textContent = offer.position || "—";
      if (clientEl) clientEl.textContent = offer.client_name || "—";
      if (locationEl) {
        var location =
          offer.location ||
          [offer.city, offer.state]
            .filter(function (x) {
              return x;
            })
            .join(", ");
        locationEl.textContent = location || "—";
      }
      if (statusEl) statusEl.textContent = offer.status || "—";
      if (createdEl) {
        if (offer.created_at) {
          try {
            var d = new Date(offer.created_at);
            createdEl.textContent = d.toLocaleString("it-IT");
          } catch (e) {
            createdEl.textContent = offer.created_at;
          }
        } else {
          createdEl.textContent = "—";
        }
      }

      var metadataContainer = root.querySelector("[data-ie-joboffer-metadata]");
      if (!metadataContainer && contentEl) {
        metadataContainer = document.createElement("div");
        metadataContainer.setAttribute("data-ie-joboffer-metadata", "true");
        contentEl.appendChild(metadataContainer);
      }
      if (metadataContainer) {
        var renderMetadata =
          window.IEPortal &&
          typeof window.IEPortal.renderEntityMetadata === "function"
            ? window.IEPortal.renderEntityMetadata
            : null;
        metadataContainer.innerHTML = renderMetadata
          ? renderMetadata(offer)
          : "";
      }

      if (loadingEl) loadingEl.classList.add("hidden");
      if (errorEl) errorEl.classList.add("hidden");
      if (contentEl) contentEl.classList.remove("hidden");
    }

    function open() {
      JOB_OFFER_PREVIEW_PREV_OVERFLOW = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";
      root.classList.remove("hidden");
    }

    function close() {
      root.classList.add("hidden");
      document.body.style.overflow = JOB_OFFER_PREVIEW_PREV_OVERFLOW || "";
    }

    root.addEventListener("click", function (event) {
      if (event.target === root) {
        close();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        close();
      });
    }

    if (openFullBtn) {
      openFullBtn.addEventListener("click", function () {
        if (!state.currentOfferId) return;
        close();
        if (window.IERouter && window.IEPortal && window.IEPortal.links) {
          window.IERouter.navigateTo(
            window.IEPortal.links.offerView(state.currentOfferId)
          );
        }
      });
    }

    JOB_OFFER_PREVIEW_MODAL = {
      root: root,
      state: state,
      setLoading: setLoading,
      setError: setError,
      setData: setData,
      open: open,
      close: close,
    };

    return JOB_OFFER_PREVIEW_MODAL;
  }

  function openJobOfferPreviewModal(id) {
    if (!id) return;
    var modal = ensureJobOfferPreviewModal();
    modal.state.currentOfferId = id;
    modal.setLoading(true);
    modal.open();

    var api = window.IESupabase;
    if (!api || (!api.fetchJobOfferById && !api.getJobOfferById)) {
      modal.setError("Supabase non disponibile.");
      return;
    }

    var fetchById = api.fetchJobOfferById || api.getJobOfferById;

    fetchById(id)
      .then(function (result) {
        if (!result || result.error) {
          modal.setError(
            (result && result.error && result.error.message) ||
              "Offerta non trovata."
          );
          return;
        }
        modal.setData(result.data || null);
      })
      .catch(function (err) {
        console.error("[ItalianExperience] fetchJobOfferById error:", err);
        modal.setError("Error loading job offer.");
      });
  }

  window.IEPortal = window.IEPortal || {};
  window.IEPortal.ui = window.IEPortal.ui || {};
  window.IEPortal.ui.openJobOfferPreviewModal = openJobOfferPreviewModal;
})();


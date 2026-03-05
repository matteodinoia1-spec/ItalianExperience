// Compute the base path where portal HTML files live
function derivePortalBasePath() {
  try {
    // new URL('.', href) restituisce sempre la directory dell'HTML corrente,
    // includendo protocollo (http/https/file) e host se presenti.
    const url = new URL(".", window.location.href);
    return url.href;
  } catch (error) {
    const pathname = window.location.pathname || "";
    if (!pathname) return "";

    const segments = pathname.split("/").filter(Boolean);
    if (!segments.length) return "";

    // Strip the last segment (file name)
    segments.pop();
    return "/" + segments.join("/") + (segments.length ? "/" : "");
  }
}

// Resolve list key to relative path (e.g. candidates -> candidates.html)
function listKeyToPath(key) {
  var k = (key || "").toString();
  if (k === "candidates") return "candidates.html";
  if (k === "jobOffers" || k === "job-offers") return "job-offers.html";
  if (k === "clients") return "clients.html";
  return k.indexOf(".html") !== -1 ? k : k + ".html";
}

// Basic helper for programmatic navigation.
// Signatures: navigateTo(path) | navigateTo(entity, id) | navigateTo(listKey, queryParams)
function navigateTo(relativePathOrEntity, idOrParams) {
  var base = derivePortalBasePath();

  if (idOrParams === undefined) {
    var path = listKeyToPath(relativePathOrEntity);
    window.location.href = base + path;
    return;
  }

  if (typeof idOrParams === "string") {
    var entityType = (relativePathOrEntity || "").toString();
    if (entityType === "jobOffer") entityType = "job-offer";
    redirectToEntityView(entityType, idOrParams);
    return;
  }

  if (idOrParams && typeof idOrParams === "object") {
    var listPath = listKeyToPath(relativePathOrEntity);
    var parts = [];
    Object.keys(idOrParams).forEach(function (k) {
      if (idOrParams[k] !== undefined && idOrParams[k] !== null && idOrParams[k] !== "") {
        parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(idOrParams[k])));
      }
    });
    var qs = parts.length ? "?" + parts.join("&") : "";
    window.location.href = base + listPath + qs;
    return;
  }

  window.location.href = base + listKeyToPath(relativePathOrEntity);
}

// Redirect to canonical entity view pages without using browser history
function redirectToEntityView(entityType, id) {
  if (!entityType || !id) return;
  var targetUrl = IEToolbar.getEntityViewUrl(entityType, id);
  if (targetUrl) {
    navigateTo(targetUrl);
  }
}

/**
 * Normalize entity page state based on URL params.
 * - No id => create
 * - id + invalid mode => default to view
 * - id + valid mode (view/edit) => use it
 *
 * @param {URLSearchParams} params
 * @returns {{ id: string|null, mode: "create"|"view"|"edit" }}
 */
function resolveEntityPageState(params) {
  const rawId = params.get("id");
  const id = rawId ? rawId.toString() : null;
  const rawMode = (params.get("mode") || "").toString().toLowerCase();

  if (!id) {
    return { id: null, mode: "create" };
  }

  if (rawMode === "view" || rawMode === "edit") {
    return { id, mode: rawMode };
  }

  return { id, mode: "view" };
}

function getCandidatePageParams() {
  const params = new URLSearchParams(window.location.search);
  const state = resolveEntityPageState(params);
  return { mode: state.mode, id: state.id };
}

function getClientPageParams() {
  const params = new URLSearchParams(window.location.search);
  const state = resolveEntityPageState(params);
  return { mode: state.mode, id: state.id };
}

function getJobOfferPageParams() {
  const params = new URLSearchParams(window.location.search);
  const state = resolveEntityPageState(params);
  return { mode: state.mode, id: state.id };
}

var IERouter = window.IERouter || {};
IERouter.derivePortalBasePath = derivePortalBasePath;
IERouter.navigateTo = navigateTo;
IERouter.redirectToEntityView = redirectToEntityView;
IERouter.resolveEntityPageState = resolveEntityPageState;
IERouter.getCandidatePageParams = getCandidatePageParams;
IERouter.getClientPageParams = getClientPageParams;
IERouter.getJobOfferPageParams = getJobOfferPageParams;
window.IERouter = IERouter;


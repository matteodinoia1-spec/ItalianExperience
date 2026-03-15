// Resolve the portal root at parse-time from this script's own URL so that
// fetch() paths work correctly regardless of the page's directory depth
// (e.g. portal/ or portal/recruitment/).
// document.currentScript is only available during synchronous script
// execution, so it must be captured here — not inside async callbacks.
var _headerLoaderPortalBase = (function () {
  try {
    // document.currentScript.src → e.g. http://host/portal/shared/header-loader.js
    // One directory up from shared/ gives portal/.
    return new URL("../", document.currentScript.src).href;
  } catch (e) {
    // Fallback: assume we're already at portal root level
    return new URL(".", window.location.href).href;
  }
})();

async function loadPortalHeader() {
  var base = _headerLoaderPortalBase;
  const headerContainer = document.getElementById("portal-header");
  const main = document.querySelector(".portal-main");

  if (headerContainer) {
    var headerFile =
      window.IE_HEADER_VARIANT === "hub"
        ? "layout/header-hub.html"
        : "layout/header.html";
    const response = await fetch(base + headerFile);
    const html = await response.text();
    headerContainer.innerHTML = html;
  }

  let footerContainer = document.getElementById("portal-footer");
  if (!footerContainer && main) {
    footerContainer = document.createElement("div");
    footerContainer.id = "portal-footer";
    main.appendChild(footerContainer);
  }

  let bottomNavContainer = document.getElementById("portal-bottom-nav");
  if (!bottomNavContainer && main && footerContainer) {
    bottomNavContainer = document.createElement("div");
    bottomNavContainer.id = "portal-bottom-nav";
    main.insertBefore(bottomNavContainer, footerContainer);
  }

  if (footerContainer) {
    const footerResponse = await fetch(base + "layout/footer.html");
    const footerHtml = await footerResponse.text();
    footerContainer.innerHTML = footerHtml;
  }

  if (bottomNavContainer) {
    const bottomNavResponse = await fetch(base + "layout/bottom-nav.html");
    const bottomNavHtml = await bottomNavResponse.text();
    bottomNavContainer.innerHTML = bottomNavHtml;
  }

  document.dispatchEvent(new CustomEvent("ie:header-loaded"));
}

document.addEventListener("DOMContentLoaded", loadPortalHeader);


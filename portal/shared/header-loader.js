async function loadPortalHeader() {
  const headerContainer = document.getElementById("portal-header");
  const main = document.querySelector(".portal-main");

  if (headerContainer) {
    const response = await fetch("layout/header.html");
    const html = await response.text();
    headerContainer.innerHTML = html;
  }

  let footerContainer = document.getElementById("portal-footer");
  if (!footerContainer && main) {
    footerContainer = document.createElement("div");
    footerContainer.id = "portal-footer";
    main.appendChild(footerContainer);
  }

  if (footerContainer) {
    const footerResponse = await fetch("layout/footer.html");
    const footerHtml = await footerResponse.text();
    footerContainer.innerHTML = footerHtml;
  }

  document.dispatchEvent(new CustomEvent("ie:header-loaded"));
}

document.addEventListener("DOMContentLoaded", loadPortalHeader);


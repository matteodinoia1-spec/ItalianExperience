async function loadPortalHeader() {
  const container = document.getElementById("portal-header");
  if (!container) return;

  const response = await fetch("layout/header.html");
  const html = await response.text();

  container.innerHTML = html;
  document.dispatchEvent(new CustomEvent("ie:header-loaded"));
}

document.addEventListener("DOMContentLoaded", loadPortalHeader);


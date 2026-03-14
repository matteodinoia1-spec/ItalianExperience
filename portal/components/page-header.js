/** Renders breadcrumbs + page title for the global header (same bar as user). */
function renderHeaderPageInfo(meta) {
  if (!meta) return "";
  var titleHtml = escapeHtml(meta.title || "");
  return (
    '<div class="header-page-info__inner">' +
    '<nav class="page-breadcrumbs" id="page-breadcrumbs" aria-label="Breadcrumb"></nav>' +
    '<span class="header-page-info__title">' + titleHtml + '</span>' +
    '</div>'
  );
}

function renderPageHeader(meta) {
  if (!meta) return "";
  var titleHtml = escapeHtml(meta.title || "");
  var subtitleHtml = meta.subtitle ? "<p class=\"page-subtitle\">" + escapeHtml(meta.subtitle) + "</p>" : "";
  return (
    '<div class="page-header">\n' +
    '  <nav class="page-breadcrumbs" id="page-breadcrumbs" aria-label="Breadcrumb"></nav>\n' +
    '  <h1 class="page-title">' + titleHtml + '</h1>\n' +
    '  ' + subtitleHtml + '\n' +
    '</div>'
  );
}

function escapeHtml(text) {
  if (typeof window !== "undefined" && window.IEFormatters && typeof window.IEFormatters.escapeHtml === "function") {
    return window.IEFormatters.escapeHtml(text);
  }
  if (text == null) return "";
  var div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

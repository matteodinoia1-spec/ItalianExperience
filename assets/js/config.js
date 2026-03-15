;(function (window) {
  // Public runtime configuration for Italian Experience.
  // - Values here are safe to expose to the browser.
  // - Supabase-related values (URL, anon key, functions URL) are safe to
  //   expose as publishable client configuration (RLS-enforced on Supabase).
  var existing = window.IEConfig || {};

  var defaultBasePath = existing.BASE_PATH || '/ItalianExperience';
  var defaultPortalPath = existing.PORTAL_PATH || defaultBasePath;
  var defaultSiteUrl = existing.SITE_URL || 'https://www.italianexp.com';

  window.IEConfig = Object.assign(
    {
      BASE_PATH: defaultBasePath,
      PORTAL_PATH: defaultPortalPath,
      SITE_URL: defaultSiteUrl,
      // Supabase defaults (can be overridden by an earlier IEConfig if needed)
      SUPABASE_URL:
        existing.SUPABASE_URL ||
        'https://xgioojjmrjcurajgirpa.supabase.co',
      SUPABASE_FUNCTIONS_URL:
        existing.SUPABASE_FUNCTIONS_URL ||
        'https://xgioojjmrjcurajgirpa.supabase.co/functions/v1',
      SUPABASE_ANON_KEY:
        existing.SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnaW9vamptcmpjdXJhamdpcnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjI3MDksImV4cCI6MjA4NzQ5ODcwOX0.fcJe-f4V_aGEaGEfD2N2el2Y-I2rqy3fO6fURu7Ennk',
    },
    existing
  );
})(window);

;(function (window) {
  // Ensure IEConfig also exposes a canonical SUPABASE_URL so all clients and
  // public forms can rely on a single source of truth.
  var cfg = window.IEConfig || {};
  var fromConfig = cfg.SUPABASE_URL;
  var fromFunctions =
    cfg.SUPABASE_FUNCTIONS_URL &&
    String(cfg.SUPABASE_FUNCTIONS_URL).replace(/\/functions\/v\d+\/?$/, '');

  // NOTE: SUPABASE_URL is normally provided by the defaults above, but can still
  // be overridden or derived from SUPABASE_FUNCTIONS_URL if needed.
  var computedSupabaseUrl = fromConfig || fromFunctions || undefined;

  window.IEConfig = Object.assign({}, cfg, {
    SUPABASE_URL: computedSupabaseUrl,
  });
})(window);


;(function (window) {
  // Public runtime configuration for Italian Experience.
  // - Values here are safe to expose to the browser.
  // - For production, prefer overriding these via an inline script
  //   before this file, or via a build step that injects environment
  //   variables, rather than committing live keys into the repo.
  window.IEConfig = Object.assign(
    {
      BASE_PATH: '/ItalianExperience',
      PORTAL_PATH: '/ItalianExperience',
      SITE_URL: 'https://www.italianexp.com',
      // Optional: Supabase Edge Functions base URL for public forms.
      // These defaults target the live Supabase project, but can be
      // safely overridden at runtime by defining window.IEConfig earlier.
      SUPABASE_FUNCTIONS_URL:
        window.IEConfig && window.IEConfig.SUPABASE_FUNCTIONS_URL
          ? window.IEConfig.SUPABASE_FUNCTIONS_URL
          : 'https://xgioojjmrjcurajgirpa.supabase.co/functions/v1',
      SUPABASE_ANON_KEY:
        window.IEConfig && window.IEConfig.SUPABASE_ANON_KEY
          ? window.IEConfig.SUPABASE_ANON_KEY
          : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnaW9vamptcmpjdXJhamdpcnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjI3MDksImV4cCI6MjA4NzQ5ODcwOX0.fcJe-f4V_aGEaGEfD2N2el2Y-I2rqy3fO6fURu7Ennk',
    },
    window.IEConfig || {}
  );
})(window);


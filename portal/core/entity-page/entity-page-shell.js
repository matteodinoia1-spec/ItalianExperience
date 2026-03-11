;(function () {
  "use strict";

  function normalizeParams(config) {
    var raw = null;
    if (
      config &&
      config.route &&
      typeof config.route.getPageParams === "function"
    ) {
      try {
        raw = config.route.getPageParams() || null;
      } catch (err) {
        console.error(
          "[EntityPageShell] route.getPageParams error:",
          err
        );
      }
    }

    if (!raw) {
      var search = new URLSearchParams(window.location.search || "");
      var rawId = search.get("id");
      var id = rawId ? rawId.toString() : null;
      var rawMode = (search.get("mode") || "").toString().toLowerCase();
      var mode = rawMode === "edit" ? "edit" : "view";
      raw = { id: id, mode: mode };
    }

    var idParam = raw.id || null;
    var rawModeParam =
      raw.mode != null ? raw.mode.toString().toLowerCase() : "";
    var modeParam = rawModeParam === "edit" ? "edit" : "view";

    return {
      id: idParam,
      mode: modeParam || "view",
      raw: raw,
    };
  }

  async function requireAuth(config, state) {
    if (config && config.auth && typeof config.auth.requireAuth === "function") {
      return config.auth.requireAuth(state);
    }

    if (
      window.IESupabase &&
      typeof window.IESupabase.requireAuth === "function"
    ) {
      return window.IESupabase.requireAuth();
    }

    // Fallback: best-effort session check if available, otherwise no-op.
    if (
      window.IESupabase &&
      window.IESupabase.supabase &&
      window.IESupabase.supabase.auth &&
      typeof window.IESupabase.supabase.auth.getSession === "function"
    ) {
      try {
        var sessionResult =
          await window.IESupabase.supabase.auth.getSession();
        if (!sessionResult || !sessionResult.data || !sessionResult.data.session) {
          if (
            typeof window.IESupabase.redirectToLogin === "function"
          ) {
            window.IESupabase.redirectToLogin();
          } else if (
            window.IEAuth &&
            typeof window.IEAuth.redirectToLogin === "function"
          ) {
            window.IEAuth.redirectToLogin();
          }
          return null;
        }
        return sessionResult.data.session;
      } catch (err) {
        console.error("[EntityPageShell] auth guard error:", err);
        if (
          typeof window.IESupabase.redirectToLogin === "function"
        ) {
          window.IESupabase.redirectToLogin();
        } else if (
          window.IEAuth &&
          typeof window.IEAuth.redirectToLogin === "function"
        ) {
          window.IEAuth.redirectToLogin();
        }
        return null;
      }
    }

    return null;
  }

  function revealPage() {
    try {
      document.body.style.visibility = "visible";
    } catch (_) {}
  }

  function buildModeContext(config, state) {
    return {
      entity: state.entity,
      mode: state.mode,
      params: state.params,
      config: config,
    };
  }

  function applyMode(config, state) {
    if (!config || !config.mode || typeof config.mode.apply !== "function") {
      return;
    }
    var ctx = buildModeContext(config, state);
    try {
      config.mode.apply(state.mode, ctx);
    } catch (err) {
      console.error("[EntityPageShell] mode.apply error:", err);
    }
  }

  async function mountActivity(config, state) {
    if (
      !config ||
      !config.ui ||
      !config.ui.activityContainerId ||
      !window.ActivitySection ||
      typeof window.ActivitySection.init !== "function"
    ) {
      return;
    }

    var container = document.getElementById(config.ui.activityContainerId);
    if (!container) return;

    try {
      await window.ActivitySection.init({
        entityType: config.entityType,
        entityId: state.id,
        container: container,
      });
    } catch (err) {
      console.error("[EntityPageShell] ActivitySection.init error:", err);
    }
  }

  async function runRelatedSections(config, state) {
    if (
      !config ||
      !config.related ||
      !Array.isArray(config.related.sections) ||
      !config.related.sections.length
    ) {
      return;
    }

    for (var i = 0; i < config.related.sections.length; i++) {
      var section = config.related.sections[i];
      if (!section) continue;

      var data;
      if (typeof section.load === "function") {
        try {
          data = await section.load(state);
        } catch (err) {
          console.error(
            "[EntityPageShell] related section load error:",
            section.id || i,
            err
          );
        }
      }

      if (typeof section.render === "function") {
        try {
          await section.render(state, data);
        } catch (err2) {
          console.error(
            "[EntityPageShell] related section render error:",
            section.id || i,
            err2
          );
        }
      }
    }
  }

  async function init(config) {
    if (!config) {
      console.error("[EntityPageShell] Missing config");
      revealPage();
      return;
    }

    var paramsInfo = normalizeParams(config);
    var id = paramsInfo.id;
    var mode = paramsInfo.mode || "view";

    if (!id) {
      if (
        config.route &&
        typeof config.route.navigateToList === "function"
      ) {
        config.route.navigateToList();
      }
      revealPage();
      return;
    }

    var state = {
      id: id,
      mode: mode,
      entity: null,
      params: paramsInfo.raw,
      config: config,
    };

    try {
      var authResult = await requireAuth(config, state);
      if (authResult == null) {
        // requireAuth implementation is responsible for redirect / error.
        return;
      }
    } catch (err) {
      console.error("[EntityPageShell] requireAuth error:", err);
      revealPage();
      return;
    }

    var loaded;
    try {
      if (
        config.data &&
        typeof config.data.loadEntity === "function"
      ) {
        loaded = await config.data.loadEntity({
          id: state.id,
          mode: state.mode,
          params: state.params,
        });
      }
    } catch (err) {
      console.error("[EntityPageShell] data.loadEntity error:", err);
    }

    var entity =
      loaded && (loaded.entity || loaded.candidate || null);
    state.entity = entity;

    if (!entity) {
      if (config.ui && typeof config.ui.onNotFound === "function") {
        try {
          config.ui.onNotFound(state);
        } catch (err) {
          console.error(
            "[EntityPageShell] ui.onNotFound error:",
            err
          );
        }
      } else {
        console.error(
          "[EntityPageShell] Entity not found for id:",
          state.id
        );
      }
      revealPage();
      return;
    }

    try {
      if (config.ui && typeof config.ui.renderMain === "function") {
        config.ui.renderMain({
          entity: entity,
          mode: state.mode,
          id: state.id,
          params: state.params,
        });
      }
    } catch (err) {
      console.error("[EntityPageShell] ui.renderMain error:", err);
    }

    applyMode(config, state);

    try {
      EntityPageShell.mountToolbar(config, state);
    } catch (err) {
      console.error("[EntityPageShell] mountToolbar error:", err);
    }

    try {
      await runRelatedSections(config, state);
    } catch (errRel) {
      console.error("[EntityPageShell] related sections error:", errRel);
    }

    await mountActivity(config, state);

    revealPage();
  }

  function mountToolbar(config, state) {
    if (typeof window.renderEntityToolbar !== "function") {
      return;
    }
    if (!config || !config.lifecycle) {
      return;
    }

    var getStatus =
      typeof config.lifecycle.getStatus === "function"
        ? config.lifecycle.getStatus
        : null;
    if (!getStatus) return;

    var status = getStatus(state.entity);
    var containerId =
      config.ui && config.ui.toolbarContainerId
        ? config.ui.toolbarContainerId
        : null;

    function navigateTo(url) {
      if (!url) return;
      if (
        window.IERouter &&
        typeof window.IERouter.navigateTo === "function"
      ) {
        window.IERouter.navigateTo(url);
      } else {
        window.location.href = url;
      }
    }

    function onEdit() {
      if (!config.route || typeof config.route.getEditUrl !== "function") {
        return;
      }
      var target = config.route.getEditUrl(state.id);
      navigateTo(target);
    }

    function createOnSave() {
      if (state.mode !== "edit") {
        return undefined;
      }

      if (
        config.data &&
        typeof config.data.buildSavePayload === "function" &&
        typeof config.data.performSave === "function"
      ) {
        return async function () {
          var payload;
          try {
            payload = await config.data.buildSavePayload(state);
          } catch (errBuild) {
            console.error(
              "[EntityPageShell] data.buildSavePayload error:",
              errBuild
            );
            return;
          }

          var result;
          try {
            result = await config.data.performSave(state, payload || {});
          } catch (errSave) {
            console.error(
              "[EntityPageShell] data.performSave error:",
              errSave
            );
            return;
          }

          if (result && result.haltRedirect) {
            return;
          }

          if (!config.route || typeof config.route.getViewUrl !== "function") {
            return;
          }
          var target = config.route.getViewUrl(state.id);
          navigateTo(target);
        };
      }

      if (config.save && typeof config.save.onSave === "function") {
        return function () {
          return config.save.onSave(state);
        };
      }

      return undefined;
    }

    var onArchive = null;
    if (typeof config.lifecycle.archive === "function") {
      onArchive = async function () {
        try {
          var res = await config.lifecycle.archive(state.id);
          if (res && res.error) return;

          if (
            config.route &&
            typeof config.route.navigateToList === "function"
          ) {
            config.route.navigateToList();
          }
        } catch (err) {
          console.error(
            "[EntityPageShell] lifecycle.archive error:",
            err
          );
        }
      };
    }

    var onReopen = null;
    if (typeof config.lifecycle.reopen === "function") {
      onReopen = async function () {
        try {
          var res = await config.lifecycle.reopen(state.id);
          if (res && res.error) return;

          // Refresh toolbar with active status
          var updatedStatus = getStatus(state.entity);
          try {
            window.renderEntityToolbar({
              entityType: config.entityType,
              entityId: state.id,
              status: updatedStatus,
              mode: state.mode,
              containerId: containerId,
              onEdit: onEdit,
              onArchive: onArchive,
              onReopen: onReopen,
              onSave: createOnSave(),
            });
          } catch (errToolbar) {
            console.error(
              "[EntityPageShell] toolbar re-render error:",
              errToolbar
            );
          }
        } catch (err) {
          console.error(
            "[EntityPageShell] lifecycle.reopen error:",
            err
          );
        }
      };
    }

    try {
      window.renderEntityToolbar({
        entityType: config.entityType,
        entityId: state.id,
        status: status,
        mode: state.mode,
        containerId: containerId,
        onEdit: onEdit,
        onArchive: onArchive,
        onReopen: onReopen,
        onSave: createOnSave(),
      });
    } catch (err) {
      console.error("[EntityPageShell] renderEntityToolbar error:", err);
    }
  }

  window.EntityPageShell = {
    init: init,
    mountToolbar: mountToolbar,
  };
})();


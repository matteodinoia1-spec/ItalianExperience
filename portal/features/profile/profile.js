// ============================================================================
// Italian Experience – Profile page logic
// ----------------------------------------------------------------------------
// - Auth guard (redirect to login if not authenticated)
// - Load profile from Supabase "profiles" table
// - Display email (read-only), first_name, last_name (editable), role (read-only)
// - Update first_name / last_name with success and error feedback
// ============================================================================

(function () {
  "use strict";

  const SELECTORS = {
    form: "#profileForm",
    email: "#profileEmail",
    firstName: "#profileFirstName",
    lastName: "#profileLastName",
    role: "#profileRole",
    editBtn: "#profileEditButton",
    submitBtn: "#profileToolbarSaveBtn",
    cancelBtn: "#profileToolbarCancelBtn",
    successToast: "#successToast",
    errorToast: "#errorToast",
    errorMessage: "#profileErrorMessage",
    headerName: "header .text-right p.text-sm",
    headerRole: "header .text-right p:nth-child(2)",
    avatarImg: "header .w-10.h-10.rounded-full img",
    profilePreview: "#profilePreview",
    profileTitle: "#profileTitle",
    profileSubtitle: "#profileSubtitle",
  };

  let currentProfile = null;

  document.addEventListener("DOMContentLoaded", async function () {
    const api = window.IESupabase;
    if (!api) {
      showError("Configuration unavailable.");
      return;
    }

    try {
      await requireAuthAndLoadProfile();
    } catch (e) {
      return;
    }

    renderProfile(currentProfile);
    bindEditButton();
    bindFormSubmit();
    bindCancelButton();
    bindChangePasswordForm();
  });

  function isEditMode() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const rawMode = (params.get("mode") || "").toString().toLowerCase();
      return rawMode === "edit";
    } catch (e) {
      return false;
    }
  }

  function navigateToProfileView() {
    if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
      window.IERouter.navigateTo("profile.html");
    } else {
      window.location.assign("profile.html");
    }
  }

  /**
   * Load profile for the current user.
   */
  async function requireAuthAndLoadProfile() {
    const api = window.IESupabase;
    setPageLoading(true);
    const { data, error } = await api.getProfile();
    setPageLoading(false);

    if (error) {
      showError(error.message || "Impossibile caricare il profilo.");
      return;
    }

    currentProfile = data || {
      email: "",
      first_name: "",
      last_name: "",
      role: "",
    };
  }

  /**
   * Fill form and header with profile data.
   */
  function renderProfile(profile) {
    if (!profile) return;

    const emailEl = document.querySelector(SELECTORS.email);
    const firstNameEl = document.querySelector(SELECTORS.firstName);
    const lastNameEl = document.querySelector(SELECTORS.lastName);
    const roleEl = document.querySelector(SELECTORS.role);
    const headerNameEl = document.querySelector(SELECTORS.headerName);
    const headerRoleEl = document.querySelector(SELECTORS.headerRole);
    const avatarEl = document.querySelector(SELECTORS.avatarImg);
    const profilePreviewEl = document.querySelector(SELECTORS.profilePreview);
    const profileTitleEl = document.querySelector(SELECTORS.profileTitle);
    const profileSubtitleEl = document.querySelector(SELECTORS.profileSubtitle);

    const displayName = getDisplayName(profile);
    const roleLabel = (profile.role || "").trim() || "—";

    if (emailEl) emailEl.value = profile.email || "";
    if (firstNameEl) firstNameEl.value = profile.first_name || "";
    if (lastNameEl) lastNameEl.value = profile.last_name || "";
    if (roleEl) roleEl.value = roleLabel;

    if (headerNameEl) headerNameEl.textContent = displayName;
    if (headerRoleEl) headerRoleEl.textContent = roleLabel !== "—" ? roleLabel : "";
    if (avatarEl) {
      avatarEl.setAttribute("src", "https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName.replace(/\s+/g, "+")) + "&background=1b4332&color=fff");
      avatarEl.setAttribute("alt", displayName);
    }
    if (profilePreviewEl) {
      profilePreviewEl.setAttribute("src", "https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName.replace(/\s+/g, "+")) + "&size=120&background=1b4332&color=fff");
      profilePreviewEl.setAttribute("alt", displayName);
    }
    if (profileTitleEl) profileTitleEl.textContent = displayName;
    if (profileSubtitleEl) profileSubtitleEl.textContent = roleLabel !== "—" ? roleLabel : "";
  }

  function getDisplayName(profile) {
    const first = (profile.first_name || "").trim();
    const last = (profile.last_name || "").trim();
    if (first || last) return (first + " " + last).trim();
    if (profile.email) return profile.email;
    return "User";
  }

  function setPageLoading(loading) {
    const firstNameEl = document.querySelector(SELECTORS.firstName);
    const lastNameEl = document.querySelector(SELECTORS.lastName);
    const submitBtn = document.querySelector(SELECTORS.submitBtn);
    if (firstNameEl) firstNameEl.disabled = loading;
    if (lastNameEl) lastNameEl.disabled = loading;
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? "Loading…" : "Save changes";
    }
  }

  function setSubmitLoading(loading) {
    const submitBtn = document.querySelector(SELECTORS.submitBtn);
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? "Saving…" : "Save changes";
    }
  }

  function bindFormSubmit() {
    const form = document.querySelector(SELECTORS.form);
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const api = window.IESupabase;
      if (!api) {
        showError("Configuration unavailable.");
        return;
      }

      const firstNameEl = document.querySelector(SELECTORS.firstName);
      const lastNameEl = document.querySelector(SELECTORS.lastName);
      const first_name = firstNameEl ? firstNameEl.value.trim() : "";
      const last_name = lastNameEl ? lastNameEl.value.trim() : "";

      setSubmitLoading(true);
      hideError();
      const { data, error } = await api.updateProfile({ first_name, last_name });
      setSubmitLoading(false);

      if (error) {
        showError(error.message || "Error while saving.");
        return;
      }

      if (data) {
        currentProfile = { ...currentProfile, first_name, last_name };
        renderProfile(currentProfile);
      }
      showSuccess();

      if (isEditMode()) {
        navigateToProfileView();
      }
    });
  }

  function bindEditButton() {
    const editBtn = document.querySelector(SELECTORS.editBtn);
    if (!editBtn) return;

    editBtn.addEventListener("click", function () {
      if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
        window.IERouter.navigateTo("profile.html?mode=edit");
      } else {
        window.location.assign("profile.html?mode=edit");
      }
    });
  }

  function bindCancelButton() {
    const cancelBtn = document.querySelector(SELECTORS.cancelBtn);
    if (!cancelBtn) return;

    cancelBtn.addEventListener("click", function () {
      if (isEditMode()) {
        navigateToProfileView();
        return;
      }
      if (!currentProfile) return;
      renderProfile(currentProfile);
      hideError();
    });
  }

  function bindChangePasswordForm() {
    const form = document.getElementById("changePasswordForm");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const currentPassword = document.getElementById("currentPassword").value;
      const newPassword = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      const messageEl = document.getElementById("changePasswordMessage");
      const submitBtn = document.getElementById("changePasswordBtn");

      messageEl.textContent = "";
      messageEl.className = "text-sm mt-2";

      if (!currentPassword) {
        messageEl.textContent = "Enter your current password.";
        messageEl.classList.add("text-red-600");
        return;
      }

      if (newPassword !== confirmPassword) {
        messageEl.textContent = "Passwords do not match.";
        messageEl.classList.add("text-red-600");
        return;
      }

      if (newPassword.length < 8) {
        messageEl.textContent = "Password must be at least 8 characters.";
        messageEl.classList.add("text-red-600");
        return;
      }

      if (!window.IESupabase || !window.IESupabase.supabase) {
        messageEl.textContent = "Internal error. Please try again later.";
        messageEl.classList.add("text-red-600");
        return;
      }

      submitBtn.disabled = true;

      const { data: sessionData } = await window.IESupabase.getSession();
      if (!sessionData?.session) {
        messageEl.textContent = "Sessione scaduta. Effettua di nuovo il login.";
        messageEl.classList.add("text-red-600");
        submitBtn.disabled = false;
        return;
      }

      const userEmail = sessionData.session.user.email;
      const verifyResult = await window.IESupabase.supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (verifyResult.error) {
      messageEl.textContent = "Current password is incorrect.";
        messageEl.classList.add("text-red-600");
        submitBtn.disabled = false;
        return;
      }

      const result = await window.IESupabase.supabase.auth.updateUser({
        password: newPassword,
      });

      if (result.error) {
        messageEl.textContent = result.error.message || "Password update error.";
        messageEl.classList.add("text-red-600");
        submitBtn.disabled = false;
        return;
      }

      messageEl.textContent = "Password updated successfully.";
      messageEl.classList.add("text-green-600");

      document.getElementById("changePasswordForm").reset();
      submitBtn.disabled = false;
    });
  }

  function showSuccess() {
    const toast = document.querySelector(SELECTORS.successToast);
    if (toast) {
      toast.classList.remove("hidden");
      setTimeout(function () {
        toast.classList.add("hidden");
      }, 3000);
    }
  }

  function showError(message) {
    const errorToast = document.querySelector(SELECTORS.errorToast);
    const errorMessage = document.querySelector(SELECTORS.errorMessage);
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.closest(".profile-error-banner")?.classList.remove("hidden");
    }
    if (errorToast) {
      const textEl = errorToast.querySelector(".profile-error-text");
      if (textEl) textEl.textContent = message;
      errorToast.classList.remove("hidden");
      setTimeout(function () {
        errorToast.classList.add("hidden");
      }, 5000);
    }
  }

  function hideError() {
    const errorToast = document.querySelector(SELECTORS.errorToast);
    const banner = document.querySelector(".profile-error-banner");
    if (banner) banner.classList.add("hidden");
    if (errorToast) errorToast.classList.add("hidden");
  }
})();

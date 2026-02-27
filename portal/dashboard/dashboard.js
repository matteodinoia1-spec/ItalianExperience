// ============================================================================
// Italian Experience – Dashboard data from Supabase
// ----------------------------------------------------------------------------
// Fetches real data for dashboard overview. Uses schema:
//   candidates: id, first_name, last_name, position, status, source, created_at, is_archived
//   job_offers: id, status, is_archived
// Load after: Supabase CDN, supabase.js, app.js
// ============================================================================

(function () {
  "use strict";

  const CARD_KEYS = {
    totalCandidates: "totalCandidates",
    activeJobOffers: "activeJobOffers",
    newCandidatesToday: "newCandidatesToday",
    hiredThisMonth: "hiredThisMonth",
  };

  const SELECTORS = {
    cardValue: "[data-dashboard-value]",
    recentCandidates: "[data-dashboard='recentCandidates']",
    candidatesBySource: "[data-dashboard='candidatesBySource']",
    placeholder: "[data-dashboard-placeholder]",
  };

  /**
   * Get Supabase client. Returns null if not available.
   * @returns {import('@supabase/supabase-js').SupabaseClient | null}
   */
  function getSupabase() {
    if (typeof window.IESupabase === "undefined" || !window.IESupabase.supabase) {
      return null;
    }
    return window.IESupabase.supabase;
  }

  /**
   * Start of today (00:00:00) in ISO string.
   */
  function getTodayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  /**
   * End of today (23:59:59.999) in ISO string.
   */
  function getTodayEnd() {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }

  /**
   * Start of current month in ISO string.
   */
  function getMonthStart() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  /**
   * Start of next month in ISO string.
   */
  function getMonthEnd() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  /**
   * Start of previous month in ISO string.
   */
  function getPreviousMonthStart() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  /**
   * End of previous month (start of current month) in ISO string.
   */
  function getPreviousMonthEnd() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  /**
   * A. Total candidates (is_archived = false).
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function fetchTotalCandidates() {
    const supabase = getSupabase();
    if (!supabase) return { data: 0, error: new Error("Supabase not available") };

    const { count, error } = await supabase
      .from("candidates_with_client")
      .select("*", { count: "exact", head: true })
      .eq("is_archived", false);

    if (error) return { data: 0, error };
    return { data: count ?? 0, error: null };
  }

  /**
   * B. Active job offers (is_archived = false, status = 'open' or 'attiva').
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function fetchActiveJobOffers() {
    const supabase = getSupabase();
    if (!supabase) return { data: 0, error: new Error("Supabase not available") };

    const { count, error } = await supabase
      .from("job_offers_with_client")
      .select("*", { count: "exact", head: true })
      .eq("is_archived", false)
      .in("status", ["open", "attiva"]);

    if (error) return { data: 0, error };
    return { data: count ?? 0, error: null };
  }

  /**
   * C. New candidates today (created_at >= start of today).
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function fetchNewCandidatesToday() {
    const supabase = getSupabase();
    if (!supabase) return { data: 0, error: new Error("Supabase not available") };

    const start = getTodayStart();
    const end = getTodayEnd();

    const { data, error } = await supabase
      .from("candidates_with_client")
      .select("id")
      .eq("is_archived", false)
      .gte("created_at", start)
      .lte("created_at", end);

    if (error) return { data: 0, error };
    return { data: (data || []).length, error: null };
  }

  /**
   * D. Hired this month (status = 'assunto', created_at in current month).
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function fetchHiredThisMonth() {
    const supabase = getSupabase();
    if (!supabase) return { data: 0, error: new Error("Supabase not available") };

    const start = getMonthStart();
    const end = getMonthEnd();

    const { data, error } = await supabase
      .from("candidates_with_client")
      .select("id")
      .eq("status", "assunto")
      .gte("created_at", start)
      .lt("created_at", end);

    if (error) return { data: 0, error };
    return { data: (data || []).length, error: null };
  }

  // ---------------------------------------------------------------------------
  // Month-over-month counts (for percentage indicators)
  // ---------------------------------------------------------------------------

  /**
   * Count candidates with created_at in [start, end).
   * @param {string} start - ISO date string (inclusive)
   * @param {string} end - ISO date string (exclusive)
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function countCandidatesCreatedInRange(start, end) {
    const supabase = getSupabase();
    if (!supabase) return { data: 0, error: new Error("Supabase not available") };
    const { data, error } = await supabase
      .from("candidates_with_client")
      .select("id")
      .gte("created_at", start)
      .lt("created_at", end);
    if (error) return { data: 0, error };
    return { data: (data || []).length, error: null };
  }

  /**
   * Count job offers with created_at in [start, end).
   * @param {string} start - ISO date string (inclusive)
   * @param {string} end - ISO date string (exclusive)
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function countJobOffersCreatedInRange(start, end) {
    const supabase = getSupabase();
    if (!supabase) return { data: 0, error: new Error("Supabase not available") };
    const { data, error } = await supabase
      .from("job_offers_with_client")
      .select("id")
      .gte("created_at", start)
      .lt("created_at", end);
    if (error) return { data: 0, error };
    return { data: (data || []).length, error: null };
  }

  /**
   * Count hired candidates (status 'hired' or 'assunto') with created_at in [start, end).
   * @param {string} start - ISO date string (inclusive)
   * @param {string} end - ISO date string (exclusive)
   * @returns {Promise<{ data: number, error: object | null }>}
   */
  async function countHiredCreatedInRange(start, end) {
    const supabase = getSupabase();
    if (!supabase) return { data: 0, error: new Error("Supabase not available") };
    const { data, error } = await supabase
      .from("candidates_with_client")
      .select("id")
      .or("status.eq.hired,status.eq.assunto")
      .gte("created_at", start)
      .lt("created_at", end);
    if (error) return { data: 0, error };
    return { data: (data || []).length, error: null };
  }

  /**
   * Compute percentage change: ((current - previous) / previous) * 100 with edge cases.
   * - previous = 0 and current > 0 → +100
   * - both 0 → 0
   * - previous > 0 and current = 0 → -100
   * @param {number} current
   * @param {number} previous
   * @returns {{ value: number, isPositive: boolean, isNegative: boolean }}
   */
  function computePercentageChange(current, previous) {
    const curr = Number(current) || 0;
    const prev = Number(previous) || 0;
    if (prev === 0 && curr > 0) return { value: 100, isPositive: true, isNegative: false };
    if (prev === 0 && curr === 0) return { value: 0, isPositive: false, isNegative: false };
    if (prev > 0 && curr === 0) return { value: -100, isPositive: false, isNegative: true };
    const value = Math.round(((curr - prev) / prev) * 100);
    return {
      value,
      isPositive: value > 0,
      isNegative: value < 0,
    };
  }

  /**
   * Format percentage for display: "+12%", "-5%", "0%".
   * @param {{ value: number }} result - from computePercentageChange
   * @returns {string}
   */
  function formatPercentageDisplay(result) {
    const v = result.value;
    if (v > 0) return "+" + v + "%";
    if (v < 0) return v + "%";
    return "0%";
  }

  /**
   * Fetch all month-over-month percentage changes (current vs previous month).
   * @returns {Promise<{ totalCandidates: { value, isPositive, isNegative }, activeJobOffers, newCandidatesToday, hiredThisMonth }>}
   */
  async function fetchMonthOverMonthPercentages() {
    const currStart = getMonthStart();
    const currEnd = getMonthEnd();
    const prevStart = getPreviousMonthStart();
    const prevEnd = getPreviousMonthEnd();

    const [
      candidatesCurr,
      candidatesPrev,
      offersCurr,
      offersPrev,
      hiredCurr,
      hiredPrev,
    ] = await Promise.all([
      countCandidatesCreatedInRange(currStart, currEnd),
      countCandidatesCreatedInRange(prevStart, prevEnd),
      countJobOffersCreatedInRange(currStart, currEnd),
      countJobOffersCreatedInRange(prevStart, prevEnd),
      countHiredCreatedInRange(currStart, currEnd),
      countHiredCreatedInRange(prevStart, prevEnd),
    ]);

    const totalCandidates = computePercentageChange(
      candidatesCurr.error ? 0 : candidatesCurr.data,
      candidatesPrev.error ? 0 : candidatesPrev.data
    );
    const activeJobOffers = computePercentageChange(
      offersCurr.error ? 0 : offersCurr.data,
      offersPrev.error ? 0 : offersPrev.data
    );
    const hiredThisMonth = computePercentageChange(
      hiredCurr.error ? 0 : hiredCurr.data,
      hiredPrev.error ? 0 : hiredPrev.data
    );

    return {
      totalCandidates,
      activeJobOffers,
      newCandidatesToday: totalCandidates,
      hiredThisMonth,
    };
  }

  /**
   * Update percentage indicator spans: text and color (green/red).
   * @param {object} percentages - result from fetchMonthOverMonthPercentages
   */
  function setPercentageIndicators(percentages) {
    if (!percentages) return;
    const keys = [
      CARD_KEYS.totalCandidates,
      CARD_KEYS.activeJobOffers,
      CARD_KEYS.newCandidatesToday,
      CARD_KEYS.hiredThisMonth,
    ];
    keys.forEach((key) => {
      const result = percentages[key];
      if (!result) return;
      const el = document.querySelector("[data-dashboard-percentage=\"" + key + "\"]");
      if (!el) return;
      el.textContent = formatPercentageDisplay(result);
      el.classList.remove("text-green-600", "text-red-600");
      if (result.isPositive) el.classList.add("text-green-600");
      else if (result.isNegative) el.classList.add("text-red-600");
      else el.classList.add("text-gray-500");
    });
  }

  /**
   * E. Recent 5 candidates (first_name, last_name, position, status, created_at).
   * @returns {Promise<{ data: Array<{ first_name: string, last_name: string, position: string, status: string, created_at: string }>, error: object | null }>}
   */
  async function fetchRecentCandidates() {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: new Error("Supabase not available") };

    const { data, error } = await supabase
      .from("candidates_with_client")
      .select("first_name, last_name, position, status, created_at")
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) return { data: [], error };

    const rows = (data || []).map((r) => ({
      first_name: r.first_name ?? "",
      last_name: r.last_name ?? "",
      position: r.position ?? "",
      status: r.status ?? "new",
      created_at: r.created_at ?? "",
    }));
    return { data: rows, error: null };
  }

  /**
   * F. Candidates grouped by source.
   * @returns {Promise<{ data: Array<{ source: string, count: number, percentage: number }>, error: object | null }>}
   */
  async function fetchCandidatesBySource() {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: new Error("Supabase not available") };

    const { data, error } = await supabase
      .from("candidates_with_client")
      .select("source")
      .eq("is_archived", false);

    if (error) return { data: [], error };

    const list = data || [];
    const bySource = {};
    list.forEach((row) => {
      const s = String(row.source ?? "other").trim() || "other";
      bySource[s] = (bySource[s] || 0) + 1;
    });
    const total = list.length;
    const result = Object.entries(bySource).map(([source, count]) => ({
      source,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
    result.sort((a, b) => b.count - a.count);
    return { data: result, error: null };
  }

  /**
   * Set loading state for all dashboard sections.
   * @param {boolean} loading
   */
  function setLoading(loading) {
    document.querySelectorAll(SELECTORS.cardValue).forEach((el) => {
      const val = el.querySelector(".dashboard-value");
      if (val) val.textContent = loading ? "…" : "—";
    });
    document.querySelectorAll("[data-dashboard-percentage]").forEach((el) => {
      el.textContent = loading ? "…" : "—";
    });

    const tbody = document.querySelector(SELECTORS.recentCandidates);
    if (tbody) {
      const placeholder = tbody.querySelector(SELECTORS.placeholder);
      if (placeholder) placeholder.style.display = loading ? "" : "none";
    }

    const sourceContainer = document.querySelector(SELECTORS.candidatesBySource);
    if (sourceContainer) {
      const ph = sourceContainer.querySelector(SELECTORS.placeholder);
      if (ph) {
        ph.style.display = loading ? "" : "none";
        ph.textContent = loading ? "Caricamento..." : "";
      }
    }
  }

  /**
   * Update stat cards with values. Use empty string or "—" for error/empty.
   * @param {object} values - { totalCandidates?, activeJobOffers?, newCandidatesToday?, hiredThisMonth? }
   * @param {boolean} isError - if true, show error state (e.g. "—")
   */
  function setCardValues(values, isError) {
    const format = (n) => {
      if (isError || (n !== 0 && !Number.isFinite(n))) return "—";
      return Number(n).toLocaleString("it-IT");
    };

    const map = {
      [CARD_KEYS.totalCandidates]: values.totalCandidates,
      [CARD_KEYS.activeJobOffers]: values.activeJobOffers,
      [CARD_KEYS.newCandidatesToday]: values.newCandidatesToday,
      [CARD_KEYS.hiredThisMonth]: values.hiredThisMonth,
    };

    Object.entries(map).forEach(([key, num]) => {
      const el = document.querySelector(`[data-dashboard-value="${key}"]`);
      if (!el) return;
      const val = el.querySelector(".dashboard-value");
      if (val) val.textContent = format(num);
    });
  }

  /**
   * Render recent candidates table body.
   * @param {Array<{ first_name: string, last_name: string, position: string, status: string, created_at: string }>} rows
   * @param {boolean} isError
   */
  function renderRecentCandidates(rows, isError) {
    const tbody = document.querySelector(SELECTORS.recentCandidates);
    if (!tbody) return;

    const placeholder = tbody.querySelector(SELECTORS.placeholder);
    if (placeholder) placeholder.remove();

    tbody.innerHTML = "";

    if (isError) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td colspan="4" class="px-6 py-8 text-center text-red-500">Errore nel caricamento. Riprova più tardi.</td>';
      tbody.appendChild(tr);
      return;
    }

    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td colspan="4" class="px-6 py-8 text-center text-gray-400">Nessun candidato recente.</td>';
      tbody.appendChild(tr);
      return;
    }

    const statusClass = (status) => {
      switch (status) {
        case "new": return "badge-new";
        case "interview": return "badge-interview";
        case "hired": return "badge-hired";
        case "assunto": return "badge-hired";
        case "rejected": return "badge-rejected";
        default: return "badge-new";
      }
    };
    const statusLabel = (status) => {
      switch (status) {
        case "assunto": return "Assunto";
        case "new": return "New";
        case "interview": return "Interview";
        case "hired": return "Hired";
        case "rejected": return "Rejected";
        default: return status ? String(status) : "New";
      }
    };

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "table-row transition";
      const createdDate = row.created_at
        ? new Date(row.created_at).toLocaleDateString("it-IT")
        : "—";
      const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "—";
      tr.innerHTML =
        "<td class=\"px-6 py-4 font-semibold text-gray-800\">" + escapeHtml(fullName) + "</td>" +
        "<td class=\"px-6 py-4 text-gray-600\">" + escapeHtml(row.position || "—") + "</td>" +
        "<td class=\"px-6 py-4 text-gray-500 text-sm\">" + escapeHtml(createdDate) + "</td>" +
        "<td class=\"px-6 py-4\"><span class=\"badge " + statusClass(row.status) + "\">" +
        escapeHtml(statusLabel(row.status)) + "</span></td>";
      tbody.appendChild(tr);
    });
  }

  /**
   * Render candidates-by-source section.
   * @param {Array<{ source: string, count: number, percentage: number }>} items
   * @param {boolean} isError
   */
  function renderCandidatesBySource(items, isError) {
    const container = document.querySelector(SELECTORS.candidatesBySource);
    if (!container) return;

    const placeholder = container.querySelector(SELECTORS.placeholder);
    if (placeholder) placeholder.remove();

    container.innerHTML = "";

    if (isError) {
      const p = document.createElement("p");
      p.className = "text-red-500 text-sm py-2";
      p.textContent = "Errore nel caricamento delle sorgenti.";
      container.appendChild(p);
      return;
    }

    if (!items.length) {
      const p = document.createElement("p");
      p.className = "text-gray-400 text-sm py-2";
      p.textContent = "Nessun dato per sorgente.";
      container.appendChild(p);
      return;
    }

    const sourceLabels = {
      linkedin: "LinkedIn",
      email: "Email Diretta",
      website: "Sito Web",
      sito: "Sito Web",
      facebook: "Facebook / IG",
      instagram: "Facebook / IG",
      other: "Altro",
    };
    const colors = ["bg-blue-600", "bg-[#c5a059]", "bg-green-600", "bg-indigo-500", "bg-gray-400"];

    items.forEach((item, idx) => {
      const key = (item.source || "other").toLowerCase();
      const label = sourceLabels[key] || key;
      const color = colors[idx % colors.length];
      const div = document.createElement("div");
      div.className = "space-y-2";
      div.innerHTML =
        "<div class=\"flex justify-between text-xs font-bold uppercase tracking-tighter\">" +
        "<span class=\"text-gray-500\">" + escapeHtml(label) + "</span>" +
        "<span class=\"text-[#1b4332]\">" + (item.percentage || 0) + "%</span>" +
        "</div>" +
        "<div class=\"w-full h-2 bg-gray-100 rounded-full overflow-hidden\">" +
        "<div class=\"h-full " + color + " rounded-full\" style=\"width:" + (item.percentage || 0) + "%\"></div>" +
        "</div>";
      container.appendChild(div);
    });
  }

  function escapeHtml(str) {
    if (str == null) return "";
    const s = String(str);
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  /**
   * Load all dashboard data and update the UI.
   */
  async function loadDashboard() {
    const supabase = getSupabase();
    setLoading(true);

    if (!supabase) {
      setCardValues(
        { totalCandidates: 0, activeJobOffers: 0, newCandidatesToday: 0, hiredThisMonth: 0 },
        true
      );
      renderRecentCandidates([], true);
      renderCandidatesBySource([], true);
      setLoading(false);
      return;
    }

    let cardError = false;
    let totalCandidates = 0;
    let activeJobOffers = 0;
    let newCandidatesToday = 0;
    let hiredThisMonth = 0;
    let recentList = [];
    let sourceList = [];

    let monthOverMonthPercentages = null;

    try {
      const [
        totalRes,
        activeRes,
        newTodayRes,
        hiredRes,
        recentRes,
        bySourceRes,
        momRes,
      ] = await Promise.all([
        fetchTotalCandidates(),
        fetchActiveJobOffers(),
        fetchNewCandidatesToday(),
        fetchHiredThisMonth(),
        fetchRecentCandidates(),
        fetchCandidatesBySource(),
        fetchMonthOverMonthPercentages(),
      ]);

      if (totalRes.error) {
        console.error("[Dashboard] fetchTotalCandidates:", totalRes.error);
        cardError = true;
      } else {
        totalCandidates = totalRes.data;
      }

      if (activeRes.error) {
        console.error("[Dashboard] fetchActiveJobOffers:", activeRes.error);
        cardError = true;
      } else {
        activeJobOffers = activeRes.data;
      }

      if (newTodayRes.error) {
        console.error("[Dashboard] fetchNewCandidatesToday:", newTodayRes.error);
        cardError = true;
      } else {
        newCandidatesToday = newTodayRes.data;
      }

      if (hiredRes.error) {
        console.error("[Dashboard] fetchHiredThisMonth:", hiredRes.error);
        cardError = true;
      } else {
        hiredThisMonth = hiredRes.data;
      }

      if (recentRes.error) {
        console.error("[Dashboard] fetchRecentCandidates:", recentRes.error);
      } else {
        recentList = recentRes.data || [];
      }

      if (bySourceRes.error) {
        console.error("[Dashboard] fetchCandidatesBySource:", bySourceRes.error);
      } else {
        sourceList = bySourceRes.data || [];
      }

      if (momRes && typeof momRes === "object") {
        monthOverMonthPercentages = momRes;
      }

      setCardValues(
        {
          totalCandidates,
          activeJobOffers,
          newCandidatesToday,
          hiredThisMonth,
        },
        cardError
      );
      renderRecentCandidates(recentList, !!recentRes.error);
      renderCandidatesBySource(sourceList, !!bySourceRes.error);
      if (monthOverMonthPercentages) setPercentageIndicators(monthOverMonthPercentages);
    } catch (err) {
      console.error("[Dashboard] loadDashboard error:", err);
      setCardValues(
        { totalCandidates: 0, activeJobOffers: 0, newCandidatesToday: 0, hiredThisMonth: 0 },
        true
      );
      renderRecentCandidates([], true);
      renderCandidatesBySource([], true);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Initialize dashboard: run only on dashboard page.
   */
  function init() {
    const path = (window.location.pathname || "").toLowerCase();
    if (!path.includes("dashboard")) return;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadDashboard);
    } else {
      loadDashboard();
    }
  }

  init();
})();

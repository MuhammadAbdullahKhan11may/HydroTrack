(function () {
  "use strict";

  /* ===================== CONSTANTS & STATE ===================== */
  var STORAGE_KEY = "hydrotrack_state_v1";
  var RING_CIRCUMFERENCE = 2 * Math.PI * 88; // matches SVG r=88

  var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var DEFAULT_STATE = {
    dailyGoalGlasses: 8,
    glassSizeMl: 250,
    todayKey: getTodayKey(),
    todayGlasses: 0,
    history: {} // { "YYYY-MM-DD": { glasses: number, goal: number } }
  };

  var state = loadState();

  /* ===================== HELPERS ===================== */
  function getTodayKey(date) {
    var d = date instanceof Date ? date : new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function clampNumber(value, min, max, fallback) {
    var n = Number(value);
    if (!isFinite(n) || isNaN(n)) return fallback;
    if (typeof min === "number" && n < min) n = min;
    if (typeof max === "number" && n > max) n = max;
    return n;
  }

  function safeInt(value, fallback) {
    var n = parseInt(value, 10);
    return isFinite(n) && !isNaN(n) ? n : fallback;
  }

  function formatMl(ml) {
    var n = isFinite(ml) ? Math.round(ml) : 0;
    return n.toLocaleString("en-US");
  }

  function $(id) {
    return document.getElementById(id);
  }

  /* ===================== STATE LOAD / SAVE ===================== */
  function loadState() {
    var fallback = JSON.parse(JSON.stringify(DEFAULT_STATE));
    fallback.todayKey = getTodayKey();

    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return fallback;
    }
    if (!raw) return fallback;

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
    if (!parsed || typeof parsed !== "object") return fallback;

    var result = {
      dailyGoalGlasses: clampNumber(parsed.dailyGoalGlasses, 1, 99, fallback.dailyGoalGlasses),
      glassSizeMl: (parsed.glassSizeMl === 500) ? 500 : 250,
      todayKey: typeof parsed.todayKey === "string" ? parsed.todayKey : fallback.todayKey,
      todayGlasses: clampNumber(parsed.todayGlasses, 0, 999, 0),
      history: (parsed.history && typeof parsed.history === "object") ? parsed.history : {}
    };

    // sanitize history entries defensively
    var cleanHistory = {};
    Object.keys(result.history).forEach(function (key) {
      var entry = result.history[key];
      if (entry && typeof entry === "object") {
        var glasses = clampNumber(entry.glasses, 0, 999, 0);
        var goal = clampNumber(entry.goal, 1, 99, result.dailyGoalGlasses);
        cleanHistory[key] = { glasses: glasses, goal: goal };
      }
    });
    result.history = cleanHistory;

    // If it's a new day since last save, archive yesterday and reset today
    var currentTodayKey = getTodayKey();
    if (result.todayKey !== currentTodayKey) {
      if (result.todayGlasses > 0 || result.todayKey) {
        result.history[result.todayKey] = {
          glasses: result.todayGlasses,
          goal: result.dailyGoalGlasses
        };
      }
      result.todayKey = currentTodayKey;
      result.todayGlasses = 0;
    }

    return result;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // storage unavailable or full — fail silently, app still works in-memory
      console.warn("HydroTrack: unable to save to localStorage.", e);
    }
  }

  /* ===================== DERIVED VALUES ===================== */
  function getGoalMl() {
    return state.dailyGoalGlasses * state.glassSizeMl;
  }
  function getConsumedMl() {
    return state.todayGlasses * state.glassSizeMl;
  }
  function getPercent() {
    var goal = state.dailyGoalGlasses;
    if (!goal || goal <= 0) return 0;
    var pct = (state.todayGlasses / goal) * 100;
    if (!isFinite(pct) || isNaN(pct)) pct = 0;
    return Math.max(0, Math.min(100, pct));
  }
  function isGoalMet() {
    return state.dailyGoalGlasses > 0 && state.todayGlasses >= state.dailyGoalGlasses;
  }

  /* ===================== RENDER: TODAY ===================== */
  var ringFill = $("ring-fill");

  function renderToday() {
    var goal = state.dailyGoalGlasses;
    var glasses = state.todayGlasses;
    var pct = getPercent();
    var goalMl = getGoalMl();
    var goalMet = isGoalMet();

    setText("goal-glasses-text", goal);
    setText("goal-ml-text", formatMl(goalMl));
    setText("glasses-count", glasses);
    setText("goal-count", goal);
    setText("ring-percent", Math.round(pct) + "%");

    if (ringFill) {
      var offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
      ringFill.style.strokeDashoffset = String(offset);
      ringFill.classList.toggle("goal-met", goalMet);
    }

    var remaining = Math.max(0, goal - glasses);
    var remainingText;
    if (goalMet) {
      remainingText = "Daily goal reached! 🎉";
    } else if (remaining === 1) {
      remainingText = "1 glass remaining";
    } else {
      remainingText = remaining + " glasses remaining";
    }
    setText("remaining-text", remainingText);

    setText(
      "today-status-msg",
      goalMet ? "— Amazing work today!" : "— Keep going!"
    );

    var removeBtn = $("remove-glass-btn");
    if (removeBtn) removeBtn.disabled = glasses <= 0;
  }

  /* ===================== RENDER: PROGRESS ===================== */
  function renderProgress() {
    var pct = getPercent();
    var goalMet = isGoalMet();
    var todayDate = new Date();

    setText("header-date", formatDisplayDate(todayDate));
    setText("progress-date", formatDisplayDate(todayDate));
    setText("progress-percent", Math.round(pct) + "%");
    setText("stat-glasses", state.todayGlasses);
    setText("stat-goal", state.dailyGoalGlasses);
    setText("stat-ml", formatMl(getConsumedMl()));
    setText("stat-ml-goal", formatMl(getGoalMl()));

    var fill = $("today-bar-fill");
    if (fill) {
      fill.style.width = pct + "%";
      fill.classList.toggle("goal-met", goalMet);
    }

    renderHistory();
  }

  function renderHistory() {
    var list = $("history-list");
    if (!list) return;
    list.innerHTML = "";

    var days = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var key = getTodayKey(d);
      var entry;
      if (key === state.todayKey) {
        entry = { glasses: state.todayGlasses, goal: state.dailyGoalGlasses };
      } else {
        entry = state.history[key];
      }
      days.push({
        key: key,
        date: d,
        glasses: entry ? clampNumber(entry.glasses, 0, 999, 0) : 0,
        goal: entry ? clampNumber(entry.goal, 1, 99, state.dailyGoalGlasses) : state.dailyGoalGlasses,
        hasData: !!entry
      });
    }

    days.forEach(function (day) {
      var item = document.createElement("div");
      item.className = "history-item";

      var pct = day.goal > 0 ? Math.max(0, Math.min(100, (day.glasses / day.goal) * 100)) : 0;
      var met = day.goal > 0 && day.glasses >= day.goal;

      var dayLabel = document.createElement("div");
      dayLabel.className = "history-day";
      dayLabel.innerHTML =
        '<p class="day-name">' + DAY_NAMES[day.date.getDay()] + '</p>' +
        '<p class="day-date">' + formatShortDate(day.date) + '</p>';

      var barTrack = document.createElement("div");
      barTrack.className = "history-bar-track";
      var barFill = document.createElement("div");
      barFill.className = "history-bar-fill";
      barFill.style.width = pct + "%";
      if (met) barFill.style.background = "linear-gradient(90deg, #34d17a, #22c55e)";
      barTrack.appendChild(barFill);

      var count = document.createElement("div");
      count.className = "history-count";
      count.textContent = day.glasses + " / " + day.goal;

      item.appendChild(dayLabel);
      item.appendChild(barTrack);
      item.appendChild(count);

      if (met) {
        var check = document.createElement("div");
        check.className = "history-check";
        check.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
        item.appendChild(check);
      }

      list.appendChild(item);
    });
  }

  /* ===================== RENDER: SETTINGS ===================== */
  function renderSettings() {
    setText("goal-value", state.dailyGoalGlasses);
    setText("settings-total-ml", formatMl(getGoalMl()) + " ml");
    setText("settings-glass-size-label", state.glassSizeMl);

    var minusBtn = $("goal-minus");
    var plusBtn = $("goal-plus");
    if (minusBtn) minusBtn.disabled = state.dailyGoalGlasses <= 1;
    if (plusBtn) plusBtn.disabled = state.dailyGoalGlasses >= 99;

    var btn250 = $("size-250");
    var btn500 = $("size-500");
    if (btn250 && btn500) {
      var is250 = state.glassSizeMl === 250;
      btn250.classList.toggle("active", is250);
      btn500.classList.toggle("active", !is250);
      btn250.setAttribute("aria-pressed", String(is250));
      btn500.setAttribute("aria-pressed", String(!is250));
    }
  }

  /* ===================== RENDER ALL ===================== */
  function renderAll() {
    renderToday();
    renderProgress();
    renderSettings();
  }

  function setText(id, value) {
    var el = $(id);
    if (el) el.textContent = String(value);
  }

  function formatDisplayDate(d) {
    try {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {
      return getTodayKey(d);
    }
  }
  function formatShortDate(d) {
    try {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (e) {
      return getTodayKey(d);
    }
  }

  /* ===================== ACTIONS ===================== */
  function addGlass() {
    state.todayGlasses = clampNumber(state.todayGlasses + 1, 0, 999, 0);
    persistAndRender();
  }

  function removeGlass() {
    state.todayGlasses = clampNumber(state.todayGlasses - 1, 0, 999, 0);
    persistAndRender();
  }

  function changeGoal(delta) {
    var next = safeInt(state.dailyGoalGlasses, DEFAULT_STATE.dailyGoalGlasses) + delta;
    state.dailyGoalGlasses = clampNumber(next, 1, 99, state.dailyGoalGlasses);
    persistAndRender();
  }

  function setGlassSize(size) {
    var s = safeInt(size, 250);
    state.glassSizeMl = (s === 500) ? 500 : 250;
    persistAndRender();
  }

  function resetToday() {
    state.todayGlasses = 0;
    persistAndRender();
    showResetStatus();
  }

  function persistAndRender() {
    state.todayKey = getTodayKey();
    saveState();
    renderAll();
  }

  var resetStatusTimeout = null;
  function showResetStatus() {
    var el = $("reset-status");
    if (!el) return;
    el.textContent = "Today's progress has been reset.";
    el.classList.add("visible");
    if (resetStatusTimeout) clearTimeout(resetStatusTimeout);
    resetStatusTimeout = setTimeout(function () {
      el.classList.remove("visible");
    }, 2800);
  }

  /* ===================== EVENT WIRING ===================== */
  function on(id, event, handler) {
    var el = $(id);
    if (el) el.addEventListener(event, handler);
  }

  on("add-glass-btn", "click", addGlass);
  on("remove-glass-btn", "click", removeGlass);
  on("goal-plus", "click", function () { changeGoal(1); });
  on("goal-minus", "click", function () { changeGoal(-1); });
  on("reset-btn", "click", resetToday);

  on("size-250", "click", function () { setGlassSize(250); });
  on("size-500", "click", function () { setGlassSize(500); });

  var editGoalBtn = $("edit-goal-btn");
  if (editGoalBtn) {
    editGoalBtn.addEventListener("click", function () {
      scrollToSection("settings");
    });
  }

  /* ===================== SMOOTH NAV + SCROLLSPY ===================== */
  var navItems = Array.prototype.slice.call(document.querySelectorAll(".nav-item"));
  var sections = ["today", "progress", "settings"]
    .map(function (id) { return $(id); })
    .filter(Boolean);

  function scrollToSection(id) {
    var target = $(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  navItems.forEach(function (item) {
    item.addEventListener("click", function () {
      var targetId = item.getAttribute("data-target");
      scrollToSection(targetId);
      setActiveNav(targetId);
    });
  });

  function setActiveNav(id) {
    navItems.forEach(function (item) {
      var isActive = item.getAttribute("data-target") === id;
      item.classList.toggle("active", isActive);
    });
  }

  function setupScrollSpy() {
    if (!("IntersectionObserver" in window) || sections.length === 0) return;

    var observer = new IntersectionObserver(
      function (entries) {
        var visible = entries
          .filter(function (e) { return e.isIntersecting; })
          .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
        if (visible.length > 0) {
          setActiveNav(visible[0].target.id);
        }
      },
      { root: null, rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach(function (section) { observer.observe(section); });
  }

  /* ===================== MIDNIGHT ROLLOVER CHECK ===================== */
  function checkDateRollover() {
    var currentKey = getTodayKey();
    if (currentKey !== state.todayKey) {
      state.history[state.todayKey] = {
        glasses: state.todayGlasses,
        goal: state.dailyGoalGlasses
      };
      state.todayKey = currentKey;
      state.todayGlasses = 0;
      saveState();
      renderAll();
    }
  }

  /* ===================== INIT ===================== */
  function init() {
    renderAll();
    setupScrollSpy();
    setInterval(checkDateRollover, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
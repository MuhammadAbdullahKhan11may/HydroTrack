/* =========================================================
   HydroTrack — script.js
   State, date system, rendering, and interactions
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     LOCAL DATE SYSTEM
     Never use toISOString() for daily keys — it can shift the
     date across a UTC boundary. Always build the key from the
     browser's local Y/M/D.
  --------------------------------------------------------- */
  function pad(n) { return String(n).padStart(2, '0'); }

  function getLocalDateKey(date) {
    var d = date instanceof Date ? date : new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function formatLocalDate(date) {
    var d = date instanceof Date ? date : new Date();
    return d.toLocaleDateString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  // Returns an array of 7 Date objects, Monday -> Sunday, for the week containing `date`.
  function getWeekDates(date) {
    var d = date instanceof Date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    var day = d.getDay(); // 0 = Sunday
    var mondayOffset = day === 0 ? -6 : 1 - day;
    var monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);

    var week = [];
    for (var i = 0; i < 7; i++) {
      var wd = new Date(monday);
      wd.setDate(monday.getDate() + i);
      week.push(wd);
    }
    return week;
  }

  /* ---------------------------------------------------------
     STATE
  --------------------------------------------------------- */
  var STORAGE_KEY = 'hydroTrackState';
  var MAX_DAILY_LOG = 10000; // technical ceiling, not health advice

  var defaultState = {
    dailyGoal: 2500,      // ml
    servingSize: 250,     // ml
    unit: 'ml',           // display unit: 'ml' | 'L'
    chartUnit: 'glasses', // 'glasses' | 'liters'
    theme: 'light',
    hydrationHistory: {}  // { 'YYYY-MM-DD': ml }
  };

  var state = loadState();
var hydrationRequestInProgress = false;

  function loadState() {
  var newState = Object.assign({}, defaultState, {
    hydrationHistory: {}
  });

  try {
    var raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return newState;
    }

    var parsed = JSON.parse(raw);

    // Only browser-specific UI preferences belong in localStorage.
    if (parsed.theme === 'light' || parsed.theme === 'dark') {
      newState.theme = parsed.theme;
    }

    if (parsed.chartUnit === 'glasses' || parsed.chartUnit === 'liters') {
      newState.chartUnit = parsed.chartUnit;
    }

  } catch (e) {
    // Ignore unavailable/corrupted localStorage.
  }

  return newState;
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: state.theme,
        chartUnit: state.chartUnit
      })
    );
  } catch (e) {
    // App continues working if localStorage is unavailable.
  }
}

  function todayKey() { return getLocalDateKey(new Date()); }

  function getConsumed(dateKey) {
    return state.hydrationHistory[dateKey] || 0;
  }

  function setConsumed(dateKey, ml) {
    state.hydrationHistory[dateKey] = Math.max(0, Math.min(MAX_DAILY_LOG, ml));
  }

  /* ---------------------------------------------------------
     UNIT HELPERS
  --------------------------------------------------------- */
  function mlToDisplay(ml) {
    if (state.unit === 'L') return (ml / 1000).toFixed(1) + ' L';
    return Math.round(ml) + ' ml';
  }

  function mlToLiters(ml) { return (ml / 1000).toFixed(1) + ' L'; }
  function mlToGlasses(ml) { return Math.round(ml / state.servingSize); }

  /* ---------------------------------------------------------
     DOM REFS
  --------------------------------------------------------- */
  var $ = function (id) { return document.getElementById(id); };

  var el = {
    currentDate: $('current-date'),
    statusBadge: $('status-badge'),
    emptyBanner: $('empty-state-banner'),
    successBanner: $('success-banner'),
    ringFill: $('ring-fill'),
    percentageText: $('percentage-text'),
    intakeText: $('intake-text'),
    goalDisplayText: $('goal-display-text'),
    remainingText: $('remaining-text'),
    glassesLeftText: $('glasses-left-text'),
    removeBtn: $('remove-water-btn'),
    addBtn: $('add-water-btn'),
    waterError: $('water-error'),
    glanceConsumed: $('glance-consumed'),
    glanceGoal: $('glance-goal'),
    glanceGlasses: $('glance-glasses'),
    glanceRemainingPercent: $('glance-remaining-percent'),

    weekRangeText: $('week-range-text'),
    streakValue: $('streak-value'),
    streakLongest: $('streak-longest'),
    weeklyAvgValue: $('weekly-avg-value'),
    weeklyAvgNote: $('weekly-avg-note'),
    goalsCompletedValue: $('goals-completed-value'),
    goalsCompletedBar: $('goals-completed-bar'),
    miniRingFill: $('mini-ring-fill'),
    todayPercentValue: $('today-percent-value'),
    todayPercentNote: $('today-percent-note'),

    chartGoalLabel: $('chart-goal-label'),
    weeklyChart: $('weekly-chart'),
    wsTotal: $('ws-total'),
    wsCompletion: $('ws-completion'),
    wsAvg: $('ws-avg'),
    wsDaysOnGoal: $('ws-days-on-goal'),
    wsProgressPercent: $('ws-progress-percent'),
    wsProgressBar: $('ws-progress-bar'),
    achievementsList: $('achievements-list'),

    goalInput: $('goal-input'),
    goalError: $('goal-error'),
    currentYear: $('current-year'),
toast: $('toast'),
profileCircle: document.querySelector('.profile-circle')
  };

  var RING_CIRC = 2 * Math.PI * 95;   // main ring r=95
  var MINI_RING_CIRC = 2 * Math.PI * 24; // mini ring r=24

  /* ---------------------------------------------------------
     TOAST
  --------------------------------------------------------- */
  var toastTimer = null;
  function showToast(message, type) {
    el.toast.textContent = message;
    el.toast.className = 'toast' + (type ? ' toast-' + type : '');
    el.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.add('hidden');
    }, 3200);
  }

  /* ---------------------------------------------------------
     TODAY RENDER
  --------------------------------------------------------- */
  function renderToday() {
    var key = todayKey();
    var consumed = getConsumed(key);
    var goal = state.dailyGoal;
    var percent = goal > 0 ? (consumed / goal) * 100 : 0;
    var ringPercent = Math.min(percent, 100);
    var remaining = Math.max(0, goal - consumed);
    var glassesConsumed = mlToGlasses(consumed);
    var glassesGoal = mlToGlasses(goal);
    var glassesLeft = Math.max(0, glassesGoal - glassesConsumed);

    el.currentDate.textContent = formatLocalDate(new Date());

    // Ring
    var offset = RING_CIRC - (ringPercent / 100) * RING_CIRC;
    el.ringFill.style.strokeDasharray = RING_CIRC;
    el.ringFill.style.strokeDashoffset = offset;
    el.percentageText.textContent = Math.round(percent) + '%';
    el.intakeText.textContent = mlToLiters(consumed) + ' / ' + mlToLiters(goal);

    // Goal / stats
    el.goalDisplayText.textContent = mlToLiters(goal) + ' (' + glassesGoal + ' glasses)';
    el.remainingText.textContent = mlToDisplay(remaining);
    el.glassesLeftText.textContent = String(glassesLeft);

    // Status + banners
    var isComplete = consumed >= goal && goal > 0;
    el.statusBadge.textContent = isComplete ? 'Goal Completed' : 'On Track';
    el.statusBadge.classList.toggle('complete', isComplete);
    el.successBanner.classList.toggle('hidden', !isComplete);
    el.emptyBanner.classList.toggle('hidden', consumed !== 0);

    // Glance
    el.glanceConsumed.textContent = mlToDisplay(consumed);
    el.glanceGoal.textContent = mlToDisplay(goal);
    el.glanceGlasses.textContent = glassesConsumed + ' / ' + glassesGoal;
    el.glanceRemainingPercent.textContent = Math.max(0, Math.round(100 - percent)) + '%';

    el.removeBtn.disabled = consumed <= 0;
  }

 async function addWater(amount) {
  if (hydrationRequestInProgress) {
    return;
  }

  var key = todayKey();
  var consumed = getConsumed(key);

  if (consumed >= MAX_DAILY_LOG) {
    showToast('Maximum daily tracking limit reached.', 'error');
    return;
  }

  var next = Math.min(MAX_DAILY_LOG, consumed + amount);

  hydrationRequestInProgress = true;

  try {
    const response = await fetch('/api/hydration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        date: key,
        waterIntake: next
      })
    });

    const data = await response.json();

    if (response.status === 401) {
      window.location.replace('sign-in.html');
      return;
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to add water.');
    }

    setConsumed(key, data.hydration.waterIntake);
    renderAll();

    if (next >= state.dailyGoal && consumed < state.dailyGoal) {
      showToast('Daily Goal Completed! 🎉', 'success');
    }

  } catch (error) {
    console.error('Add water error:', error);
    showToast('Unable to save water intake.', 'error');

  } finally {
    hydrationRequestInProgress = false;
  }
}

  async function removeWater(amount) {
  if (hydrationRequestInProgress) {
    return;
  }

  var key = todayKey();
  var consumed = getConsumed(key);

  if (consumed <= 0) {
    showToast('Cannot go below 0 ml.', 'error');
    return;
  }

  var next = Math.max(0, consumed - amount);

  hydrationRequestInProgress = true;

  try {
    const response = await fetch('/api/hydration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        date: key,
        waterIntake: next
      })
    });

    const data = await response.json();

    if (response.status === 401) {
      window.location.replace('sign-in.html');
      return;
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to remove water.');
    }

    setConsumed(key, data.hydration.waterIntake);
    renderAll();

  } catch (error) {
    console.error('Remove water error:', error);
    showToast('Unable to save water intake.', 'error');

  } finally {
    hydrationRequestInProgress = false;
  }
}
  /* ---------------------------------------------------------
     PROGRESS RENDER
  --------------------------------------------------------- */
  function computeStreak() {
    // Current streak: consecutive days ending today (or yesterday if
    // today hasn't hit goal yet) where consumed >= goal.
    var d = new Date();
    if (getConsumed(getLocalDateKey(d)) < state.dailyGoal) {
      d.setDate(d.getDate() - 1);
    }
    var streak = 0;
    while (getConsumed(getLocalDateKey(d)) >= state.dailyGoal && state.dailyGoal > 0
      && Object.prototype.hasOwnProperty.call(state.hydrationHistory, getLocalDateKey(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function computeLongestStreak() {
    var keys = Object.keys(state.hydrationHistory).sort();
    var longest = 0, running = 0, prevDate = null;
    keys.forEach(function (key) {
      var met = state.hydrationHistory[key] >= state.dailyGoal && state.dailyGoal > 0;
      var d = new Date(key + 'T00:00:00');
      if (met) {
        if (prevDate) {
          var diffDays = Math.round((d - prevDate) / 86400000);
          running = diffDays === 1 ? running + 1 : 1;
        } else {
          running = 1;
        }
        longest = Math.max(longest, running);
        prevDate = d;
      } else {
        running = 0;
        prevDate = null;
      }
    });
    return longest;
  }

  function renderProgress() {
    var week = getWeekDates(new Date());
    var weekKeys = week.map(function (d) { return getLocalDateKey(d); });
    var weekValues = weekKeys.map(function (k) { return getConsumed(k); });
    var goal = state.dailyGoal;
    var goalGlasses = mlToGlasses(goal);

    var startLabel = week[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    var endLabel = week[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    el.weekRangeText.textContent = startLabel + ' – ' + endLabel;

    // Summary cards
    var streak = computeStreak();
    var longest = computeLongestStreak();
    el.streakValue.textContent = streak + (streak === 1 ? ' day' : ' days');
    el.streakLongest.textContent = 'Longest streak: ' + longest + (longest === 1 ? ' day' : ' days');

    var totalGlasses = weekValues.reduce(function (sum, ml) { return sum + mlToGlasses(ml); }, 0);
    var avgGlasses = weekValues.length ? (totalGlasses / weekValues.length) : 0;
    el.weeklyAvgValue.textContent = avgGlasses.toFixed(1) + ' glasses/day';

    var daysOnGoal = weekValues.filter(function (ml) { return ml >= goal && goal > 0; }).length;
    el.goalsCompletedValue.textContent = daysOnGoal + ' / 7';
    el.goalsCompletedBar.style.width = Math.round((daysOnGoal / 7) * 100) + '%';

    var todayConsumed = getConsumed(todayKey());
    var todayPercent = goal > 0 ? (todayConsumed / goal) * 100 : 0;
    var todayRingPercent = Math.min(todayPercent, 100);
    var miniOffset = MINI_RING_CIRC - (todayRingPercent / 100) * MINI_RING_CIRC;
    el.miniRingFill.style.strokeDasharray = MINI_RING_CIRC;
    el.miniRingFill.style.strokeDashoffset = miniOffset;
    el.todayPercentValue.textContent = Math.round(todayPercent) + '%';
    el.todayPercentNote.textContent = todayPercent >= 100 ? "You're doing great!" : 'Keep going!';

    // Weekly summary card
    el.wsTotal.textContent = totalGlasses + ' / ' + (goalGlasses * 7);
    var weeklyCompletion = goalGlasses * 7 > 0 ? Math.round((totalGlasses / (goalGlasses * 7)) * 100) : 0;
    el.wsCompletion.textContent = weeklyCompletion + '%';
    el.wsAvg.textContent = avgGlasses.toFixed(1);
    el.wsDaysOnGoal.textContent = String(daysOnGoal);
    el.wsProgressPercent.textContent = weeklyCompletion + '%';
    el.wsProgressBar.style.width = Math.min(weeklyCompletion, 100) + '%';

    // Chart
    renderChart(week, weekKeys, weekValues, goal);

    // Achievements
    renderAchievements();
  }

  function renderChart(week, weekKeys, weekValues, goal) {
    var unit = state.chartUnit; // 'glasses' | 'liters'
    var goalDisplay = unit === 'glasses' ? mlToGlasses(goal) : Number((goal / 1000).toFixed(1));
    el.chartGoalLabel.textContent = 'Daily goal: ' + goalDisplay + (unit === 'glasses' ? ' glasses' : ' L');

    var displayValues = weekValues.map(function (ml) {
      return unit === 'glasses' ? mlToGlasses(ml) : Number((ml / 1000).toFixed(1));
    });

    var maxScale = Math.max(goalDisplay, Math.max.apply(null, displayValues)) || 1;
    // round scale up a bit for headroom
    maxScale = Math.ceil(maxScale * 1.15) || 1;

    var goalLinePercent = Math.min((goalDisplay / maxScale) * 100, 100);

    var html = '<div class="chart-goal-dash" style="bottom:' + goalLinePercent + '%"></div>';
    week.forEach(function (d, i) {
      var val = displayValues[i];
      var barPercent = Math.min((val / maxScale) * 100, 100);
      html += '' +
        '<div class="chart-day">' +
          '<span class="chart-value">' + val + '</span>' +
          '<div class="chart-bar-track">' +
            '<div class="chart-bar-fill" style="height:' + barPercent + '%"></div>' +
          '</div>' +
        '</div>';
    });
    el.weeklyChart.innerHTML = html;

    var labelsHtml = '<div class="chart-labels">';
    week.forEach(function (d, i) {
      var met = weekValues[i] >= goal && goal > 0;
      var dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
      var dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      labelsHtml += '<div class="chart-day-label">' + dayName + '<b>' + dateLabel + '</b>' +
        (met ? '<i data-lucide="check-circle"></i>' : '') + '</div>';
    });
    labelsHtml += '</div>';

    // Replace any previously-rendered labels row, then insert the fresh one.
    var existingLabels = el.weeklyChart.parentElement.querySelector('.chart-labels');
    if (existingLabels) existingLabels.remove();
    el.weeklyChart.insertAdjacentHTML('afterend', labelsHtml);

    if (window.lucide) window.lucide.createIcons();
  }

  /* ---------------------------------------------------------
     ACHIEVEMENTS
  --------------------------------------------------------- */
  var ACHIEVEMENTS = [
    {
      id: 'first-goal',
      title: 'First Goal',
      desc: 'Complete your daily goal at least once',
      icon: 'star',
      check: function (history, goal) {
        return Object.keys(history).some(function (k) { return history[k] >= goal; });
      }
    },
    {
      id: 'streak-3',
      title: '3-Day Streak',
      desc: 'Complete your daily goal 3 days in a row',
      icon: 'flame',
      check: function () { return computeLongestStreak() >= 3; }
    },
    {
      id: 'streak-7',
      title: '7-Day Streak',
      desc: 'Complete your daily goal 7 days in a row',
      icon: 'trophy',
      check: function () { return computeLongestStreak() >= 7; }
    },
    {
      id: 'consistent',
      title: 'Consistent Drinker',
      desc: 'Reach your goal at least 5 times in one week',
      icon: 'calendar-check',
      check: function () {
        var week = getWeekDates(new Date());
        var count = week.filter(function (d) {
          return getConsumed(getLocalDateKey(d)) >= state.dailyGoal && state.dailyGoal > 0;
        }).length;
        return count >= 5;
      }
    }
  ];

  function renderAchievements() {
    var html = '';
    ACHIEVEMENTS.forEach(function (a) {
      var unlocked = a.check(state.hydrationHistory, state.dailyGoal);
      html += '' +
        '<div class="achievement-item' + (unlocked ? '' : ' locked') + '">' +
          '<div class="achievement-icon"><i data-lucide="' + a.icon + '"></i></div>' +
          '<div class="achievement-body"><b>' + a.title + '</b><span>' + a.desc + '</span></div>' +
          '<span class="achievement-status">' + (unlocked ? 'Completed' : 'Locked') + '</span>' +
        '</div>';
    });
    el.achievementsList.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  /* ---------------------------------------------------------
     SETTINGS RENDER
  --------------------------------------------------------- */
  function renderSettings() {
    el.goalInput.value = state.dailyGoal;
    document.querySelectorAll('.serving-option').forEach(function (btn) {
      btn.classList.toggle('active', Number(btn.dataset.serving) === state.servingSize);
    });
    document.querySelectorAll('.unit-option').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.unit === state.unit);
    });
  }

  function validateGoal(value) {
    if (isNaN(value) || value === null || value === '') {
      return 'Please enter a valid number.';
    }
    if (value < 500) return 'Daily goal must be at least 500 ml.';
    if (value > 8000) return 'Daily goal cannot exceed 8,000 ml.';
    if (value < 0) return 'Daily goal cannot be negative.';
    return null;
  }

  async function saveSettings() {
  var rawGoal = Number(el.goalInput.value);
  var error = validateGoal(rawGoal);

  if (error) {
    el.goalError.textContent = error;
    el.goalError.classList.remove('hidden');
    return;
  }

  el.goalError.classList.add('hidden');

  try {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        dailyGoal: rawGoal,
        servingSize: state.servingSize,
        measurementUnit: state.unit
      })
    });

    const data = await response.json();

    if (response.status === 401) {
      window.location.replace('sign-in.html');
      return;
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to save settings.');
    }

    state.dailyGoal = data.settings.dailyGoal;
    state.servingSize = data.settings.servingSize;
    state.unit = data.settings.measurementUnit;

    renderAll();
    showToast('Settings saved.', 'success');

  } catch (error) {
    console.error('Save settings error:', error);
    showToast('Unable to save settings.', 'error');
  }
}

  /* ---------------------------------------------------------
     MODAL
  --------------------------------------------------------- */
  var modal = $('reset-modal');
  function openModal() { modal.classList.remove('hidden'); }
  function closeModal() { modal.classList.add('hidden'); }

  async function confirmReset() {
  var key = todayKey();

  try {
    const response = await fetch(
      '/api/hydration/today?date=' + encodeURIComponent(key),
      {
        method: 'DELETE',
        credentials: 'include'
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      window.location.replace('sign-in.html');
      return;
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to reset progress.');
    }

    setConsumed(key, 0);
    renderAll();
    closeModal();

    showToast("Today's progress has been reset.", 'success');

  } catch (error) {
    console.error('Reset progress error:', error);
    showToast('Unable to reset today\'s progress.', 'error');
  }
}
  /* ---------------------------------------------------------
     NAVIGATION
  --------------------------------------------------------- */
  function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(function (sec) {
      sec.classList.toggle('active', sec.id === pageId);
    });
    document.querySelectorAll('.nav-link').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------------------------------------------------
     THEME
  --------------------------------------------------------- */
  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    $('theme-toggle').setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    saveState();
  }

  /* ---------------------------------------------------------
     RENDER ALL
  --------------------------------------------------------- */
  function renderAll() {
    renderToday();
    renderProgress();
    renderSettings();
  }

  /* ---------------------------------------------------------
     EVENTS
  --------------------------------------------------------- */
  function bindEvents() {
    document.querySelectorAll('.nav-link, .logo').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        switchPage(link.dataset.page);
      });
    });

    el.addBtn.addEventListener('click', function () { addWater(state.servingSize); });
    el.removeBtn.addEventListener('click', function () { removeWater(state.servingSize); });

    document.querySelectorAll('.quick-add-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { addWater(Number(btn.dataset.amount)); });
    });

    document.querySelectorAll('.unit-toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.unit-toggle-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.chartUnit = btn.dataset.unit;
        saveState();
        renderProgress();
      });
    });

    document.querySelectorAll('.serving-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.servingSize = Number(btn.dataset.serving);
        saveState();
        renderSettings();
        renderToday();
      });
    });

    document.querySelectorAll('.unit-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.unit = btn.dataset.unit;
        saveState();
        renderSettings();
        renderToday();
      });
    });

    el.goalInput.addEventListener('input', function () {
      el.goalError.classList.add('hidden');
    });

    $('save-settings-btn').addEventListener('click', saveSettings);
    $('reset-progress-btn').addEventListener('click', openModal);
    $('reset-cancel-btn').addEventListener('click', closeModal);
    $('reset-confirm-btn').addEventListener('click', confirmReset);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });

    $('theme-toggle').addEventListener('click', toggleTheme);
  }
/* ---------------------------------------------------------
   AUTHENTICATION
--------------------------------------------------------- */

async function checkAuthentication() {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      window.location.replace('sign-in.html');
      return false;
    }

    const data = await response.json();

    if (!data.success || !data.user) {
      window.location.replace('sign-in.html');
      return false;
    }

    // Generate profile initials from authenticated user's name.
    if (el.profileCircle && data.user.name) {
      const initials = data.user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(function (part) {
          return part.charAt(0).toUpperCase();
        })
        .join('');

      el.profileCircle.textContent = initials || 'U';
    }

    return true;

  } catch (error) {
    console.error('Authentication check failed:', error);
    window.location.replace('sign-in.html');
    return false;
  }
}

/* ---------------------------------------------------------
   LOAD DASHBOARD DATA FROM API
--------------------------------------------------------- */

async function loadDashboardData() {
  try {
    const [settingsResponse, hydrationResponse] = await Promise.all([
      fetch('/api/settings', {
        method: 'GET',
        credentials: 'include'
      }),
      fetch('/api/hydration', {
        method: 'GET',
        credentials: 'include'
      })
    ]);

    if (settingsResponse.status === 401 || hydrationResponse.status === 401) {
      window.location.replace('sign-in.html');
      return false;
    }

    const settingsData = await settingsResponse.json();
    const hydrationData = await hydrationResponse.json();

    if (!settingsResponse.ok || !settingsData.success) {
      throw new Error(
        settingsData.message || 'Unable to load settings.'
      );
    }

    if (!hydrationResponse.ok || !hydrationData.success) {
      throw new Error(
        hydrationData.message || 'Unable to load hydration history.'
      );
    }

    // Database-backed settings
    state.dailyGoal = settingsData.settings.dailyGoal;
    state.servingSize = settingsData.settings.servingSize;
    state.unit = settingsData.settings.measurementUnit;

    // Database-backed hydration history
    state.hydrationHistory = {};

    hydrationData.hydration.forEach(function (record) {
      state.hydrationHistory[record.date] = record.waterIntake;
    });

    return true;

  } catch (error) {
    console.error('Dashboard data loading failed:', error);
    showToast('Unable to load your HydroTrack data.', 'error');
    return false;
  }
}

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */
async function init() {

  // 1. Verify authentication
  const isAuthenticated = await checkAuthentication();

  if (!isAuthenticated) {
    return;
  }

  // 2. Apply local UI preferences
  applyTheme(state.theme);
  el.currentYear.textContent = new Date().getFullYear();

  document.querySelectorAll('.unit-toggle-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.unit === state.chartUnit);
  });

  // 3. Bind UI interactions BEFORE loading API data
  bindEvents();

  // 4. Load database-backed data
  const dataLoaded = await loadDashboardData();

  if (!dataLoaded) {
    return;
  }

  // 5. Render using database-backed data
  renderAll();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
/* =========================================================
   Authentication — Logout
   ========================================================= */

const logoutBtn = document.getElementById('logout-btn');

if (logoutBtn) {
  logoutBtn.addEventListener('click', async function () {
    const originalContent = logoutBtn.innerHTML;

    logoutBtn.disabled = true;
    logoutBtn.innerHTML = '<span>Signing out...</span>';

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to sign out.');
      }

      // Authentication cookie has now been cleared by the server.
      window.location.href = 'sign-in.html';

    } catch (error) {
      console.error('Logout failed:', error);

      logoutBtn.disabled = false;
      logoutBtn.innerHTML = originalContent;

      // Re-render Lucide icon after restoring innerHTML.
      if (window.lucide) {
        lucide.createIcons();
      }

      alert('Unable to sign out. Please try again.');
    }
  });
}
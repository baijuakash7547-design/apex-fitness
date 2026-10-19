// ── Water Tracker Module ──────────────────────────────────────────────────────

const WaterModule = (() => {
  const DEFAULT_GOAL = 8; // glasses
  const GLASS_ML = 250;

  function init() {
    setupEventListeners();
    renderWaterTracker();
  }

  function setupEventListeners() {
    const addBtn = document.getElementById('add-water-btn');
    if (addBtn) addBtn.addEventListener('click', addGlass);

    const removeBtn = document.getElementById('remove-water-btn');
    if (removeBtn) removeBtn.addEventListener('click', removeGlass);

    const saveGoalBtn = document.getElementById('save-water-goal-btn');
    if (saveGoalBtn) saveGoalBtn.addEventListener('click', saveWaterGoal);

    const customBtn = document.getElementById('add-custom-water-btn');
    if (customBtn) customBtn.addEventListener('click', addCustomAmount);
  }

  function getTodayData() {
    const water = Storage.getWater();
    const today = Storage.todayKey();
    const current = Number(water[today]?.glasses);
    water[today] = { glasses: Number.isFinite(current) && current >= 0 ? Math.min(current, 10000) : 0 };
    return { water, today };
  }

  function addGlass() {
    const { water, today } = getTodayData();
    water[today].glasses = (water[today].glasses || 0) + 1;
    if (!Storage.saveWater(water)) return;
    renderWaterTracker();
    updateDashboard();
    checkAchievements();
    animateWaterAdd();
  }

  function removeGlass() {
    const { water, today } = getTodayData();
    water[today].glasses = Math.max(0, (water[today].glasses || 0) - 1);
    if (!Storage.saveWater(water)) return;
    renderWaterTracker();
    updateDashboard();
  }

  function addCustomAmount() {
    const mlInput = document.getElementById('custom-water-ml');
    if (!mlInput) return;
    const ml = parseFloat(mlInput.value);
    if (!Number.isFinite(ml) || ml <= 0 || ml > 10000) { showToast('Enter an amount between 1 and 10,000 ml.', 'warning'); return; }
    const glasses = ml / GLASS_ML;
    const { water, today } = getTodayData();
    water[today].glasses = Math.round(((water[today].glasses || 0) + glasses) * 10) / 10;
    if (!Storage.saveWater(water)) return;
    mlInput.value = '';
    renderWaterTracker();
    updateDashboard();
    showToast(`Added ${ml}ml of water! 💧`, 'success');
  }

  function saveWaterGoal() {
    const input = document.getElementById('water-goal-input');
    if (!input) return;
    const goal = Number(input.value);
    if (!Number.isInteger(goal) || goal < 1 || goal > 30) { showToast('Choose a daily goal from 1 to 30 glasses.', 'warning'); return; }
    if (!Storage.set('ft_water_goal', goal)) return;
    renderWaterTracker();
    showToast('Water goal updated!', 'success');
  }

  function getGoal() {
    const goal = Number(Storage.get('ft_water_goal', DEFAULT_GOAL));
    return Number.isInteger(goal) && goal >= 1 && goal <= 30 ? goal : DEFAULT_GOAL;
  }

  function renderWaterTracker() {
    const { water, today } = getTodayData();
    const glasses = Number(water[today]?.glasses) || 0;
    const goal = getGoal();
    const pct = Math.min(100, (glasses / goal) * 100);
    const ml = Math.round(glasses * GLASS_ML);

    const glassesEl = document.getElementById('water-glasses-count');
    const mlEl = document.getElementById('water-ml-count');
    const progressEl = document.getElementById('water-progress-bar');
    const percentEl = document.getElementById('water-percent');
    const goalInput = document.getElementById('water-goal-input');
    const statusEl = document.getElementById('water-status');

    if (glassesEl) glassesEl.textContent = glasses.toFixed(1);
    if (mlEl) mlEl.textContent = ml.toLocaleString();
    if (progressEl) progressEl.style.width = pct + '%';
    if (percentEl) percentEl.textContent = Math.round(pct) + '%';
    if (goalInput) goalInput.value = goal;
    if (statusEl) {
      if (pct >= 100) { statusEl.textContent = '🎉 Goal reached! Amazing!'; statusEl.className = 'water-status success'; }
      else if (pct >= 75) { statusEl.textContent = '💪 Almost there! Keep going!'; statusEl.className = 'water-status good'; }
      else if (pct >= 50) { statusEl.textContent = '👍 Halfway done!'; statusEl.className = 'water-status medium'; }
      else { statusEl.textContent = '💧 Stay hydrated!'; statusEl.className = 'water-status low'; }
    }

    renderWaterGlasses(glasses, goal);
    renderWaterHistory();
  }

  function renderWaterGlasses(current, goal) {
    const container = document.getElementById('water-glasses-visual');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < goal; i++) {
      const glass = document.createElement('button');
      glass.type = 'button';
      glass.className = `water-glass ${i < Math.floor(current) ? 'filled' : i < current ? 'half' : ''}`;
      glass.setAttribute('aria-label', `Set today's water intake to ${i + 1} glasses`);
      glass.setAttribute('aria-pressed', String(i + 1 <= current));
      glass.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 3h14l-2 17H7L5 3z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${i < Math.floor(current) ? '<path d="M7 14h10l-.5 4.5H7.5L7 14z" fill="currentColor" opacity="0.8"/>' : ''}
        </svg>
      `;
      glass.addEventListener('click', () => {
        const { water, today } = getTodayData();
        water[today].glasses = i + 1;
        if (!Storage.saveWater(water)) return;
        renderWaterTracker();
        updateDashboard();
      });
      container.appendChild(glass);
    }
  }

  function renderWaterHistory() {
    const container = document.getElementById('water-history-list');
    if (!container) return;
    const water = Storage.getWater();
    const goal = getGoal();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localDateKey(d);
      days.push({
        label: d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
        glasses: Math.max(0, Math.min(10000, Number(water[key]?.glasses) || 0)),
        goal,
      });
    }
    container.innerHTML = days.map(d => `
      <div class="water-history-row">
        <span class="water-history-day">${d.label}</span>
        <div class="water-history-bar-wrap">
          <div class="water-history-bar" style="width:${Math.min(100, (d.glasses / d.goal) * 100)}%"></div>
        </div>
        <span class="water-history-value">${d.glasses.toFixed(1)} / ${d.goal} 🥤</span>
      </div>
    `).join('');
  }

  function animateWaterAdd() {
    const container = document.getElementById('water-animation-container');
    if (!container) return;
    const drop = document.createElement('div');
    drop.className = 'water-drop-anim';
    drop.textContent = '💧';
    container.appendChild(drop);
    setTimeout(() => drop.remove(), 1000);
  }

  function getTodayGlasses() {
    const water = Storage.getWater();
    const today = Storage.todayKey();
    const glasses = Number(water[today]?.glasses);
    return Number.isFinite(glasses) && glasses >= 0 ? Math.min(glasses, 10000) : 0;
  }

  function getWeeklyWater() {
    const water = Storage.getWater();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localDateKey(d);
      result.push({
        label: d.toLocaleDateString('en', { weekday: 'short' }),
        glasses: water[key]?.glasses || 0,
      });
    }
    return result;
  }

  return { init, addGlass, removeGlass, getTodayGlasses, getWeeklyWater, getGoal, renderWaterTracker };
})();

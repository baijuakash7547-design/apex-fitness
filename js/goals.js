// ── Goals & Achievements Module ───────────────────────────────────────────────

const GoalsModule = (() => {
  const ACHIEVEMENTS = [
    { id: 'first_workout', icon: '🏋️', title: 'First Rep!', desc: 'Log your first workout', check: () => Storage.getWorkouts().length >= 1 },
    { id: 'week_warrior', icon: '🗓️', title: 'Week Warrior', desc: 'Work out 5 days in a week', check: checkWeekWarrior },
    { id: 'hydration_hero', icon: '💧', title: 'Hydration Hero', desc: 'Hit your water goal 7 days in a row', check: checkHydrationHero },
    { id: 'calorie_counter', icon: '🔥', title: 'Calorie Counter', desc: 'Log meals for 7 days', check: checkCalorieCounter },
    { id: 'iron_will', icon: '🦾', title: 'Iron Will', desc: 'Log 10 workouts total', check: () => Storage.getWorkouts().length >= 10 },
    { id: 'heavy_lifter', icon: '🏆', title: 'Heavy Lifter', desc: 'Log 1000kg+ total volume in one workout', check: checkHeavyLifter },
    { id: 'consistent', icon: '📅', title: 'Consistent', desc: 'Log something for 30 days', check: checkConsistent },
    { id: 'protein_king', icon: '🥩', title: 'Protein King', desc: 'Hit protein goal 5 days in a row', check: checkProteinKing },
    { id: 'early_bird', icon: '🌅', title: 'Early Bird', desc: 'Log a workout before 8AM', check: checkEarlyBird },
    { id: 'centurion', icon: '💯', title: 'Centurion', desc: 'Log 100 total exercises', check: checkCenturion },
  ];

  function checkWeekWarrior() {
    const workouts = Storage.getWorkouts();
    for (let weekStart = 0; weekStart < 4; weekStart++) {
      const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() - weekStart * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      const startKey = localDateKey(start);
      const endKey = localDateKey(end);
      const days = new Set();
      workouts.forEach(w => {
        const key = localDateKey(w.date);
        const diff = calendarDayDifference(startKey, key);
        if (diff >= 0 && key <= endKey) days.add(key);
      });
      if (days.size >= 5) return true;
    }
    return false;
  }

  function checkHydrationHero() {
    const water = Storage.getWater();
    const goal = WaterModule.getGoal();
    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = localDateKey(d);
      if ((water[key]?.glasses || 0) >= goal) streak++;
      else break;
    }
    return streak >= 7;
  }

  function checkCalorieCounter() {
    const meals = Storage.getMeals();
    const days = new Set(meals.map(m => localDateKey(m.date)).filter(Boolean));
    return days.size >= 7;
  }

  function checkHeavyLifter() {
    return Storage.getWorkouts().some(w => w.totalVolume >= 1000);
  }

  function checkConsistent() {
    const allDates = new Set([
      ...Storage.getWorkouts().map(w => localDateKey(w.date)).filter(Boolean),
      ...Storage.getMeals().map(m => localDateKey(m.date)).filter(Boolean),
    ]);
    return allDates.size >= 30;
  }

  function checkProteinKing() {
    const meals = Storage.getMeals();
    const goals = NutritionModule.getGoals();
    let streak = 0;
    for (let i = 0; i < 5; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = localDateKey(d);
      const dayMeals = meals.filter(m => localDateKey(m.date) === key);
      const protein = dayMeals.reduce((acc, m) => acc + (Number(m.protein) || 0), 0);
      if (protein >= goals.protein) streak++;
      else break;
    }
    return streak >= 5;
  }

  function checkEarlyBird() {
    return Storage.getWorkouts().some(w => new Date(w.date).getHours() < 8);
  }

  function checkCenturion() {
    return Storage.getWorkouts().reduce((acc, w) => acc + (Array.isArray(w.sets) ? w.sets.length : 0), 0) >= 100;
  }

  function init() {
    renderGoals();
    renderAchievements();
    setupEventListeners();
  }

  function setupEventListeners() {
    const addGoalBtn = document.getElementById('add-goal-btn');
    if (addGoalBtn) addGoalBtn.addEventListener('click', addGoal);
    document.getElementById('goals-list')?.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const id = Number(button.dataset.id);
      if (!Number.isSafeInteger(id) || id < 0) return;
      if (button.dataset.action === 'delete-goal') deleteGoal(id);
      if (button.dataset.action === 'update-goal') {
        const input = document.getElementById(button.dataset.inputId);
        if (input) updateGoalProgress(id, input.value);
      }
    });
  }

  function addGoal() {
    const title = document.getElementById('goal-title')?.value.trim();
    const targetValue = document.getElementById('goal-target')?.value.trim();
    const target = Number(targetValue);
    const unit = document.getElementById('goal-unit')?.value.trim();
    const deadline = document.getElementById('goal-deadline')?.value;
    const category = document.getElementById('goal-category')?.value;

    if (!title || title.length > 100) { showToast('Enter a goal title between 1 and 100 characters.', 'warning'); return; }
    if (!targetValue || !Number.isFinite(target) || target <= 0 || target > 10000000) { showToast('Goal target must be greater than 0 and no more than 10,000,000.', 'warning'); return; }
    if (unit.length > 20) { showToast('Goal units must be 20 characters or fewer.', 'warning'); return; }
    if (!['general', 'strength', 'cardio', 'nutrition', 'body', 'hydration'].includes(category)) { showToast('Choose a valid goal category.', 'warning'); return; }
    if (deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || localDateKey(new Date(`${deadline}T00:00:00`)) !== deadline)) {
      showToast('Choose a valid deadline.', 'warning');
      return;
    }

    const goals = Storage.getGoals();
    goals.unshift({
      id: Date.now(),
      title, target, unit, deadline, category,
      progress: 0,
      completed: false,
      createdAt: new Date().toISOString(),
    });
    if (!Storage.saveGoals(goals)) return;

    clearGoalFields();
    renderGoals();
    showToast('Goal added! 🎯', 'success');
  }

  function clearGoalFields() {
    ['goal-title', 'goal-target', 'goal-unit', 'goal-deadline'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  function updateGoalProgress(id, progress) {
    if (!Number.isSafeInteger(id) || id < 0) return;
    const goals = Storage.getGoals();
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const progressValue = Number(progress);
    if (!Number.isFinite(progressValue) || progressValue < 0) { showToast('Progress must be a valid non-negative number.', 'warning'); return; }
    const wasCompleted = goal.completed;
    goal.progress = Math.min(goal.target, progressValue);
    goal.completed = goal.target > 0 && goal.progress >= goal.target;
    if (!Storage.saveGoals(goals)) return;
    renderGoals();
    if (goal.completed && !wasCompleted) {
      showToast(`🎉 Goal "${goal.title}" completed!`, 'success');
      triggerConfetti();
    }
  }

  function deleteGoal(id) {
    if (!Number.isSafeInteger(id) || id < 0) return;
    const storedGoals = Storage.getGoals();
    if (!storedGoals.some(goal => goal.id === id)) return;
    const goals = storedGoals.filter(g => g.id !== id);
    if (!Storage.saveGoals(goals)) return;
    renderGoals();
    showToast('Goal removed', 'info');
  }

  function renderGoals() {
    const container = document.getElementById('goals-list');
    if (!container) return;
    const goals = Storage.getGoals();

    if (goals.length === 0) {
      container.innerHTML = '<p class="empty-state">No goals set yet. Add your first fitness goal!</p>';
      return;
    }

    container.innerHTML = goals.map(g => {
      const goalId = Number.isSafeInteger(Number(g.id)) ? Number(g.id) : -1;
      const category = ['strength', 'cardio', 'nutrition', 'body', 'hydration', 'general'].includes(g.category) ? g.category : 'general';
      const target = Number(g.target);
      const progress = Number(g.progress) || 0;
      const pct = Number.isFinite(target) && target > 0 ? Math.min(100, Math.max(0, (progress / target) * 100)) : 0;
      const daysLeft = g.deadline ? calendarDayDifference(Storage.todayKey(), g.deadline) : null;
      return `
        <div class="goal-card ${g.completed ? 'completed' : ''}">
          <div class="goal-card-header">
            <div>
              <span class="goal-category-badge">${categoryIcon(category)} ${escapeHTML(category)}</span>
              <h4 class="goal-title-text">${escapeHTML(g.title)}</h4>
              ${daysLeft !== null ? `<span class="goal-deadline ${daysLeft < 0 ? 'overdue' : daysLeft < 7 ? 'urgent' : ''}">${daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today!' : `${daysLeft} days left`}</span>` : ''}
            </div>
            <div class="goal-actions">
              ${g.completed ? '<span class="completed-badge">✅ Done!</span>' : ''}
              <button type="button" class="btn-icon danger small" data-action="delete-goal" data-id="${goalId}" aria-label="Delete goal ${escapeHTML(g.title)}">
                <svg viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
          ${Number.isFinite(target) && target > 0 ? `
            <div class="goal-progress-section">
              <div class="goal-progress-bar-wrap">
                <div class="goal-progress-bar" style="width:${pct}%"></div>
              </div>
              <span class="goal-progress-text">${escapeHTML(progress)} / ${escapeHTML(target)} ${escapeHTML(g.unit || '')} (${Math.round(pct)}%)</span>
            </div>
            <div class="goal-update-row">
              <input type="number" class="input-sm" id="progress-input-${goalId}" placeholder="Update progress" value="${escapeHTML(progress)}" min="0" max="${escapeHTML(target)}" aria-label="Progress for ${escapeHTML(g.title)}"/>
              <button type="button" class="btn-sm primary" data-action="update-goal" data-id="${goalId}" data-input-id="progress-input-${goalId}">Update</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  function renderAchievements() {
    const container = document.getElementById('achievements-grid');
    if (!container) return;
    const unlocked = Storage.getAchievements();

    container.innerHTML = ACHIEVEMENTS.map(a => {
      const isUnlocked = unlocked.includes(a.id);
      return `
        <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="achievement-icon">${isUnlocked ? a.icon : '🔒'}</div>
          <div class="achievement-info">
            <h5>${a.title}</h5>
            <p>${a.desc}</p>
          </div>
          ${isUnlocked ? '<div class="achievement-glow"></div>' : ''}
        </div>
      `;
    }).join('');
  }

  function checkAndUnlock() {
    const unlocked = new Set(Storage.getAchievements());
    let newUnlocks = [];

    ACHIEVEMENTS.forEach(a => {
      if (!unlocked.has(a.id)) {
        try {
          if (a.check()) {
            unlocked.add(a.id);
            newUnlocks.push(a);
          }
        } catch { }
      }
    });

    if (newUnlocks.length > 0) {
      if (!Storage.saveAchievements([...unlocked])) return 0;
      newUnlocks.forEach(a => {
        showToast(`🏆 Achievement Unlocked: ${a.title}!`, 'achievement');
      });
      renderAchievements();
    }
    return newUnlocks.length;
  }

  function categoryIcon(cat) {
    const icons = new Map([
      ['strength', '💪'], ['cardio', '🏃'], ['nutrition', '🥗'],
      ['body', '📏'], ['hydration', '💧'], ['general', '🎯'],
    ]);
    return icons.get(cat) || '🎯';
  }

  function getStats() {
    const unlocked = Storage.getAchievements();
    const goals = Storage.getGoals();
    return {
      achievements: unlocked.length,
      goalsCompleted: goals.filter(g => g.completed).length,
      goalsTotal: goals.length,
    };
  }

  return { init, addGoal, deleteGoal, updateGoalProgress, renderGoals, renderAchievements, checkAndUnlock, getStats };
})();

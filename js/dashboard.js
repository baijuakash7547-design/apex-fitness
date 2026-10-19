// ── Dashboard presentation and data export ───────────────────────────────────

const updateDashboardCore = window.updateDashboard;
window.updateDashboard = function updateDashboardWithExtras() {
  updateDashboardCore();

  const streak = Number(document.getElementById('dash-streak')?.textContent) || 0;
  setText('topbar-streak', streak);
  setText('dash-streak-big', streak);

  const profile = Storage.getProfile();
  const name = profile.name || 'Athlete';
  setText('hero-name', name);
  setText('profile-name-top', name);
  setText('profile-name-display', name);
  setText('profile-avatar-big', profile.avatar || '🏃');

  const glasses = WaterModule.getTodayGlasses();
  const waterGoal = WaterModule.getGoal();
  setText('dash-water-big', glasses.toFixed(1));
  const waterBar = document.getElementById('dash-water-bar');
  if (waterBar) waterBar.style.width = `${Math.min(100, (glasses / waterGoal) * 100)}%`;

  const totals = NutritionModule.getTodayTotals();
  setText('dash-cal-num', `${Math.round(totals.calories)} kcal`);
  const goals = NutritionModule.getGoals();
  const setBarWidth = (id, value, max) => {
    const element = document.getElementById(id);
    if (element) element.style.width = `${Math.min(100, max > 0 ? (value / max) * 100 : 0)}%`;
  };
  setBarWidth('dash-protein-bar', totals.protein, goals.protein);
  setBarWidth('dash-carbs-bar', totals.carbs, goals.carbs);
  setBarWidth('dash-fat-bar', totals.fat, goals.fat);
  setText('dash-protein-label', `${Math.round(totals.protein)}g`);
  setText('dash-carbs-label', `${Math.round(totals.carbs)}g`);
  setText('dash-fat-label', `${Math.round(totals.fat)}g`);

  setText('profile-total-workouts', Storage.getWorkouts().length);
  setText('profile-total-meals', Storage.getMeals().length);
  setText('profile-achievements', Storage.getAchievements().length);
  setText('profile-goals-done', Storage.getGoals().filter(goal => goal.completed).length);
};

function exportData() {
  const data = {
    schemaVersion: 1,
    workouts: Storage.getWorkouts(),
    meals: Storage.getMeals(),
    water: Storage.getWater(),
    goals: Storage.getGoals(),
    body: Storage.getBodyStats(),
    bodyHistory: Storage.get('ft_body_history', []),
    nutritionGoals: NutritionModule.getGoals(),
    waterGoal: WaterModule.getGoal(),
    profile: Storage.getProfile(),
    achievements: Storage.getAchievements(),
    exportDate: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `prism-fitness-data-${Storage.todayKey()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Data exported successfully!', 'success');
}

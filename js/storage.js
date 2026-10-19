// Local persistence adapter. Keep feature modules behind this interface so its
// implementation can be replaced when the authenticated backend API is added.

const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      if (typeof showToast === 'function') showToast('Could not save data in this browser. Check available storage.', 'error');
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  // Workout logs
  getWorkouts() { const value = this.get('ft_workouts', []); return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : []; },
  saveWorkouts(data) { return this.set('ft_workouts', data); },

  // Nutrition logs
  getMeals() { const value = this.get('ft_meals', []); return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : []; },
  saveMeals(data) { return this.set('ft_meals', data); },

  // Water logs
  getWater() { const value = this.get('ft_water', {}); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; },
  saveWater(data) { return this.set('ft_water', data); },

  // Goals
  getGoals() { const value = this.get('ft_goals', []); return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : []; },
  saveGoals(data) { return this.set('ft_goals', data); },

  // Body stats
  getBodyStats() { const value = this.get('ft_body', {}); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; },
  saveBodyStats(data) { return this.set('ft_body', data); },

  // Profile
  getProfile() { const value = this.get('ft_profile', { name: 'Athlete', avatar: '💪' }); return value && typeof value === 'object' && !Array.isArray(value) ? value : { name: 'Athlete', avatar: '💪' }; },
  saveProfile(data) { return this.set('ft_profile', data); },

  // Achievements
  getAchievements() { const value = this.get('ft_achievements', []); return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []; },
  saveAchievements(data) { return this.set('ft_achievements', data); },

  clearAll() {
    try {
      const appKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('ft_') || key === 'prism_demo_account' || key === 'prism_demo_session') appKeys.push(key);
      }
      appKeys.forEach(key => localStorage.removeItem(key));
      sessionStorage.removeItem('prism_demo_session');
      return true;
    } catch {
      if (typeof showToast === 'function') showToast('Could not clear all app data.', 'error');
      return false;
    }
  },

  todayKey() {
    return localDateKey();
  }
};

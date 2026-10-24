// ── App Core ──────────────────────────────────────────────────────────────────

// ── Utility Functions ─────────────────────────────────────────────────────────

function formatDate(iso) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(iso))
    ? new Date(`${iso}T00:00:00`)
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  const diff = calendarDayDifference(localDateKey(d), localDateKey());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// ── Toast Notifications ───────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { success: '✅', warning: '⚠️', info: 'ℹ️', error: '❌', achievement: '🏆' };
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = icons[type] || 'ℹ️';
  const text = document.createElement('span');
  text.className = 'toast-message';
  text.textContent = String(message);
  const close = document.createElement('button');
  close.className = 'toast-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.textContent = '×';
  close.addEventListener('click', () => toast.remove());
  toast.append(icon, text, close);

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, type === 'achievement' ? 5000 : 3000);
}

// ── Confetti ──────────────────────────────────────────────────────────────────

function triggerConfetti() {
  const colors = ['#7C3AED', '#06B6D4', '#34D399', '#F59E0B', '#F87171', '#A78BFA'];
  for (let i = 0; i < 80; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.cssText = `
      left: ${Math.random() * 100}vw;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${Math.random() * 10 + 5}px;
      height: ${Math.random() * 10 + 5}px;
      animation-duration: ${Math.random() * 2 + 1.5}s;
      animation-delay: ${Math.random() * 0.5}s;
    `;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3500);
  }
}

// ── Check Achievements ────────────────────────────────────────────────────────

function checkAchievements() {
  GoalsModule.checkAndUnlock();
}

// ── Navigation ────────────────────────────────────────────────────────────────

let currentPage = 'dashboard';

function navigateTo(page) {
  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (!pageEl || !navEl) return;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.removeAttribute('aria-current');
  });
  pageEl.classList.add('active');
  navEl.classList.add('active');
  navEl.setAttribute('aria-current', 'page');

  currentPage = page;

  // Refresh relevant content
  if (page === 'dashboard') updateDashboard();
  if (page === 'workouts') WorkoutModule.renderWorkoutHistory();
  if (page === 'nutrition') NutritionModule.renderMealLog();
  if (page === 'water') WaterModule.renderWaterTracker();
  if (page === 'bmi') BMIModule.renderBodyHistory();
  if (page === 'goals') { GoalsModule.renderGoals(); GoalsModule.renderAchievements(); }
  if (page === 'analytics') ChartsModule.refreshCharts();

  // Close sidebar on mobile
  if (window.innerWidth < 768) {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
    document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'false');
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function updateDashboard() {
  const workoutStats = WorkoutModule.getTodayStats();
  const nutritionTotals = NutritionModule.getTodayTotals();
  const waterGlasses = WaterModule.getTodayGlasses();
  const waterGoal = WaterModule.getGoal();
  const nutritionGoal = NutritionModule.getGoals();
  const goalStats = GoalsModule.getStats();
  // Update stat cards
  setText('dash-workouts', workoutStats.count);
  setText('dash-exercises', workoutStats.exercises);
  setText('dash-volume', workoutStats.volume > 0 ? `${workoutStats.volume.toLocaleString()}kg` : '0kg');
  setText('dash-calories', Math.round(nutritionTotals.calories));
  setText('dash-calories-goal', nutritionGoal.calories);
  setText('dash-water', `${waterGlasses.toFixed(1)} / ${waterGoal}`);
  setText('dash-achievements', goalStats.achievements);
  setText('dash-goals-done', goalStats.goalsCompleted);

  // Calorie ring
  const calPct = Math.min(100, (nutritionTotals.calories / nutritionGoal.calories) * 100);
  updateRing('calorie-ring', calPct, '#F59E0B');

  // Water ring
  const waterPct = Math.min(100, (waterGlasses / waterGoal) * 100);
  updateRing('water-ring', waterPct, '#06B6D4');

  // Today's workout summary
  WorkoutModule.renderTodayWorkout();

  // Streak
  updateStreak();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateRing(id, percent, color) {
  const ring = document.getElementById(id);
  if (!ring) return;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percent / 100) * circumference;
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = offset;
  ring.style.stroke = color;
}

function updateStreak() {
  const workouts = Storage.getWorkouts();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    const hasActivity = workouts.some(w => localDateKey(w.date) === key) ||
      Storage.getMeals().some(m => localDateKey(m.date) === key);
    if (hasActivity) streak++;
    else if (i > 0) break;
  }
  setText('dash-streak', streak);
}

// ── Profile ───────────────────────────────────────────────────────────────────

function initProfile() {
  refreshProfile();
  const nameInput = document.getElementById('profile-name-input');
  const saveBtn = document.getElementById('save-profile-btn');
  const photoInput = document.getElementById('profile-photo-input');
  document.querySelectorAll('[data-profile-photo-edit]').forEach(button => {
    button.addEventListener('click', () => photoInput?.click());
  });
  photoInput?.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Choose an image file for your profile photo.', 'warning');
      photoInput.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Choose an image smaller than 10 MB.', 'warning');
      photoInput.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('The selected image has no dimensions.');

      const size = 320;
      const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image editing is not supported in this browser.');
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);

      const avatar = canvas.toDataURL('image/jpeg', 0.8);
      const profile = Storage.getProfile();
      if (!Storage.saveProfile({ ...profile, avatar })) return;
      refreshProfile();
      showToast('Profile photo updated!', 'success');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown image error';
      showToast(`Could not use that image: ${reason}`, 'error');
    } finally {
      URL.revokeObjectURL(objectUrl);
      photoInput.value = '';
    }
  });
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = nameInput?.value.trim() || '';
      if (!name || name.length > 60) {
        showToast('Enter a display name between 1 and 60 characters.', 'warning');
        nameInput?.focus();
        return;
      }
      const profile = Storage.getProfile();
      if (!Storage.saveProfile({ ...profile, name })) return;
      refreshProfile();
      showToast('Profile updated!', 'success');
    });
  }
}

function refreshProfile() {
  const profile = Storage.getProfile();
  const name = profile.name || 'Athlete';
  setText('profile-name', name);
  setText('profile-name-top', name);
  setText('profile-name-display', name);
  const nameInput = document.getElementById('profile-name-input');
  if (nameInput) nameInput.value = name;
  if (typeof profile.avatar === 'string' && profile.avatar.startsWith('data:image/')) {
    document.querySelectorAll('#profile-avatar, #profile-avatar-big').forEach(avatar => {
      const image = document.createElement('img');
      image.src = profile.avatar;
      image.alt = `${name}'s profile photo`;
      avatar.replaceChildren(image);
    });
  }
}

function initImageViewer() {
  const viewer = document.createElement('dialog');
  viewer.className = 'image-viewer';
  viewer.setAttribute('aria-label', 'Image preview');

  const closeButton = document.createElement('button');
  closeButton.className = 'image-viewer-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close image preview');
  closeButton.textContent = '×';

  const image = document.createElement('img');
  image.className = 'image-viewer-image';
  image.alt = '';

  const caption = document.createElement('p');
  caption.className = 'image-viewer-caption';

  viewer.append(closeButton, image, caption);
  document.body.appendChild(viewer);

  const makeImageAccessible = target => {
    if (!(target instanceof HTMLImageElement) || target === image) return;
    target.tabIndex = 0;
    target.setAttribute('role', 'button');
    if (!target.hasAttribute('aria-label')) {
      target.setAttribute('aria-label', target.alt ? `View image: ${target.alt}` : 'View image');
    }
  };

  document.querySelectorAll('img').forEach(makeImageAccessible);

  const openViewer = target => {
    makeImageAccessible(target);
    image.src = target.currentSrc || target.src;
    image.alt = target.alt;
    caption.textContent = target.alt;
    viewer.showModal();
    closeButton.focus();
  };

  document.addEventListener('click', event => {
    const target = event.target;
    if (target instanceof HTMLImageElement && target !== image) openViewer(target);
  });

  document.addEventListener('keydown', event => {
    if (event.target instanceof HTMLImageElement && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openViewer(event.target);
    }
  });

  closeButton.addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {
    if (event.target === viewer) viewer.close();
  });

  viewer.addEventListener('close', () => {
    image.removeAttribute('src');
    caption.textContent = '';
  });
}

// ── Mobile Sidebar Toggle ─────────────────────────────────────────────────────

function initSidebar() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  const setSidebarOpen = open => {
    sidebar?.classList.toggle('open', open);
    overlay?.classList.toggle('open', open);
    toggleBtn?.setAttribute('aria-expanded', String(open));
  };
  if (toggleBtn) toggleBtn.addEventListener('click', () => setSidebarOpen(!sidebar?.classList.contains('open')));
  if (overlay) overlay.addEventListener('click', () => setSidebarOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setSidebarOpen(false);
  });
}

// ── Motivational Quotes ───────────────────────────────────────────────────────

const QUOTES = [
  '"The only bad workout is the one that didn\'t happen."',
  '"Push yourself, because no one else is going to do it for you."',
  '"Success starts with self-discipline."',
  '"Your body can stand almost anything. It\'s your mind you have to convince."',
  '"The pain you feel today will be the strength you feel tomorrow."',
  '"Don\'t stop when you\'re tired. Stop when you\'re done."',
  '"Fitness is not about being better than someone else. It\'s about being better than you used to be."',
  '"Sweat is fat crying."',
];

function renderMotivationalQuote() {
  const el = document.getElementById('motivational-quote');
  if (el) el.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

// ── Date/Time Display ─────────────────────────────────────────────────────────

function updateDateTime() {
  const el = document.getElementById('current-datetime');
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleDateString('en', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
  const greeting = document.getElementById('greeting');
  if (greeting) {
    const h = new Date().getHours();
    greeting.textContent = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  }
}

// ── App Init ──────────────────────────────────────────────────────────────────

function initApp() {
  // Init modules
  WorkoutModule.init();
  NutritionModule.init();
  WaterModule.init();
  BMIModule.init();
  GoalsModule.init();

  // Init UI
  initSidebar();
  initProfile();
  initImageViewer();
  updateDateTime();
  renderMotivationalQuote();
  updateDashboard();

  // Nav event listeners
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page) navigateTo(page);
    });
  });
  document.querySelectorAll('[data-navigate]').forEach(button => {
    button.addEventListener('click', () => navigateTo(button.dataset.navigate));
  });
  document.querySelectorAll('[data-water-action]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.waterAction === 'add') WaterModule.addGlass();
      if (button.dataset.waterAction === 'remove') WaterModule.removeGlass();
    });
  });

  // Navigate to dashboard
  navigateTo('dashboard');

  document.getElementById('export-data-btn')?.addEventListener('click', exportData);
  document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    if (window.confirm('Clear all PRISM fitness data stored in this browser?') && Storage.clearAll()) {
      window.location.reload();
    }
  });

  // Refresh time every minute
  setInterval(updateDateTime, 60000);
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

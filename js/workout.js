// ── Workout Module ────────────────────────────────────────────────────────────

const WorkoutModule = (() => {
  const EXERCISE_LIBRARY = {
    chest: ['Bench Press', 'Incline Bench Press', 'Push-ups', 'Chest Fly', 'Cable Crossover', 'Dips'],
    back: ['Pull-ups', 'Deadlift', 'Bent-over Row', 'Lat Pulldown', 'Seated Row', 'T-bar Row'],
    legs: ['Squat', 'Leg Press', 'Lunges', 'Leg Extension', 'Leg Curl', 'Calf Raise', 'Romanian Deadlift'],
    shoulders: ['Overhead Press', 'Lateral Raise', 'Front Raise', 'Arnold Press', 'Shrugs', 'Rear Delt Fly'],
    arms: ['Bicep Curl', 'Hammer Curl', 'Tricep Pushdown', 'Skull Crushers', 'Preacher Curl', 'Dips'],
    core: ['Plank', 'Crunches', 'Russian Twist', 'Leg Raise', 'Mountain Climbers', 'Ab Wheel'],
    cardio: ['Running', 'Cycling', 'Jump Rope', 'Rowing', 'Elliptical', 'HIIT', 'Swimming'],
  };

  let currentWorkoutSets = [];
  let workoutTimer = null;
  let workoutSeconds = 0;
  let workoutStartedAt = null;
  let timerRunning = false;

  function init() {
    renderWorkoutHistory();
    populateExerciseDropdown();
    setupEventListeners();
    renderTodayWorkout();
  }

  function populateExerciseDropdown() {
    const categorySelect = document.getElementById('exercise-category');
    const exerciseSelect = document.getElementById('exercise-name');
    if (!categorySelect || !exerciseSelect) return;

    categorySelect.addEventListener('change', () => {
      const cat = categorySelect.value;
      exerciseSelect.innerHTML = '<option value="">-- Select Exercise --</option>';
      if (cat && EXERCISE_LIBRARY[cat]) {
        EXERCISE_LIBRARY[cat].forEach(ex => {
          const opt = document.createElement('option');
          opt.value = ex;
          opt.textContent = ex;
          exerciseSelect.appendChild(opt);
        });
      }
    });
  }

  function setupEventListeners() {
    const addSetBtn = document.getElementById('add-set-btn');
    if (addSetBtn) addSetBtn.addEventListener('click', addSet);

    const saveWorkoutBtn = document.getElementById('save-workout-btn');
    if (saveWorkoutBtn) saveWorkoutBtn.addEventListener('click', saveWorkout);

    const startTimerBtn = document.getElementById('start-timer-btn');
    if (startTimerBtn) startTimerBtn.addEventListener('click', toggleTimer);

    const resetTimerBtn = document.getElementById('reset-timer-btn');
    if (resetTimerBtn) resetTimerBtn.addEventListener('click', resetTimer);

    document.getElementById('current-sets-list')?.addEventListener('click', event => {
      const button = event.target.closest('[data-action="remove-set"]');
      if (button) removeSet(Number(button.dataset.index));
    });
    document.getElementById('workout-history-list')?.addEventListener('click', event => {
      const button = event.target.closest('[data-action="delete-workout"]');
      if (button) deleteWorkout(Number(button.dataset.id));
    });
  }

  function addSet() {
    const exercise = document.getElementById('exercise-name')?.value;
    const setsValue = document.getElementById('workout-sets')?.value.trim();
    const repsValue = document.getElementById('workout-reps')?.value.trim();
    const weightValue = document.getElementById('workout-weight')?.value.trim();
    const sets = Number(setsValue);
    const reps = Number(repsValue);
    const weight = weightValue ? Number(weightValue) : 0;

    if (!Object.values(EXERCISE_LIBRARY).some(exercises => exercises.includes(exercise))) { showToast('Please choose a valid exercise.', 'warning'); return; }
    if (!Number.isInteger(sets) || sets < 1 || sets > 20) { showToast('Sets must be a whole number from 1 to 20.', 'warning'); return; }
    if (!Number.isInteger(reps) || reps < 1 || reps > 200) { showToast('Reps must be a whole number from 1 to 200.', 'warning'); return; }
    if (!Number.isFinite(weight) || weight < 0 || weight > 1000) { showToast('Weight must be between 0 and 1,000 kg.', 'warning'); return; }

    const setEntry = {
      id: Date.now(),
      exercise,
      sets,
      reps,
      weight,
    };

    currentWorkoutSets.push(setEntry);
    renderCurrentSets();
    clearFields();
  }

  function clearFields() {
    ['workout-sets', 'workout-reps', 'workout-weight'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  function renderCurrentSets() {
    const container = document.getElementById('current-sets-list');
    if (!container) return;

    if (currentWorkoutSets.length === 0) {
      container.innerHTML = '<p class="empty-state">No sets added yet. Add your first set above!</p>';
      return;
    }

    container.innerHTML = currentWorkoutSets.map((s, idx) => `
      <div class="set-item" data-id="${s.id}">
        <div class="set-info">
          <span class="set-exercise">${escapeHTML(s.exercise)}</span>
          <span class="set-details">${s.sets} sets × ${s.reps} reps ${s.weight ? `@ ${s.weight}kg` : ''}</span>
        </div>
        <button type="button" class="btn-icon danger" data-action="remove-set" data-index="${idx}" aria-label="Remove set ${idx + 1}: ${escapeHTML(s.exercise)}">
          <svg viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    `).join('');
  }

  function removeSet(idx) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= currentWorkoutSets.length) return;
    currentWorkoutSets.splice(idx, 1);
    renderCurrentSets();
  }

  function saveWorkout() {
    if (currentWorkoutSets.length === 0) {
      showToast('Add at least one set before saving!', 'warning');
      return;
    }

    const workoutName = document.getElementById('workout-name')?.value.trim() || 'My Workout';
    if (workoutName.length > 80) { showToast('Workout names must be 80 characters or fewer.', 'warning'); return; }
    const workouts = Storage.getWorkouts();
    const newWorkout = {
      id: Date.now(),
      name: workoutName,
      date: new Date().toISOString(),
      sets: [...currentWorkoutSets],
      duration: getElapsedSeconds(),
      totalVolume: currentWorkoutSets.reduce((acc, s) => acc + (s.sets * s.reps * s.weight), 0),
    };

    workouts.unshift(newWorkout);
    if (!Storage.saveWorkouts(workouts)) return;

    currentWorkoutSets = [];
    workoutSeconds = 0;
    workoutStartedAt = null;
    timerRunning = false;
    if (workoutTimer) clearInterval(workoutTimer);
    const timerButton = document.getElementById('start-timer-btn');
    if (timerButton) { timerButton.textContent = '▶ Start'; timerButton.classList.remove('active'); }
    updateTimerDisplay();

    renderCurrentSets();
    renderWorkoutHistory();
    renderTodayWorkout();
    checkAchievements();
    updateDashboard();

    showToast('Workout saved! 💪', 'success');

    if (document.getElementById('workout-name')) document.getElementById('workout-name').value = '';
  }

  function renderWorkoutHistory() {
    const container = document.getElementById('workout-history-list');
    if (!container) return;

    const workouts = Storage.getWorkouts().slice(0, 20);
    if (workouts.length === 0) {
      container.innerHTML = '<p class="empty-state">No workouts yet. Start your first workout!</p>';
      return;
    }

    container.innerHTML = workouts.map(w => `
      <div class="history-card workout-card-item">
        <div class="history-card-header">
          <div>
            <h4>${escapeHTML(w.name)}</h4>
            <span class="history-date">${formatDate(w.date)}</span>
          </div>
          <div class="history-stats">
            <span class="stat-chip">${Array.isArray(w.sets) ? w.sets.length : 0} exercises</span>
            ${w.duration ? `<span class="stat-chip">${formatTime(Number(w.duration) || 0)}</span>` : ''}
            ${w.totalVolume ? `<span class="stat-chip">${(Number(w.totalVolume) || 0).toLocaleString()}kg vol</span>` : ''}
          </div>
        </div>
        <div class="history-exercises">
          ${(Array.isArray(w.sets) ? w.sets : []).map(s => `<span class="exercise-tag">${escapeHTML(s.exercise)} ${escapeHTML(s.sets)}×${escapeHTML(s.reps)}</span>`).join('')}
        </div>
        <button type="button" class="btn-icon danger small" data-action="delete-workout" data-id="${Number.isSafeInteger(Number(w.id)) ? Number(w.id) : -1}" aria-label="Delete workout ${escapeHTML(w.name)}" title="Delete workout">
          <svg viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    `).join('');
  }

  function renderTodayWorkout() {
    const container = document.getElementById('today-workout-summary');
    if (!container) return;
    const today = Storage.todayKey();
    const workouts = Storage.getWorkouts().filter(w => localDateKey(w.date) === today);
    if (workouts.length === 0) {
      container.innerHTML = '<p class="empty-state small">No workouts today yet.</p>';
    } else {
      container.innerHTML = workouts.map(w => `
        <div class="mini-workout-card">
          <span class="mini-workout-name">${escapeHTML(w.name)}</span>
          <span class="mini-workout-detail">${Array.isArray(w.sets) ? w.sets.length : 0} exercises</span>
        </div>
      `).join('');
    }
  }

  function deleteWorkout(id) {
    if (!Number.isSafeInteger(id) || id < 0) return;
    const storedWorkouts = Storage.getWorkouts();
    if (!storedWorkouts.some(workout => workout.id === id)) return;
    const workouts = storedWorkouts.filter(w => w.id !== id);
    if (!Storage.saveWorkouts(workouts)) return;
    renderWorkoutHistory();
    renderTodayWorkout();
    updateDashboard();
    showToast('Workout deleted', 'info');
  }

  function toggleTimer() {
    const btn = document.getElementById('start-timer-btn');
    if (timerRunning) {
      workoutSeconds = getElapsedSeconds();
      workoutStartedAt = null;
      clearInterval(workoutTimer);
      timerRunning = false;
      if (btn) { btn.textContent = '▶ Resume'; btn.classList.remove('active'); }
    } else {
      timerRunning = true;
      workoutStartedAt = Date.now();
      workoutTimer = setInterval(() => {
        updateTimerDisplay();
      }, 1000);
      if (btn) { btn.textContent = '⏸ Pause'; btn.classList.add('active'); }
    }
  }

  function resetTimer() {
    clearInterval(workoutTimer);
    timerRunning = false;
    workoutSeconds = 0;
    workoutStartedAt = null;
    updateTimerDisplay();
    const btn = document.getElementById('start-timer-btn');
    if (btn) { btn.textContent = '▶ Start'; btn.classList.remove('active'); }
  }

  function updateTimerDisplay() {
    const el = document.getElementById('workout-timer-display');
    if (el) el.textContent = formatTime(getElapsedSeconds());
  }

  function getElapsedSeconds() {
    return workoutSeconds + (timerRunning && workoutStartedAt ? Math.floor((Date.now() - workoutStartedAt) / 1000) : 0);
  }

  function getTodayStats() {
    const today = Storage.todayKey();
    const workouts = Storage.getWorkouts().filter(w => localDateKey(w.date) === today);
    return {
      count: workouts.length,
      exercises: workouts.reduce((acc, w) => acc + (Array.isArray(w.sets) ? w.sets.length : 0), 0),
      volume: workouts.reduce((acc, w) => acc + (Number(w.totalVolume) || 0), 0),
    };
  }

  function getWeeklyVolume() {
    const workouts = Storage.getWorkouts();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localDateKey(d);
      const dayWorkouts = workouts.filter(w => localDateKey(w.date) === key);
      days.push({
        label: d.toLocaleDateString('en', { weekday: 'short' }),
        volume: dayWorkouts.reduce((acc, w) => acc + (Number(w.totalVolume) || 0), 0),
        count: dayWorkouts.length,
      });
    }
    return days;
  }

  return { init, removeSet, deleteWorkout, getTodayStats, getWeeklyVolume, renderWorkoutHistory, renderTodayWorkout };
})();

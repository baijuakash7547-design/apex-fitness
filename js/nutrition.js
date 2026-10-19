// ── Nutrition Module ──────────────────────────────────────────────────────────

const NutritionModule = (() => {
  const FOOD_DB = [
    { name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { name: 'Brown Rice (100g)', calories: 216, protein: 4.5, carbs: 45, fat: 1.8 },
    { name: 'Oatmeal (100g)', calories: 389, protein: 17, carbs: 66, fat: 7 },
    { name: 'Egg (1 large)', calories: 72, protein: 6, carbs: 0.4, fat: 5 },
    { name: 'Banana (1 medium)', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
    { name: 'Almonds (28g)', calories: 164, protein: 6, carbs: 6, fat: 14 },
    { name: 'Greek Yogurt (170g)', calories: 100, protein: 17, carbs: 6, fat: 0.7 },
    { name: 'Salmon (100g)', calories: 208, protein: 20, carbs: 0, fat: 13 },
    { name: 'Sweet Potato (100g)', calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
    { name: 'Avocado (100g)', calories: 160, protein: 2, carbs: 9, fat: 15 },
    { name: 'Broccoli (100g)', calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    { name: 'Whey Protein (1 scoop)', calories: 120, protein: 25, carbs: 3, fat: 1.5 },
    { name: 'Whole Milk (240ml)', calories: 149, protein: 8, carbs: 12, fat: 8 },
    { name: 'Tuna (100g)', calories: 132, protein: 29, carbs: 0, fat: 1.3 },
    { name: 'Quinoa (100g)', calories: 120, protein: 4.4, carbs: 22, fat: 1.9 },
    { name: 'Pasta (100g)', calories: 371, protein: 13, carbs: 74, fat: 1.5 },
    { name: 'Apple (1 medium)', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
    { name: 'Peanut Butter (2 tbsp)', calories: 190, protein: 8, carbs: 6, fat: 16 },
    { name: 'Cottage Cheese (100g)', calories: 98, protein: 11, carbs: 3.4, fat: 4.3 },
    { name: 'White Rice (100g)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  ];

  const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 250, fat: 65 };

  function init() {
    populateFoodDropdown();
    setupEventListeners();
    renderMealLog();
    renderNutritionGoals();
  }

  function populateFoodDropdown() {
    const select = document.getElementById('food-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Select food or type custom --</option>';
    FOOD_DB.forEach((f, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = f.name;
      select.appendChild(opt);
    });

  }

  function setupEventListeners() {
    const addBtn = document.getElementById('add-meal-btn');
    if (addBtn) addBtn.addEventListener('click', addMeal);

    const saveGoalsBtn = document.getElementById('save-nutrition-goals-btn');
    if (saveGoalsBtn) saveGoalsBtn.addEventListener('click', saveNutritionGoals);
    const foodSelect = document.getElementById('food-select');
    foodSelect?.addEventListener('change', () => {
      const selected = foodSelect.value;
      if (selected === '') return;
      const index = Number(selected);
      if (!Number.isInteger(index) || index < 0 || index >= FOOD_DB.length) {
        showToast('Choose an item from the food list.', 'warning');
        foodSelect.value = '';
        return;
      }
      const food = FOOD_DB[index];
      const fields = {
        'food-name': food.name,
        'food-calories': food.calories,
        'food-protein': food.protein,
        'food-carbs': food.carbs,
        'food-fat': food.fat,
      };
      Object.entries(fields).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
      });
    });
    document.getElementById('meal-log-container')?.addEventListener('click', event => {
      const button = event.target.closest('[data-action="delete-meal"]');
      if (button) deleteMeal(Number(button.dataset.id));
    });
  }

  function addMeal() {
    const name = document.getElementById('food-name')?.value.trim();
    const calories = Number(document.getElementById('food-calories')?.value);
    const protein = Number(document.getElementById('food-protein')?.value || 0);
    const carbs = Number(document.getElementById('food-carbs')?.value || 0);
    const fat = Number(document.getElementById('food-fat')?.value || 0);
    const mealType = document.getElementById('meal-type')?.value || 'snack';

    if (!name || name.length > 120) { showToast('Enter a food name between 1 and 120 characters.', 'warning'); return; }
    if (!Number.isFinite(calories) || calories <= 0 || calories > 100000) { showToast('Calories must be greater than 0 and no more than 100,000.', 'warning'); return; }
    if (![protein, carbs, fat].every(value => Number.isFinite(value) && value >= 0 && value <= 10000)) {
      showToast('Macro values must be between 0 and 10,000 grams.', 'warning');
      return;
    }
    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) { showToast('Choose a valid meal type.', 'warning'); return; }

    const meals = Storage.getMeals();
    meals.unshift({
      id: Date.now(),
      name, calories, protein, carbs, fat,
      mealType,
      date: new Date().toISOString(),
    });
    if (!Storage.saveMeals(meals)) return;

    clearNutritionFields();
    renderMealLog();
    updateDashboard();
    checkAchievements();
    showToast('Meal logged! 🍽️', 'success');
  }

  function clearNutritionFields() {
    ['food-name', 'food-calories', 'food-protein', 'food-carbs', 'food-fat'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const sel = document.getElementById('food-select');
    if (sel) sel.value = '';
  }

  function renderMealLog() {
    const container = document.getElementById('meal-log-container');
    if (!container) return;

    const today = Storage.todayKey();
    const meals = Storage.getMeals().filter(m => localDateKey(m.date) === today);
    const goals = getGoals();

    const totals = meals.reduce((acc, m) => ({
      calories: acc.calories + (Number(m.calories) || 0),
      protein: acc.protein + (Number(m.protein) || 0),
      carbs: acc.carbs + (Number(m.carbs) || 0),
      fat: acc.fat + (Number(m.fat) || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    document.getElementById('nutrition-calories-consumed')?.textContent !== undefined &&
      (document.getElementById('nutrition-calories-consumed').textContent = Math.round(totals.calories));
    document.getElementById('nutrition-calories-remaining')?.textContent !== undefined &&
      (document.getElementById('nutrition-calories-remaining').textContent = Math.max(0, Math.round(goals.calories - totals.calories)));

    updateMacroBar('protein', totals.protein, goals.protein);
    updateMacroBar('carbs', totals.carbs, goals.carbs);
    updateMacroBar('fat', totals.fat, goals.fat);

    const allMeals = meals.slice(0, 30);
    if (allMeals.length === 0) {
      container.innerHTML = '<p class="empty-state">No meals logged today. Start tracking your nutrition!</p>';
      return;
    }

    const byType = { breakfast: [], lunch: [], dinner: [], snack: [] };
    allMeals.forEach(m => { if (byType[m.mealType]) byType[m.mealType].push(m); });

    container.innerHTML = Object.entries(byType).map(([type, items]) => {
      if (items.length === 0) return '';
      return `
        <div class="meal-section">
          <h4 class="meal-type-header">${mealTypeIcon(type)} ${capitalize(type)}</h4>
          ${items.map(m => `
            <div class="meal-item">
              <div class="meal-item-info">
                <span class="meal-name">${escapeHTML(m.name)}</span>
                <span class="meal-date-tag">${formatDate(m.date)}</span>
              </div>
              <div class="meal-macros">
                <span class="macro-tag calories">${Math.round(m.calories)} kcal</span>
                <span class="macro-tag protein">P:${escapeHTML(m.protein)}g</span>
                <span class="macro-tag carbs">C:${escapeHTML(m.carbs)}g</span>
                <span class="macro-tag fat">F:${escapeHTML(m.fat)}g</span>
              </div>
              <button type="button" class="btn-icon danger small" data-action="delete-meal" data-id="${Number.isSafeInteger(Number(m.id)) ? Number(m.id) : -1}" aria-label="Delete ${escapeHTML(m.name)}">
                <svg viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');
  }

  function updateMacroBar(macro, current, goal) {
    const bar = document.getElementById(`${macro}-bar`);
    const label = document.getElementById(`${macro}-label`);
    if (!bar) return;
    const pct = Math.min(100, goal > 0 ? (current / goal) * 100 : 0);
    bar.style.width = pct + '%';
    if (label) label.textContent = `${Math.round(current)}g / ${goal}g`;
  }

  function renderNutritionGoals() {
    const goals = getGoals();
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('goal-calories', goals.calories);
    setVal('goal-protein', goals.protein);
    setVal('goal-carbs', goals.carbs);
    setVal('goal-fat', goals.fat);
  }

  function saveNutritionGoals() {
    const goals = {
      calories: Number(document.getElementById('goal-calories')?.value),
      protein: Number(document.getElementById('goal-protein')?.value),
      carbs: Number(document.getElementById('goal-carbs')?.value),
      fat: Number(document.getElementById('goal-fat')?.value),
    };
    if (!Number.isInteger(goals.calories) || goals.calories < 500 || goals.calories > 8000 ||
      ![goals.protein, goals.carbs, goals.fat].every(value => Number.isFinite(value) && value >= 0 && value <= 2000)) {
      showToast('Set calories between 500–8,000 and macros between 0–2,000 g.', 'warning');
      return;
    }
    if (!Storage.set('ft_nutrition_goals', goals)) return;
    renderMealLog();
    showToast('Nutrition goals saved!', 'success');
  }

  function getGoals() {
    const saved = Storage.get('ft_nutrition_goals', DEFAULT_GOALS);
    return Object.fromEntries(Object.entries(DEFAULT_GOALS).map(([key, fallback]) => {
      const value = Number(saved?.[key]);
      const valid = Number.isFinite(value) && (key === 'calories' ? value >= 500 && value <= 8000 : value >= 0 && value <= 2000);
      return [key, valid ? value : fallback];
    }));
  }

  function deleteMeal(id) {
    if (!Number.isSafeInteger(id) || id < 0) return;
    const storedMeals = Storage.getMeals();
    if (!storedMeals.some(meal => meal.id === id)) return;
    const meals = storedMeals.filter(m => m.id !== id);
    if (!Storage.saveMeals(meals)) return;
    renderMealLog();
    updateDashboard();
    showToast('Meal removed', 'info');
  }

  function getTodayTotals() {
    const today = Storage.todayKey();
    return Storage.getMeals()
      .filter(m => localDateKey(m.date) === today)
      .reduce((acc, m) => ({
        calories: acc.calories + (Number(m.calories) || 0),
        protein: acc.protein + (Number(m.protein) || 0),
        carbs: acc.carbs + (Number(m.carbs) || 0),
        fat: acc.fat + (Number(m.fat) || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  function getWeeklyCalories() {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localDateKey(d);
      const dayMeals = Storage.getMeals().filter(m => localDateKey(m.date) === key);
      result.push({
        label: d.toLocaleDateString('en', { weekday: 'short' }),
        calories: dayMeals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0),
      });
    }
    return result;
  }

  function mealTypeIcon(type) {
    return { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }[type] || '🍽️';
  }

  return { init, deleteMeal, getTodayTotals, getWeeklyCalories, renderMealLog, getGoals };
})();

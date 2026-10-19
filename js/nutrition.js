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
  let foodSearchResults = [];
  let foodSearchController;

  function init() {
    populateFoodDropdown();
    setupEventListeners();
    renderMealLog();
    renderNutritionGoals();
  }

  function populateFoodDropdown() {
    const select = document.getElementById('food-select');
    if (!select) return;
    select.replaceChildren(new Option('-- Select a regular food --', ''));
    const presets = document.createElement('optgroup');
    presets.label = 'Common foods';
    FOOD_DB.forEach((f, i) => {
      const opt = document.createElement('option');
      opt.value = `preset:${i}`;
      opt.textContent = f.name;
      presets.appendChild(opt);
    });
    select.appendChild(presets);

    const customFoods = getCustomFoods();
    if (customFoods.length) {
      const saved = document.createElement('optgroup');
      saved.label = 'My regular foods';
      customFoods.forEach(food => {
        const option = document.createElement('option');
        option.value = `custom:${food.id}`;
        option.textContent = `${food.name} (${food.serving})`;
        saved.appendChild(option);
      });
      select.appendChild(saved);
    }
  }

  function setupEventListeners() {
    const addBtn = document.getElementById('add-meal-btn');
    if (addBtn) addBtn.addEventListener('click', addMeal);

    const saveGoalsBtn = document.getElementById('save-nutrition-goals-btn');
    if (saveGoalsBtn) saveGoalsBtn.addEventListener('click', saveNutritionGoals);
    document.getElementById('estimate-food-btn')?.addEventListener('click', searchFoodNutrition);
    const foodSelect = document.getElementById('food-select');
    foodSelect?.addEventListener('change', () => {
      const food = getFoodSelection(foodSelect.value);
      if (!food) return;
      fillFoodFields(food);
    });
    document.getElementById('food-search-results')?.addEventListener('change', applyFoodSearchResult);
    document.getElementById('food-quantity-minus')?.addEventListener('click', () => changeQuantity(-1));
    document.getElementById('food-quantity-plus')?.addEventListener('click', () => changeQuantity(1));
    document.getElementById('food-quantity')?.addEventListener('change', normalizeQuantity);
    document.getElementById('meal-log-container')?.addEventListener('click', event => {
      const button = event.target.closest('[data-action="delete-meal"]');
      if (button) deleteMeal(Number(button.dataset.id));
    });
  }

  async function searchFoodNutrition() {
    const nameInput = document.getElementById('food-name');
    const query = nameInput?.value.trim();
    const status = document.getElementById('food-lookup-status');
    const button = document.getElementById('estimate-food-btn');
    const results = document.getElementById('food-search-results');
    const resultsLabel = document.getElementById('food-search-results-label');

    if (!query || query.length > 120) {
      if (status) status.textContent = 'Enter a food or product name first.';
      nameInput?.focus();
      return;
    }

    foodSearchController?.abort();
    foodSearchController = new AbortController();
    button.disabled = true;
    status.textContent = 'Searching Open Food Facts…';
    results.hidden = true;
    resultsLabel.hidden = true;
    results.replaceChildren(new Option('-- Choose a matching food --', ''));
    foodSearchResults = [];

    try {
      const params = new URLSearchParams({
        search_terms: query,
        fields: 'code,product_name,brands,serving_size,nutriments',
        page_size: '12',
        json: '1',
      });
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
        signal: foodSearchController.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Food database returned HTTP ${response.status}.`);
      const data = await response.json();
      const products = Array.isArray(data.products) ? data.products : [];
      foodSearchResults = products
        .map(product => {
          const nutrients = product.nutriments || {};
          const caloriesPer100 = nutrients['energy-kcal_100g'];
          const proteinPer100 = nutrients.proteins_100g;
          const calories = Number(caloriesPer100);
          const protein = Number(proteinPer100);
          if (!product.code || !product.product_name ||
            caloriesPer100 === null || caloriesPer100 === undefined ||
            proteinPer100 === null || proteinPer100 === undefined ||
            !Number.isFinite(calories) || calories < 0 ||
            !Number.isFinite(protein) || protein < 0) return null;
          return {
            code: String(product.code),
            name: String(product.product_name).trim(),
            brand: typeof product.brands === 'string' ? product.brands.split(',')[0].trim() : '',
            servingSize: typeof product.serving_size === 'string' ? product.serving_size.trim() : '',
            caloriesPer100: calories,
            proteinPer100: protein,
            carbsPer100: Number(nutrients.carbohydrates_100g) || 0,
            fatPer100: Number(nutrients.fat_100g) || 0,
          };
        })
        .filter(Boolean);

      if (!foodSearchResults.length) {
        status.textContent = 'No matching foods with calorie and protein data were found. Try a different name or enter values manually.';
        return;
      }

      foodSearchResults.forEach((food, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${food.name}${food.brand ? ` — ${food.brand}` : ''}${food.servingSize ? ` (${food.servingSize})` : ''}`;
        results.appendChild(option);
      });
      results.hidden = false;
      resultsLabel.hidden = false;
      status.textContent = `${foodSearchResults.length} matches found. Select the exact food/product to fill its nutrition estimate.`;
    } catch (error) {
      if (error.name === 'AbortError') return;
      status.textContent = `Could not search the food database: ${error.message || 'Check your connection and try again.'}`;
    } finally {
      button.disabled = false;
    }
  }

  function applyFoodSearchResult() {
    const results = document.getElementById('food-search-results');
    const index = Number(results.value);
    const food = foodSearchResults[index];
    if (!Number.isInteger(index) || !food) return;

    const requestedServing = document.getElementById('food-serving').value.trim();
    const requestedGrams = parseServingGrams(requestedServing);
    const listedGrams = parseServingGrams(food.servingSize);
    const amount = requestedGrams || listedGrams || 100;
    const serving = requestedGrams
      ? requestedServing
      : listedGrams
        ? food.servingSize
        : '100 g';
    const multiplier = amount / 100;
    const fields = {
      'food-name': food.name,
      'food-serving': serving,
      'food-calories': roundNutrition(food.caloriesPer100 * multiplier),
      'food-protein': roundNutrition(food.proteinPer100 * multiplier),
      'food-carbs': roundNutrition(food.carbsPer100 * multiplier),
      'food-fat': roundNutrition(food.fatPer100 * multiplier),
      'food-quantity': 1,
    };
    Object.entries(fields).forEach(([id, value]) => {
      document.getElementById(id).value = value;
    });
    document.getElementById('food-lookup-status').textContent =
      `Estimate filled for ${serving}. Review the selected product and serving values before logging.`;
  }

  function parseServingGrams(value) {
    const match = String(value).match(/(\d+(?:[.,]\d+)?)\s*(?:g|gram|grams)\b/i);
    if (!match) return 0;
    const amount = Number(match[1].replace(',', '.'));
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }

  function roundNutrition(value) {
    return Math.round(value * 10) / 10;
  }

  function getCustomFoods() {
    const foods = Storage.get('ft_custom_foods', []);
    return Array.isArray(foods) ? foods.filter(food =>
      food && typeof food === 'object' && typeof food.id === 'string' &&
      typeof food.name === 'string' && typeof food.serving === 'string' &&
      ['calories', 'protein', 'carbs', 'fat'].every(key => Number.isFinite(Number(food[key]))),
    ) : [];
  }

  function getFoodSelection(value) {
    if (value.startsWith('preset:')) {
      const index = Number(value.slice('preset:'.length));
      const food = FOOD_DB[index];
      if (!Number.isInteger(index) || !food) return null;
      const serving = food.name.match(/\(([^()]*)\)\s*$/)?.[1] || '1 serving';
      return { ...food, name: food.name.replace(/\s*\([^()]*\)\s*$/, ''), serving };
    }
    if (value.startsWith('custom:')) {
      const id = value.slice('custom:'.length);
      return getCustomFoods().find(food => food.id === id) || null;
    }
    return null;
  }

  function fillFoodFields(food) {
    const fields = {
      'food-name': food.name,
      'food-serving': food.serving,
      'food-calories': food.calories,
      'food-protein': food.protein,
      'food-carbs': food.carbs,
      'food-fat': food.fat,
      'food-quantity': 1,
    };
    Object.entries(fields).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input) input.value = value;
    });
  }

  function changeQuantity(change) {
    const input = document.getElementById('food-quantity');
    if (!input) return;
    const current = Number(input.value) || 1;
    input.value = Math.max(1, Math.min(100, current + change));
  }

  function normalizeQuantity() {
    const input = document.getElementById('food-quantity');
    if (!input) return;
    const quantity = Number(input.value);
    input.value = Number.isInteger(quantity) && quantity >= 1 && quantity <= 100 ? quantity : 1;
  }

  function addMeal() {
    const name = document.getElementById('food-name')?.value.trim();
    const serving = document.getElementById('food-serving')?.value.trim();
    const servingCalories = Number(document.getElementById('food-calories')?.value);
    const servingProtein = Number(document.getElementById('food-protein')?.value || 0);
    const servingCarbs = Number(document.getElementById('food-carbs')?.value || 0);
    const servingFat = Number(document.getElementById('food-fat')?.value || 0);
    const quantity = Number(document.getElementById('food-quantity')?.value);
    const mealType = document.getElementById('meal-type')?.value || 'snack';

    if (!name || name.length > 120) { showToast('Enter a food name between 1 and 120 characters.', 'warning'); return; }
    if (!serving || serving.length > 40) { showToast('Enter a serving measure between 1 and 40 characters.', 'warning'); return; }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) { showToast('Quantity must be a whole number from 1 to 100.', 'warning'); return; }
    const totals = {
      calories: servingCalories * quantity,
      protein: servingProtein * quantity,
      carbs: servingCarbs * quantity,
      fat: servingFat * quantity,
    };
    if (!Number.isFinite(servingCalories) || servingCalories <= 0 || totals.calories > 100000) {
      showToast('Total calories must be greater than 0 and no more than 100,000.', 'warning');
      return;
    }
    if (![servingProtein, servingCarbs, servingFat].every(value => Number.isFinite(value) && value >= 0) ||
      [totals.protein, totals.carbs, totals.fat].some(value => !Number.isFinite(value) || value > 10000)) {
      showToast('Macro values must be between 0 and 10,000 grams.', 'warning');
      return;
    }
    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) { showToast('Choose a valid meal type.', 'warning'); return; }

    if (document.getElementById('save-food-for-reuse')?.checked) {
      const savedFoods = getCustomFoods();
      const matchingIndex = savedFoods.findIndex(food =>
        food.name.toLocaleLowerCase() === name.toLocaleLowerCase() &&
        food.serving.toLocaleLowerCase() === serving.toLocaleLowerCase(),
      );
      const savedFood = {
        id: matchingIndex >= 0 ? savedFoods[matchingIndex].id : `food-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name, serving,
        calories: servingCalories,
        protein: servingProtein,
        carbs: servingCarbs,
        fat: servingFat,
      };
      if (matchingIndex >= 0) savedFoods[matchingIndex] = savedFood;
      else savedFoods.push(savedFood);
      if (!Storage.set('ft_custom_foods', savedFoods)) return;
      populateFoodDropdown();
    }

    const meals = Storage.getMeals();
    meals.unshift({
      id: Date.now(),
      name, serving, quantity,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
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
    ['food-name', 'food-serving', 'food-calories', 'food-protein', 'food-carbs', 'food-fat'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('food-quantity').value = 1;
    document.getElementById('save-food-for-reuse').checked = false;
    const sel = document.getElementById('food-select');
    if (sel) sel.value = '';
    const searchResults = document.getElementById('food-search-results');
    if (searchResults) {
      searchResults.replaceChildren(new Option('-- Choose a matching food --', ''));
      searchResults.hidden = true;
    }
    document.getElementById('food-search-results-label').hidden = true;
    document.getElementById('food-lookup-status').textContent = '';
    foodSearchResults = [];
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
                <span class="meal-date-tag">${Number.isInteger(m.quantity) && m.quantity > 1 ? `${m.quantity} × ` : ''}${escapeHTML(m.serving || '1 serving')}</span>
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

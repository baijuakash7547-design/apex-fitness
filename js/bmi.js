// ── BMI Module ────────────────────────────────────────────────────────────────

const BMIModule = (() => {
  function init() {
    setupEventListeners();
    loadSavedStats();
    renderBodyHistory();
  }

  function setupEventListeners() {
    const calcBtn = document.getElementById('calculate-bmi-btn');
    if (calcBtn) calcBtn.addEventListener('click', calculateBMI);

    const saveBtn = document.getElementById('save-body-stats-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveBodyStats);
  }

  function loadSavedStats() {
    const stats = Storage.getBodyStats();
    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null) el.value = val; };
    setVal('bmi-weight', stats.weight);
    setVal('bmi-height', stats.height);
    setVal('bmi-age', stats.age);
    setVal('bmi-gender', stats.gender);
    setVal('body-chest', stats.chest);
    setVal('body-waist', stats.waist);
    setVal('body-hips', stats.hips);
    setVal('body-biceps', stats.biceps);
    setVal('body-thighs', stats.thighs);
    if (stats.weight && stats.height) calculateBMI(false);
  }

  function calculateBMI(saveStats = true) {
    const weight = parseFloat(document.getElementById('bmi-weight')?.value);
    const heightCm = parseFloat(document.getElementById('bmi-height')?.value);
    const age = Number(document.getElementById('bmi-age')?.value);
    const gender = document.getElementById('bmi-gender')?.value;

    if (!Number.isFinite(weight) || !Number.isFinite(heightCm) || weight < 1 || weight > 500 || heightCm < 50 || heightCm > 300) {
      if (saveStats) showToast('Please enter weight and height', 'warning');
      return;
    }
    const ageValue = document.getElementById('bmi-age')?.value.trim();
    if (ageValue && (!Number.isInteger(age) || age < 1 || age > 120)) {
      if (saveStats) showToast('Enter an age between 1 and 120.', 'warning');
      return;
    }

    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    const category = getBMICategory(bmi);

    // Calculate BMR (Mifflin-St Jeor)
    let bmr = 0;
    if (age && gender) {
      if (gender === 'male') {
        bmr = 10 * weight + 6.25 * heightCm - 5 * age + 5;
      } else {
        bmr = 10 * weight + 6.25 * heightCm - 5 * age - 161;
      }
    }

    // Ideal weight range (BMI 18.5-24.9)
    const idealMin = Math.round(18.5 * heightM * heightM);
    const idealMax = Math.round(24.9 * heightM * heightM);

    updateBMIDisplay(bmi, category, bmr, idealMin, idealMax);
    animateBMIGauge(bmi);

    if (saveStats) {
      if (!saveBodyStatsData({ weight, height: heightCm, age, gender })) return;
      showToast('BMI calculated!', 'success');
    }
  }

  function getBMICategory(bmi) {
    if (bmi < 18.5) return { label: 'Underweight', color: '#60A5FA', emoji: '⚠️' };
    if (bmi < 25) return { label: 'Normal Weight', color: '#34D399', emoji: '✅' };
    if (bmi < 30) return { label: 'Overweight', color: '#FBBF24', emoji: '⚠️' };
    return { label: 'Obese', color: '#F87171', emoji: '❗' };
  }

  function updateBMIDisplay(bmi, category, bmr, idealMin, idealMax) {
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setStyle = (id, prop, val) => { const el = document.getElementById(id); if (el) el.style[prop] = val; };

    setText('bmi-result-value', bmi.toFixed(1));
    setText('bmi-result-category', `${category.emoji} ${category.label}`);
    setText('bmi-ideal-range', `${idealMin} – ${idealMax} kg`);
    if (bmr) setText('bmi-bmr', `${Math.round(bmr)} kcal/day`);

    setStyle('bmi-result-value', 'color', category.color);
    setStyle('bmi-result-category', 'color', category.color);

    const resultCard = document.getElementById('bmi-result-card');
    if (resultCard) resultCard.style.display = 'block';
  }

  function animateBMIGauge(bmi) {
    const needle = document.getElementById('bmi-gauge-needle');
    const gauge = document.getElementById('bmi-gauge-value');
    if (!needle) return;

    // BMI gauge: 10–40 range mapped to -90 to +90 degrees
    const clamped = Math.max(10, Math.min(40, bmi));
    const angle = ((clamped - 10) / 30) * 180 - 90;
    needle.style.transform = `rotate(${angle}deg)`;
    if (gauge) gauge.textContent = bmi.toFixed(1);
  }

  function saveBodyStats() {
    const weightValue = document.getElementById('bmi-weight')?.value.trim();
    const heightValue = document.getElementById('bmi-height')?.value.trim();
    const weight = weightValue ? Number(weightValue) : undefined;
    const height = heightValue ? Number(heightValue) : undefined;
    const ageValue = document.getElementById('bmi-age')?.value.trim();
    const age = ageValue ? Number(ageValue) : undefined;
    const gender = document.getElementById('bmi-gender')?.value;
    if ((weight === undefined) !== (height === undefined)) { showToast('Enter both weight and height, or leave both blank to save measurements only.', 'warning'); return; }
    if (weight !== undefined && (!Number.isFinite(weight) || weight < 1 || weight > 500)) { showToast('Weight must be between 1 and 500 kg.', 'warning'); return; }
    if (height !== undefined && (!Number.isFinite(height) || height < 50 || height > 300)) { showToast('Height must be between 50 and 300 cm.', 'warning'); return; }
    if (age !== undefined && (!Number.isInteger(age) || age < 1 || age > 120)) { showToast('Age must be between 1 and 120.', 'warning'); return; }

    const measurements = {};
    for (const [key, id] of Object.entries({ chest: 'body-chest', waist: 'body-waist', hips: 'body-hips', biceps: 'body-biceps', thighs: 'body-thighs' })) {
      const value = document.getElementById(id)?.value.trim();
      if (!value) continue;
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0 || number > 300) { showToast(`${capitalize(key)} must be between 0 and 300 cm.`, 'warning'); return; }
      measurements[key] = number;
    }
    if (weight === undefined && Object.keys(measurements).length === 0) { showToast('Enter a body measurement or weight and height first.', 'warning'); return; }

    const stats = { ...measurements };
    if (weight !== undefined) Object.assign(stats, { weight, height, age, gender });
    if (!saveBodyStatsData(stats)) return;
    renderBodyHistory();
    showToast('Body stats saved! 📏', 'success');
  }

  function saveBodyStatsData(data) {
    const stats = { ...Storage.getBodyStats(), ...data, date: new Date().toISOString() };
    if (!Storage.saveBodyStats(stats)) return false;

    // Save to history
      const storedHistory = Storage.get('ft_body_history', []);
      const history = (Array.isArray(storedHistory) ? storedHistory : []).slice(0, 50);
    history.unshift({ ...data, date: new Date().toISOString() });
    if (history.length > 50) history.splice(50);
    return Storage.set('ft_body_history', history);
  }

  function renderBodyHistory() {
    const container = document.getElementById('body-history-list');
    if (!container) return;
    const storedHistory = Storage.get('ft_body_history', []);
    const history = (Array.isArray(storedHistory) ? storedHistory : []).slice(0, 10);
    if (history.length === 0) {
      container.innerHTML = '<p class="empty-state">No body stats recorded yet.</p>';
      return;
    }
    container.innerHTML = history.map(h => {
      const weight = Number(h.weight);
      const height = Number(h.height);
      const heightM = height / 100;
      const bmi = weight > 0 && height > 0 ? (weight / (heightM * heightM)).toFixed(1) : '—';
      return `
        <div class="history-card">
          <div class="history-card-header">
            <span>${formatDate(h.date)}</span>
            <span class="stat-chip">BMI: ${bmi}</span>
          </div>
          <div class="body-stats-row">
            ${Number.isFinite(weight) && weight > 0 ? `<span class="body-stat">⚖️ ${escapeHTML(weight)}kg</span>` : ''}
            ${Number.isFinite(height) && height > 0 ? `<span class="body-stat">📏 ${escapeHTML(height)}cm</span>` : ''}
            ${Number(h.waist) > 0 ? `<span class="body-stat">Waist: ${escapeHTML(Number(h.waist))}cm</span>` : ''}
            ${Number(h.chest) > 0 ? `<span class="body-stat">Chest: ${escapeHTML(Number(h.chest))}cm</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  function getWeightHistory() {
    const storedHistory = Storage.get('ft_body_history', []);
    const history = Array.isArray(storedHistory) ? storedHistory : [];
    return history.slice(0, 10).reverse().map(h => ({
      label: new Date(h.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      weight: Number(h.weight) || 0,
    })).filter(item => item.weight > 0);
  }

  return { init, calculateBMI, getWeightHistory, renderBodyHistory };
})();

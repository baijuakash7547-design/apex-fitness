// ── Charts Module (Chart.js) ──────────────────────────────────────────────────

const ChartsModule = (() => {
  const charts = {};

  const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#CBD5E1', font: { family: 'Inter', size: 12 } } } },
    scales: {
      x: { ticks: { color: '#94A3B8', font: { family: 'Inter' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#94A3B8', font: { family: 'Inter' } }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  };

  const waterGoalLinePlugin = {
    id: 'waterGoalLine',
    afterDraw(chart, args, options) {
      const yScale = chart.scales.y;
      const area = chart.chartArea;
      if (!yScale || !area || !Number.isFinite(options?.value)) return;
      const y = yScale.getPixelForValue(options.value);
      if (y < area.top || y > area.bottom) return;
      const { ctx } = chart;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.8)';
      ctx.lineWidth = 2;
      ctx.moveTo(area.left, y);
      ctx.lineTo(area.right, y);
      ctx.stroke();
      ctx.restore();
    },
  };

  function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
  }

  function initAllCharts() {
    const canvases = document.querySelectorAll('.chart-container canvas');
    canvases.forEach(canvas => {
      canvas.hidden = false;
      canvas.parentElement.querySelector('.chart-fallback')?.remove();
    });
    if (typeof Chart === 'undefined') {
      canvases.forEach(canvas => {
        canvas.hidden = true;
        const message = document.createElement('p');
        message.className = 'chart-fallback';
        message.setAttribute('role', 'status');
        message.textContent = 'Charts are unavailable. Check your connection and reload this page.';
        canvas.parentElement.appendChild(message);
      });
      return;
    }
    renderWeeklyVolumeChart();
    renderCalorieChart();
    renderWaterChart();
    renderMacroDonutChart();
    renderWeightProgressChart();
  }

  function renderWeeklyVolumeChart() {
    const ctx = document.getElementById('weekly-volume-chart');
    if (!ctx) return;
    destroyChart('weeklyVolume');

    const data = WorkoutModule.getWeeklyVolume();
    charts.weeklyVolume = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Volume (kg)',
          data: data.map(d => d.volume),
          backgroundColor: 'rgba(124, 58, 237, 0.7)',
          borderColor: '#7C3AED',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }, {
          label: 'Workouts',
          data: data.map(d => d.count),
          backgroundColor: 'rgba(6, 182, 212, 0.5)',
          borderColor: '#06B6D4',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          yAxisID: 'y1',
        }],
      },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          ...CHART_DEFAULTS.scales,
          y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: 'Volume (kg)', color: '#94A3B8' } },
          y1: { position: 'right', ticks: { color: '#94A3B8' }, grid: { display: false }, title: { display: true, text: 'Workouts', color: '#94A3B8' } },
        },
      },
    });
  }

  function renderCalorieChart() {
    const ctx = document.getElementById('calorie-chart');
    if (!ctx) return;
    destroyChart('calories');

    const data = NutritionModule.getWeeklyCalories();
    const goal = NutritionModule.getGoals().calories;

    charts.calories = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Calories',
          data: data.map(d => d.calories),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#F59E0B',
          pointRadius: 5,
          pointHoverRadius: 8,
        }, {
          label: 'Goal',
          data: data.map(() => goal),
          borderColor: 'rgba(248, 113, 113, 0.7)',
          borderDash: [6, 3],
          pointRadius: 0,
          fill: false,
        }],
      },
      options: { ...CHART_DEFAULTS },
    });
  }

  function renderWaterChart() {
    const ctx = document.getElementById('water-chart');
    if (!ctx) return;
    destroyChart('water');

    const data = WaterModule.getWeeklyWater();
    const goal = WaterModule.getGoal();

    charts.water = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Glasses',
          data: data.map(d => d.glasses),
          backgroundColor: data.map(d => d.glasses >= goal ? 'rgba(6, 182, 212, 0.8)' : 'rgba(6, 182, 212, 0.35)'),
          borderColor: '#06B6D4',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          ...CHART_DEFAULTS.plugins,
          waterGoalLine: { value: goal },
        },
      },
      plugins: [waterGoalLinePlugin],
    });
  }

  function renderMacroDonutChart() {
    const ctx = document.getElementById('macro-donut-chart');
    if (!ctx) return;
    destroyChart('macros');

    const totals = NutritionModule.getTodayTotals();
    const hasData = totals.protein > 0 || totals.carbs > 0 || totals.fat > 0;

    charts.macros = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Protein', 'Carbs', 'Fat'],
        datasets: [{
          data: hasData ? [totals.protein * 4, totals.carbs * 4, totals.fat * 9] : [1, 1, 1],
          backgroundColor: ['rgba(52, 211, 153, 0.8)', 'rgba(251, 191, 36, 0.8)', 'rgba(248, 113, 113, 0.8)'],
          borderColor: ['#34D399', '#FBBF24', '#F87171'],
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#CBD5E1', font: { family: 'Inter', size: 12 }, padding: 15 } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(0)} kcal`,
            },
          },
        },
      },
    });
  }

  function renderWeightProgressChart() {
    const ctx = document.getElementById('weight-chart');
    if (!ctx) return;
    destroyChart('weight');

    const data = BMIModule.getWeightHistory();
    if (data.length === 0) {
      ctx.hidden = true;
      const message = document.createElement('p');
      message.className = 'chart-fallback';
      message.textContent = 'Log body measurements to see your weight history.';
      ctx.parentElement.appendChild(message);
      return;
    }

    charts.weight = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Weight (kg)',
          data: data.map(d => d.weight),
          borderColor: '#A78BFA',
          backgroundColor: 'rgba(167, 139, 250, 0.15)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#A78BFA',
          pointRadius: 5,
          pointHoverRadius: 8,
        }],
      },
      options: { ...CHART_DEFAULTS },
    });
  }

  function refreshCharts() {
    destroyChart('weeklyVolume');
    destroyChart('calories');
    destroyChart('water');
    destroyChart('macros');
    destroyChart('weight');
    setTimeout(initAllCharts, 100);
  }

  return { initAllCharts, refreshCharts, renderWeeklyVolumeChart, renderCalorieChart, renderWaterChart, renderMacroDonutChart, renderWeightProgressChart };
})();

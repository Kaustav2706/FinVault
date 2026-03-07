/* ===================================================
   FinVault — Chart Module (Chart.js) — Enhanced
   =================================================== */

const FinCharts = (() => {
    let pieChartInstance = null;
    let lineChartInstance = null;
    let dashPieInstance = null;
    let dailyBarInstance = null;
    let monthlyBarInstance = null;

    const CATEGORY_COLORS = [
        '#6366f1', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
        '#06b6d4', '#84cc16', '#e11d48', '#7c3aed'
    ];

    function getCurrSym() {
        try {
            const s = JSON.parse(localStorage.getItem('finvault_data') || '{}');
            const syms = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
            return syms[s.currency] || '$';
        } catch { return '$'; }
    }

    function getChartDefaults() {
        const isDark = document.body.classList.contains('dark-mode');
        return {
            color: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            gridColor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.05)',
            cardBg: isDark ? '#1e2535' : '#ffffff',
        };
    }

    function tooltipConfig(defaults) {
        const isDark = document.body.classList.contains('dark-mode');
        return {
            backgroundColor: isDark ? '#1e2535' : '#fff',
            titleColor: isDark ? '#f1f5f9' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: defaults.borderColor,
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            bodyFont: { family: 'Inter' },
            titleFont: { family: 'Inter', weight: 600 },
        };
    }

    function clearCanvas(canvas, defaults, msg) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Inter';
        ctx.fillStyle = defaults.color;
        ctx.textAlign = 'center';
        ctx.fillText(msg || 'No expense data', canvas.width / 2, canvas.height / 2);
    }

    // ========== Data ==========
    function getCategorySpending(txns) {
        const spending = {};
        txns.forEach(t => {
            if (t.type === 'expense') {
                const cat = t.category || 'Other';
                spending[cat] = (spending[cat] || 0) + Math.abs(t.amount);
            }
        });
        return spending;
    }

    function getMonthlyExpenses(txns) {
        const monthly = {};
        txns.forEach(t => {
            if (t.type === 'expense') {
                const d = new Date(t.date);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthly[key] = (monthly[key] || 0) + Math.abs(t.amount);
            }
        });
        const sorted = Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
        return {
            labels: sorted.map(([k]) => {
                const [y, m] = k.split('-');
                return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }),
            data: sorted.map(([, v]) => v)
        };
    }

    function getDailyExpenses(txns, days) {
        const daily = {};
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            daily[d.toISOString().split('T')[0]] = 0;
        }
        txns.forEach(t => {
            if (t.type === 'expense' && daily.hasOwnProperty(t.date)) {
                daily[t.date] += Math.abs(t.amount);
            }
        });
        const entries = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
        return {
            labels: entries.map(([k]) => new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            data: entries.map(([, v]) => v)
        };
    }

    function getMonthlyIncomeVsExpense(txns) {
        const months = {};
        txns.forEach(t => {
            const d = new Date(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!months[key]) months[key] = { income: 0, expense: 0 };
            if (t.type === 'income') months[key].income += Math.abs(t.amount);
            else if (t.type === 'expense') months[key].expense += Math.abs(t.amount);
        });
        const sorted = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
        return {
            labels: sorted.map(([k]) => {
                const [y, m] = k.split('-');
                return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }),
            income: sorted.map(([, v]) => v.income),
            expense: sorted.map(([, v]) => v.expense)
        };
    }

    // ========== Chart Renderers ==========

    function renderPieChart(canvasId, txns) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        const defaults = getChartDefaults();
        const spending = getCategorySpending(txns);
        const labels = Object.keys(spending);
        const data = Object.values(spending);

        if (canvasId === 'dashPieChart' && dashPieInstance) dashPieInstance.destroy();
        else if (canvasId === 'categoryPieChart' && pieChartInstance) pieChartInstance.destroy();

        if (labels.length === 0) { clearCanvas(canvas, defaults); return null; }

        const instance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: CATEGORY_COLORS.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: defaults.cardBg,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: canvasId === 'dashPieChart' ? 'bottom' : 'right',
                        labels: {
                            color: defaults.color,
                            font: { family: 'Inter', size: 12, weight: 500 },
                            padding: 12,
                            usePointStyle: true,
                            pointStyleWidth: 10
                        }
                    },
                    tooltip: {
                        ...tooltipConfig(defaults),
                        callbacks: { label: c => ` ${getCurrSym()}${c.parsed.toFixed(2)}` }
                    }
                }
            }
        });

        if (canvasId === 'dashPieChart') dashPieInstance = instance;
        else pieChartInstance = instance;
        return instance;
    }

    function renderLineChart(canvasId, txns) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const defaults = getChartDefaults();
        const { labels, data } = getMonthlyExpenses(txns);

        if (lineChartInstance) lineChartInstance.destroy();
        if (labels.length === 0) { clearCanvas(canvas, defaults); return null; }

        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
        grad.addColorStop(0, 'rgba(99,102,241,0.25)');
        grad.addColorStop(1, 'rgba(99,102,241,0.02)');

        lineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Expenses',
                    data,
                    borderColor: '#6366f1',
                    backgroundColor: grad,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: defaults.gridColor },
                        ticks: { color: defaults.color, font: { family: 'Inter', size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: defaults.gridColor },
                        ticks: {
                            color: defaults.color,
                            font: { family: 'Inter', size: 11 },
                            callback: v => getCurrSym() + v
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...tooltipConfig(defaults),
                        callbacks: { label: c => ` ${getCurrSym()}${c.parsed.y.toFixed(2)}` }
                    }
                }
            }
        });
        return lineChartInstance;
    }

    function renderDailyBarChart(canvasId, txns) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const defaults = getChartDefaults();
        const { labels, data } = getDailyExpenses(txns, 14);

        if (dailyBarInstance) dailyBarInstance.destroy();
        if (!data.some(v => v > 0)) { clearCanvas(canvas, defaults, 'No expenses in the last 14 days'); return null; }

        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(1, '#a78bfa');

        dailyBarInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Daily Expenses',
                    data,
                    backgroundColor: grad,
                    borderRadius: 6,
                    borderSkipped: false,
                    hoverBackgroundColor: '#4f46e5',
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: defaults.color,
                            font: { family: 'Inter', size: 10 },
                            maxRotation: 45
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: defaults.gridColor },
                        ticks: {
                            color: defaults.color,
                            font: { family: 'Inter', size: 11 },
                            callback: v => getCurrSym() + v
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...tooltipConfig(defaults),
                        callbacks: { label: c => ` ${getCurrSym()}${c.parsed.y.toFixed(2)}` }
                    }
                }
            }
        });
        return dailyBarInstance;
    }

    function renderMonthlyBarChart(canvasId, txns) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const defaults = getChartDefaults();
        const { labels, income, expense } = getMonthlyIncomeVsExpense(txns);

        if (monthlyBarInstance) monthlyBarInstance.destroy();
        if (labels.length === 0) { clearCanvas(canvas, defaults, 'No data to compare'); return null; }

        monthlyBarInstance = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Income',
                        data: income,
                        backgroundColor: 'rgba(16,185,129,0.75)',
                        borderRadius: 6,
                        borderSkipped: false,
                        hoverBackgroundColor: '#10b981',
                        barPercentage: 0.7,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'Expenses',
                        data: expense,
                        backgroundColor: 'rgba(239,68,68,0.75)',
                        borderRadius: 6,
                        borderSkipped: false,
                        hoverBackgroundColor: '#ef4444',
                        barPercentage: 0.7,
                        categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: defaults.color, font: { family: 'Inter', size: 10 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: defaults.gridColor },
                        ticks: {
                            color: defaults.color,
                            font: { family: 'Inter', size: 11 },
                            callback: v => getCurrSym() + v
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: defaults.color,
                            font: { family: 'Inter', size: 12, weight: 500 },
                            usePointStyle: true,
                            pointStyleWidth: 10,
                            padding: 16
                        }
                    },
                    tooltip: {
                        ...tooltipConfig(defaults),
                        callbacks: { label: c => ` ${c.dataset.label}: ${getCurrSym()}${c.parsed.y.toFixed(2)}` }
                    }
                }
            }
        });
        return monthlyBarInstance;
    }

    // ========== Public API ==========
    function updateAll(txns) {
        renderPieChart('dashPieChart', txns);
        renderPieChart('categoryPieChart', txns);
        renderLineChart('monthlyLineChart', txns);
        renderDailyBarChart('dailyBarChart', txns);
        renderMonthlyBarChart('monthlyBarChart', txns);
    }

    function destroyAll() {
        [pieChartInstance, lineChartInstance, dashPieInstance, dailyBarInstance, monthlyBarInstance].forEach(i => {
            if (i) i.destroy();
        });
        pieChartInstance = lineChartInstance = dashPieInstance = dailyBarInstance = monthlyBarInstance = null;
    }

    return { renderPieChart, renderLineChart, renderDailyBarChart, renderMonthlyBarChart, updateAll, destroyAll };
})();

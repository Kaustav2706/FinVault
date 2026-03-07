/* ===================================================
   FinVault — Main Application Logic
   =================================================== */

(function () {
    'use strict';

    // ========== Default Data ==========
    const DEFAULT_CATEGORIES = [
        { name: 'Food', icon: '🍔' },
        { name: 'Transport', icon: '🚗' },
        { name: 'Shopping', icon: '🛍️' },
        { name: 'Entertainment', icon: '🎮' },
        { name: 'Rent', icon: '🏠' },
        { name: 'Bills', icon: '📄' },
        { name: 'Salary', icon: '💰' },
        { name: 'Freelance', icon: '💻' },
        { name: 'Investment', icon: '📊' },
        { name: 'Other', icon: '📌' }
    ];

    const DEFAULT_ACCOUNTS = [
        { id: genId(), name: 'Cash', type: 'Cash', icon: '💵', balance: 0 },
        { id: genId(), name: 'Bank Account', type: 'Bank', icon: '🏦', balance: 0 },
        { id: genId(), name: 'UPI', type: 'UPI', icon: '📱', balance: 0 },
        { id: genId(), name: 'Credit Card', type: 'Credit Card', icon: '💳', balance: 0 }
    ];

    // ========== Currency Config ==========
    const CURRENCIES = {
        USD: { symbol: '$', code: 'USD', locale: 'en-US' },
        INR: { symbol: '₹', code: 'INR', locale: 'en-IN' },
        EUR: { symbol: '€', code: 'EUR', locale: 'de-DE' },
        GBP: { symbol: '£', code: 'GBP', locale: 'en-GB' }
    };

    // ========== State ==========
    let state = {
        transactions: [],
        categories: [],
        accounts: [],
        budgets: { daily: 0, monthly: 0, categories: {} },
        goals: [],
        recurring: [],
        darkMode: false,
        currency: 'USD'
    };

    // ========== Helpers ==========
    function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
    function $(id) { return document.getElementById(id); }
    function fmt(n) {
        const c = CURRENCIES[state.currency] || CURRENCIES.USD;
        return c.symbol + Math.abs(n).toLocaleString(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function currSymbol() { return (CURRENCIES[state.currency] || CURRENCIES.USD).symbol; }
    function today() { return new Date().toISOString().split('T')[0]; }

    // ========== LocalStorage ==========
    function save() { localStorage.setItem('finvault_data', JSON.stringify(state)); }

    function load() {
        const raw = localStorage.getItem('finvault_data');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                state = { ...state, ...parsed };
            } catch (e) { /* ignore */ }
        }
        // Ensure defaults
        if (!state.categories || state.categories.length === 0) state.categories = [...DEFAULT_CATEGORIES];
        if (!state.accounts || state.accounts.length === 0) state.accounts = [...DEFAULT_ACCOUNTS];
        if (!state.budgets) state.budgets = { daily: 0, monthly: 0, categories: {} };
        if (!state.goals) state.goals = [];
        if (!state.recurring) state.recurring = [];
        if (!state.transactions) state.transactions = [];
    }

    // ========== Navigation ==========
    function initNav() {
        const links = document.querySelectorAll('.nav-link');
        links.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const section = link.dataset.section;
                switchSection(section);
                // Close sidebar on mobile
                $('sidebar').classList.remove('open');
                $('sidebarOverlay').classList.remove('open');
            });
        });

        // Mobile bottom nav
        const bottomBtns = document.querySelectorAll('.bottom-nav-btn');
        bottomBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                switchSection(section);
            });
        });

        // Hamburger
        $('hamburgerBtn').addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                $('sidebar').classList.add('open');
                $('sidebarOverlay').classList.add('open');
            } else {
                document.body.classList.toggle('sidebar-collapsed');
            }
        });

        $('sidebarClose').addEventListener('click', () => {
            $('sidebar').classList.remove('open');
            $('sidebarOverlay').classList.remove('open');
        });

        $('sidebarOverlay').addEventListener('click', () => {
            $('sidebar').classList.remove('open');
            $('sidebarOverlay').classList.remove('open');
        });
    }

    function switchSection(name) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const section = $('section-' + name);
        if (section) section.classList.add('active');
        const link = document.querySelector(`.nav-link[data-section="${name}"]`);
        if (link) link.classList.add('active');

        // Sync mobile bottom nav active state
        document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
        const bottomBtn = document.querySelector(`.bottom-nav-btn[data-section="${name}"]`);
        if (bottomBtn) bottomBtn.classList.add('active');

        const titles = {
            dashboard: 'Dashboard', transactions: 'Transactions', budgets: 'Budgets',
            analytics: 'Analytics', goals: 'Savings Goals', recurring: 'Recurring',
            accounts: 'Accounts', settings: 'Settings'
        };
        $('pageTitle').textContent = titles[name] || name;

        // Scroll to top on section switch
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Refresh section-specific data
        if (name === 'dashboard') renderDashboard();
        if (name === 'transactions') renderTransactionList();
        if (name === 'analytics') {
            setTimeout(() => FinCharts.updateAll(state.transactions), 100);
        }
        if (name === 'budgets') renderBudgets();
        if (name === 'goals') renderGoals();
        if (name === 'recurring') renderRecurring();
        if (name === 'accounts') renderAccounts();
    }

    // ========== Dark Mode ==========
    function initDarkMode() {
        if (state.darkMode) {
            document.body.classList.add('dark-mode');
            $('darkModeCheckbox').checked = true;
        }

        $('darkModeToggle').addEventListener('click', toggleDarkMode);
        $('darkModeCheckbox').addEventListener('change', toggleDarkMode);
    }

    function toggleDarkMode() {
        state.darkMode = !document.body.classList.contains('dark-mode');
        document.body.classList.toggle('dark-mode', state.darkMode);
        $('darkModeCheckbox').checked = state.darkMode;
        $('darkModeToggle').textContent = state.darkMode ? '☀️' : '🌙';
        save();
        // Re-render charts with new theme
        FinCharts.updateAll(state.transactions);
    }

    // ========== Categories ==========
    function getAllCategories() { return state.categories; }

    function getCategoryIcon(name) {
        const cat = state.categories.find(c => c.name === name);
        return cat ? cat.icon : '📌';
    }

    function populateCategorySelects() {
        const selects = ['txnCategory', 'filterCategory', 'catBudgetSelect', 'recCategory'];
        selects.forEach(id => {
            const sel = $(id);
            if (!sel) return;
            const currentVal = sel.value;
            if (id === 'filterCategory') {
                sel.innerHTML = '<option value="all">All Categories</option>';
            } else {
                sel.innerHTML = '';
            }
            state.categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.name;
                opt.textContent = `${cat.icon} ${cat.name}`;
                sel.appendChild(opt);
            });
            if (currentVal) sel.value = currentVal;
        });
    }

    function populateAccountSelects() {
        const selects = ['txnAccount', 'recAccount'];
        selects.forEach(id => {
            const sel = $(id);
            if (!sel) return;
            const currentVal = sel.value;
            sel.innerHTML = '';
            state.accounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.id;
                opt.textContent = `${acc.icon} ${acc.name}`;
                sel.appendChild(opt);
            });
            if (currentVal) sel.value = currentVal;
        });
    }

    function renderCustomCategories() {
        const container = $('customCatList');
        // Show only non-default categories
        const defaultNames = DEFAULT_CATEGORIES.map(c => c.name);
        const custom = state.categories.filter(c => !defaultNames.includes(c.name));
        container.innerHTML = '';
        if (custom.length === 0) {
            container.innerHTML = '<span class="empty-state" style="padding:0.5rem;font-size:0.8rem;">No custom categories</span>';
            return;
        }
        custom.forEach(cat => {
            const tag = document.createElement('span');
            tag.className = 'cat-tag';
            tag.innerHTML = `${cat.icon} ${cat.name} <button data-cat="${cat.name}" title="Remove">✕</button>`;
            tag.querySelector('button').addEventListener('click', () => {
                state.categories = state.categories.filter(c => c.name !== cat.name);
                save();
                populateCategorySelects();
                renderCustomCategories();
            });
            container.appendChild(tag);
        });
    }

    function initCustomCategories() {
        $('addCustomCat').addEventListener('click', () => {
            const name = $('newCatName').value.trim();
            const icon = $('newCatIcon').value.trim() || '📌';
            if (!name) return;
            if (state.categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
                showAlert('Category already exists', 'warning');
                return;
            }
            state.categories.push({ name, icon });
            save();
            $('newCatName').value = '';
            $('newCatIcon').value = '';
            populateCategorySelects();
            renderCustomCategories();
        });
    }

    // ========== Transactions ==========
    function initTransactionForm() {
        // Open modal
        $('openAddTxn').addEventListener('click', () => {
            $('txnEditId').value = '';
            $('txnModalTitle').textContent = 'Add Transaction';
            $('txnForm').reset();
            $('txnDate').value = today();
            openModal('txnModal');
        });

        $('closeTxnModal').addEventListener('click', () => closeModal('txnModal'));

        // Submit
        $('txnForm').addEventListener('submit', e => {
            e.preventDefault();
            const editId = $('txnEditId').value;
            const type = $('txnType').value;
            const amount = parseFloat($('txnAmount').value);
            if (isNaN(amount) || amount <= 0) { showAlert('Enter a valid amount', 'warning'); return; }

            const txn = {
                id: editId || genId(),
                title: $('txnTitle').value.trim(),
                amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
                type,
                category: $('txnCategory').value,
                date: $('txnDate').value || today(),
                account: $('txnAccount').value
            };

            if (editId) {
                const idx = state.transactions.findIndex(t => t.id === editId);
                if (idx >= 0) state.transactions[idx] = txn;
            } else {
                state.transactions.push(txn);
            }

            save();
            closeModal('txnModal');
            refreshAll();
            checkBudgetAlerts();
        });
    }

    function editTransaction(id) {
        const txn = state.transactions.find(t => t.id === id);
        if (!txn) return;
        $('txnEditId').value = txn.id;
        $('txnModalTitle').textContent = 'Edit Transaction';
        $('txnTitle').value = txn.title;
        $('txnAmount').value = Math.abs(txn.amount);
        $('txnType').value = txn.type;
        $('txnCategory').value = txn.category;
        $('txnDate').value = txn.date;
        $('txnAccount').value = txn.account;
        openModal('txnModal');
    }

    function deleteTransaction(id) {
        showConfirm('Delete this transaction?', () => {
            state.transactions = state.transactions.filter(t => t.id !== id);
            save();
            refreshAll();
        });
    }

    function getFilteredTransactions() {
        let txns = [...state.transactions];
        const catFilter = $('filterCategory').value;
        const typeFilter = $('filterType').value;
        const sortDir = $('sortDate').value;

        if (catFilter !== 'all') txns = txns.filter(t => t.category === catFilter);
        if (typeFilter !== 'all') txns = txns.filter(t => t.type === typeFilter);
        txns.sort((a, b) => sortDir === 'newest'
            ? new Date(b.date) - new Date(a.date)
            : new Date(a.date) - new Date(b.date));
        return txns;
    }

    function renderTransactionList() {
        const container = $('transactionList');
        const txns = getFilteredTransactions();
        if (txns.length === 0) {
            container.innerHTML = '<p class="empty-state">No transactions found.</p>';
            return;
        }
        container.innerHTML = txns.map(t => txnItemHTML(t, true)).join('');
        // Bind actions
        container.querySelectorAll('.edit-txn').forEach(btn => {
            btn.addEventListener('click', () => editTransaction(btn.dataset.id));
        });
        container.querySelectorAll('.delete-txn').forEach(btn => {
            btn.addEventListener('click', () => deleteTransaction(btn.dataset.id));
        });
    }

    function txnItemHTML(t, showActions = false) {
        const icon = getCategoryIcon(t.category);
        const accName = getAccountName(t.account);
        const actions = showActions ? `
      <div class="txn-actions">
        <button class="edit-txn" data-id="${t.id}" title="Edit">✏️</button>
        <button class="delete-txn" data-id="${t.id}" title="Delete">🗑️</button>
      </div>` : '';
        return `
      <div class="txn-item">
        <div class="txn-icon">${icon}</div>
        <div class="txn-details">
          <div class="txn-title">${escHTML(t.title)}</div>
          <div class="txn-meta">
            <span>${t.category}</span>
            <span>${formatDate(t.date)}</span>
            <span>${accName}</span>
          </div>
        </div>
        <span class="txn-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</span>
        ${actions}
      </div>`;
    }

    function initTransactionFilters() {
        ['filterCategory', 'filterType', 'sortDate'].forEach(id => {
            $(id).addEventListener('change', renderTransactionList);
        });
    }

    // ========== Dashboard ==========
    function renderDashboard() {
        const txns = state.transactions;
        const totalIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
        const totalExpenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
        const balance = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;

        $('totalBalance').textContent = (balance >= 0 ? '' : '-') + fmt(balance);
        $('totalIncome').textContent = '+' + fmt(totalIncome);
        $('totalExpenses').textContent = '-' + fmt(totalExpenses);
        $('savingsRate').textContent = savingsRate.toFixed(1) + '%';

        // Recent transactions (latest 5)
        const recent = [...txns].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        const recentContainer = $('recentTransactions');
        if (recent.length === 0) {
            recentContainer.innerHTML = '<p class="empty-state">No transactions yet. Add one to get started!</p>';
        } else {
            recentContainer.innerHTML = recent.map(t => txnItemHTML(t, false)).join('');
        }

        // Budget bars on dashboard
        renderDashBudgetBars();

        // Insights
        renderInsights();

        // Charts
        FinCharts.renderPieChart('dashPieChart', txns);
    }

    // ========== Budget System ==========
    function initBudgets() {
        $('saveDailyBudget').addEventListener('click', () => {
            state.budgets.daily = parseFloat($('dailyBudgetInput').value) || 0;
            save();
            renderBudgets();
            renderDashBudgetBars();
            checkBudgetAlerts();
        });

        $('saveMonthlyBudget').addEventListener('click', () => {
            state.budgets.monthly = parseFloat($('monthlyBudgetInput').value) || 0;
            save();
            renderBudgets();
            renderDashBudgetBars();
            checkBudgetAlerts();
        });

        $('saveCatBudget').addEventListener('click', () => {
            const cat = $('catBudgetSelect').value;
            const amt = parseFloat($('catBudgetAmount').value) || 0;
            if (cat && amt > 0) {
                state.budgets.categories[cat] = amt;
                save();
                $('catBudgetAmount').value = '';
                renderBudgets();
                renderDashBudgetBars();
                checkBudgetAlerts();
            }
        });
    }

    function getDailySpent() {
        const todayStr = today();
        return state.transactions
            .filter(t => t.type === 'expense' && t.date === todayStr)
            .reduce((s, t) => s + Math.abs(t.amount), 0);
    }

    function getMonthlySpent() {
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth();
        return state.transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                const d = new Date(t.date);
                return d.getFullYear() === y && d.getMonth() === m;
            })
            .reduce((s, t) => s + Math.abs(t.amount), 0);
    }

    function getCategorySpent(category) {
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth();
        return state.transactions
            .filter(t => {
                if (t.type !== 'expense' || t.category !== category) return false;
                const d = new Date(t.date);
                return d.getFullYear() === y && d.getMonth() === m;
            })
            .reduce((s, t) => s + Math.abs(t.amount), 0);
    }

    function renderBudgets() {
        // Daily
        $('dailyBudgetInput').value = state.budgets.daily || '';
        const dailySpent = getDailySpent();
        $('dailySpent').textContent = fmt(dailySpent);
        $('dailyLimit').textContent = state.budgets.daily ? fmt(state.budgets.daily) : '$0';
        updateProgressBar('dailyProgressBar', dailySpent, state.budgets.daily);

        // Monthly
        $('monthlyBudgetInput').value = state.budgets.monthly || '';
        const monthlySpent = getMonthlySpent();
        $('monthlySpent').textContent = fmt(monthlySpent);
        $('monthlyLimit').textContent = state.budgets.monthly ? fmt(state.budgets.monthly) : '$0';
        updateProgressBar('monthlyProgressBar', monthlySpent, state.budgets.monthly);

        // Category budgets
        const catContainer = $('categoryBudgets');
        const catBudgets = state.budgets.categories || {};
        const cats = Object.keys(catBudgets);

        if (cats.length === 0) {
            catContainer.innerHTML = '<p class="empty-state" style="padding:0.5rem">No category budgets set.</p>';
        } else {
            catContainer.innerHTML = cats.map(cat => {
                const limit = catBudgets[cat];
                const spent = getCategorySpent(cat);
                const pct = limit > 0 ? Math.min(spent / limit * 100, 100) : 0;
                const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : '';
                return `
          <div class="category-budget-item">
            <div class="category-budget-header">
              <span>${getCategoryIcon(cat)} ${cat}</span>
              <span>${fmt(spent)} / ${fmt(limit)}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
          </div>`;
            }).join('');
        }
    }

    function renderDashBudgetBars() {
        const container = $('dashBudgetBars');
        const bars = [];

        if (state.budgets.daily > 0) {
            const spent = getDailySpent();
            const pct = Math.min(spent / state.budgets.daily * 100, 100);
            const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : '';
            bars.push(`
        <div class="budget-bar-item">
          <label>Daily: ${fmt(spent)} / ${fmt(state.budgets.daily)}</label>
          <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
        </div>`);
        }

        if (state.budgets.monthly > 0) {
            const spent = getMonthlySpent();
            const pct = Math.min(spent / state.budgets.monthly * 100, 100);
            const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : '';
            bars.push(`
        <div class="budget-bar-item">
          <label>Monthly: ${fmt(spent)} / ${fmt(state.budgets.monthly)}</label>
          <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
        </div>`);
        }

        const catBudgets = state.budgets.categories || {};
        Object.keys(catBudgets).forEach(cat => {
            const limit = catBudgets[cat];
            const spent = getCategorySpent(cat);
            const pct = limit > 0 ? Math.min(spent / limit * 100, 100) : 0;
            const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : '';
            bars.push(`
        <div class="budget-bar-item">
          <label>${getCategoryIcon(cat)} ${cat}: ${fmt(spent)} / ${fmt(limit)}</label>
          <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
        </div>`);
        });

        container.innerHTML = bars.length > 0 ? bars.join('') : '<p class="empty-state">No budgets set yet.</p>';
    }

    function updateProgressBar(barId, spent, limit) {
        const bar = $(barId);
        if (!bar) return;
        if (!limit || limit <= 0) {
            bar.style.width = '0%';
            bar.className = 'progress-fill';
            return;
        }
        const pct = Math.min(spent / limit * 100, 100);
        bar.style.width = pct + '%';
        bar.className = 'progress-fill';
        if (pct >= 100) bar.classList.add('danger');
        else if (pct >= 80) bar.classList.add('warning');
    }

    function checkBudgetAlerts() {
        // Daily
        if (state.budgets.daily > 0) {
            const spent = getDailySpent();
            const pct = spent / state.budgets.daily * 100;
            if (pct >= 100) showAlert(`⚠️ You've exceeded your daily budget! (${fmt(spent)} / ${fmt(state.budgets.daily)})`, 'danger');
            else if (pct >= 80) showAlert(`Daily budget is at ${pct.toFixed(0)}% — slow down on spending!`, 'warning');
        }

        // Monthly
        if (state.budgets.monthly > 0) {
            const spent = getMonthlySpent();
            const pct = spent / state.budgets.monthly * 100;
            if (pct >= 100) showAlert(`⚠️ Monthly budget exceeded! (${fmt(spent)} / ${fmt(state.budgets.monthly)})`, 'danger');
            else if (pct >= 80) showAlert(`Monthly budget is at ${pct.toFixed(0)}% — watch your spending!`, 'warning');
        }

        // Category budgets
        const catBudgets = state.budgets.categories || {};
        Object.keys(catBudgets).forEach(cat => {
            const limit = catBudgets[cat];
            const spent = getCategorySpent(cat);
            const pct = limit > 0 ? spent / limit * 100 : 0;
            if (pct >= 100) showAlert(`⚠️ ${cat} budget exceeded! (${fmt(spent)} / ${fmt(limit)})`, 'danger');
            else if (pct >= 80) showAlert(`${cat} budget at ${pct.toFixed(0)}% — consider limiting ${cat.toLowerCase()} expenses`, 'warning');
        });
    }

    // ========== Smart Insights ==========
    function renderInsights() {
        const container = $('insightsContainer');
        const insights = generateInsights();
        if (insights.length === 0) {
            container.innerHTML = '<p class="empty-state">Add transactions to see insights.</p>';
            return;
        }
        container.innerHTML = insights.map(i =>
            `<div class="insight-item"><span class="insight-icon">${i.icon}</span><span>${i.text}</span></div>`
        ).join('');
    }

    function generateInsights() {
        const insights = [];
        const txns = state.transactions;
        if (txns.length === 0) return insights;

        const now = new Date();
        const thisMonth = txns.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        const lastMonth = txns.filter(t => {
            const d = new Date(t.date);
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
        });

        // Category spending comparison
        const catSpendThisMonth = {};
        const catSpendLastMonth = {};
        thisMonth.filter(t => t.type === 'expense').forEach(t => {
            catSpendThisMonth[t.category] = (catSpendThisMonth[t.category] || 0) + Math.abs(t.amount);
        });
        lastMonth.filter(t => t.type === 'expense').forEach(t => {
            catSpendLastMonth[t.category] = (catSpendLastMonth[t.category] || 0) + Math.abs(t.amount);
        });

        // Compare each category
        Object.keys(catSpendThisMonth).forEach(cat => {
            const thisAmt = catSpendThisMonth[cat];
            const lastAmt = catSpendLastMonth[cat] || 0;
            if (lastAmt > 0) {
                const pctChange = ((thisAmt - lastAmt) / lastAmt * 100).toFixed(0);
                if (pctChange > 20) {
                    insights.push({ icon: '📈', text: `You spent ${pctChange}% more on ${cat} this month compared to last month.` });
                } else if (pctChange < -20) {
                    insights.push({ icon: '📉', text: `Great! You reduced ${cat} spending by ${Math.abs(pctChange)}% this month.` });
                }
            }
        });

        // Top expense category
        const topCat = Object.entries(catSpendThisMonth).sort((a, b) => b[1] - a[1])[0];
        if (topCat) {
            insights.push({ icon: '🏷️', text: `${topCat[0]} is your biggest expense category this month (${fmt(topCat[1])}).` });
        }

        // Savings insight
        const totalIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
        const totalExpenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
        if (totalIncome > 0) {
            const rate = ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1);
            if (rate > 30) {
                insights.push({ icon: '🎉', text: `Amazing! You're saving ${rate}% of your income this month.` });
            } else if (rate > 0) {
                insights.push({ icon: '💡', text: `You're saving ${rate}% of your income this month. Aim for 20%+!` });
            } else {
                insights.push({ icon: '⚠️', text: `You're spending more than you earn this month. Review your expenses!` });
            }
        }

        // Transaction count
        if (thisMonth.length > 0) {
            insights.push({ icon: '📋', text: `You have ${thisMonth.length} transaction${thisMonth.length > 1 ? 's' : ''} this month.` });
        }

        return insights;
    }

    // ========== Savings Goals ==========
    function initGoals() {
        $('openAddGoal').addEventListener('click', () => {
            $('goalEditId').value = '';
            $('goalModalTitle').textContent = 'New Savings Goal';
            $('goalForm').reset();
            $('goalSaved').value = '0';
            openModal('goalModal');
        });

        $('closeGoalModal').addEventListener('click', () => closeModal('goalModal'));

        $('goalForm').addEventListener('submit', e => {
            e.preventDefault();
            const editId = $('goalEditId').value;
            const goal = {
                id: editId || genId(),
                name: $('goalName').value.trim(),
                target: parseFloat($('goalTarget').value) || 0,
                saved: parseFloat($('goalSaved').value) || 0
            };

            if (editId) {
                const idx = state.goals.findIndex(g => g.id === editId);
                if (idx >= 0) state.goals[idx] = goal;
            } else {
                state.goals.push(goal);
            }

            save();
            closeModal('goalModal');
            renderGoals();
        });
    }

    function renderGoals() {
        const container = $('goalsList');
        if (state.goals.length === 0) {
            container.innerHTML = '<p class="empty-state">No savings goals yet. Create one!</p>';
            return;
        }
        container.innerHTML = state.goals.map(g => {
            const pct = g.target > 0 ? Math.min(g.saved / g.target * 100, 100) : 0;
            const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : '';
            return `
        <div class="goal-card">
          <div class="goal-header">
            <span class="goal-name">🏆 ${escHTML(g.name)}</span>
            <button class="btn btn-sm btn-outline delete-goal" data-id="${g.id}">🗑️</button>
          </div>
          <div class="progress-bar"><div class="progress-fill ${pct >= 100 ? '' : cls}" style="width:${pct}%;${pct >= 100 ? 'background:var(--success)' : ''}"></div></div>
          <div class="goal-amounts">
            <span>Saved: ${fmt(g.saved)}</span>
            <span>${pct.toFixed(1)}%</span>
            <span>Target: ${fmt(g.target)}</span>
          </div>
          <div class="goal-actions">
            <input type="number" class="input-field goal-add-amount" placeholder="Add amount" min="0" step="0.01" />
            <button class="btn btn-sm btn-primary add-to-goal" data-id="${g.id}">+ Add</button>
            <button class="btn btn-sm btn-outline edit-goal" data-id="${g.id}">✏️</button>
          </div>
        </div>`;
        }).join('');

        // Bind events
        container.querySelectorAll('.add-to-goal').forEach(btn => {
            btn.addEventListener('click', () => {
                const goal = state.goals.find(g => g.id === btn.dataset.id);
                const input = btn.parentElement.querySelector('.goal-add-amount');
                const addAmt = parseFloat(input.value) || 0;
                if (goal && addAmt > 0) {
                    goal.saved += addAmt;
                    save();
                    renderGoals();
                }
            });
        });

        container.querySelectorAll('.edit-goal').forEach(btn => {
            btn.addEventListener('click', () => {
                const goal = state.goals.find(g => g.id === btn.dataset.id);
                if (!goal) return;
                $('goalEditId').value = goal.id;
                $('goalModalTitle').textContent = 'Edit Goal';
                $('goalName').value = goal.name;
                $('goalTarget').value = goal.target;
                $('goalSaved').value = goal.saved;
                openModal('goalModal');
            });
        });

        container.querySelectorAll('.delete-goal').forEach(btn => {
            btn.addEventListener('click', () => {
                showConfirm('Delete this savings goal?', () => {
                    state.goals = state.goals.filter(g => g.id !== btn.dataset.id);
                    save();
                    renderGoals();
                });
            });
        });
    }

    // ========== Recurring Expenses ==========
    function initRecurring() {
        $('openAddRecurring').addEventListener('click', () => {
            $('recurringForm').reset();
            openModal('recurringModal');
        });

        $('closeRecurringModal').addEventListener('click', () => closeModal('recurringModal'));

        $('recurringForm').addEventListener('submit', e => {
            e.preventDefault();
            const rec = {
                id: genId(),
                title: $('recTitle').value.trim(),
                amount: parseFloat($('recAmount').value) || 0,
                category: $('recCategory').value,
                day: parseInt($('recDay').value) || 1,
                account: $('recAccount').value,
                lastGenerated: null
            };
            state.recurring.push(rec);
            save();
            closeModal('recurringModal');
            renderRecurring();
        });
    }

    function renderRecurring() {
        const container = $('recurringList');
        if (state.recurring.length === 0) {
            container.innerHTML = '<p class="empty-state">No recurring expenses set.</p>';
            return;
        }
        container.innerHTML = state.recurring.map(r => {
            const icon = getCategoryIcon(r.category);
            const accName = getAccountName(r.account);
            return `
        <div class="recurring-card">
          <div class="txn-icon">${icon}</div>
          <div class="recurring-info">
            <div class="recurring-title">${escHTML(r.title)}</div>
            <div class="recurring-meta">Day ${r.day} · ${r.category} · ${accName}</div>
          </div>
          <span class="recurring-amount">-${fmt(r.amount)}</span>
          <div class="txn-actions">
            <button class="delete-recurring" data-id="${r.id}" title="Delete">🗑️</button>
          </div>
        </div>`;
        }).join('');

        container.querySelectorAll('.delete-recurring').forEach(btn => {
            btn.addEventListener('click', () => {
                showConfirm('Remove this recurring expense?', () => {
                    state.recurring = state.recurring.filter(r => r.id !== btn.dataset.id);
                    save();
                    renderRecurring();
                });
            });
        });
    }

    function processRecurringExpenses() {
        const now = new Date();
        const currentDay = now.getDate();
        const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

        state.recurring.forEach(rec => {
            if (currentDay >= rec.day && rec.lastGenerated !== monthKey) {
                // Auto-add this month's transaction
                state.transactions.push({
                    id: genId(),
                    title: `🔄 ${rec.title}`,
                    amount: -Math.abs(rec.amount),
                    type: 'expense',
                    category: rec.category,
                    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(rec.day).padStart(2, '0')}`,
                    account: rec.account
                });
                rec.lastGenerated = monthKey;
            }
        });
        save();
    }

    // ========== Multi-Account ==========
    function initAccounts() {
        $('openAddAccount').addEventListener('click', () => {
            $('accountForm').reset();
            $('accIcon').value = '💳';
            openModal('accountModal');
        });

        $('closeAccountModal').addEventListener('click', () => closeModal('accountModal'));

        $('accountForm').addEventListener('submit', e => {
            e.preventDefault();
            const acc = {
                id: genId(),
                name: $('accName').value.trim(),
                type: $('accType').value,
                icon: $('accIcon').value.trim() || '💳',
                balance: parseFloat($('accBalance').value) || 0
            };
            state.accounts.push(acc);
            save();
            closeModal('accountModal');
            populateAccountSelects();
            renderAccounts();
        });
    }

    function getAccountName(accId) {
        const acc = state.accounts.find(a => a.id === accId);
        return acc ? acc.name : 'Unknown';
    }

    function getAccountBalance(accId) {
        const acc = state.accounts.find(a => a.id === accId);
        const openingBal = acc ? acc.balance : 0;
        const txnBal = state.transactions
            .filter(t => t.account === accId)
            .reduce((s, t) => s + t.amount, 0);
        return openingBal + txnBal;
    }

    function renderAccounts() {
        const container = $('accountsList');
        container.innerHTML = state.accounts.map(acc => {
            const bal = getAccountBalance(acc.id);
            return `
        <div class="account-card">
          <div class="account-icon">${acc.icon}</div>
          <div class="account-name">${escHTML(acc.name)}</div>
          <div class="account-type">${acc.type}</div>
          <div class="account-balance" style="color:${bal >= 0 ? 'var(--success)' : 'var(--danger)'}">${bal >= 0 ? '' : '-'}${fmt(bal)}</div>
          <div class="account-actions">
            <button class="btn btn-sm btn-outline delete-account" data-id="${acc.id}">🗑️ Remove</button>
          </div>
        </div>`;
        }).join('');

        container.querySelectorAll('.delete-account').forEach(btn => {
            btn.addEventListener('click', () => {
                if (state.accounts.length <= 1) {
                    showAlert('You need at least one account', 'warning');
                    return;
                }
                showConfirm('Remove this account? Transactions linked to it will remain.', () => {
                    state.accounts = state.accounts.filter(a => a.id !== btn.dataset.id);
                    save();
                    populateAccountSelects();
                    renderAccounts();
                });
            });
        });
    }

    // ========== Export ==========
    function initExport() {
        $('exportCSV').addEventListener('click', exportCSV);
        $('exportPDF').addEventListener('click', exportPDF);
    }

    function exportCSV() {
        if (state.transactions.length === 0) {
            showAlert('No transactions to export', 'warning');
            return;
        }
        const headers = ['Date', 'Description', 'Type', 'Category', 'Amount', 'Account'];
        const rows = state.transactions.map(t => [
            t.date,
            `"${t.title.replace(/"/g, '""')}"`,
            t.type,
            t.category,
            t.amount.toFixed(2),
            getAccountName(t.account)
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        downloadFile(csv, 'finvault_transactions.csv', 'text/csv');
    }

    function exportPDF() {
        if (state.transactions.length === 0) {
            showAlert('No transactions to export', 'warning');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.setFontSize(20);
            doc.setTextColor(99, 102, 241);
            doc.text('FinVault — Financial Report', 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

            // Summary
            const totalIncome = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
            const totalExpenses = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);

            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text('Summary', 14, 40);
            doc.setFontSize(10);
            doc.text(`Total Income: ${fmt(totalIncome)}`, 14, 48);
            doc.text(`Total Expenses: ${fmt(totalExpenses)}`, 14, 55);
            doc.text(`Balance: ${fmt(totalIncome - totalExpenses)}`, 14, 62);

            // Transactions table
            doc.setFontSize(12);
            doc.text('Transactions', 14, 76);

            let y = 84;
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Date', 14, y);
            doc.text('Description', 44, y);
            doc.text('Category', 104, y);
            doc.text('Amount', 144, y);
            doc.text('Type', 174, y);
            y += 6;

            doc.setTextColor(40);
            const sorted = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
            sorted.forEach(t => {
                if (y > 280) { doc.addPage(); y = 20; }
                doc.text(t.date, 14, y);
                doc.text(t.title.substring(0, 30), 44, y);
                doc.text(t.category, 104, y);
                doc.text(fmt(Math.abs(t.amount)), 144, y);
                doc.text(t.type, 174, y);
                y += 6;
            });

            doc.save('finvault_report.pdf');
        } catch (err) {
            showAlert('PDF export failed. Make sure jsPDF is loaded.', 'danger');
            console.error(err);
        }
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ========== Clear Data ==========
    function initClearData() {
        $('clearAllData').addEventListener('click', () => {
            showConfirm('Are you sure you want to clear ALL data? This cannot be undone.', () => {
                localStorage.removeItem('finvault_data');
                state.transactions = [];
                state.budgets = { daily: 0, monthly: 0, categories: {} };
                state.goals = [];
                state.recurring = [];
                state.categories = [...DEFAULT_CATEGORIES];
                state.accounts = [...DEFAULT_ACCOUNTS];
                save();
                refreshAll();
                showAlert('All data cleared.', 'warning');
            });
        });
    }

    // ========== Modals ==========
    function openModal(id) {
        $(id).classList.add('open');
    }

    function closeModal(id) {
        $(id).classList.remove('open');
    }

    let confirmCallback = null;

    function showConfirm(message, onConfirm) {
        $('confirmMessage').textContent = message;
        confirmCallback = onConfirm;
        openModal('confirmModal');
    }

    function initConfirmModal() {
        $('closeConfirmModal').addEventListener('click', () => closeModal('confirmModal'));
        $('confirmCancel').addEventListener('click', () => closeModal('confirmModal'));
        $('confirmOk').addEventListener('click', () => {
            closeModal('confirmModal');
            if (confirmCallback) confirmCallback();
            confirmCallback = null;
        });
    }

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });

    // ========== Alerts ==========
    function showAlert(message, type = 'warning') {
        const container = $('alertsContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
      <span>${type === 'danger' ? '🚨' : '⚠️'} ${message}</span>
      <button class="alert-close" onclick="this.parentElement.remove()">✕</button>`;
        container.appendChild(alert);
        setTimeout(() => { if (alert.parentElement) alert.remove(); }, 5000);
    }

    // ========== Utilities ==========
    function escHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return dateStr; }
    }

    // ========== Refresh All ==========
    function refreshAll() {
        renderDashboard();
        renderTransactionList();
        renderBudgets();
        renderGoals();
        renderRecurring();
        renderAccounts();
        renderCustomCategories();
        populateCategorySelects();
        populateAccountSelects();
        FinCharts.updateAll(state.transactions);
    }

    // ========== Currency ==========
    function initCurrency() {
        const sel1 = $('currencySelect');
        const sel2 = $('currencySelectSettings');

        // Set initial value
        sel1.value = state.currency;
        sel2.value = state.currency;

        function onCurrencyChange(e) {
            state.currency = e.target.value;
            sel1.value = state.currency;
            sel2.value = state.currency;
            save();
            refreshAll();
        }

        sel1.addEventListener('change', onCurrencyChange);
        sel2.addEventListener('change', onCurrencyChange);
    }

    // ========== Init ==========
    function init() {
        load();
        initNav();
        initDarkMode();
        initCurrency();
        initConfirmModal();
        initTransactionForm();
        initTransactionFilters();
        initBudgets();
        initGoals();
        initRecurring();
        initAccounts();
        initCustomCategories();
        initExport();
        initClearData();

        populateCategorySelects();
        populateAccountSelects();
        renderCustomCategories();

        // Process recurring on load
        processRecurringExpenses();

        // Initial render
        refreshAll();
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);
})();

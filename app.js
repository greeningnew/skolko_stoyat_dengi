const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzinZUX7K1sIveAC3-l-jUEAgBlgEUMT98UOe8D_c8wV0hUMsg8eB8AcZR6jHBtmXjb/exec';
const API_TOKEN = '673-ov1P8j9pRWAKzEEEEdyEC5MunZSr';

const state = {
  operations: [],
  accounts: ['карта', 'наличка', 'крипта', 'другое'],
  expenseCategories: ['еда','доставка','продукты','транспорт','подписки','здоровье','спорт','одежда','развлечения','работа/бизнес','дом','другое'],
  incomeCategories: ['зарплата','проект','возврат','подарок','крипта','другое'],
  monthlyLimit: 100000,
  step: 1,
  draft: {
    amount: '',
    category: 'еда',
    account: 'карта',
    date: today()
  }
};

const els = {
  status: document.querySelector('#status'),
  total: document.querySelector('#total'),
  accountChips: document.querySelector('#accountChips'),
  quickForm: document.querySelector('#quickForm'),
  amountInput: document.querySelector('#amountInput'),
  dateInput: document.querySelector('#dateInput'),
  categoryChips: document.querySelector('#categoryChips'),
  accountSelectChips: document.querySelector('#accountSelectChips'),
  monthIncome: document.querySelector('#monthIncome'),
  monthExpense: document.querySelector('#monthExpense'),
  monthDiff: document.querySelector('#monthDiff'),
  categoryBars: document.querySelector('#categoryBars'),
  history: document.querySelector('#history'),
  syncButton: document.querySelector('#syncButton'),
  tabButtons: document.querySelectorAll('[data-tab]'),
  tabPages: document.querySelectorAll('.tab-page')
};

function money(value) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sameMonth(dateString) {
  const d = new Date(dateString);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

function api(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('PASTE_')) {
      reject(new Error('сначала вставь ссылку Google Apps Script в app.js'));
      return;
    }

    const callback = 'jsonp_' + Math.random().toString(36).slice(2);
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', API_TOKEN);
    url.searchParams.set('callback', callback);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value ?? ''));

    const script = document.createElement('script');
    window[callback] = (data) => {
      delete window[callback];
      script.remove();
      data && data.ok ? resolve(data) : reject(new Error(data && data.error ? data.error : 'ошибка API'));
    };
    script.onerror = () => {
      delete window[callback];
      script.remove();
      reject(new Error('не удалось подключиться к Google Apps Script'));
    };
    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function setStatus(text) {
  els.status.textContent = text;
}

function calculateAccounts() {
  const result = Object.fromEntries(state.accounts.map(name => [name, 0]));
  state.operations.forEach(op => {
    if (!result.hasOwnProperty(op.account)) result[op.account] = 0;
    result[op.account] += op.type === 'income' ? Number(op.amount) : -Number(op.amount);
  });
  return result;
}

function sortedOperations() {
  return [...state.operations].sort((a, b) => {
    const byDate = String(b.date).localeCompare(String(a.date));
    return byDate || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

function renderBalance() {
  const accounts = calculateAccounts();
  const total = Object.values(accounts).reduce((sum, value) => sum + value, 0);
  els.total.textContent = money(total);

  const visible = ['карта', 'наличка', 'крипта'];
  els.accountChips.innerHTML = visible.map(name => `
    <div class="balance-chip">
      <span>${name}</span>
      <b>${money(accounts[name] || 0)}</b>
    </div>
  `).join('');
}

function renderAnalytics() {
  const monthOps = state.operations.filter(op => sameMonth(op.date));
  const monthIncome = monthOps.filter(op => op.type === 'income').reduce((sum, op) => sum + Number(op.amount), 0);
  const monthExpense = monthOps.filter(op => op.type === 'expense').reduce((sum, op) => sum + Number(op.amount), 0);

  els.monthIncome.textContent = money(monthIncome);
  els.monthExpense.textContent = money(monthExpense);
  els.monthDiff.textContent = money(monthIncome - monthExpense);

  const byCategory = {};
  monthOps.filter(op => op.type === 'expense').forEach(op => {
    byCategory[op.category] = (byCategory[op.category] || 0) + Number(op.amount);
  });
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = rows[0]?.[1] || 0;

  els.categoryBars.innerHTML = rows.length ? rows.map(([name, value]) => `
    <div class="bar-row">
      <div class="bar-meta"><span>${name}</span><b>${money(value)}</b></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(6, Math.round(value / max * 100))}%"></div></div>
    </div>
  `).join('') : '<div class="empty">пока мало данных</div>';
}

function renderHistory() {
  const ops = sortedOperations().slice(0, 80);
  els.history.innerHTML = ops.length ? ops.map(op => `
    <div class="operation">
      <div>
        <b>${op.type === 'income' ? '+' : '-'}${money(op.amount)}</b>
        <span>${op.category} · ${op.account}</span>
        ${op.comment ? `<em>${op.comment}</em>` : ''}
      </div>
      <time>${formatDate(op.date)}</time>
    </div>
  `).join('') : '<div class="empty">пока операций нет</div>';
}

function render() {
  renderBalance();
  renderAnalytics();
  renderHistory();
}

function formatDate(dateString) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function renderChips() {
  els.categoryChips.innerHTML = state.expenseCategories.map(name => `
    <button class="chip ${state.draft.category === name ? 'active' : ''}" type="button" data-category="${name}">${name}</button>
  `).join('');

  const mainAccounts = state.accounts.filter(name => ['карта', 'наличка', 'крипта', 'другое'].includes(name));
  els.accountSelectChips.innerHTML = mainAccounts.map(name => `
    <button class="chip ${state.draft.account === name ? 'active' : ''}" type="button" data-account="${name}">${name}</button>
  `).join('');
}

function setStep(step) {
  state.step = Math.min(3, Math.max(1, step));
  document.querySelectorAll('.form-step').forEach(el => el.classList.toggle('active', Number(el.dataset.step) === state.step));
  document.querySelectorAll('[data-step-indicator]').forEach(el => {
    const n = Number(el.dataset.stepIndicator);
    el.classList.toggle('active', n === state.step);
    el.classList.toggle('done', n < state.step);
  });
  if (state.step === 1) setTimeout(() => els.amountInput.focus(), 80);
}

function setTab(tabId) {
  els.tabPages.forEach(page => page.classList.toggle('active', page.id === tabId));
  els.tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
}

function resetQuickForm() {
  state.draft.amount = '';
  state.draft.category = state.expenseCategories[0] || 'еда';
  state.draft.account = state.accounts.includes('карта') ? 'карта' : (state.accounts[0] || 'карта');
  state.draft.date = today();
  els.amountInput.value = '';
  els.dateInput.value = state.draft.date;
  renderChips();
  setStep(1);
}

function validateStep() {
  if (state.step === 1) {
    const amount = Number(String(els.amountInput.value).replace(',', '.'));
    if (!amount || amount <= 0) {
      setStatus('введи сумму');
      return false;
    }
    state.draft.amount = amount;
  }
  if (state.step === 2 && !state.draft.category) {
    setStatus('выбери категорию');
    return false;
  }
  return true;
}

async function bootstrap() {
  setStatus('синхронизация...');
  const data = await api('bootstrap');
  state.operations = data.operations || [];
  state.monthlyLimit = data.settings?.monthlyLimit || state.monthlyLimit;
  state.expenseCategories = data.settings?.expenseCategories?.length ? data.settings.expenseCategories : state.expenseCategories;
  state.incomeCategories = data.settings?.incomeCategories?.length ? data.settings.incomeCategories : state.incomeCategories;
  state.accounts = data.settings?.accounts?.length ? data.settings.accounts : state.accounts;
  resetQuickForm();
  render();
  setStatus('синхронизировано');
}

els.quickForm.addEventListener('click', (event) => {
  const categoryButton = event.target.closest('[data-category]');
  if (categoryButton) {
    state.draft.category = categoryButton.dataset.category;
    renderChips();
    return;
  }

  const accountButton = event.target.closest('[data-account]');
  if (accountButton) {
    state.draft.account = accountButton.dataset.account;
    renderChips();
    return;
  }

  if (event.target.closest('[data-next]')) {
    if (validateStep()) setStep(state.step + 1);
  }

  if (event.target.closest('[data-prev]')) {
    setStep(state.step - 1);
  }
});

els.quickForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!validateStep()) return;

  const operation = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date: els.dateInput.value || today(),
    type: 'expense',
    amount: Number(String(state.draft.amount).replace(',', '.')),
    category: state.draft.category,
    account: state.draft.account,
    comment: '',
    createdAt: new Date().toISOString()
  };

  state.operations.push(operation);
  render();
  resetQuickForm();
  setStatus('сохраняю...');

  try {
    await api('addOperation', operation);
    setStatus('сохранено');
  } catch (err) {
    setStatus('ошибка: ' + err.message);
  }
});

els.amountInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (validateStep()) setStep(2);
  }
});
els.dateInput.value = today();
els.dateInput.addEventListener('change', () => state.draft.date = els.dateInput.value || today());
els.syncButton.addEventListener('click', () => bootstrap().catch(err => setStatus('ошибка: ' + err.message)));
els.tabButtons.forEach(button => button.addEventListener('click', () => setTab(button.dataset.tab)));

renderChips();
setStep(1);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

bootstrap().catch(err => setStatus('ошибка: ' + err.message));

const APPS_SCRIPT_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';
const API_TOKEN = 'https://script.google.com/macros/s/AKfycbzinZUX7K1sIveAC3-l-jUEAgBlgEUMT98UOe8D_c8wV0hUMsg8eB8AcZR6jHBtmXjb/exec';

const state = {
  operations: [],
  accounts: ['карта', 'наличка', 'крипта', 'другое'],
  expenseCategories: ['еда','доставка','продукты','транспорт','подписки','здоровье','спорт','одежда','развлечения','работа/бизнес','дом','другое'],
  incomeCategories: ['зарплата','проект','возврат','подарок','крипта','другое'],
  monthlyLimit: 100000,
  type: 'expense'
};

const els = {
  status: document.querySelector('#status'),
  total: document.querySelector('#total'),
  monthIncome: document.querySelector('#monthIncome'),
  monthExpense: document.querySelector('#monthExpense'),
  monthDiff: document.querySelector('#monthDiff'),
  accounts: document.querySelector('#accounts'),
  history: document.querySelector('#history'),
  category: document.querySelector('#category'),
  account: document.querySelector('#account'),
  form: document.querySelector('#operationForm'),
  typeButtons: document.querySelectorAll('[data-type]'),
  syncButton: document.querySelector('#syncButton')
};

function money(value) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameMonth(dateString) {
  const d = new Date(dateString);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

function api(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('PASTE_')) {
      reject(new Error('Сначала вставь ссылку Google Apps Script в app.js'));
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
      data && data.ok ? resolve(data) : reject(new Error(data && data.error ? data.error : 'Ошибка API'));
    };
    script.onerror = () => {
      delete window[callback];
      script.remove();
      reject(new Error('Не удалось подключиться к Google Apps Script'));
    };
    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function setStatus(text) {
  els.status.textContent = text;
}

function setType(type) {
  state.type = type;
  els.typeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.type === type));
  fillSelect(els.category, type === 'income' ? state.incomeCategories : state.expenseCategories);
}

function fillSelect(select, items) {
  select.innerHTML = '';
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
}

function calculateAccounts() {
  const result = Object.fromEntries(state.accounts.map(name => [name, 0]));
  state.operations.forEach(op => {
    if (!result.hasOwnProperty(op.account)) result[op.account] = 0;
    result[op.account] += op.type === 'income' ? op.amount : -op.amount;
  });
  return result;
}

function render() {
  const accounts = calculateAccounts();
  const total = Object.values(accounts).reduce((sum, value) => sum + value, 0);
  const monthOps = state.operations.filter(op => sameMonth(op.date));
  const monthIncome = monthOps.filter(op => op.type === 'income').reduce((sum, op) => sum + op.amount, 0);
  const monthExpense = monthOps.filter(op => op.type === 'expense').reduce((sum, op) => sum + op.amount, 0);

  els.total.textContent = money(total);
  els.monthIncome.textContent = money(monthIncome);
  els.monthExpense.textContent = money(monthExpense);
  els.monthDiff.textContent = money(monthIncome - monthExpense);

  els.accounts.innerHTML = Object.entries(accounts).map(([name, value]) => `
    <div class="account-card">
      <span>${name}</span>
      <strong>${money(value)}</strong>
    </div>
  `).join('');

  const sorted = [...state.operations].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));
  els.history.innerHTML = sorted.slice(0, 80).map(op => `
    <div class="operation">
      <div>
        <b>${op.type === 'income' ? '+' : '-'}${money(op.amount)}</b>
        <span>${op.category} · ${op.account}</span>
        ${op.comment ? `<em>${op.comment}</em>` : ''}
      </div>
      <time>${op.date}</time>
    </div>
  `).join('') || '<div class="empty">Пока операций нет</div>';
}

async function bootstrap() {
  setStatus('синхронизация...');
  const data = await api('bootstrap');
  state.operations = data.operations || [];
  state.monthlyLimit = data.settings?.monthlyLimit || state.monthlyLimit;
  state.expenseCategories = data.settings?.expenseCategories?.length ? data.settings.expenseCategories : state.expenseCategories;
  state.incomeCategories = data.settings?.incomeCategories?.length ? data.settings.incomeCategories : state.incomeCategories;
  state.accounts = data.settings?.accounts?.length ? data.settings.accounts : state.accounts;
  fillSelect(els.account, state.accounts);
  setType(state.type);
  render();
  setStatus('синхронизировано');
}

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(els.form);
  const amount = Number(String(form.get('amount')).replace(',', '.'));
  if (!amount || amount <= 0) return;

  const operation = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date: form.get('date') || today(),
    type: state.type,
    amount,
    category: form.get('category'),
    account: form.get('account'),
    comment: form.get('comment') || '',
    createdAt: new Date().toISOString()
  };

  state.operations.push(operation);
  render();
  els.form.reset();
  els.form.elements.date.value = today();
  setStatus('сохраняю...');

  try {
    await api('addOperation', operation);
    setStatus('сохранено');
  } catch (err) {
    setStatus('ошибка: ' + err.message);
  }
});

els.typeButtons.forEach(button => button.addEventListener('click', () => setType(button.dataset.type)));
els.syncButton.addEventListener('click', bootstrap);
els.form.elements.date.value = today();
fillSelect(els.account, state.accounts);
setType('expense');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

bootstrap().catch(err => setStatus('ошибка: ' + err.message));

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzinZUX7K1sIveAC3-l-jUEAgBlgEUMT98UOe8D_c8wV0hUMsg8eB8AcZR6jHBtmXjb/exec';
const API_TOKEN = '673-ov1P8j9pRWAKzEEEEdyEC5MunZSr';

const state = {
  operations: [],
  selectedMonth: new Date(),
  expenseStep: 1,
  incomeStep: 1,
  analyticsType: 'expense',
  historyAccount: 'all',
  historyCategory: 'all',
  expense: { type: 'expense', amount: '', category: 'продукты', account: 'карта', date: '', comment: '' },
  income: { type: 'income', amount: '', category: 'зп nonteam', account: 'карта', date: '', comment: '' },
};

const expenseCategories = [
  ['продукты', '🛒'], ['транспорт', '🚗'], ['еда вне дома', '🍔'], ['курение', '🚬'], ['здоровье', '💊'],
  ['спорт', '🏋️'], ['одежда', '👕'], ['подписки', '📺'], ['развлечения', '🎮'],
  ['дом', '🏠'], ['кредиты', '🏦'], ['бизнес', '💼'], ['долг', '💸'], ['другое', '•••'],
];
const incomeCategories = [
  ['зп nonteam', '💼'], ['фриланс', '⚡'], ['подарки', '🎁'], ['прочее', '•••'],
];
const accounts = [['карта', '💳'], ['наличка', '💵'], ['крипта', '🟡₿'], ['другое', '•••']];
const colors = ['#3B5BFF', '#22C7A9', '#F59E0B', '#EF476F', '#8B5CF6', '#14B8A6', '#94A3B8', '#60A5FA', '#111827', '#6C8CFF'];
const monthNames = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

const $ = (id) => document.getElementById(id);

function formatMoney(value) {
  const n = Number(value || 0);
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} ₽`;
}
function parseAmount(value) {
  return Number(String(value).replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
}
function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}
function parseDateSafe(raw) {
  if (!raw) return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;

  const value = String(raw).trim();
  if (!value) return null;

  // Google Sheets / ISO: 2026-05-02 or 2026-05-02T16:42:00.000Z
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  // Russian/manual format: 02.05.2026
  const ruMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (ruMatch) {
    const [, d, m, y] = ruMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
function dateKey(op) {
  const date = parseDateSafe(op.date) || parseDateSafe(op.createdAt) || parseDateSafe(op.timestamp);
  if (!date) return '';
  const tz = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 10);
}
function operationDate(op) {
  return parseDateSafe(op.date) || parseDateSafe(op.createdAt) || parseDateSafe(op.timestamp) || new Date(0);
}
function isSameMonth(date, base) {
  if (!date || Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === base.getFullYear() && date.getMonth() === base.getMonth();
}
function normalizeOperation(raw) {
  return {
    id: raw.id || raw.createdAt || crypto.randomUUID?.() || String(Math.random()),
    date: raw.date || raw.createdAt || raw.timestamp || todayISO(),
    type: raw.type || (Number(raw.amount) < 0 ? 'expense' : 'income'),
    amount: Math.abs(Number(raw.amount || 0)),
    category: raw.category || 'другое',
    account: raw.account || 'карта',
    comment: raw.comment || '',
    createdAt: raw.createdAt || raw.date || new Date().toISOString(),
  };
}

function api(action, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('PASTE')) {
      reject(new Error('Не вставлена ссылка Apps Script'));
      return;
    }

    const callbackName = 'jsonp_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    const cleanup = (script) => {
      delete window[callbackName];
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };

    window[callbackName] = (data) => {
      cleanup(script);

      if (data.status === 'success') return resolve(data);
      if (data.ok === false || data.status === 'error') {
        return reject(new Error(data.error || data.message || 'Ошибка API'));
      }
      resolve(data);
    };

    const params = new URLSearchParams({
      callback: callbackName,
      token: API_TOKEN,
      action,
      payload: JSON.stringify(payload),
    });

    const script = document.createElement('script');
    script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
    script.onerror = () => {
      cleanup(script);
      reject(new Error('Не удалось подключиться к Google Apps Script'));
    };

    document.body.appendChild(script);
  });
}

async function loadData() {
  $('status').textContent = 'загрузка...';
  try {
    const data = await api('bootstrap');
    const rows = data.operations || data.rows || data.data || [];
    state.operations = rows.map(normalizeOperation);
    $('status').textContent = 'синхронизировано';
  } catch (err) {
    $('status').textContent = `ошибка: ${err.message}`;
  }
  renderAll();
}

async function saveOperation(op) {
  const payload = { operation: op, ...op };
  await api('addOperation', payload);
  state.operations.unshift(normalizeOperation(op));
  renderAll();
}

function renderAccounts() {
  const balance = { карта: 0, наличка: 0, крипта: 0, другое: 0 };
  state.operations.forEach(op => {
    const key = op.account || 'другое';
    if (!(key in balance)) balance[key] = 0;

    if (op.type === 'income' || op.type === 'initial') {
      balance[key] += Number(op.amount);
    } else if (op.type === 'expense') {
      balance[key] -= Number(op.amount);
    }
  });
  const total = Object.values(balance).reduce((a, b) => a + b, 0);
  const today = todayISO();
  const todaySpent = state.operations
    .filter(op => op.type === 'expense' && dateKey(op) === today)
    .reduce((sum, op) => sum + Number(op.amount || 0), 0);

  $('total').textContent = formatMoney(total);
  if ($('todaySpent')) $('todaySpent').textContent = formatMoney(todaySpent);
  $('accountInline').innerHTML = ['карта', 'наличка', 'крипта'].map(name => `
    <div class="account-pill"><span>${name}</span><strong>${formatMoney(balance[name] || 0)}</strong></div>
  `).join('');
}

function renderChips(containerId, items, active, onClick) {
  const container = $(containerId);
  container.innerHTML = items.map(([name, icon]) => `
    <button type="button" class="chip ${name === active ? 'active' : ''}" data-value="${name}">
      <span class="ico">${icon}</span><span>${name}</span>
    </button>
  `).join('');
  container.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => onClick(btn.dataset.value)));
}

function setExpenseStep(step) {
  state.expenseStep = Math.max(1, Math.min(3, step));
  document.querySelectorAll('.flow-step').forEach(el => el.classList.toggle('active', Number(el.dataset.step) === state.expenseStep));
  document.querySelectorAll('[data-step-dot]').forEach(el => el.classList.toggle('active', Number(el.dataset.stepDot) === state.expenseStep));
}
function setIncomeStep(step) {
  state.incomeStep = Math.max(1, Math.min(3, step));
  document.querySelectorAll('.income-flow-step').forEach(el => el.classList.toggle('active', Number(el.dataset.incomeStep) === state.incomeStep));
  document.querySelectorAll('[data-income-step-dot]').forEach(el => el.classList.toggle('active', Number(el.dataset.incomeStepDot) === state.incomeStep));
}
function renderForms() {
  renderChips('expenseCategories', expenseCategories, state.expense.category, value => { state.expense.category = value; renderForms(); });
  renderChips('expenseAccounts', accounts, state.expense.account, value => { state.expense.account = value; renderForms(); });
  renderChips('incomeCategories', incomeCategories, state.income.category, value => { state.income.category = value; renderForms(); });
  renderChips('incomeAccounts', accounts, state.income.account, value => { state.income.account = value; renderForms(); });
}

function monthOps(offset = 0) {
  const base = new Date(state.selectedMonth);
  base.setMonth(base.getMonth() + offset);
  return state.operations.filter(op => isSameMonth(operationDate(op), base));
}
function sumByType(ops, type) { return ops.filter(op => op.type === type).reduce((s, op) => s + Number(op.amount || 0), 0); }
function groupByCategory(ops, type) {
  const map = new Map();
  ops.filter(op => op.type === type).forEach(op => map.set(op.category, (map.get(op.category) || 0) + Number(op.amount || 0)));
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
}
function renderAnalytics() {
  const ops = monthOps(0);
  const income = sumByType(ops, 'income');
  const expense = sumByType(ops, 'expense');
  const activeType = state.analyticsType || 'expense';
  const currentTotal = activeType === 'income' ? income : expense;

  $('activeMonthLabel').textContent = `${monthNames[state.selectedMonth.getMonth()]} ${state.selectedMonth.getFullYear()}`;
  $('analyticsIncome').textContent = formatMoney(income);
  $('analyticsExpense').textContent = formatMoney(expense);

  document.querySelectorAll('[data-analytics-type]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.analyticsType === activeType);
  });

  const grouped = groupByCategory(ops, activeType);
  $('categoryChartTitle').textContent = activeType === 'income' ? 'доходы по категориям' : 'расходы по категориям';
  renderDonut('categoryChart', 'categoryLegend', grouped, currentTotal);
}
function renderDonut(canvasId, legendId, data, total) {
  const canvas = $(canvasId);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const legend = $(legendId);
  if (!total || data.length === 0) {
    legend.innerHTML = '<div class="empty-state">пока мало данных</div>';
    ctx.beginPath(); ctx.arc(120, 120, 82, 0, Math.PI * 2); ctx.strokeStyle = '#E6EAF2'; ctx.lineWidth = 34; ctx.stroke();
    ctx.fillStyle = '#7A8497'; ctx.font = '700 15px -apple-system, BlinkMacSystemFont, Segoe UI'; ctx.textAlign = 'center'; ctx.fillText('нет данных', 120, 125);
    return;
  }
  let start = -Math.PI / 2;
  data.forEach(item => {
    const angle = (item.value / total) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(120, 120, 82, start, start + angle); ctx.strokeStyle = item.color; ctx.lineWidth = 34; ctx.lineCap = 'butt'; ctx.stroke();
    if (angle > 0.38) {
      const mid = start + angle / 2;
      const x = 120 + Math.cos(mid) * 82;
      const y = 120 + Math.sin(mid) * 82;
      ctx.fillStyle = '#fff'; ctx.font = '800 13px -apple-system, BlinkMacSystemFont, Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(item.value / total * 100)}%`, x, y);
    }
    start += angle;
  });
  ctx.beginPath(); ctx.arc(120, 120, 52, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.fillStyle = '#0F172A'; ctx.font = '850 20px -apple-system, BlinkMacSystemFont, Segoe UI'; ctx.textAlign = 'center'; ctx.fillText(formatMoney(total), 120, 116);
  ctx.fillStyle = '#7A8497'; ctx.font = '700 12px -apple-system, BlinkMacSystemFont, Segoe UI'; ctx.fillText('всего', 120, 136);
  legend.innerHTML = data.map(item => `
    <div class="legend-row">
      <div class="legend-left"><i class="legend-dot" style="background:${item.color}"></i><span class="legend-name">${item.name}</span></div>
      <div class="legend-values"><strong>${formatMoney(item.value)}</strong><span class="legend-percent">${Math.round(item.value / total * 100)}%</span></div>
    </div>
  `).join('');
}

function renderHistoryFilters() {
  const select = $('historyCategoryFilter');
  if (!select) return;
  const categories = [...new Set(state.operations.map(op => op.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  const current = state.historyCategory || 'all';
  select.innerHTML = '<option value="all">все категории</option>' + categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  select.value = categories.includes(current) ? current : 'all';
  state.historyCategory = select.value;
}

function renderHistory() {
  renderHistoryFilters();
  const list = $('historyList');
  let rows = [...state.operations]
    .filter(op => op.type !== 'initial')
    .filter(op => state.historyAccount === 'all' || op.account === state.historyAccount)
    .filter(op => state.historyCategory === 'all' || op.category === state.historyCategory)
    .sort((a, b) => operationDate(b) - operationDate(a))
    .slice(0, 90);

  if (!rows.length) { list.innerHTML = '<div class="empty-state">история пока пустая</div>'; return; }

  const groups = new Map();
  rows.forEach(op => {
    const key = dateKey(op) || 'no-date';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(op);
  });

  list.innerHTML = [...groups.entries()].map(([dateKeyValue, items]) => {
    const date = parseDateSafe(dateKeyValue);
    const title = date ? date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'без даты';
    const expenseTotal = items.filter(op => op.type === 'expense').reduce((s, op) => s + Number(op.amount || 0), 0);
    const incomeTotal = items.filter(op => op.type === 'income').reduce((s, op) => s + Number(op.amount || 0), 0);
    const subtitle = [
      expenseTotal ? `расходы ${formatMoney(expenseTotal)}` : '',
      incomeTotal ? `доходы ${formatMoney(incomeTotal)}` : ''
    ].filter(Boolean).join(' · ');

    const rowsHtml = items.map(op => {
      const icon = [...expenseCategories, ...incomeCategories].find(([name]) => name === op.category)?.[1] || '•';
      const sign = op.type === 'income' ? '+' : '-';
      return `<div class="history-item">
        <div class="history-title"><strong>${icon} ${op.category}</strong><span class="history-meta">${op.account}${op.comment ? ' · ' + op.comment : ''}</span></div>
        <strong class="history-amount ${op.type}">${sign}${formatMoney(op.amount)}</strong>
      </div>`;
    }).join('');

    return `<section class="history-day">
      <div class="history-day-head"><strong>${title}</strong><span>${subtitle || 'нет операций'}</span></div>
      ${rowsHtml}
    </section>`;
  }).join('');
}
function renderAll() { renderAccounts(); renderForms(); renderAnalytics(); renderHistory(); }

function showToast(message) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2000);
}

function bindEvents() {
  $('syncButton').addEventListener('click', loadData);
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(`screen-${btn.dataset.screen}`).classList.add('active');
  }));
  document.querySelectorAll('[data-next="expense"]').forEach(btn => btn.addEventListener('click', () => {
    if (state.expenseStep === 1 && !parseAmount($('expenseAmount').value)) return;
    setExpenseStep(state.expenseStep + 1);
  }));
  document.querySelectorAll('[data-back="expense"]').forEach(btn => btn.addEventListener('click', () => setExpenseStep(state.expenseStep - 1)));
  document.querySelectorAll('[data-next="income"]').forEach(btn => btn.addEventListener('click', () => {
    if (state.incomeStep === 1 && !parseAmount($('incomeAmount').value)) return;
    setIncomeStep(state.incomeStep + 1);
  }));
  document.querySelectorAll('[data-back="income"]').forEach(btn => btn.addEventListener('click', () => setIncomeStep(state.incomeStep - 1)));
  $('prevMonth').addEventListener('click', () => { state.selectedMonth.setMonth(state.selectedMonth.getMonth() - 1); renderAnalytics(); });
  $('nextMonth').addEventListener('click', () => { state.selectedMonth.setMonth(state.selectedMonth.getMonth() + 1); renderAnalytics(); });
  document.querySelectorAll('[data-analytics-type]').forEach(btn => btn.addEventListener('click', () => {
    state.analyticsType = btn.dataset.analyticsType;
    renderAnalytics();
  }));
  if ($('historyAccountFilter')) $('historyAccountFilter').addEventListener('change', e => {
    state.historyAccount = e.target.value;
    renderHistory();
  });
  if ($('historyCategoryFilter')) $('historyCategoryFilter').addEventListener('change', e => {
    state.historyCategory = e.target.value;
    renderHistory();
  });

  $('expenseForm').addEventListener('submit', async e => {
    e.preventDefault();
    const op = { type: 'expense', amount: parseAmount($('expenseAmount').value), category: state.expense.category, account: state.expense.account, date: $('expenseDate').value || todayISO(), comment: $('expenseComment').value.trim(), createdAt: new Date().toISOString() };
    if (!op.amount) return;
    await saveOperation(op);
    showToast('трата добавлена');
    $('expenseAmount').value = ''; $('expenseComment').value = ''; $('expenseDate').value = todayISO(); setExpenseStep(1);
  });
  $('incomeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const op = { type: 'income', amount: parseAmount($('incomeAmount').value), category: state.income.category, account: state.income.account, date: $('incomeDate').value || todayISO(), comment: $('incomeComment').value.trim(), createdAt: new Date().toISOString() };
    if (!op.amount) return;
    await saveOperation(op);
    showToast('доход добавлен');
    $('incomeAmount').value = ''; $('incomeComment').value = ''; $('incomeDate').value = todayISO(); setIncomeStep(1);
  });
}

function init() {
  $('expenseDate').value = todayISO();
  $('incomeDate').value = todayISO();
  bindEvents();
  renderAll();
  loadData();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
init();

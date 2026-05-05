const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzinZUX7K1sIveAC3-l-jUEAgBlgEUMT98UOe8D_c8wV0hUMsg8eB8AcZR6jHBtmXjb/exec';
const API_TOKEN = '673-ov1P8j9pRWAKzEEEEdyEC5MunZSr';

const state = {
  operations: [],
  goals: [],
  customCategories: { expense: [], income: [] },
  categoryModalType: null,
  goalActionMenuId: null,
  selectedMonth: new Date(),
  expenseStep: 1,
  incomeStep: 1,
  analyticsType: 'expense',
  historyAccount: 'all',
  historyCategory: 'all',
  historyExpanded: false,
  historyDateFrom: '',
  historyDateTo: '',
  calendarView: new Date(),
  expense: { type: 'expense', amount: '', category: 'продукты', account: 'карта', date: '', comment: '' },
  income: { type: 'income', amount: '', category: 'зп nonteam', account: 'карта', date: '', comment: '' },
};

const baseExpenseCategories = [
  ['продукты', 'food'], ['транспорт', 'transport'], ['еда вне дома', 'restaurant'], ['курение', 'smoking'], ['здоровье', 'health'],
  ['спорт', 'sport'], ['одежда', 'clothes'], ['подписки', 'subscriptions'], ['развлечения', 'entertainment'],
  ['дом', 'home'], ['аренда квартиры', 'home'], ['оплаты за сдачу жилья', 'home'],
  ['кредиты', 'credit'], ['бизнес', 'business'], ['долг', 'debt'], ['другое', 'other'],
];
const baseIncomeCategories = [
  ['зп nonteam', 'business'], ['фриланс', 'business'], ['сдача жилья', 'home'], ['подарки', 'other'], ['прочее', 'other'],
];
const accounts = [['карта', '💳'], ['наличка', '💵'], ['крипта', '🟡₿'], ['другое', '•••']];
const colors = ['#3B5BFF', '#22C7A9', '#F59E0B', '#EF476F', '#8B5CF6', '#14B8A6', '#94A3B8', '#60A5FA', '#111827', '#6C8CFF'];
const monthNames = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const categoryIconOptions = [
  ['other', 'другое'],
  ['home', 'дом'],
  ['business', 'бизнес'],
  ['food', 'продукты'],
  ['restaurant', 'еда'],
  ['transport', 'транспорт'],
  ['health', 'здоровье'],
  ['sport', 'спорт'],
  ['clothes', 'одежда'],
  ['subscriptions', 'подписки'],
  ['entertainment', 'развлечения'],
  ['credit', 'кредиты'],
  ['debt', 'долг'],
  ['smoking', 'курение'],
];


function normalizeCategory(raw, fallbackType = 'expense') {
  if (Array.isArray(raw)) {
    return { type: fallbackType, name: String(raw[0] || '').trim(), icon: raw[1] || 'other' };
  }
  return {
    type: raw.type === 'income' ? 'income' : 'expense',
    name: String(raw.name || '').trim().toLowerCase(),
    icon: raw.icon || 'other',
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

function uniqueCategories(categories) {
  const map = new Map();
  categories.map(item => normalizeCategory(item)).filter(item => item.name).forEach(item => {
    map.set(item.name, item);
  });
  return [...map.values()];
}


function categoriesToArray(source) {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== 'object') return [];

  const expense = Array.isArray(source.expense)
    ? source.expense.map(item => ({ ...normalizeCategory(item, 'expense'), type: 'expense' }))
    : [];

  const income = Array.isArray(source.income)
    ? source.income.map(item => ({ ...normalizeCategory(item, 'income'), type: 'income' }))
    : [];

  return [...expense, ...income];
}

function categoryItems(type) {
  const base = type === 'income' ? baseIncomeCategories : baseExpenseCategories;
  const custom = state.customCategories[type] || [];
  const merged = uniqueCategories([
    ...base.map(([name, icon]) => ({ type, name, icon })),
    ...custom.map(item => ({ ...item, type })),
  ]);
  return merged.map(item => [item.name, item.icon || 'other']);
}

function allCategoryItems() {
  return [...categoryItems('expense'), ...categoryItems('income')];
}

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

function operationCreatedTime(op) {
  const values = [op.createdAt, op.timestamp];

  for (const value of values) {
    if (!value) continue;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();

    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  }

  return operationDate(op).getTime();
}

function compareOperationsNewestFirst(a, b) {
  const dateDiff = operationDate(b).getTime() - operationDate(a).getTime();
  if (dateDiff !== 0) return dateDiff;

  return operationCreatedTime(b) - operationCreatedTime(a);
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeGoal(raw) {
  return {
    id: raw.id || crypto.randomUUID?.() || String(Math.random()),
    name: raw.name || 'цель',
    target: Math.max(0, Number(raw.target || 0)),
    current: Math.max(0, Number(raw.current || 0)),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
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
    state.goals = (data.goals || []).map(normalizeGoal);
    const categories = categoriesToArray(data.categories || data.customCategories || []);
    state.customCategories.expense = uniqueCategories(
      categories.filter(item => normalizeCategory(item, 'expense').type === 'expense')
    );
    state.customCategories.income = uniqueCategories(
      categories.filter(item => normalizeCategory(item, 'income').type === 'income')
    );
    $('status').textContent = 'синхронизировано';
  } catch (err) {
    $('status').textContent = `ошибка: ${err.message}`;
  }
  renderAll();
}

async function saveOperation(op) {
  const optimistic = normalizeOperation({
    ...op,
    id: op.id || `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: op.createdAt || new Date().toISOString(),
  });

  state.operations.unshift(optimistic);
  renderAll();
  triggerBalanceFlash();

  try {
    const payload = { operation: optimistic, ...optimistic };
    const response = await api('addOperation', payload);
    const saved = normalizeOperation(response.operation || optimistic);
    const index = state.operations.findIndex(item => String(item.id) === String(optimistic.id));
    if (index !== -1) state.operations[index] = saved;
    renderAll();
    return saved;
  } catch (err) {
    state.operations = state.operations.filter(item => String(item.id) !== String(optimistic.id));
    renderAll();
    throw err;
  }
}

async function saveGoal(goal) {
  const optimistic = normalizeGoal({
    ...goal,
    id: goal.id || `tmp-goal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: goal.createdAt || new Date().toISOString(),
    updatedAt: goal.updatedAt || new Date().toISOString(),
  });

  state.goals.unshift(optimistic);
  renderAll();

  try {
    const response = await api('addGoal', optimistic);
    const saved = normalizeGoal(response.goal || optimistic);
    const index = state.goals.findIndex(item => String(item.id) === String(optimistic.id));
    if (index !== -1) state.goals[index] = saved;
    renderAll();
    return saved;
  } catch (err) {
    state.goals = state.goals.filter(item => String(item.id) !== String(optimistic.id));
    renderAll();
    throw err;
  }
}


async function saveCategory(type, name, icon = 'other') {
  const normalized = normalizeCategory({
    type,
    name,
    icon,
    createdAt: new Date().toISOString(),
  }, type);
  if (!normalized.name) return;

  const exists = categoryItems(type).some(([categoryName]) => categoryName === normalized.name);
  if (exists) {
    showToast('такая категория уже есть');
    return;
  }

  await api('addCategory', normalized);
  state.customCategories[type].push(normalized);

  if (type === 'expense') state.expense.category = normalized.name;
  if (type === 'income') state.income.category = normalized.name;

  renderForms();
  showToast('категория добавлена');
  haptic(10);
}

async function addGoalProgress(id, amount) {
  const value = parseAmount(amount);
  if (!id || !value) return;
  await api('addGoalProgress', { id, amount: value, updatedAt: new Date().toISOString() });
  const goal = state.goals.find(item => String(item.id) === String(id));
  if (goal) {
    goal.current = Math.max(0, Number(goal.current || 0) + value);
    goal.updatedAt = new Date().toISOString();
  }
  renderAll();
}

async function updateGoal(id, updates) {
  const goal = state.goals.find(item => String(item.id) === String(id));
  if (!goal) throw new Error('goal_not_found');

  const nextGoal = normalizeGoal({ ...goal, ...updates, id, updatedAt: new Date().toISOString() });
  await api('updateGoal', nextGoal);

  Object.assign(goal, nextGoal);
  renderAll();
}

async function deleteGoal(id) {
  if (!id) return;
  await api('deleteGoal', { id });
  state.goals = state.goals.filter(item => String(item.id) !== String(id));
  renderAll();
}


function animateValue(el, start, end, duration = 420) {
  if (!el) return;
  const from = Number(start || 0);
  const to = Number(end || 0);
  if (from === to) {
    el.textContent = formatMoney(to);
    return;
  }

  let startTime = null;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = easeOutCubic(progress);
    const value = from + (to - from) * eased;
    el.textContent = formatMoney(value);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function triggerBalanceFlash() {
  const card = document.querySelector('.balance-card');
  if (!card) return;
  card.classList.remove('flash');
  void card.offsetWidth;
  card.classList.add('flash');
  setTimeout(() => card.classList.remove('flash'), 340);
}

function haptic(ms = 10) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function accountShortName(name) {
  const labels = { карта: 'карта', наличка: 'нал.', крипта: 'крипта', другое: 'другое' };
  return labels[name] || name;
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

  const totalEl = $('total');
  const previousTotal = Number(totalEl?.dataset.value || 0);
  if (totalEl) {
    animateValue(totalEl, previousTotal, total);
    totalEl.dataset.value = String(total);
  }
  if ($('todaySpent')) $('todaySpent').textContent = formatMoney(todaySpent);
  $('accountInline').innerHTML = ['карта', 'наличка', 'крипта'].map(name => `
    <div class="account-pill"><span>${accountShortName(name)}</span><strong>${formatMoney(balance[name] || 0)}</strong></div>
  `).join('');
}

function iconMarkup(icon, className = '') {
  if (!icon) return '•';
  const aliases = {
    rent: 'home',
    'rent-payment': 'home',
    'rent-income': 'home',
    gift: 'other',
  };
  const safeIcon = aliases[String(icon)] || String(icon);
  if (safeIcon.length > 3) {
    return `<img class="${className}" src="./assets/categories/${safeIcon}.svg" alt="">`;
  }
  return safeIcon;
}


function renderChips(containerId, items, active, onClick, options = {}) {
  const container = $(containerId);
  const addButton = options.onAdd
    ? `<button type="button" class="chip add-category-chip ${state.categoryModalType === options.type ? 'active' : ''}" data-add-category="${options.type}">
        <span class="ico">+</span><span>добавить новую</span>
      </button>`
    : '';

  container.innerHTML = items.map(([name, icon]) => `
    <button type="button" class="chip ${name === active ? 'active' : ''}" data-value="${name}">
      <span class="ico">${iconMarkup(icon)}</span>
      <span>${name}</span>
    </button>
  `).join('') + addButton;

  container.querySelectorAll('.chip[data-value]').forEach(btn => {
    btn.addEventListener('click', () => {
      haptic(6);
      onClick(btn.dataset.value);
    });
  });

  const addCategoryButton = container.querySelector('[data-add-category]');
  if (addCategoryButton) {
    addCategoryButton.addEventListener('click', () => {
      haptic(6);
      const type = options.type;
      if (state.categoryModalType === type) {
        closeCategoryModal();
        return;
      }
      openCategoryModal(type);
    });
  }
}

function closeCategoryModal() {
  const existing = document.querySelector('.category-modal-backdrop');
  if (existing) existing.remove();
  state.categoryModalType = null;
  document.querySelectorAll('.add-category-chip').forEach(btn => btn.classList.remove('active'));
}

function openCategoryModal(type) {
  closeCategoryModal();
  state.categoryModalType = type;
  document.querySelectorAll(`[data-add-category="${type}"]`).forEach(btn => btn.classList.add('active'));

  const backdrop = document.createElement('div');
  backdrop.className = 'category-modal-backdrop';
  backdrop.innerHTML = `
    <form class="category-add-form category-add-modal" role="dialog" aria-modal="true">
      <div class="category-modal-head">
        <strong>новая категория</strong>
        <button class="category-modal-close" type="button" aria-label="Закрыть">×</button>
      </div>
      <input class="category-add-input" type="text" autocomplete="off" placeholder="название категории" />
      <div class="category-icon-picker" aria-label="Выбор иконки">
        ${categoryIconOptions.map(([icon, label], index) => `
          <button class="category-icon-option ${index === 0 ? 'active' : ''}" type="button" data-icon="${icon}" aria-label="${label}">
            ${iconMarkup(icon, 'category-icon-preview')}
          </button>
        `).join('')}
      </div>
      <div class="category-add-actions">
        <button class="category-add-cancel" type="button">отмена</button>
        <button class="category-add-save" type="submit">сохранить</button>
      </div>
    </form>
  `;

  document.body.appendChild(backdrop);

  const form = backdrop.querySelector('.category-add-form');
  const input = backdrop.querySelector('.category-add-input');
  const saveButton = backdrop.querySelector('.category-add-save');
  const cancelButton = backdrop.querySelector('.category-add-cancel');
  const closeButton = backdrop.querySelector('.category-modal-close');
  let selectedIcon = 'other';

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeCategoryModal();
  });

  closeButton.addEventListener('click', closeCategoryModal);
  cancelButton.addEventListener('click', closeCategoryModal);

  form.querySelectorAll('.category-icon-option').forEach(button => {
    button.addEventListener('click', () => {
      selectedIcon = button.dataset.icon || 'other';
      form.querySelectorAll('.category-icon-option').forEach(item => item.classList.toggle('active', item === button));
      haptic(6);
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = input.value.trim().toLowerCase();
    if (!name || saveButton.disabled) return;

    setButtonLoading(saveButton, true, 'сохраняю');
    try {
      await saveCategory(type, name, selectedIcon);
      closeCategoryModal();
    } catch (err) {
      showToast(`ошибка: ${err.message}`);
      setButtonLoading(saveButton, false);
    }
  });
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
function setActiveChip(containerId, value) {
  document.querySelectorAll(`#${containerId} .chip`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}

function renderForms() {
  renderChips('expenseCategories', categoryItems('expense'), state.expense.category, value => {
    state.expense.category = value;
    setActiveChip('expenseCategories', value);
  }, { type: 'expense', onAdd: true });
  renderChips('expenseAccounts', accounts, state.expense.account, value => {
    state.expense.account = value;
    setActiveChip('expenseAccounts', value);
  });
  renderChips('incomeCategories', categoryItems('income'), state.income.category, value => {
    state.income.category = value;
    setActiveChip('incomeCategories', value);
  }, { type: 'income', onAdd: true });
  renderChips('incomeAccounts', accounts, state.income.account, value => {
    state.income.account = value;
    setActiveChip('incomeAccounts', value);
  });
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
  const legend = $(legendId);
  if (!canvas || !legend) return;

  const size = 198;
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const radius = 67;
  const lineWidth = 24;
  const innerRadius = radius - lineWidth / 2 - 5;

  if (!total || data.length === 0) {
    legend.innerHTML = '<div class="empty-state">пока мало данных</div>';
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#E6EAF2';
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.fillStyle = '#7A8497';
    ctx.font = '800 14px -apple-system, BlinkMacSystemFont, Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('нет данных', center, center);
    return;
  }

  let start = -Math.PI / 2;
  data.forEach(item => {
    const angle = (item.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, start, start + angle);
    ctx.strokeStyle = item.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt';
    ctx.stroke();
    start += angle;
  });

  ctx.beginPath();
  ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.font = '850 18px -apple-system, BlinkMacSystemFont, Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatMoney(total), center, center - 6);
  ctx.fillStyle = '#7A8497';
  ctx.font = '800 11px -apple-system, BlinkMacSystemFont, Segoe UI';
  ctx.fillText('всего', center, center + 15);

  legend.innerHTML = data.map(item => `
    <div class="legend-row">
      <div class="legend-left"><i class="legend-dot" style="background:${item.color}"></i><span class="legend-name">${escapeHtml(item.name)}</span></div>
      <div class="legend-metrics"><strong>${formatMoney(item.value)}</strong><span class="legend-percent">${Math.round(item.value / total * 100)}%</span></div>
    </div>
  `).join('');
}

function animateAnalyticsSwitch() {
  const card = document.querySelector('.analytics-main-card');
  if (!card) return;
  card.classList.remove('analytics-switching');
  void card.offsetWidth;
  card.classList.add('analytics-switching');
  setTimeout(() => card.classList.remove('analytics-switching'), 360);
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


function renderGoals() {
  const list = $('goalsList');
  if (!list) return;

  const goals = [...state.goals].sort((a, b) => Number(b.current || 0) / Math.max(Number(b.target || 0), 1) - Number(a.current || 0) / Math.max(Number(a.target || 0), 1));
  if (!goals.length) {
    list.innerHTML = '<div class="empty-state goals-empty-state">целей пока нет</div>';
    return;
  }

  list.innerHTML = goals.map(goal => {
    const target = Math.max(Number(goal.target || 0), 0);
    const current = Math.max(Number(goal.current || 0), 0);
    const percent = target ? Math.min(100, Math.round(current / target * 100)) : 0;
    const safeId = escapeHtml(goal.id);
    const menuOpened = state.goalActionMenuId === String(goal.id);

    return `<article class="goal-card" data-goal-id="${safeId}">
      <div class="goal-card-top">
        <div>
          <strong>${escapeHtml(goal.name)}</strong>
          <span>${formatMoney(current)} / ${formatMoney(target)}</span>
        </div>
        <div class="goal-card-actions">
          <b>${percent}%</b>
          <button class="goal-menu-btn" type="button" data-goal-menu="${safeId}" aria-label="Действия с целью">•••</button>
          <div class="goal-menu ${menuOpened ? 'open' : ''}" data-goal-menu-panel="${safeId}">
            <button type="button" data-goal-action="edit" data-goal-id="${safeId}">редактировать</button>
            <button type="button" class="danger" data-goal-action="delete" data-goal-id="${safeId}">удалить</button>
          </div>
        </div>
      </div>
      <div class="goal-progress" aria-label="Прогресс цели"><i style="width:${percent}%"></i></div>
      <form class="goal-add-form" data-goal-id="${safeId}">
        <input class="text-input goal-add-input" inputmode="decimal" autocomplete="off" placeholder="сумма" />
        <button type="submit" class="secondary-btn">+ добавить</button>
      </form>
    </article>`;
  }).join('');

  list.querySelectorAll('.goal-menu-btn').forEach(button => {
    button.addEventListener('click', e => {
      e.stopPropagation();
      const id = String(button.dataset.goalMenu || '');
      state.goalActionMenuId = state.goalActionMenuId === id ? null : id;
      renderGoals();
      haptic(6);
    });
  });

  list.querySelectorAll('[data-goal-action]').forEach(button => {
    button.addEventListener('click', e => {
      e.stopPropagation();
      const id = button.dataset.goalId;
      const action = button.dataset.goalAction;
      const goal = state.goals.find(item => String(item.id) === String(id));
      state.goalActionMenuId = null;
      renderGoals();
      if (!goal) return;

      if (action === 'edit') openGoalEditModal(goal, 'edit');
      if (action === 'delete') openGoalDeleteModal(goal);
    });
  });

  list.querySelectorAll('.goal-add-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = form.querySelector('.goal-add-input');
      const amount = parseAmount(input.value);
      if (!amount) return;
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn?.disabled) return;
      setButtonLoading(submitBtn, true, 'добавляю');
      haptic(12);
      try {
        await addGoalProgress(form.dataset.goalId, amount);
        showToast('добавлено в цель');
        haptic(18);
      } catch (err) {
        showToast(`ошибка: ${err.message}`);
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  });
}

function closeGoalModal() {
  document.querySelector('.goal-modal-backdrop')?.remove();
}

function openGoalEditModal(goal) {
  closeGoalModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'goal-modal-backdrop';
  backdrop.innerHTML = `
    <form class="goal-modal" role="dialog" aria-modal="true">
      <div class="goal-modal-head">
        <strong>редактировать цель</strong>
        <button class="goal-modal-close" type="button" aria-label="Закрыть">×</button>
      </div>
      <label class="field-label">название</label>
      <input class="text-input goal-edit-name" type="text" value="${escapeHtml(goal.name)}" autocomplete="off" />
      <label class="field-label">цель</label>
      <input class="text-input goal-edit-target" inputmode="decimal" value="${Number(goal.target || 0)}" autocomplete="off" />
      <label class="field-label">накоплено сейчас</label>
      <input class="text-input goal-edit-current" inputmode="decimal" value="${Number(goal.current || 0)}" autocomplete="off" />
      <div class="goal-modal-actions">
        <button class="secondary-btn" type="button" data-goal-modal-cancel>отмена</button>
        <button class="primary-btn" type="submit">сохранить</button>
      </div>
    </form>
  `;

  document.body.appendChild(backdrop);

  const form = backdrop.querySelector('.goal-modal');
  const closeButton = backdrop.querySelector('.goal-modal-close');
  const cancelButton = backdrop.querySelector('[data-goal-modal-cancel]');
  const saveButton = form.querySelector('button[type="submit"]');

  setTimeout(() => form.querySelector('input')?.focus(), 60);

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeGoalModal();
  });
  closeButton.addEventListener('click', closeGoalModal);
  cancelButton.addEventListener('click', closeGoalModal);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (saveButton.disabled) return;

    const updates = {
      name: form.querySelector('.goal-edit-name')?.value.trim() || goal.name,
      target: parseAmount(form.querySelector('.goal-edit-target')?.value),
      current: parseAmount(form.querySelector('.goal-edit-current')?.value),
    };

    if (!updates.name || !updates.target) return;

    setButtonLoading(saveButton, true, 'сохраняю');
    try {
      await updateGoal(goal.id, updates);
      closeGoalModal();
      showToast('цель обновлена');
      haptic(18);
    } catch (err) {
      showToast(`ошибка: ${err.message}`);
      setButtonLoading(saveButton, false);
    }
  });
}

function openGoalDeleteModal(goal) {
  closeGoalModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'goal-modal-backdrop';
  backdrop.innerHTML = `
    <div class="goal-modal goal-delete-modal" role="dialog" aria-modal="true">
      <div class="goal-modal-head">
        <strong>удалить цель?</strong>
        <button class="goal-modal-close" type="button" aria-label="Закрыть">×</button>
      </div>
      <p>Цель «${escapeHtml(goal.name)}» удалится без восстановления</p>
      <div class="goal-modal-actions">
        <button class="secondary-btn" type="button" data-goal-modal-cancel>отмена</button>
        <button class="primary-btn danger-btn" type="button" data-goal-delete-confirm>удалить</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeButton = backdrop.querySelector('.goal-modal-close');
  const cancelButton = backdrop.querySelector('[data-goal-modal-cancel]');
  const deleteButton = backdrop.querySelector('[data-goal-delete-confirm]');

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeGoalModal();
  });
  closeButton.addEventListener('click', closeGoalModal);
  cancelButton.addEventListener('click', closeGoalModal);

  deleteButton.addEventListener('click', async () => {
    if (deleteButton.disabled) return;
    setButtonLoading(deleteButton, true, 'удаляю');
    try {
      await deleteGoal(goal.id);
      closeGoalModal();
      showToast('цель удалена');
      haptic(18);
    } catch (err) {
      showToast(`ошибка: ${err.message}`);
      setButtonLoading(deleteButton, false);
    }
  });
}

function hasHistoryDateFilter() {
  return Boolean(state.historyDateFrom || state.historyDateTo);
}

function isOperationInHistoryDateRange(op) {
  const key = dateKey(op);
  if (!key) return false;
  if (state.historyDateFrom && key < state.historyDateFrom) return false;
  if (state.historyDateTo && key > state.historyDateTo) return false;
  return true;
}

function historyDateLabel() {
  if (!hasHistoryDateFilter()) return '';
  const from = state.historyDateFrom;
  const to = state.historyDateTo;
  if (from && to && from === to) return formatShortDateLabel(from);
  if (from && to) return `${formatShortDateLabel(from)}–${formatShortDateLabel(to)}`;
  if (from) return `с ${formatShortDateLabel(from)}`;
  return `до ${formatShortDateLabel(to)}`;
}

function formatShortDateLabel(value) {
  const date = parseDateSafe(value);
  if (!date) return value;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
}

function formatFullDateLabel(value) {
  const date = parseDateSafe(value);
  if (!date) return 'выбрать дату';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function updateDateButtons() {
  const expenseButton = $('expenseDateButton');
  const incomeButton = $('incomeDateButton');
  if (expenseButton) expenseButton.textContent = formatFullDateLabel($('expenseDate')?.value || todayISO());
  if (incomeButton) incomeButton.textContent = formatFullDateLabel($('incomeDate')?.value || todayISO());
}

function isoFromDate(date) {
  const tz = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 10);
}

function monthTitle(date) {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function openSingleDatePicker({ title = 'выберите дату', initialValue = todayISO(), onSelect }) {
  const initialDate = parseDateSafe(initialValue) || new Date();
  openCalendarModal({
    mode: 'single',
    title,
    initialFrom: isoFromDate(initialDate),
    initialTo: isoFromDate(initialDate),
    onApply: ({ from }) => onSelect(from || todayISO()),
  });
}

function openHistoryDateModal() {
  openCalendarModal({
    mode: 'range',
    title: 'период истории',
    initialFrom: state.historyDateFrom,
    initialTo: state.historyDateTo,
    onApply: ({ from, to }) => {
      state.historyDateFrom = from || '';
      state.historyDateTo = to || '';
      if (state.historyDateFrom && state.historyDateTo && state.historyDateFrom > state.historyDateTo) {
        const tmp = state.historyDateFrom;
        state.historyDateFrom = state.historyDateTo;
        state.historyDateTo = tmp;
      }
      state.historyExpanded = true;
      renderHistory();
    },
    onClear: () => {
      state.historyDateFrom = '';
      state.historyDateTo = '';
      state.historyExpanded = false;
      renderHistory();
    }
  });
}

function openCalendarModal({ mode, title, initialFrom = '', initialTo = '', onApply, onClear }) {
  closeHistoryDateModal();
  const backdrop = document.createElement('div');
  backdrop.className = 'history-date-backdrop calendar-backdrop';

  let selectedFrom = initialFrom || '';
  let selectedTo = mode === 'range' ? (initialTo || '') : selectedFrom;
  let view = parseDateSafe(selectedFrom || selectedTo) || new Date();
  view = new Date(view.getFullYear(), view.getMonth(), 1);

  backdrop.innerHTML = `
    <div class="history-date-modal calendar-modal" role="dialog" aria-modal="true">
      <div class="history-date-head calendar-head">
        <strong>${escapeHtml(title)}</strong>
        <button class="history-date-close" type="button" aria-label="Закрыть">×</button>
      </div>
      <div class="calendar-topline">
        <button type="button" class="calendar-arrow" data-calendar-prev aria-label="Предыдущий месяц">‹</button>
        <strong data-calendar-title>${monthTitle(view)}</strong>
        <button type="button" class="calendar-arrow" data-calendar-next aria-label="Следующий месяц">›</button>
      </div>
      <div class="calendar-weekdays"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span></div>
      <div class="calendar-grid" data-calendar-grid></div>
      <div class="calendar-selected" data-calendar-selected></div>
      <div class="history-date-quick">
        <button type="button" data-history-date-today>сегодня</button>
        <button type="button" data-history-date-clear>сбросить</button>
      </div>
      <div class="history-date-actions">
        <button class="secondary-btn" type="button" data-history-date-cancel>отмена</button>
        <button class="primary-btn" type="button" data-calendar-apply>применить</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const grid = backdrop.querySelector('[data-calendar-grid]');
  const titleEl = backdrop.querySelector('[data-calendar-title]');
  const selectedEl = backdrop.querySelector('[data-calendar-selected]');

  function selectedLabel() {
    if (mode === 'single') return selectedFrom ? formatFullDateLabel(selectedFrom) : 'дата не выбрана';
    if (selectedFrom && selectedTo && selectedFrom !== selectedTo) return `${formatShortDateLabel(selectedFrom)} — ${formatShortDateLabel(selectedTo)}`;
    if (selectedFrom) return `с ${formatShortDateLabel(selectedFrom)}`;
    if (selectedTo) return `до ${formatShortDateLabel(selectedTo)}`;
    return 'период не выбран';
  }

  function renderCalendar() {
    titleEl.textContent = monthTitle(view);
    selectedEl.textContent = selectedLabel();
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const startOffset = (first.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push('<span class="calendar-day ghost"></span>');
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(view.getFullYear(), view.getMonth(), day);
      const iso = isoFromDate(d);
      const isSelected = iso === selectedFrom || iso === selectedTo;
      const inRange = mode === 'range' && selectedFrom && selectedTo && iso > selectedFrom && iso < selectedTo;
      const today = iso === todayISO();
      cells.push(`<button type="button" class="calendar-day ${isSelected ? 'selected' : ''} ${inRange ? 'in-range' : ''} ${today ? 'today' : ''}" data-date="${iso}">${day}</button>`);
    }
    grid.innerHTML = cells.join('');
    grid.querySelectorAll('[data-date]').forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.date;
      if (mode === 'single') {
        selectedFrom = value;
        selectedTo = value;
      } else if (!selectedFrom || (selectedFrom && selectedTo)) {
        selectedFrom = value;
        selectedTo = '';
      } else {
        selectedTo = value;
        if (selectedFrom > selectedTo) {
          const tmp = selectedFrom;
          selectedFrom = selectedTo;
          selectedTo = tmp;
        }
      }
      haptic(6);
      renderCalendar();
    }));
  }

  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeHistoryDateModal(); });
  backdrop.querySelector('.history-date-close').addEventListener('click', closeHistoryDateModal);
  backdrop.querySelector('[data-history-date-cancel]').addEventListener('click', closeHistoryDateModal);
  backdrop.querySelector('[data-calendar-prev]').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); renderCalendar(); haptic(4); });
  backdrop.querySelector('[data-calendar-next]').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); renderCalendar(); haptic(4); });
  backdrop.querySelector('[data-history-date-today]').addEventListener('click', () => {
    const today = todayISO();
    selectedFrom = today;
    selectedTo = mode === 'range' ? today : today;
    view = parseDateSafe(today) || new Date();
    view = new Date(view.getFullYear(), view.getMonth(), 1);
    renderCalendar();
    haptic(6);
  });
  backdrop.querySelector('[data-history-date-clear]').addEventListener('click', () => {
    selectedFrom = '';
    selectedTo = '';
    if (onClear) onClear();
    renderCalendar();
    haptic(6);
  });
  backdrop.querySelector('[data-calendar-apply]').addEventListener('click', () => {
    onApply({ from: selectedFrom, to: selectedTo || selectedFrom });
    closeHistoryDateModal();
    haptic(8);
  });

  renderCalendar();
}

function closeHistoryDateModal() {
  document.querySelector('.history-date-backdrop')?.remove();
}

function renderHistory() {
  renderHistoryFilters();
  const list = $('historyList');
  const toggle = $('historyShowAll');
  const dateButton = $('historyDateButton');
  if (dateButton) {
    dateButton.classList.toggle('active', hasHistoryDateFilter());
    dateButton.title = historyDateLabel() || 'фильтр по дате';
  }

  let allRows = [...state.operations]
    .filter(op => op.type !== 'initial')
    .filter(op => state.historyAccount === 'all' || op.account === state.historyAccount)
    .filter(op => state.historyCategory === 'all' || op.category === state.historyCategory)
    .filter(op => !hasHistoryDateFilter() || isOperationInHistoryDateRange(op))
    .sort(compareOperationsNewestFirst);

  const shouldLimitToLastDay = !state.historyExpanded && !hasHistoryDateFilter() && state.historyAccount === 'all' && state.historyCategory === 'all';
  const latestKey = allRows[0] ? dateKey(allRows[0]) : '';
  const latestRows = latestKey ? allRows.filter(op => dateKey(op) === latestKey) : [];
  const rows = shouldLimitToLastDay ? latestRows : allRows.slice(0, 160);

  if (toggle) {
    const canToggle = !hasHistoryDateFilter() && allRows.length > latestRows.length;
    toggle.hidden = !canToggle;
    toggle.textContent = state.historyExpanded ? 'показать последний день' : 'показать все';
  }

  if (!rows.length) {
    const message = hasHistoryDateFilter() ? 'за период операций нет' : 'история пока пустая';
    list.innerHTML = `<div class="empty-state">${message}</div>`;
    return;
  }

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
      const icon = allCategoryItems().find(([name]) => name === op.category)?.[1] || 'other';
      const sign = op.type === 'income' ? '+' : '-';
      return `<div class="history-item">
        <div class="history-title">
          <strong><span class="history-icon-wrap">${iconMarkup(icon, 'history-icon')}</span><span>${escapeHtml(op.category)}</span></strong>
          <span class="history-meta">${escapeHtml(op.account)}${op.comment ? ' · ' + escapeHtml(op.comment) : ''}</span>
        </div>
        <strong class="history-amount ${op.type}">${sign}${formatMoney(op.amount)}</strong>
      </div>`;
    }).join('');

    return `<section class="history-day">
      <div class="history-day-head"><strong>${title}</strong><span>${subtitle || 'нет операций'}</span></div>
      ${rowsHtml}
    </section>`;
  }).join('');
}

function renderAll() { renderAccounts(); renderForms(); renderAnalytics(); renderGoals(); renderHistory(); }

function showToast(message) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2000);
}


function setButtonLoading(button, isLoading, loadingText = 'сохраняю') {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    button.classList.add('is-loading');
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove('is-loading');
    delete button.dataset.originalText;
  }
}

function bindEvents() {
  document.addEventListener('click', () => {
    if (state.goalActionMenuId) {
      state.goalActionMenuId = null;
      renderGoals();
    }
  });

  $('syncButton').addEventListener('click', loadData);
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    haptic(6);
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(`screen-${btn.dataset.screen}`).classList.add('active');
  }));
  document.querySelectorAll('[data-next="expense"]').forEach(btn => btn.addEventListener('click', () => {
    if (state.expenseStep === 1 && !parseAmount($('expenseAmount').value)) return;
    haptic(6);
    setExpenseStep(state.expenseStep + 1);
  }));
  document.querySelectorAll('[data-back="expense"]').forEach(btn => btn.addEventListener('click', () => { haptic(4); setExpenseStep(state.expenseStep - 1); }));
  document.querySelectorAll('[data-next="income"]').forEach(btn => btn.addEventListener('click', () => {
    if (state.incomeStep === 1 && !parseAmount($('incomeAmount').value)) return;
    haptic(6);
    setIncomeStep(state.incomeStep + 1);
  }));
  document.querySelectorAll('[data-back="income"]').forEach(btn => btn.addEventListener('click', () => { haptic(4); setIncomeStep(state.incomeStep - 1); }));
  $('prevMonth').addEventListener('click', () => { state.selectedMonth.setMonth(state.selectedMonth.getMonth() - 1); renderAnalytics(); });
  $('nextMonth').addEventListener('click', () => { state.selectedMonth.setMonth(state.selectedMonth.getMonth() + 1); renderAnalytics(); });
  document.querySelectorAll('[data-analytics-type]').forEach(btn => btn.addEventListener('click', () => {
    const nextType = btn.dataset.analyticsType;
    if (state.analyticsType === nextType) return;
    state.analyticsType = nextType;
    renderAnalytics();
    animateAnalyticsSwitch();
    haptic(6);
  }));
  if ($('historyAccountFilter')) $('historyAccountFilter').addEventListener('change', e => {
    state.historyAccount = e.target.value;
    renderHistory();
  });
  if ($('historyCategoryFilter')) $('historyCategoryFilter').addEventListener('change', e => {
    state.historyCategory = e.target.value;
    renderHistory();
  });
  if ($('historyDateButton')) $('historyDateButton').addEventListener('click', () => {
    openHistoryDateModal();
    haptic(6);
  });
  if ($('expenseDateButton')) $('expenseDateButton').addEventListener('click', () => {
    openSingleDatePicker({ title: 'дата траты', initialValue: $('expenseDate').value || todayISO(), onSelect: value => { $('expenseDate').value = value; updateDateButtons(); } });
    haptic(6);
  });
  if ($('incomeDateButton')) $('incomeDateButton').addEventListener('click', () => {
    openSingleDatePicker({ title: 'дата дохода', initialValue: $('incomeDate').value || todayISO(), onSelect: value => { $('incomeDate').value = value; updateDateButtons(); } });
    haptic(6);
  });
  if ($('historyShowAll')) $('historyShowAll').addEventListener('click', () => {
    state.historyExpanded = !state.historyExpanded;
    renderHistory();
    haptic(6);
  });

  $('expenseForm').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const op = { type: 'expense', amount: parseAmount($('expenseAmount').value), category: state.expense.category, account: state.expense.account, date: $('expenseDate').value || todayISO(), comment: $('expenseComment').value.trim(), createdAt: new Date().toISOString() };
    if (!op.amount || submitBtn?.disabled) return;

    setButtonLoading(submitBtn, true, 'сохраняю');
    haptic(12);
    try {
      await saveOperation(op);
      showToast('трата добавлена');
      haptic(18);
      $('expenseAmount').value = '';
      $('expenseComment').value = '';
      $('expenseDate').value = todayISO();
      updateDateButtons();
      setExpenseStep(1);
    } catch (err) {
      showToast(`ошибка: ${err.message}`);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
  $('incomeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const op = { type: 'income', amount: parseAmount($('incomeAmount').value), category: state.income.category, account: state.income.account, date: $('incomeDate').value || todayISO(), comment: $('incomeComment').value.trim(), createdAt: new Date().toISOString() };
    if (!op.amount || submitBtn?.disabled) return;

    setButtonLoading(submitBtn, true, 'сохраняю');
    haptic(12);
    try {
      await saveOperation(op);
      showToast('доход добавлен');
      haptic(18);
      $('incomeAmount').value = '';
      $('incomeComment').value = '';
      $('incomeDate').value = todayISO();
      updateDateButtons();
      setIncomeStep(1);
    } catch (err) {
      showToast(`ошибка: ${err.message}`);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  if ($('goalForm')) $('goalForm').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const name = $('goalName').value.trim();
    const target = parseAmount($('goalTarget').value);
    if (!name || !target || submitBtn?.disabled) return;

    setButtonLoading(submitBtn, true, 'создаю');
    haptic(12);
    try {
      await saveGoal({ name, target, current: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      showToast('цель создана');
      haptic(18);
      $('goalName').value = '';
      $('goalTarget').value = '';
    } catch (err) {
      showToast(`ошибка: ${err.message}`);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

function init() {
  $('expenseDate').value = todayISO();
  $('incomeDate').value = todayISO();
  updateDateButtons();
  bindEvents();
  renderAll();
  loadData();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
init();

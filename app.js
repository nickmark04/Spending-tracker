const STORAGE_KEY = 'spending-tracker-data-v1';

const form = document.getElementById('expense-form');
const dateInput = document.getElementById('date');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const noteInput = document.getElementById('note');

const totalAllEl = document.getElementById('total-all');
const totalMonthEl = document.getElementById('total-month');
const listEl = document.getElementById('expense-list');
const emptyMessageEl = document.getElementById('empty-message');
const clearBtn = document.getElementById('clear-data');

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatMoney(value) {
  return '$' + value.toFixed(2);
}

function render() {
  const data = loadData();
  if (data.length === 0) {
    emptyMessageEl.style.display = 'block';
    listEl.innerHTML = '';
    totalAllEl.textContent = '$0.00';
    totalMonthEl.textContent = '$0.00';
    return;
  }

  emptyMessageEl.style.display = 'none';

  // Sort newest first
  data.sort((a, b) => (a.date < b.date ? 1 : -1));

  // Render list
  listEl.innerHTML = '';
  data.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'expense-item';

    const main = document.createElement('div');
    main.className = 'expense-main';

    const left = document.createElement('div');
    left.textContent = `${item.category}`;

    const right = document.createElement('div');
    right.className = 'expense-amount';
    right.textContent = formatMoney(item.amount);

    main.appendChild(left);
    main.appendChild(right);

    const meta = document.createElement('div');
    meta.className = 'expense-meta';
    meta.textContent = item.date;

    li.appendChild(main);
    li.appendChild(meta);

    if (item.note && item.note.trim() !== '') {
      const note = document.createElement('div');
      note.className = 'expense-note';
      note.textContent = item.note;
      li.appendChild(note);
    }

    listEl.appendChild(li);
  });

  // Totals
  const totalAll = data.reduce((sum, x) => sum + x.amount, 0);

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const totalMonth = data.reduce((sum, x) => {
    const d = new Date(x.date);
    return d.getMonth() === month && d.getFullYear() === year
      ? sum + x.amount
      : sum;
  }, 0);

  totalAllEl.textContent = formatMoney(totalAll);
  totalMonthEl.textContent = formatMoney(totalMonth);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const date = dateInput.value || todayISO();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value || 'Other';
  const note = noteInput.value.trim();

  if (!amount || amount <= 0) {
    alert('Enter a valid amount.');
    return;
  }

  const data = loadData();
  data.push({ date, amount, category, note });
  saveData(data);

  amountInput.value = '';
  noteInput.value = '';
  render();
});

clearBtn.addEventListener('click', () => {
  if (!confirm('Clear ALL saved expenses?')) return;
  localStorage.removeItem(STORAGE_KEY);
  render();
});

// Initialize default date and render
dateInput.value = todayISO();
render();

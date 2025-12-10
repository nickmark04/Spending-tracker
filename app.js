// Simple BudgetGPT tracker using localStorage

const STORAGE_KEY = "budgetGPT_state_v1";

const defaultState = {
  hourlyRate: 22.5,
  taxRate: 14, // percent
  alloc: { savings: 50, spending: 40, investing: 10 },
  pay: {
    hours: 0,
    date: ""
  },
  balances: {
    checking: 0,
    savings: 0
  },
  bills: [], // {id, name, amount, due}
  debts: [], // {id, name, amount, due}
  goals: [] // {id, name, target, current}
};

let state = loadState();

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);

// ---------- Load / Save ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      alloc: { ...defaultState.alloc, ...(parsed.alloc || {}) },
      balances: { ...defaultState.balances, ...(parsed.balances || {}) }
    };
  } catch (e) {
    console.warn("Failed to load state, using defaults", e);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- Render ----------
function formatMoney(val) {
  if (isNaN(val)) return "$0";
  return "$" + val.toFixed(2);
}

function renderSettings() {
  $("hourlyRate").value = state.hourlyRate;
  $("taxRate").value = state.taxRate;
  $("allocSavings").value = state.alloc.savings;
  $("allocSpending").value = state.alloc.spending;
  $("allocInvesting").value = state.alloc.investing;
}

function renderBalances() {
  $("balChecking").value = state.balances.checking;
  $("balSavings").value = state.balances.savings;
}

function renderPay() {
  $("payHours").value = state.pay.hours;
  $("payDate").value = state.pay.date;
}

function renderBills() {
  const list = $("billsList");
  list.innerHTML = "";
  let total = 0;
  state.bills.forEach((b) => {
    total += Number(b.amount) || 0;
    const li = document.createElement("li");
    li.className = "item-row";
    li.innerHTML = `
      <div>
        <div>${b.name || "Unnamed bill"} - <strong>${formatMoney(
      Number(b.amount) || 0
    )}</strong></div>
        <div class="meta">Due: ${b.due || "n/a"}</div>
      </div>
      <button data-type="bill" data-id="${b.id}">Remove</button>
    `;
    list.appendChild(li);
  });
  $("billsTotal").textContent = formatMoney(total);
}

function renderDebts() {
  const list = $("debtsList");
  list.innerHTML = "";
  let total = 0;
  state.debts.forEach((d) => {
    total += Number(d.amount) || 0;
    const li = document.createElement("li");
    li.className = "item-row";
    li.innerHTML = `
      <div>
        <div>${d.name || "Debt"} - <strong>${formatMoney(
      Number(d.amount) || 0
    )}</strong></div>
        <div class="meta">Planned by: ${d.due || "n/a"}</div>
      </div>
      <button data-type="debt" data-id="${d.id}">Remove</button>
    `;
    list.appendChild(li);
  });
  $("debtsTotal").textContent = formatMoney(total);
}

function renderGoals() {
  const list = $("goalsList");
  list.innerHTML = "";
  state.goals.forEach((g) => {
    const percent =
      g.target > 0 ? Math.min(100, (Number(g.current) / g.target) * 100) : 0;
    const li = document.createElement("li");
    li.className = "item-row";
    li.innerHTML = `
      <div>
        <div><strong>${g.name || "Goal"}</strong></div>
        <div class="meta">${formatMoney(
          Number(g.current) || 0
        )} / ${formatMoney(Number(g.target) || 0)} (${percent.toFixed(
      1
    )}%)</div>
      </div>
      <button data-type="goal" data-id="${g.id}">Remove</button>
    `;
    list.appendChild(li);
  });
}

function renderSummary() {
  const gross = state.hourlyRate * state.pay.hours;
  const net = gross * (1 - state.taxRate / 100);
  $("netPayDisplay").textContent = formatMoney(isNaN(net) ? 0 : net);

  const totalCashAfter =
    (Number(state.balances.checking) || 0) +
    (Number(state.balances.savings) || 0) +
    (isNaN(net) ? 0 : net);

  const billsTotal = state.bills.reduce(
    (sum, b) => sum + (Number(b.amount) || 0),
    0
  );
  const debtsTotal = state.debts.reduce(
    (sum, d) => sum + (Number(d.amount) || 0),
    0
  );

  const requiredTotal = billsTotal + debtsTotal;
  const leftover = totalCashAfter - requiredTotal;

  $("totalCashAfter").textContent = formatMoney(totalCashAfter);
  $("totalRequired").textContent = formatMoney(requiredTotal);
  $("safeToSpend").textContent = formatMoney(leftover);

  let safe = leftover > 0 ? leftover : 0;

  const allocSavings = (safe * state.alloc.savings) / 100;
  const allocSpending = (safe * state.alloc.spending) / 100;
  const allocInvesting = (safe * state.alloc.investing) / 100;

  $("suggestSavings").textContent = formatMoney(allocSavings);
  $("suggestSpending").textContent = formatMoney(allocSpending);
  $("suggestInvesting").textContent = formatMoney(allocInvesting);
}

function renderAll() {
  renderSettings();
  renderBalances();
  renderPay();
  renderBills();
  renderDebts();
  renderGoals();
  renderSummary();
}

// ---------- Event handlers ----------
function saveSettingsFromUI() {
  state.hourlyRate = Number($("hourlyRate").value) || 0;
  state.taxRate = Number($("taxRate").value) || 0;

  const s = Number($("allocSavings").value) || 0;
  const p = Number($("allocSpending").value) || 0;
  const i = Number($("allocInvesting").value) || 0;
  const total = s + p + i || 1;

  // Normalize to percentages
  state.alloc.savings = (s / total) * 100;
  state.alloc.spending = (p / total) * 100;
  state.alloc.investing = (i / total) * 100;

  saveState();
  renderSettings();
  renderSummary();

  // 🔽 Collapse the Settings card after saving
  const settingsCard = document.getElementById("settingsCard");
  if (settingsCard) {
    settingsCard.classList.toggle("hidden");
  }
}
$("saveSettings").closest(".card").classList.add("hidden");
function saveBalancesFromUI() {
  state.balances.checking = Number($("balChecking").value) || 0;
  state.balances.savings = Number($("balSavings").value) || 0;
  saveState();
  renderSummary();
}

function savePayFromUI() {
  state.pay.hours = Number($("payHours").value) || 0;
  state.pay.date = $("payDate").value || "";
  saveState();
  renderSummary();
}

function addBillFromUI() {
  const name = $("billName").value.trim();
  const amount = Number($("billAmount").value) || 0;
  const due = $("billDue").value || "";

  if (!name && !amount) return;

  state.bills.push({
    id: crypto.randomUUID(),
    name,
    amount,
    due
  });

  $("billName").value = "";
  $("billAmount").value = "";
  $("billDue").value = "";

  saveState();
  renderBills();
  renderSummary();
}

function addDebtFromUI() {
  const name = $("debtName").value.trim();
  const amount = Number($("debtAmount").value) || 0;
  const due = $("debtDue").value || "";
  if (!name && !amount) return;

  state.debts.push({
    id: crypto.randomUUID(),
    name,
    amount,
    due
  });

  $("debtName").value = "";
  $("debtAmount").value = "";
  $("debtDue").value = "";

  saveState();
  renderDebts();
  renderSummary();
}

function addGoalFromUI() {
  const name = $("goalName").value.trim();
  const target = Number($("goalTarget").value) || 0;
  const current = Number($("goalCurrent").value) || 0;
  if (!name && !target) return;

  state.goals.push({
    id: crypto.randomUUID(),
    name,
    target,
    current
  });

  $("goalName").value = "";
  $("goalTarget").value = "";
  $("goalCurrent").value = "";

  saveState();
  renderGoals();
}

function handleListClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = btn.dataset.id;
  const type = btn.dataset.type;
  if (!id || !type) return;

  if (type === "bill") {
    state.bills = state.bills.filter((b) => b.id !== id);
    saveState();
    renderBills();
    renderSummary();
  } else if (type === "debt") {
    state.debts = state.debts.filter((d) => d.id !== id);
    saveState();
    renderDebts();
    renderSummary();
  } else if (type === "goal") {
    state.goals = state.goals.filter((g) => g.id !== id);
    saveState();
    renderGoals();
  }
}

function resetAll() {
  if (!confirm("Reset all data? This cannot be undone.")) return;
  state = structuredClone(defaultState);
  saveState();
  renderAll();
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  renderAll();

  $("saveSettings").addEventListener("click", saveSettingsFromUI);
  document.addEventListener("DOMContentLoaded", () => {
  renderAll();

  $("saveSettings").addEventListener("click", saveSettingsFromUI);
  ...
});
  $("balChecking").addEventListener("input", saveBalancesFromUI);
  $("balSavings").addEventListener("input", saveBalancesFromUI);
  $("payHours").addEventListener("input", savePayFromUI);
  $("payDate").addEventListener("change", savePayFromUI);

  $("addBill").addEventListener("click", addBillFromUI);
  $("addDebt").addEventListener("click", addDebtFromUI);
  $("addGoal").addEventListener("click", addGoalFromUI);

  $("billsList").addEventListener("click", handleListClick);
  $("debtsList").addEventListener("click", handleListClick);
  $("goalsList").addEventListener("click", handleListClick);

  $("recalc").addEventListener("click", () => {
    saveSettingsFromUI();
    saveBalancesFromUI();
    savePayFromUI();
    renderSummary();
  });

  $("resetAll").addEventListener("click", resetAll);

  // Register service worker if present
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((err) => console.warn("SW registration failed", err));
  }
});
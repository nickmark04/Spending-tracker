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
  bills: [],      // {id, name, amount, due}
  debts: [],      // {id, name, amount, due}
  goals: [],      // {id, name, target, current}
  recurring: [],  // {id, name, amount, note}
  useRecurring: true
};

let state = loadState();

// ---------- DOM helper ----------
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
  const useRecurring = $("useRecurring");
  if (useRecurring) useRecurring.checked = !!state.useRecurring;
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

function renderRecurring() {
  const list = $("recurringList");
  const totalEl = $("recurringTotal");
  list.innerHTML = "";
  let total = 0;

  state.recurring.forEach((r) => {
    total += Number(r.amount) || 0;
    const li = document.createElement("li");
    li.className = "item-row";
    li.innerHTML = `
      <div>
        <div>${r.name || "Recurring"} - <strong>${formatMoney(
      Number(r.amount) || 0
    )}</strong></div>
        ${
          r.note
            ? `<div class="meta">${r.note}</div>`
            : ""
        }
      </div>
      <button data-type="recurring" data-id="${r.id}">Remove</button>
    `;
    list.appendChild(li);
  });

  if (totalEl) totalEl.textContent = formatMoney(total);
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

  const recurringTotal = state.recurring.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  );

  const effectiveRecurring = state.useRecurring ? recurringTotal : 0;

  $("totalCashAfter").textContent = formatMoney(totalCashAfter);
  $("summaryRecurring").textContent = formatMoney(effectiveRecurring);

  const requiredTotal = billsTotal + debtsTotal + effectiveRecurring;
  const leftover = totalCashAfter - requiredTotal;

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

function updateRecurringVisibility() {
  const card = $("recurringCard");
  if (!card) return;
  if (state.useRecurring) {
    card.classList.remove("hidden");
  } else {
    card.classList.add("hidden");
  }
}

function renderAll() {
  renderSettings();
  renderBalances();
  renderPay();
  renderBills();
  renderDebts();
  renderGoals();
  renderRecurring();
  updateRecurringVisibility();
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

  state.alloc.savings = (s / total) * 100;
  state.alloc.spending = (p / total) * 100;
  state.alloc.investing = (i / total) * 100;

  const useRecurring = $("useRecurring");
  state.useRecurring = useRecurring ? !!useRecurring.checked : true;

  saveState();
  renderSettings();
  updateRecurringVisibility();
  renderSummary();

  const settingsCard = $("settingsCard");
  if (settingsCard) {
    settingsCard.classList.add("hidden");
  }
}

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

function addRecurringFromUI() {
  const name = $("recName").value.trim();
  const amount = Number($("recAmount").value) || 0;
  const note = $("recNote").value.trim();

  if (!name && !amount) return;

  state.recurring.push({
    id: crypto.randomUUID(),
    name,
    amount,
    note
  });

  $("recName").value = "";
  $("recAmount").value = "";
  $("recNote").value = "";

  saveState();
  renderRecurring();
  renderSummary();
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
  } else if (type === "recurring") {
    state.recurring = state.recurring.filter((r) => r.id !== id);
    saveState();
    renderRecurring();
    renderSummary();
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

  const settingsCard = $("settingsCard");
  const toggleSettingsBtn = $("toggleSettings");

  // start hidden
  if (settingsCard) {
    settingsCard.classList.add("hidden");
  }

  if (toggleSettingsBtn && settingsCard) {
    toggleSettingsBtn.addEventListener("click", () => {
      const hidden = settingsCard.classList.toggle("hidden");
      toggleSettingsBtn.textContent = hidden ? "Show Settings" : "Hide Settings";
    });
  }

  $("saveSettings").addEventListener("click", saveSettingsFromUI);

  $("balChecking").addEventListener("input", saveBalancesFromUI);
  $("balSavings").addEventListener("input", saveBalancesFromUI);
  $("payHours").addEventListener("input", savePayFromUI);
  $("payDate").addEventListener("change", savePayFromUI);

  $("addBill").addEventListener("click", addBillFromUI);
  $("addDebt").addEventListener("click", addDebtFromUI);
  $("addGoal").addEventListener("click", addGoalFromUI);
  $("addRecurring").addEventListener("click", addRecurringFromUI);

  $("billsList").addEventListener("click", handleListClick);
  $("debtsList").addEventListener("click", handleListClick);
  $("goalsList").addEventListener("click", handleListClick);
  $("recurringList").addEventListener("click", handleListClick);

  $("recalc").addEventListener("click", () => {
    saveSettingsFromUI();
    saveBalancesFromUI();
    savePayFromUI();
    renderSummary();
  });

  $("resetAll").addEventListener("click", resetAll);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((err) => console.warn("SW registration failed", err));
  }
});

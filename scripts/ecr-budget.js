(function (root) {
  'use strict';
  function calculateBudget(balance, reserve, price, spins) {
    const values = [balance, reserve, price, spins];
    if (!values.every(Number.isSafeInteger) || balance < 0 || reserve < 0 || price <= 0 || spins < 0) return null;
    const cost = price * spins;
    if (!Number.isSafeInteger(cost)) return null;
    const spendable = Math.max(0, balance - reserve);
    return {cost, remaining: balance - cost, maxSpins: Math.floor(spendable / price), withinBudget: reserve <= balance && cost <= spendable};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {calculateBudget};
  if (!root.document) return;
  const form = root.document.getElementById('budgetForm');
  if (!form) return;
  const get = id => root.document.getElementById(id);
  const fmt = value => value.toLocaleString('en-IN');
  function update() {
    const ids = ['coinBalance', 'coinReserve', 'spinPrice', 'spinCount'];
    const inputs = ids.map(get);
    const values = inputs.map(input => input.value.trim() === '' ? NaN : Number(input.value));
    const result = inputs.every(input => input.validity.valid) ? calculateBudget(...values) : null;
    if (!result) {
      get('spinCost').textContent = 'Check your inputs';
      ['spinSummary', 'budgetRemaining', 'budgetLimit'].forEach(id => { get(id).textContent = ''; });
      get('budgetStatus').textContent = 'Enter whole numbers within the displayed limits. Spin price must be greater than zero.';
      return;
    }
    get('spinCost').textContent = fmt(result.cost) + ' A-Coins';
    get('spinSummary').textContent = fmt(values[3]) + ' spins × ' + fmt(values[2]) + ' A-Coins';
    get('budgetRemaining').textContent = 'Balance after spins: ' + fmt(result.remaining) + ' A-Coins';
    get('budgetLimit').textContent = 'Up to ' + fmt(result.maxSpins) + ' spins while keeping your reserve.';
    get('budgetStatus').textContent = result.withinBudget ? 'Within your chosen budget.' : 'Over your chosen budget. Reduce spins or revise your reserve.';
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', update);
  update();
})(typeof window === 'undefined' ? {} : window);

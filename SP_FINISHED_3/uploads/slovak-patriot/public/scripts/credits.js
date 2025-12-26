// credits.js - Credit purchase and management
let selectedPackage = null;
let selectedPaymentMethod = null;

// Modal System
function showModal(title, message, onConfirm = null) {
  const modalHtml = `
    <div id="customModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 10000;">
      <div style="background: var(--black-light); padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; border: 2px solid var(--accent-red);">
        <h3 style="color: var(--accent-red); margin-bottom: 15px;">${title}</h3>
        <p style="color: var(--white); margin-bottom: 20px; line-height: 1.6;">${message}</p>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="modalConfirm" class="btn btn-activate" style="padding: 10px 20px;">OK</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = document.getElementById('customModal');
  const confirmBtn = document.getElementById('modalConfirm');
  
  confirmBtn.onclick = () => {
    modal.remove();
    if (onConfirm) onConfirm();
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const sessionResponse = await fetch('/session');
  const sessionData = await sessionResponse.json();

  if (!sessionData.loggedIn) {
    showModal('Login Required', 'Please login to buy credits', () => {
      window.location.href = 'login.html';
    });
    return;
  }

  // Load current balance
  loadBalance();
  loadTransactionHistory();
});

async function loadBalance() {
  try {
    const response = await fetch('/wallet');
    const data = await response.json();

    if (data.ok) {
      document.getElementById('currentBalance').textContent = data.balance;
    }
  } catch (error) {
    console.error('Error loading balance:', error);
  }
}

async function loadTransactionHistory() {
  try {
    const response = await fetch('/wallet/transactions');
    const data = await response.json();

    if (data.ok && data.transactions.length > 0) {
      displayTransactions(data.transactions);
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
  }
}

function displayTransactions(transactions) {
  const transactionList = document.getElementById('transactionList');
  
  transactionList.innerHTML = transactions.slice(0, 10).map(tx => `
    <div class="transaction-item">
      <div>
        <div class="type">${tx.type}</div>
        <div style="color: var(--gray); font-size: 0.85rem;">${new Date(tx.timestamp).toLocaleString()}</div>
      </div>
      <div class="amount ${tx.amount < 0 ? 'negative' : ''}">${tx.amount > 0 ? '+' : ''}${tx.amount}</div>
    </div>
  `).join('');
}

function selectPackage(amount, price) {
  selectedPackage = { amount, price };
  
  document.getElementById('modalAmount').textContent = amount;
  document.getElementById('modalPrice').textContent = `€${price.toFixed(2)}`;
  document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
  selectedPackage = null;
  selectedPaymentMethod = null;
  
  // Remove selected class from all payment methods
  document.querySelectorAll('.payment-method').forEach(method => {
    method.classList.remove('selected');
  });
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  
  // Remove selected class from all payment methods
  document.querySelectorAll('.payment-method').forEach(m => {
    m.classList.remove('selected');
  });
  
  // Add selected class to clicked method
  event.currentTarget.classList.add('selected');
}

async function processPayment() {
  if (!selectedPackage) {
    showModal('Error', 'Please select a package');
    return;
  }
  
  if (!selectedPaymentMethod) {
    showModal('Error', 'Please select a payment method');
    return;
  }
  
  // Show loading state
  const button = event.currentTarget;
  const originalText = button.textContent;
  button.textContent = 'Processing...';
  button.disabled = true;
  
  try {
    const response = await fetch('/wallet/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: selectedPackage.amount,
        price: selectedPackage.price,
        paymentMethod: selectedPaymentMethod
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      showModal('Success', `Successfully purchased ${selectedPackage.amount} credits!`, () => {
        closePaymentModal();
        loadBalance();
        loadTransactionHistory();
      });
    } else {
      showModal('Error', data.message || 'Payment failed. Please try again.');
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    showModal('Error', 'Payment failed. Please try again.');
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}
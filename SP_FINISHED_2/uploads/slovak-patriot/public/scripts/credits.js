// credits.js - Credit purchase and management
let selectedPackage = null;
let selectedPaymentMethod = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const sessionResponse = await fetch('/session');
  const sessionData = await sessionResponse.json();

  if (!sessionData.loggedIn) {
    alert('Please login to buy credits');
    window.location.href = 'login.html';
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
    alert('Please select a package');
    return;
  }
  
  if (!selectedPaymentMethod) {
    alert('Please select a payment method');
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
      alert(`Successfully purchased ${selectedPackage.amount} credits!`);
      closePaymentModal();
      loadBalance();
      loadTransactionHistory();
    } else {
      alert(data.message || 'Payment failed. Please try again.');
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    alert('Payment failed. Please try again.');
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}
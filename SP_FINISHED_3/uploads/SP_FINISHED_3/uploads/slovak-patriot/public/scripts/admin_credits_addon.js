// Add these functions to admin.js for credit management

// Update the displayPlayers function to include credit management buttons
function displayPlayersWithCredits(users) {
  const playersList = document.getElementById('playersList');
  if (!playersList) return;

  if (users.length === 0) {
    playersList.innerHTML = '<p>No players registered yet.</p>';
    return;
  }

  playersList.innerHTML = users.map(user => `
    <div class="admin-card">
      <div class="card-header">
        <h3>${user.username}</h3>
        <span style="color: var(--gray);">${user.email}</span>
      </div>
      <div class="card-body">
        <p><strong>Status:</strong> ${user.status.toUpperCase()}</p>
        <p><strong>Team:</strong> ${user.teamId ? 'Yes' : 'No'}</p>
        <p><strong>Wallet:</strong> <span style="color: #4CAF50; font-weight: bold; font-size: 1.2rem;">${user.wallet || 0} credits</span></p>
        <p><strong>Registered Events:</strong> ${user.registeredEvents.length}</p>
        <p><strong>Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
      <div class="card-actions">
        <button class="btn btn-edit" onclick="addCreditsToUser('${user.id}', '${user.username}')" style="background: #4CAF50;">Add Credits</button>
        <button class="btn btn-edit" onclick="removeCreditsFromUser('${user.id}', '${user.username}')" style="background: #FF9800;">Remove Credits</button>
        ${user.status === 'active' ? `
          <button class="btn btn-suspend" onclick="suspendUser('${user.id}', '${user.username}')">Suspend</button>
          <button class="btn btn-ban" onclick="banUser('${user.id}', '${user.username}')">Ban</button>
        ` : `
          <button class="btn btn-activate" onclick="activateUser('${user.id}', '${user.username}')">Activate</button>
        `}
        <button class="btn btn-disqualify" onclick="showDisqualifyModal('${user.id}', '${user.username}')">Disqualify</button>
        <button class="btn btn-delete" onclick="deleteUser('${user.id}', '${user.username}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// Add credits to user
async function addCreditsToUser(userId, username) {
  const amount = prompt(`How many credits do you want to ADD to ${username}?`);
  if (!amount || isNaN(amount) || parseInt(amount) <= 0) {
    if (amount !== null) alert('Please enter a valid positive number');
    return;
  }

  const reason = prompt('Enter reason for adding credits (optional):', 'Admin adjustment');

  try {
    const response = await fetch(`/admin/users/${userId}/add-credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount: parseInt(amount),
        reason: reason || 'Admin adjustment'
      })
    });

    const data = await response.json();

    if (data.ok) {
      alert(data.message);
      loadPlayers();
    } else {
      alert(data.message || 'Failed to add credits');
    }
  } catch (error) {
    console.error('Error adding credits:', error);
    alert('Failed to add credits');
  }
}

// Remove credits from user
async function removeCreditsFromUser(userId, username) {
  const amount = prompt(`How many credits do you want to REMOVE from ${username}?`);
  if (!amount || isNaN(amount) || parseInt(amount) <= 0) {
    if (amount !== null) alert('Please enter a valid positive number');
    return;
  }

  const reason = prompt('Enter reason for removing credits (optional):', 'Admin adjustment');

  if (!confirm(`Are you sure you want to remove ${amount} credits from ${username}?`)) {
    return;
  }

  try {
    const response = await fetch(`/admin/users/${userId}/remove-credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount: parseInt(amount),
        reason: reason || 'Admin adjustment'
      })
    });

    const data = await response.json();

    if (data.ok) {
      alert(data.message);
      loadPlayers();
    } else {
      alert(data.message || 'Failed to remove credits');
    }
  } catch (error) {
    console.error('Error removing credits:', error);
    alert('Failed to remove credits');
  }
}
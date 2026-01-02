// modals.js - Custom modal system for better UX

// Create Team Modal
function showCreateTeamModal() {
  const modalHtml = `
    <div id="createTeamModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 10000;">
      <div style="background: var(--black-light); padding: 40px; border-radius: 12px; max-width: 500px; width: 90%; border: 2px solid var(--accent-red); box-shadow: 0 8px 32px rgba(220, 20, 60, 0.4);">
        <h3 style="color: var(--accent-red); margin-bottom: 25px; text-align: center; font-size: 1.8rem;">Create Your Team</h3>
        
        <form id="createTeamForm">
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: var(--white); font-weight: 600;">Team Name *</label>
            <input type="text" id="teamName" required maxlength="30" placeholder="Enter team name" style="width: 100%; padding: 14px; border: 2px solid var(--black-lighter); border-radius: 6px; background: var(--black); color: var(--white); font-size: 1rem;">
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: var(--white); font-weight: 600;">Description</label>
            <textarea id="teamDescription" rows="3" maxlength="200" placeholder="Tell others about your team (optional)" style="width: 100%; padding: 14px; border: 2px solid var(--black-lighter); border-radius: 6px; background: var(--black); color: var(--white); font-size: 1rem; font-family: inherit; resize: vertical;"></textarea>
          </div>
          
          <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 8px; color: var(--white); font-weight: 600;">Team Motto</label>
            <input type="text" id="teamMotto" maxlength="50" placeholder="Your team's motto (optional)" style="width: 100%; padding: 14px; border: 2px solid var(--black-lighter); border-radius: 6px; background: var(--black); color: var(--white); font-size: 1rem;">
          </div>
          
          <div style="display: flex; gap: 12px;">
            <button type="submit" style="flex: 1; padding: 14px; background: var(--accent-red); color: white; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: all 0.3s;">Create Team</button>
            <button type="button" onclick="closeCreateTeamModal()" style="flex: 1; padding: 14px; background: var(--black-lighter); color: white; border: 2px solid var(--gray-dark); border-radius: 6px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: all 0.3s;">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  document.getElementById('createTeamForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('teamName').value.trim();
    const description = document.getElementById('teamDescription').value.trim();
    const motto = document.getElementById('teamMotto').value.trim();
    
    await createTeam(name, description, motto);
  });
}

function closeCreateTeamModal() {
  const modal = document.getElementById('createTeamModal');
  if (modal) modal.remove();
}

async function createTeam(name, description, motto) {
  try {
    const response = await fetch('/teams/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, motto })
    });

    const data = await response.json();

    if (data.ok) {
      closeCreateTeamModal();
      showSuccessModal(`Team "${name}" created successfully!`, `Your invite code is: <strong style="color: var(--accent-red); font-size: 1.3rem; letter-spacing: 2px;">${data.team.inviteCode}</strong><br><br>Share this code with your friends to invite them!`, () => {
        window.location.href = 'undersites/team-management.html';
      });
    } else {
      showErrorModal('Failed to Create Team', data.message);
    }
  } catch (error) {
    console.error('Error creating team:', error);
    showErrorModal('Error', 'Failed to create team. Please try again.');
  }
}

// Success Modal
function showSuccessModal(title, message, onClose) {
  const modalHtml = `
    <div id="successModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 10001;">
      <div style="background: var(--black-light); padding: 40px; border-radius: 12px; max-width: 500px; width: 90%; border: 2px solid #2ecc71; box-shadow: 0 8px 32px rgba(46, 204, 113, 0.4);">
        <h3 style="color: #2ecc71; margin-bottom: 20px; text-align: center; font-size: 1.8rem;">✓ ${title}</h3>
        <p style="color: var(--white); margin-bottom: 30px; text-align: center; line-height: 1.6;">${message}</p>
        <button onclick="closeSuccessModal()" style="width: 100%; padding: 14px; background: #2ecc71; color: white; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: 600; cursor: pointer;">OK</button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  window.closeSuccessModal = () => {
    const modal = document.getElementById('successModal');
    if (modal) modal.remove();
    if (onClose) onClose();
  };
}

// Error Modal
function showErrorModal(title, message) {
  const modalHtml = `
    <div id="errorModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 10001;">
      <div style="background: var(--black-light); padding: 40px; border-radius: 12px; max-width: 500px; width: 90%; border: 2px solid var(--accent-red); box-shadow: 0 8px 32px rgba(255, 68, 68, 0.4);">
        <h3 style="color: var(--accent-red); margin-bottom: 20px; text-align: center; font-size: 1.8rem;">✗ ${title}</h3>
        <p style="color: var(--white); margin-bottom: 30px; text-align: center; line-height: 1.6;">${message}</p>
        <button onclick="closeErrorModal()" style="width: 100%; padding: 14px; background: var(--accent-red); color: white; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: 600; cursor: pointer;">OK</button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  window.closeErrorModal = () => {
    const modal = document.getElementById('errorModal');
    if (modal) modal.remove();
  };
}

// Make functions globally available
window.showCreateTeamModal = showCreateTeamModal;
window.closeCreateTeamModal = closeCreateTeamModal;
window.createTeam = createTeam;
window.showSuccessModal = showSuccessModal;
window.showErrorModal = showErrorModal;
// ADMIN ROUTES - Complete PostgreSQL Conversion
// Add these routes to server-postgres.js after the ticket routes

// Get all users (admin only)
app.get('/admin/users', isAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      status: u.status,
      teamId: u.team_id,
      wallet: u.wallet || 0,
      registeredEvents: u.registered_events || [],
      createdAt: u.created_at
    }));

    res.json({ ok: true, users: safeUsers });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load users' });
  }
});

// Get all teams (admin only)
app.get('/admin/teams', isAdmin, async (req, res) => {
  try {
    const teams = await db.getAllTeams();

    const teamsWithDetails = await Promise.all(
      teams.map(async (team) => {
        const captain = await db.findUserById(team.captain_id);
        const memberDetails = await Promise.all(
          team.members.map(async (memberId) => {
            const member = await db.findUserById(memberId);
            return {
              id: member.id,
              username: member.username
            };
          })
        );

        return {
          ...team,
          captainName: captain ? captain.username : 'Unknown',
          memberDetails
        };
      })
    );

    res.json({ ok: true, teams: teamsWithDetails });
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load teams' });
  }
});

// Delete team (admin only)
app.delete('/admin/teams/:teamId', isAdmin, async (req, res) => {
  try {
    const team = await db.findTeamById(req.params.teamId);

    if (!team) {
      return res.status(404).json({ ok: false, message: 'Team not found' });
    }

    // Remove team from all members
    for (const memberId of team.members) {
      await db.updateUser(memberId, { teamId: null });
    }

    // Delete team
    await db.deleteTeam(team.id);

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete team' });
  }
});

// Ban user (admin only)
app.post('/admin/users/:userId/ban', isAdmin, async (req, res) => {
  try {
    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    await db.updateUser(user.id, { status: 'banned' });

    res.json({ ok: true });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to ban user' });
  }
});

// Suspend user (admin only)
app.post('/admin/users/:userId/suspend', isAdmin, async (req, res) => {
  try {
    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    await db.updateUser(user.id, { status: 'suspended' });

    res.json({ ok: true });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to suspend user' });
  }
});

// Activate user (admin only)
app.post('/admin/users/:userId/activate', isAdmin, async (req, res) => {
  try {
    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    await db.updateUser(user.id, { status: 'active' });

    res.json({ ok: true });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to activate user' });
  }
});

// Delete user account (admin only)
app.delete('/admin/users/:userId', isAdmin, async (req, res) => {
  try {
    await db.deleteUser(req.params.userId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete user' });
  }
});

// Admin: Add credits to user
app.post('/admin/users/:userId/add-credits', isAdmin, async (req, res) => {
  const { amount, reason } = req.body;
  
  try {
    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, message: 'Invalid amount' });
    }

    const newWallet = (user.wallet || 0) + parseInt(amount);
    const transactions = user.transactions || [];
    transactions.push({
      type: `Admin Credit (${reason || 'No reason provided'})`,
      amount: parseInt(amount),
      timestamp: new Date().toISOString()
    });

    await db.updateUser(user.id, { wallet: newWallet, transactions });

    res.json({ ok: true, message: `Added ${amount} credits to ${user.username}`, newBalance: newWallet });
  } catch (error) {
    console.error('Add credits error:', error);
    res.status(500).json({ ok: false, message: 'Failed to add credits' });
  }
});

// Admin: Remove credits from user
app.post('/admin/users/:userId/remove-credits', isAdmin, async (req, res) => {
  const { amount, reason } = req.body;
  
  try {
    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, message: 'Invalid amount' });
    }

    const removeAmount = parseInt(amount);
    const newWallet = Math.max(0, (user.wallet || 0) - removeAmount);
    const transactions = user.transactions || [];
    transactions.push({
      type: `Admin Deduction (${reason || 'No reason provided'})`,
      amount: -removeAmount,
      timestamp: new Date().toISOString()
    });

    await db.updateUser(user.id, { wallet: newWallet, transactions });

    res.json({ ok: true, message: `Removed ${amount} credits from ${user.username}`, newBalance: newWallet });
  } catch (error) {
    console.error('Remove credits error:', error);
    res.status(500).json({ ok: false, message: 'Failed to remove credits' });
  }
});

// Disqualify user from event (admin only) - NO REFUND
app.post('/admin/users/:userId/disqualify', isAdmin, async (req, res) => {
  const { eventId } = req.body;
  
  try {
    const event = await db.findEventById(eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const user = await db.findUserById(req.params.userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    // NO REFUND on disqualification (money is lost)
    // Remove from registrations
    const registrations = event.registrations || [];
    const updatedRegistrations = registrations.filter(r => 
      r.userId !== user.id && r.teamId !== user.team_id
    );

    const disqualified = event.disqualified || [];
    disqualified.push({
      userId: user.id,
      username: user.username,
      disqualifiedAt: new Date().toISOString()
    });

    await db.updateEvent(event.id, { registrations: updatedRegistrations, disqualified });

    res.json({ ok: true, message: `${user.username} has been disqualified. Entry fee is NOT refunded.` });
  } catch (error) {
    console.error('Disqualify user error:', error);
    res.status(500).json({ ok: false, message: 'Failed to disqualify user' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Slovak Patriot server running at http://localhost:${PORT}`);
  console.log('WebSocket server is ready for chat connections');
  console.log('✓ Using PostgreSQL database for persistent storage');
});
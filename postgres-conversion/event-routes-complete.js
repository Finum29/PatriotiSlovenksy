// EVENT ROUTES - Complete PostgreSQL Conversion
// Add these routes to server-postgres.js after the team routes

// Update event image (admin only)
app.post('/events/:eventId/image', isAdmin, async (req, res) => {
  const { iconUrl } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    await db.updateEvent(event.id, { iconUrl: iconUrl || '../images/Background.png' });
    const updatedEvent = await db.findEventById(event.id);

    res.json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('Update event image error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update event image' });
  }
});

// Update event (admin only)
app.put('/events/:eventId', isAdmin, async (req, res) => {
  const { name, description, date, time, mode, eliminationType, streamUrl, lobbyUrl, teamSize } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (date) updates.date = date;
    if (time) updates.time = time;
    if (mode) updates.mode = mode;
    if (eliminationType) updates.eliminationType = eliminationType;
    if (streamUrl !== undefined) updates.streamUrl = streamUrl;
    if (lobbyUrl !== undefined) updates.lobbyUrl = lobbyUrl;
    if (teamSize !== undefined && mode !== 'solo') {
      updates.teamSize = Math.min(Math.max(parseInt(teamSize), 1), 5);
    }

    await db.updateEvent(event.id, updates);
    const updatedEvent = await db.findEventById(event.id);

    res.json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update event' });
  }
});

// Register for event
app.post('/events/:eventId/register', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  const { type } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    if (event.status !== 'upcoming') {
      return res.status(400).json({ ok: false, message: 'Event is not open for registration' });
    }

    const user = await db.findUserById(req.session.user.id);

    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ ok: false, message: 'Account restricted' });
    }

    const registrations = event.registrations || [];
    const alreadyRegistered = registrations.some(r => 
      r.userId === user.id || (r.teamId && r.teamId === user.team_id)
    );

    if (alreadyRegistered) {
      return res.status(400).json({ ok: false, message: 'Already registered' });
    }

    // Check if registration is closed
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const minutesDiff = (eventDateTime - now) / (1000 * 60);

    if (minutesDiff < -5) {
      return res.status(400).json({ ok: false, message: 'Registration closed' });
    }

    // Handle entry fee
    if (event.entry_fee > 0) {
      if (type === 'team') {
        const team = await db.findTeamById(user.team_id);
        
        if (team.captain_id !== user.id) {
          return res.status(403).json({ ok: false, message: 'Only captain can register team for paid events' });
        }
        
        if ((user.wallet || 0) < event.entry_fee) {
          return res.status(400).json({ ok: false, message: `Insufficient funds. Entry fee: ${event.entry_fee} credits` });
        }
        
        const newWallet = (user.wallet || 0) - event.entry_fee;
        const transactions = user.transactions || [];
        transactions.push({
          type: `Event Entry Fee - ${event.name}`,
          amount: -event.entry_fee,
          timestamp: new Date().toISOString()
        });
        
        await db.updateUser(user.id, { wallet: newWallet, transactions });
      } else {
        if ((user.wallet || 0) < event.entry_fee) {
          return res.status(400).json({ ok: false, message: `Insufficient funds. Entry fee: ${event.entry_fee} credits` });
        }
        
        const newWallet = (user.wallet || 0) - event.entry_fee;
        const transactions = user.transactions || [];
        transactions.push({
          type: `Event Entry Fee - ${event.name}`,
          amount: -event.entry_fee,
          timestamp: new Date().toISOString()
        });
        
        await db.updateUser(user.id, { wallet: newWallet, transactions });
      }
    }

    if (type === 'team') {
      if (!user.team_id) {
        return res.status(400).json({ ok: false, message: 'Not in a team' });
      }

      const team = await db.findTeamById(user.team_id);

      if (team.captain_id !== user.id) {
        return res.status(403).json({ ok: false, message: 'Only captain can register team' });
      }

      if (event.team_size && team.members.length > event.team_size) {
        return res.status(400).json({ 
          ok: false, 
          message: `Team size exceeds limit. This event requires ${event.team_size} players per team.` 
        });
      }

      registrations.push({
        type: 'team',
        teamId: team.id,
        teamName: team.name,
        memberCount: team.members.length,
        captainId: user.id,
        registeredAt: new Date().toISOString(),
        checkedIn: false,
        paidEntry: event.entry_fee > 0
      });
    } else {
      registrations.push({
        type: 'solo',
        userId: user.id,
        username: user.username,
        registeredAt: new Date().toISOString(),
        checkedIn: false,
        paidEntry: event.entry_fee > 0
      });
    }

    await db.updateEvent(event.id, { registrations });

    const registeredEvents = user.registered_events || [];
    registeredEvents.push(event.id);
    await db.updateUser(user.id, { registeredEvents });

    res.json({ ok: true });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ ok: false, message: 'Failed to register for event' });
  }
});

// Check-in for event
app.post('/events/:eventId/checkin', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const minutesDiff = (eventDateTime - now) / (1000 * 60);

    if (minutesDiff > 10) {
      return res.status(400).json({ ok: false, message: 'Check-in opens 10 minutes before the event' });
    }

    const user = await db.findUserById(req.session.user.id);
    const registrations = event.registrations || [];

    const registration = registrations.find(r => 
      r.userId === user.id || (r.teamId && r.teamId === user.team_id)
    );

    if (!registration) {
      return res.status(400).json({ ok: false, message: 'Not registered' });
    }
    
    if (registration.type === 'team') {
      const team = await db.findTeamById(user.team_id);
      if (team.captain_id !== user.id) {
        return res.status(403).json({ ok: false, message: 'Only captain can check in' });
      }
    }

    registration.checkedIn = true;
    await db.updateEvent(event.id, { registrations });

    // Broadcast check-in status via WebSocket
    broadcastToAll({ 
      type: 'checkin_update', 
      eventId: event.id, 
      userId: user.id, 
      teamId: user.team_id,
      checkedIn: true 
    });

    res.json({ ok: true, message: 'Checked in successfully' });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ ok: false, message: 'Failed to check in' });
  }
});

// Unregister from event
app.post('/events/:eventId/unregister', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const minutesDiff = (eventDateTime - now) / (1000 * 60);

    if (minutesDiff < 0) {
      return res.status(400).json({ ok: false, message: 'Cannot unregister after event start' });
    }

    const user = await db.findUserById(req.session.user.id);
    const registrations = event.registrations || [];

    // Find registration to check if entry was paid
    const registration = registrations.find(r => 
      r.userId === user.id || (r.teamId && r.teamId === user.team_id)
    );

    // Refund entry fee if paid
    if (registration && registration.paidEntry && event.entry_fee > 0) {
      const newWallet = (user.wallet || 0) + event.entry_fee;
      const transactions = user.transactions || [];
      transactions.push({
        type: `Event Entry Refund - ${event.name}`,
        amount: event.entry_fee,
        timestamp: new Date().toISOString()
      });
      
      await db.updateUser(user.id, { wallet: newWallet, transactions });
    }

    const updatedRegistrations = registrations.filter(r => 
      r.userId !== user.id && r.teamId !== user.team_id
    );

    await db.updateEvent(event.id, { registrations: updatedRegistrations });

    const registeredEvents = (user.registered_events || []).filter(id => id !== event.id);
    await db.updateUser(user.id, { registeredEvents });

    res.json({ ok: true });
  } catch (error) {
    console.error('Unregister error:', error);
    res.status(500).json({ ok: false, message: 'Failed to unregister' });
  }
});

// Update event status (admin only)
app.post('/events/:eventId/status', isAdmin, async (req, res) => {
  const { status, streamUrl, lobbyUrl } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const updates = { status };
    
    if (streamUrl !== undefined) {
      updates.streamUrl = streamUrl;
    }

    if (lobbyUrl !== undefined) {
      updates.lobbyUrl = lobbyUrl;
    }
    
    if (status === 'finished') {
      updates.finishedAt = new Date();
    }

    await db.updateEvent(event.id, updates);
    const updatedEvent = await db.findEventById(event.id);

    res.json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update status' });
  }
});

// Set event winner (admin only)
app.post('/events/:eventId/winner', isAdmin, async (req, res) => {
  const { winnerId, winnerName } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const winner = {
      id: winnerId,
      name: winnerName,
      announcedAt: new Date().toISOString()
    };

    await db.updateEvent(event.id, { winner });
    const updatedEvent = await db.findEventById(event.id);

    res.json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('Set winner error:', error);
    res.status(500).json({ ok: false, message: 'Failed to set winner' });
  }
});

// Award prize (admin only)
app.post('/events/:eventId/award-prize', isAdmin, async (req, res) => {
  const { userId, amount } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const user = await db.findUserById(userId);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const newWallet = (user.wallet || 0) + amount;
    const transactions = user.transactions || [];
    transactions.push({
      type: `Prize - ${event.name}`,
      amount: amount,
      timestamp: new Date().toISOString()
    });
    
    await db.updateUser(user.id, { wallet: newWallet, transactions });

    const prizes = event.prizes || {};
    prizes[userId] = amount;
    await db.updateEvent(event.id, { prizes });

    // Notify user
    broadcastNotification({ 
      type: 'prize_awarded', 
      userId: userId, 
      amount: amount, 
      eventName: event.name 
    });

    res.json({ ok: true, message: `Awarded ${amount} credits to ${user.username}` });
  } catch (error) {
    console.error('Award prize error:', error);
    res.status(500).json({ ok: false, message: 'Failed to award prize' });
  }
});

// Generate bracket (admin only)
app.post('/events/:eventId/bracket/generate', isAdmin, async (req, res) => {
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const registrations = event.registrations || [];
    const participants = registrations.map((r, index) => ({
      id: r.userId || r.teamId,
      name: r.username || r.teamName,
      seed: index + 1,
      checkedIn: r.checkedIn
    }));

    const rounds = Math.max(2, Math.ceil(Math.log2(participants.length)));
    const bracket = [];

    for (let round = 0; round < rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round - 1);
      const roundMatches = [];

      for (let match = 0; match < matchesInRound; match++) {
        if (round === 0) {
          const p1Index = match * 2;
          const p2Index = match * 2 + 1;
          
          roundMatches.push({
            matchId: `R${round}-M${match}`,
            round: round,
            participant1: participants[p1Index] || null,
            participant2: participants[p2Index] || null,
            winner: null,
            scheduledTime: null
          });
        } else {
          roundMatches.push({
            matchId: `R${round}-M${match}`,
            round: round,
            participant1: null,
            participant2: null,
            winner: null,
            scheduledTime: null
          });
        }
      }

      bracket.push(roundMatches);
    }

    let loserBracket = null;
    
    // Generate loser bracket for double elimination
    if (event.elimination_type === 'double') {
      const loserRounds = rounds - 1;
      loserBracket = [];
      
      for (let round = 0; round < loserRounds; round++) {
        const matchesInRound = Math.pow(2, loserRounds - round - 1);
        const roundMatches = [];
        
        for (let match = 0; match < matchesInRound; match++) {
          roundMatches.push({
            matchId: `LR${round}-M${match}`,
            round: round,
            participant1: null,
            participant2: null,
            winner: null,
            scheduledTime: null
          });
        }
        
        loserBracket.push(roundMatches);
      }
    }
    
    await db.updateEvent(event.id, { bracket, loserBracket });

    res.json({ ok: true, bracket, loserBracket });
  } catch (error) {
    console.error('Generate bracket error:', error);
    res.status(500).json({ ok: false, message: 'Failed to generate bracket' });
  }
});

// Update match result (admin only)
app.post('/events/:eventId/matches/:matchId/result', isAdmin, async (req, res) => {
  const { winnerId } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event || !event.bracket) {
      return res.status(404).json({ ok: false, message: 'Event or bracket not found' });
    }

    let matchFound = false;
    let loser = null;
    const bracket = event.bracket;
    const loserBracket = event.loser_bracket;
    
    // Check winner bracket
    for (const round of bracket) {
      const match = round.find(m => m.matchId === req.params.matchId);
      if (match) {
        const winner = match.participant1?.id === winnerId ? match.participant1 : match.participant2;
        loser = match.participant1?.id === winnerId ? match.participant2 : match.participant1;
        match.winner = winner;
        matchFound = true;

        // Advance winner to next round
        const nextRound = bracket[match.round + 1];
        if (nextRound) {
          const nextMatchIndex = Math.floor(round.indexOf(match) / 2);
          const nextMatch = nextRound[nextMatchIndex];
          if (!nextMatch.participant1) {
            nextMatch.participant1 = winner;
          } else {
            nextMatch.participant2 = winner;
          }
        }
        
        // For double elimination, send loser to loser bracket
        if (event.elimination_type === 'double' && loserBracket && loser) {
          const loserRound = loserBracket[match.round];
          if (loserRound) {
            const loserMatch = loserRound.find(m => !m.participant1 || !m.participant2);
            if (loserMatch) {
              if (!loserMatch.participant1) {
                loserMatch.participant1 = loser;
              } else {
                loserMatch.participant2 = loser;
              }
            }
          }
        }
        
        break;
      }
    }
    
    // Check loser bracket if not found in winner bracket
    if (!matchFound && loserBracket) {
      for (const round of loserBracket) {
        const match = round.find(m => m.matchId === req.params.matchId);
        if (match) {
          const winner = match.participant1?.id === winnerId ? match.participant1 : match.participant2;
          match.winner = winner;
          matchFound = true;

          // Advance winner in loser bracket
          const nextRound = loserBracket[match.round + 1];
          if (nextRound) {
            const nextMatchIndex = Math.floor(round.indexOf(match) / 2);
            const nextMatch = nextRound[nextMatchIndex];
            if (!nextMatch.participant1) {
              nextMatch.participant1 = winner;
            } else {
              nextMatch.participant2 = winner;
            }
          }
          break;
        }
      }
    }

    if (!matchFound) {
      return res.status(404).json({ ok: false, message: 'Match not found' });
    }

    await db.updateEvent(event.id, { bracket, loserBracket });

    res.json({ ok: true, bracket, loserBracket });
  } catch (error) {
    console.error('Update match result error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update match result' });
  }
});

// Schedule match (admin only)
app.post('/events/:eventId/matches/:matchId/schedule', isAdmin, async (req, res) => {
  const { scheduledTime } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event || !event.bracket) {
      return res.status(404).json({ ok: false, message: 'Event or bracket not found' });
    }

    let matchFound = false;
    const bracket = event.bracket;
    const loserBracket = event.loser_bracket;
    
    for (const round of bracket) {
      const match = round.find(m => m.matchId === req.params.matchId);
      if (match) {
        match.scheduledTime = scheduledTime;
        matchFound = true;
        break;
      }
    }
    
    if (!matchFound && loserBracket) {
      for (const round of loserBracket) {
        const match = round.find(m => m.matchId === req.params.matchId);
        if (match) {
          match.scheduledTime = scheduledTime;
          matchFound = true;
          break;
        }
      }
    }

    if (!matchFound) {
      return res.status(404).json({ ok: false, message: 'Match not found' });
    }

    await db.updateEvent(event.id, { bracket, loserBracket });

    res.json({ ok: true });
  } catch (error) {
    console.error('Schedule match error:', error);
    res.status(500).json({ ok: false, message: 'Failed to schedule match' });
  }
});

// Manually update match participants (admin only)
app.post('/events/:eventId/matches/:matchId/update', isAdmin, async (req, res) => {
  const { participant1Id, participant2Id } = req.body;
  
  try {
    const event = await db.findEventById(req.params.eventId);

    if (!event || !event.bracket) {
      return res.status(404).json({ ok: false, message: 'Event or bracket not found' });
    }

    const getParticipant = (id) => {
      if (!id) return null;
      const registrations = event.registrations || [];
      const reg = registrations.find(r => r.userId === id || r.teamId === id);
      if (!reg) return null;
      return {
        id: reg.userId || reg.teamId,
        name: reg.username || reg.teamName,
        checkedIn: reg.checkedIn
      };
    };

    let matchFound = false;
    const bracket = event.bracket;
    
    for (const round of bracket) {
      const match = round.find(m => m.matchId === req.params.matchId);
      if (match) {
        if (participant1Id !== undefined) match.participant1 = getParticipant(participant1Id);
        if (participant2Id !== undefined) match.participant2 = getParticipant(participant2Id);
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      return res.status(404).json({ ok: false, message: 'Match not found' });
    }

    await db.updateEvent(event.id, { bracket });

    res.json({ ok: true, bracket });
  } catch (error) {
    console.error('Update match participants error:', error);
    res.status(500).json({ ok: false, message: 'Failed to update match participants' });
  }
});

// Delete event (admin only)
app.delete('/events/:eventId', isAdmin, async (req, res) => {
  try {
    await db.deleteEvent(req.params.eventId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete event' });
  }
});
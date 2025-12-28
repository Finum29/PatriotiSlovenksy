// events.jsw - Event Management Backend Module
import wixData from 'wix-data';
import { updateWallet } from './users.jsw';

/**
 * Get all events
 * @returns {Promise<Object>} All events
 */
export async function getAllEvents() {
  try {
    const results = await wixData.query('Events')
      .descending('createdAt')
      .find();

    return { ok: true, events: results.items };
  } catch (error) {
    console.error('Get events error:', error);
    return { ok: false, message: 'Failed to load events' };
  }
}

/**
 * Get event by ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Event data
 */
export async function getEventById(eventId) {
  try {
    const event = await wixData.get('Events', eventId);
    return { ok: true, event };
  } catch (error) {
    console.error('Get event error:', error);
    return { ok: false, message: 'Event not found' };
  }
}

/**
 * Create event (admin only)
 * @param {Object} eventData - Event details
 * @param {boolean} isAdmin - Is user admin
 * @returns {Promise<Object>} Created event
 */
export async function createEvent(eventData, isAdmin) {
  if (!isAdmin) {
    return { ok: false, message: 'Admin access required' };
  }

  const { name, description, date, time, mode, eliminationType, iconUrl, streamUrl, lobbyUrl, teamSize, entryFee, firstPrize, secondPrize, thirdPrize } = eventData;

  if (!name || !date || !time || !mode) {
    return { ok: false, message: 'Missing required fields' };
  }

  try {
    const validatedTeamSize = teamSize && mode !== 'solo' ? Math.min(Math.max(parseInt(teamSize), 1), 5) : null;

    const newEvent = {
      name,
      description: description || '',
      date,
      time,
      mode,
      eliminationType: eliminationType || 'single',
      iconUrl: iconUrl || '',
      streamUrl: streamUrl || '',
      lobbyUrl: lobbyUrl || '',
      teamSize: validatedTeamSize,
      entryFee: parseInt(entryFee) || 0,
      prizePool: {
        first: parseInt(firstPrize) || 0,
        second: parseInt(secondPrize) || 0,
        third: parseInt(thirdPrize) || 0
      },
      prizes: {},
      status: 'upcoming',
      registrations: [],
      bracket: null,
      loserBracket: null,
      winner: null,
      disqualified: [],
      createdAt: new Date()
    };

    const result = await wixData.insert('Events', newEvent);
    return { ok: true, event: result };
  } catch (error) {
    console.error('Create event error:', error);
    return { ok: false, message: 'Failed to create event' };
  }
}

/**
 * Update event (admin only)
 * @param {string} eventId - Event ID
 * @param {Object} updates - Event updates
 * @param {boolean} isAdmin - Is user admin
 * @returns {Promise<Object>} Updated event
 */
export async function updateEvent(eventId, updates, isAdmin) {
  if (!isAdmin) {
    return { ok: false, message: 'Admin access required' };
  }

  try {
    const event = await wixData.get('Events', eventId);

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        event[key] = updates[key];
      }
    });

    const result = await wixData.update('Events', event);
    return { ok: true, event: result };
  } catch (error) {
    console.error('Update event error:', error);
    return { ok: false, message: 'Failed to update event' };
  }
}

/**
 * Register for event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {string} type - Registration type ('solo' or 'team')
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Registration result
 */
export async function registerForEvent(eventId, userId, type, userData) {
  try {
    const event = await wixData.get('Events', eventId);
    const user = await wixData.get('Users', userId);

    if (event.status !== 'upcoming') {
      return { ok: false, message: 'Event is not open for registration' };
    }

    if (user.status === 'banned' || user.status === 'suspended') {
      return { ok: false, message: 'Account restricted' };
    }

    // Check if already registered
    const alreadyRegistered = event.registrations.some(r =>
      r.userId === userId || (r.teamId && r.teamId === user.teamId)
    );

    if (alreadyRegistered) {
      return { ok: false, message: 'Already registered' };
    }

    // Check registration deadline
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const minutesDiff = (eventDateTime - now) / (1000 * 60);

    if (minutesDiff < -5) {
      return { ok: false, message: 'Registration closed' };
    }

    // Handle entry fee
    if (event.entryFee > 0) {
      if (type === 'team') {
        const team = await wixData.get('Teams', user.teamId);
        if (team.captainId !== userId) {
          return { ok: false, message: 'Only captain can register team for paid events' };
        }
      }

      if ((user.wallet || 0) < event.entryFee) {
        return { ok: false, message: `Insufficient funds. Entry fee: ${event.entryFee} credits` };
      }

      // Deduct entry fee
      await updateWallet(userId, -event.entryFee, `Event Entry Fee - ${event.name}`);
    }

    // Add registration
    if (type === 'team') {
      if (!user.teamId) {
        return { ok: false, message: 'Not in a team' };
      }

      const team = await wixData.get('Teams', user.teamId);

      if (team.captainId !== userId) {
        return { ok: false, message: 'Only captain can register team' };
      }

      if (event.teamSize && team.members.length > event.teamSize) {
        return { ok: false, message: `Team size exceeds limit. This event requires ${event.teamSize} players per team.` };
      }

      event.registrations.push({
        type: 'team',
        teamId: team._id,
        teamName: team.name,
        memberCount: team.members.length,
        captainId: userId,
        registeredAt: new Date(),
        checkedIn: false,
        paidEntry: event.entryFee > 0
      });
    } else {
      event.registrations.push({
        type: 'solo',
        userId: userId,
        username: user.username,
        registeredAt: new Date(),
        checkedIn: false,
        paidEntry: event.entryFee > 0
      });
    }

    await wixData.update('Events', event);

    // Update user's registered events
    user.registeredEvents = user.registeredEvents || [];
    user.registeredEvents.push(eventId);
    await wixData.update('Users', user);

    return { ok: true };
  } catch (error) {
    console.error('Register for event error:', error);
    return { ok: false, message: 'Failed to register for event' };
  }
}

/**
 * Check-in for event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Check-in result
 */
export async function checkInForEvent(eventId, userId) {
  try {
    const event = await wixData.get('Events', eventId);
    const user = await wixData.get('Users', userId);

    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const minutesDiff = (eventDateTime - now) / (1000 * 60);

    if (minutesDiff > 10) {
      return { ok: false, message: 'Check-in opens 10 minutes before the event' };
    }

    const registration = event.registrations.find(r =>
      r.userId === userId || (r.teamId && r.teamId === user.teamId)
    );

    if (!registration) {
      return { ok: false, message: 'Not registered' };
    }

    if (registration.type === 'team') {
      const team = await wixData.get('Teams', user.teamId);
      if (team.captainId !== userId) {
        return { ok: false, message: 'Only captain can check in' };
      }
    }

    registration.checkedIn = true;
    await wixData.update('Events', event);

    return { ok: true, message: 'Checked in successfully' };
  } catch (error) {
    console.error('Check-in error:', error);
    return { ok: false, message: 'Failed to check in' };
  }
}

/**
 * Unregister from event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Unregister result
 */
export async function unregisterFromEvent(eventId, userId) {
  try {
    const event = await wixData.get('Events', eventId);
    const user = await wixData.get('Users', userId);

    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const minutesDiff = (eventDateTime - now) / (1000 * 60);

    if (minutesDiff < 0) {
      return { ok: false, message: 'Cannot unregister after event start' };
    }

    // Find registration
    const registration = event.registrations.find(r =>
      r.userId === userId || (r.teamId && r.teamId === user.teamId)
    );

    // Refund entry fee if paid
    if (registration && registration.paidEntry && event.entryFee > 0) {
      await updateWallet(userId, event.entryFee, `Event Entry Refund - ${event.name}`);
    }

    // Remove registration
    event.registrations = event.registrations.filter(r =>
      r.userId !== userId && r.teamId !== user.teamId
    );

    await wixData.update('Events', event);

    // Update user's registered events
    user.registeredEvents = (user.registeredEvents || []).filter(id => id !== eventId);
    await wixData.update('Users', user);

    return { ok: true };
  } catch (error) {
    console.error('Unregister error:', error);
    return { ok: false, message: 'Failed to unregister from event' };
  }
}

/**
 * Update event status (admin only)
 * @param {string} eventId - Event ID
 * @param {string} status - New status
 * @param {Object} updates - Additional updates
 * @param {boolean} isAdmin - Is user admin
 * @returns {Promise<Object>} Update result
 */
export async function updateEventStatus(eventId, status, updates, isAdmin) {
  if (!isAdmin) {
    return { ok: false, message: 'Admin access required' };
  }

  try {
    const event = await wixData.get('Events', eventId);
    event.status = status;

    if (updates.streamUrl !== undefined) {
      event.streamUrl = updates.streamUrl;
    }

    if (updates.lobbyUrl !== undefined) {
      event.lobbyUrl = updates.lobbyUrl;
    }

    if (status === 'finished') {
      event.finishedAt = new Date();
    }

    await wixData.update('Events', event);
    return { ok: true, event };
  } catch (error) {
    console.error('Update status error:', error);
    return { ok: false, message: 'Failed to update event status' };
  }
}

/**
 * Generate tournament bracket (admin only)
 * @param {string} eventId - Event ID
 * @param {boolean} isAdmin - Is user admin
 * @returns {Promise<Object>} Generated bracket
 */
export async function generateBracket(eventId, isAdmin) {
  if (!isAdmin) {
    return { ok: false, message: 'Admin access required' };
  }

  try {
    const event = await wixData.get('Events', eventId);

    const participants = event.registrations.map((r, index) => ({
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

    event.bracket = bracket;

    // Generate loser bracket for double elimination
    if (event.eliminationType === 'double') {
      const loserRounds = rounds - 1;
      const loserBracket = [];

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

      event.loserBracket = loserBracket;
    }

    await wixData.update('Events', event);

    return { ok: true, bracket: event.bracket, loserBracket: event.loserBracket };
  } catch (error) {
    console.error('Generate bracket error:', error);
    return { ok: false, message: 'Failed to generate bracket' };
  }
}

/**
 * Update match result (admin only)
 * @param {string} eventId - Event ID
 * @param {string} matchId - Match ID
 * @param {string} winnerId - Winner ID
 * @param {boolean} isAdmin - Is user admin
 * @returns {Promise<Object>} Update result
 */
export async function updateMatchResult(eventId, matchId, winnerId, isAdmin) {
  if (!isAdmin) {
    return { ok: false, message: 'Admin access required' };
  }

  try {
    const event = await wixData.get('Events', eventId);

    if (!event.bracket) {
      return { ok: false, message: 'Bracket not found' };
    }

    let matchFound = false;
    let loser = null;

    // Check winner bracket
    for (const round of event.bracket) {
      const match = round.find(m => m.matchId === matchId);
      if (match) {
        const winner = match.participant1?.id === winnerId ? match.participant1 : match.participant2;
        loser = match.participant1?.id === winnerId ? match.participant2 : match.participant1;
        match.winner = winner;
        matchFound = true;

        // Advance winner to next round
        const nextRound = event.bracket[match.round + 1];
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
        if (event.eliminationType === 'double' && event.loserBracket && loser) {
          const loserRound = event.loserBracket[match.round];
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

    // Check loser bracket if not found
    if (!matchFound && event.loserBracket) {
      for (const round of event.loserBracket) {
        const match = round.find(m => m.matchId === matchId);
        if (match) {
          const winner = match.participant1?.id === winnerId ? match.participant1 : match.participant2;
          match.winner = winner;
          matchFound = true;

          // Advance winner in loser bracket
          const nextRound = event.loserBracket[match.round + 1];
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
      return { ok: false, message: 'Match not found' };
    }

    await wixData.update('Events', event);
    return { ok: true, bracket: event.bracket, loserBracket: event.loserBracket };
  } catch (error) {
    console.error('Update match error:', error);
    return { ok: false, message: 'Failed to update match result' };
  }
}

/**
 * Award prize (admin only)
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {number} amount - Prize amount
 * @param {boolean} isAdmin - Is user admin
 * @returns {Promise<Object>} Award result
 */
export async function awardPrize(eventId, userId, amount, isAdmin) {
  if (!isAdmin) {
    return { ok: false, message: 'Admin access required' };
  }

  try {
    const event = await wixData.get('Events', eventId);
    const user = await wixData.get('Users', userId);

    await updateWallet(userId, amount, `Prize - ${event.name}`);

    event.prizes = event.prizes || {};
    event.prizes[userId] = amount;
    await wixData.update('Events', event);

    return { ok: true, message: `Awarded ${amount} credits to ${user.username}` };
  } catch (error) {
    console.error('Award prize error:', error);
    return { ok: false, message: 'Failed to award prize' };
  }
}

/**
 * Delete event (admin only)
 * @param {string} eventId - Event ID
 * @param {boolean} isAdmin - Is user admin
 * @returns {Promise<Object>} Delete result
 */
export async function deleteEvent(eventId, isAdmin) {
  if (!isAdmin) {
    return { ok: false, message: 'Admin access required' };
  }

  try {
    await wixData.remove('Events', eventId);
    return { ok: true };
  } catch (error) {
    console.error('Delete event error:', error);
    return { ok: false, message: 'Failed to delete event' };
  }
}
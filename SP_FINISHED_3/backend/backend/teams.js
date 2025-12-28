// teams.jsw - Team Management Backend Module
import wixData from 'wix-data';

/**
 * Create a new team
 * @param {string} userId - User ID
 * @param {Object} teamData - Team details
 * @returns {Promise<Object>} Created team
 */
export async function createTeam(userId, teamData) {
  const { name, description, motto } = teamData;

  if (!name) {
    return { ok: false, message: 'Team name required' };
  }

  try {
    const user = await wixData.get('Users', userId);

    if (user.teamId) {
      return { ok: false, message: 'Already in a team' };
    }

    // Generate unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const newTeam = {
      name,
      description: description || '',
      motto: motto || '',
      captainId: userId,
      members: [userId],
      inviteCode,
      createdAt: new Date()
    };

    const result = await wixData.insert('Teams', newTeam);

    // Update user's teamId
    user.teamId = result._id;
    await wixData.update('Users', user);

    return { ok: true, team: result };
  } catch (error) {
    console.error('Create team error:', error);
    return { ok: false, message: 'Failed to create team' };
  }
}

/**
 * Get team by ID
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Team data with member details
 */
export async function getTeamById(teamId) {
  try {
    const team = await wixData.get('Teams', teamId);

    // Get member details
    const memberDetails = await Promise.all(
      team.members.map(async (memberId) => {
        try {
          const user = await wixData.get('Users', memberId);
          return {
            id: user._id,
            username: user.username,
            isCaptain: user._id === team.captainId
          };
        } catch (error) {
          return null;
        }
      })
    );

    return {
      ok: true,
      team: {
        ...team,
        memberDetails: memberDetails.filter(m => m !== null)
      }
    };
  } catch (error) {
    console.error('Get team error:', error);
    return { ok: false, message: 'Team not found' };
  }
}

/**
 * Join team with invite code
 * @param {string} userId - User ID
 * @param {string} inviteCode - Team invite code
 * @returns {Promise<Object>} Join result
 */
export async function joinTeam(userId, inviteCode) {
  if (!inviteCode) {
    return { ok: false, message: 'Invite code required' };
  }

  try {
    const user = await wixData.get('Users', userId);

    if (user.teamId) {
      return { ok: false, message: 'Already in a team' };
    }

    // Find team by invite code
    const results = await wixData.query('Teams')
      .eq('inviteCode', inviteCode.toUpperCase())
      .find();

    if (results.items.length === 0) {
      return { ok: false, message: 'Invalid invite code' };
    }

    const team = results.items[0];

    // Add user to team
    team.members.push(userId);
    await wixData.update('Teams', team);

    // Update user's teamId
    user.teamId = team._id;
    await wixData.update('Users', user);

    return { ok: true, team };
  } catch (error) {
    console.error('Join team error:', error);
    return { ok: false, message: 'Failed to join team' };
  }
}

/**
 * Leave team
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Leave result
 */
export async function leaveTeam(userId) {
  try {
    const user = await wixData.get('Users', userId);

    if (!user.teamId) {
      return { ok: false, message: 'Not in a team' };
    }

    const team = await wixData.get('Teams', user.teamId);

    if (team.captainId === userId) {
      return { ok: false, message: 'Captain cannot leave. Transfer captaincy or disband team' };
    }

    // Check if team is in any active events
    const eventResults = await wixData.query('Events')
      .hasSome('registrations', [{ teamId: team._id }])
      .find();

    if (eventResults.items.length > 0) {
      return { ok: false, message: 'Cannot leave while team is registered in an event' };
    }

    // Remove user from team
    team.members = team.members.filter(m => m !== userId);
    await wixData.update('Teams', team);

    // Update user
    user.teamId = null;
    await wixData.update('Users', user);

    return { ok: true };
  } catch (error) {
    console.error('Leave team error:', error);
    return { ok: false, message: 'Failed to leave team' };
  }
}

/**
 * Kick member from team (captain only)
 * @param {string} teamId - Team ID
 * @param {string} captainId - Captain user ID
 * @param {string} memberId - Member to kick
 * @returns {Promise<Object>} Kick result
 */
export async function kickMember(teamId, captainId, memberId) {
  try {
    const team = await wixData.get('Teams', teamId);

    if (team.captainId !== captainId) {
      return { ok: false, message: 'Only captain can kick members' };
    }

    // Check if team is in any active events
    const eventResults = await wixData.query('Events')
      .hasSome('registrations', [{ teamId: team._id }])
      .find();

    if (eventResults.items.length > 0) {
      return { ok: false, message: 'Cannot kick members while registered in an event' };
    }

    // Remove member from team
    team.members = team.members.filter(m => m !== memberId);
    await wixData.update('Teams', team);

    // Update member's teamId
    const member = await wixData.get('Users', memberId);
    member.teamId = null;
    await wixData.update('Users', member);

    return { ok: true };
  } catch (error) {
    console.error('Kick member error:', error);
    return { ok: false, message: 'Failed to kick member' };
  }
}

/**
 * Transfer captaincy (captain only)
 * @param {string} teamId - Team ID
 * @param {string} currentCaptainId - Current captain ID
 * @param {string} newCaptainId - New captain ID
 * @returns {Promise<Object>} Transfer result
 */
export async function transferCaptaincy(teamId, currentCaptainId, newCaptainId) {
  try {
    const team = await wixData.get('Teams', teamId);

    if (team.captainId !== currentCaptainId) {
      return { ok: false, message: 'Only captain can transfer captaincy' };
    }

    if (!team.members.includes(newCaptainId)) {
      return { ok: false, message: 'New captain must be a team member' };
    }

    team.captainId = newCaptainId;
    await wixData.update('Teams', team);

    return { ok: true };
  } catch (error) {
    console.error('Transfer captaincy error:', error);
    return { ok: false, message: 'Failed to transfer captaincy' };
  }
}

/**
 * Disband team (captain only)
 * @param {string} teamId - Team ID
 * @param {string} captainId - Captain user ID
 * @returns {Promise<Object>} Disband result
 */
export async function disbandTeam(teamId, captainId) {
  try {
    const team = await wixData.get('Teams', teamId);

    if (team.captainId !== captainId) {
      return { ok: false, message: 'Only captain can disband team' };
    }

    // Check if team is in any active events
    const eventResults = await wixData.query('Events')
      .hasSome('registrations', [{ teamId: team._id }])
      .find();

    if (eventResults.items.length > 0) {
      return { ok: false, message: 'Cannot disband team while registered in an event' };
    }

    // Remove team from all members
    for (const memberId of team.members) {
      try {
        const user = await wixData.get('Users', memberId);
        user.teamId = null;
        await wixData.update('Users', user);
      } catch (error) {
        console.error(`Failed to update user ${memberId}:`, error);
      }
    }

    // Delete team
    await wixData.remove('Teams', teamId);

    return { ok: true };
  } catch (error) {
    console.error('Disband team error:', error);
    return { ok: false, message: 'Failed to disband team' };
  }
}

/**
 * Get all teams (admin only)
 * @param {boolean} isAdmin - Is user admin
 * @returns {Promise<Object>} All teams with details
 */
export async function getAllTeams(isAdmin) {
  if (!isAdmin) {
    return { ok: false, message: 'Admin access required' };
  }

  try {
    const results = await wixData.query('Teams')
      .descending('createdAt')
      .find();

    const teamsWithDetails = await Promise.all(
      results.items.map(async (team) => {
        const captain = await wixData.get('Users', team.captainId);
        const memberDetails = await Promise.all(
          team.members.map(async (memberId) => {
            try {
              const member = await wixData.get('Users', memberId);
              return {
                id: member._id,
                username: member.username
              };
            } catch (error) {
              return null;
            }
          })
        );

        return {
          ...team,
          captainName: captain.username,
          memberDetails: memberDetails.filter(m => m !== null)
        };
      })
    );

    return { ok: true, teams: teamsWithDetails };
  } catch (error) {
    console.error('Get all teams error:', error);
    return { ok: false, message: 'Failed to load teams' };
  }
}

/**
 * Delete team (admin only)
 * @param {string} teamId - Team ID
 * @param {boolean} isAdmin - Is user admin
 * @returns {Promise<Object>} Delete result
 */
export async function deleteTeam(teamId, isAdmin) {
  if (!isAdmin) {
    return { ok: false, message: 'Admin access required' };
  }

  try {
    const team = await wixData.get('Teams', teamId);

    // Remove team from all members
    for (const memberId of team.members) {
      try {
        const user = await wixData.get('Users', memberId);
        user.teamId = null;
        await wixData.update('Users', user);
      } catch (error) {
        console.error(`Failed to update user ${memberId}:`, error);
      }
    }

    // Delete team
    await wixData.remove('Teams', teamId);

    return { ok: true };
  } catch (error) {
    console.error('Delete team error:', error);
    return { ok: false, message: 'Failed to delete team' };
  }
}
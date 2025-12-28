// chat.jsw - Chat Backend Module
import wixData from 'wix-data';

/**
 * Send a chat message
 * @param {string} userId - User ID
 * @param {Object} messageData - Message details
 * @returns {Promise<Object>} Sent message
 */
export async function sendMessage(userId, messageData) {
  const { message, room } = messageData;

  if (!message) {
    return { ok: false, message: 'Message content required' };
  }

  try {
    const user = await wixData.get('Users', userId);

    const chatMessage = {
      userId: userId,
      username: user.username,
      message: message,
      isAdmin: user.isAdmin || false,
      room: room || 'global',
      timestamp: new Date()
    };

    const result = await wixData.insert('ChatMessages', chatMessage);
    return { ok: true, message: result };
  } catch (error) {
    console.error('Send message error:', error);
    return { ok: false, message: 'Failed to send message' };
  }
}

/**
 * Get chat messages for a room
 * @param {string} room - Room name
 * @param {number} limit - Number of messages to retrieve
 * @returns {Promise<Object>} Chat messages
 */
export async function getChatMessages(room, limit = 100) {
  try {
    const results = await wixData.query('ChatMessages')
      .eq('room', room || 'global')
      .descending('timestamp')
      .limit(limit)
      .find();

    // Reverse to show oldest first
    const messages = results.items.reverse();

    return { ok: true, messages };
  } catch (error) {
    console.error('Get chat messages error:', error);
    return { ok: false, message: 'Failed to load messages' };
  }
}

/**
 * Send a tournament chat message
 * @param {string} userId - User ID
 * @param {Object} messageData - Message details
 * @returns {Promise<Object>} Sent message
 */
export async function sendTournamentMessage(userId, messageData) {
  const { message, room, isCaptain, teamId } = messageData;

  if (!message || !room) {
    return { ok: false, message: 'Message content and room required' };
  }

  try {
    const user = await wixData.get('Users', userId);

    const chatMessage = {
      userId: userId,
      username: user.username,
      message: message,
      isAdmin: user.isAdmin || false,
      isCaptain: isCaptain || false,
      teamId: teamId || null,
      room: room,
      timestamp: new Date()
    };

    const result = await wixData.insert('TournamentChat', chatMessage);
    return { ok: true, message: result };
  } catch (error) {
    console.error('Send tournament message error:', error);
    return { ok: false, message: 'Failed to send message' };
  }
}

/**
 * Get tournament chat messages for a room
 * @param {string} room - Room name
 * @param {number} limit - Number of messages to retrieve
 * @returns {Promise<Object>} Tournament chat messages
 */
export async function getTournamentChatMessages(room, limit = 100) {
  try {
    const results = await wixData.query('TournamentChat')
      .eq('room', room)
      .descending('timestamp')
      .limit(limit)
      .find();

    // Reverse to show oldest first
    const messages = results.items.reverse();

    return { ok: true, messages };
  } catch (error) {
    console.error('Get tournament chat messages error:', error);
    return { ok: false, message: 'Failed to load messages' };
  }
}

/**
 * Delete a message (admin only)
 * @param {string} messageId - Message ID
 * @param {string} collection - Collection name ('ChatMessages' or 'TournamentChat')
 * @param {boolean} isAdmin - Is user admin
 * @returns {Promise<Object>} Delete result
 */
export async function deleteMessage(messageId, collection, isAdmin) {
  if (!isAdmin) {
    return { ok: false, message: 'Admin access required' };
  }

  try {
    await wixData.remove(collection, messageId);
    return { ok: true };
  } catch (error) {
    console.error('Delete message error:', error);
    return { ok: false, message: 'Failed to delete message' };
  }
}
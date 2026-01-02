// TICKET ROUTES - Complete PostgreSQL Conversion
// Add these routes to server-postgres.js after the event routes

// Create ticket
app.post('/tickets/create', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Please login to submit a support ticket' });
  }

  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ ok: false, message: 'Subject and message required' });
  }

  try {
    const newTicket = await db.createTicket({
      id: Date.now().toString(),
      userId: req.session.user.id,
      username: req.session.user.username,
      subject,
      message,
      status: 'open',
      responses: [],
      messages: [
        {
          id: Date.now().toString(),
          userId: req.session.user.id,
          username: req.session.user.username,
          message: message,
          isAdmin: false,
          timestamp: new Date().toISOString()
        }
      ],
      hasUnreadResponse: false,
      createdAt: new Date()
    });

    // Notify admins about new ticket
    broadcastToAdmins({ 
      type: 'new_ticket', 
      ticket: newTicket 
    });

    res.json({ ok: true, ticket: newTicket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ ok: false, message: 'Failed to create ticket' });
  }
});

// Get user's tickets
app.get('/tickets/my', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  try {
    const userTickets = await db.findTicketsByUserId(req.session.user.id);
    res.json({ ok: true, tickets: userTickets });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load tickets' });
  }
});

// Mark ticket responses as read
app.post('/tickets/:ticketId/mark-read', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false, message: 'Not logged in' });
  }

  try {
    const ticket = await db.findTicketById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    if (ticket.user_id !== req.session.user.id) {
      return res.status(403).json({ ok: false, message: 'Unauthorized' });
    }

    await db.updateTicket(ticket.id, { hasUnreadResponse: false });

    res.json({ ok: true });
  } catch (error) {
    console.error('Mark ticket as read error:', error);
    res.status(500).json({ ok: false, message: 'Failed to mark ticket as read' });
  }
});

// Get all tickets (admin only)
app.get('/tickets', isAdmin, async (req, res) => {
  try {
    const tickets = await db.getAllTickets();
    res.json({ ok: true, tickets });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ ok: false, message: 'Failed to load tickets' });
  }
});

// Respond to ticket (admin only)
app.post('/tickets/:ticketId/respond', isAdmin, async (req, res) => {
  const { message } = req.body;
  
  try {
    const ticket = await db.findTicketById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    const responses = ticket.responses || [];
    responses.push({
      message,
      respondedBy: req.session.user.username,
      respondedAt: new Date().toISOString()
    });
    
    const messages = ticket.messages || [];
    messages.push({
      id: Date.now().toString(),
      userId: req.session.user.id,
      username: req.session.user.username,
      message: message,
      isAdmin: true,
      timestamp: new Date().toISOString()
    });

    await db.updateTicket(ticket.id, {
      responses,
      messages,
      hasUnreadResponse: true
    });

    const updatedTicket = await db.findTicketById(ticket.id);

    res.json({ ok: true, ticket: updatedTicket });
  } catch (error) {
    console.error('Respond to ticket error:', error);
    res.status(500).json({ ok: false, message: 'Failed to respond to ticket' });
  }
});

// Close ticket (admin only)
app.post('/tickets/:ticketId/close', isAdmin, async (req, res) => {
  try {
    const ticket = await db.findTicketById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    await db.updateTicket(ticket.id, {
      status: 'closed',
      closedAt: new Date()
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({ ok: false, message: 'Failed to close ticket' });
  }
});

// Reopen ticket (admin only)
app.post('/tickets/:ticketId/reopen', isAdmin, async (req, res) => {
  try {
    const ticket = await db.findTicketById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ ok: false, message: 'Ticket not found' });
    }

    await db.updateTicket(ticket.id, {
      status: 'open',
      closedAt: null
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Reopen ticket error:', error);
    res.status(500).json({ ok: false, message: 'Failed to reopen ticket' });
  }
});
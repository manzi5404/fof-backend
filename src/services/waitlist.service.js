const { supabase } = require('../config/supabase');
const waitlistRepo = require('../repositories/waitlist.repository');
const notificationService = require('./notification.service');
const { events } = require('../events');
const { ValidationError } = require('../utils/errors');

async function addToWaitlist({ name, email, phone, source }) {
  if (!email) {
    throw new ValidationError('Email is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  const entry = await waitlistRepo.create({
    name: name || null,
    email: email.trim().toLowerCase(),
    phone: phone || null,
    source: source || 'web',
  });

  events.emit(events.WAITLIST_JOINED, { entry });

  return {
    id: entry.id,
    name: entry.name,
    email: entry.email,
    phone: entry.phone,
    notified: entry.notified,
    created_at: entry.created_at,
  };
}

async function notifyForDrop(dropId, dropTitle) {
  const unnotified = await waitlistRepo.findUnnotified(1000);

  let notifiedCount = 0;

  for (const entry of unnotified) {
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('email', entry.email)
      .maybeSingle();

    if (userRow) {
      await notificationService.createForUser(
        userRow.id,
        'drop',
        `New drop available: ${dropTitle}`
      );
      notifiedCount++;
    }
  }

  const ids = unnotified.map((e) => e.id);
  if (ids.length > 0) {
    await waitlistRepo.markNotified(ids);
  }

  return {
    totalEntries: unnotified.length,
    notifiedCount,
  };
}

async function getAllForAdmin() {
  return waitlistRepo.findAll();
}

module.exports = {
  addToWaitlist,
  notifyForDrop,
  getAllForAdmin,
};

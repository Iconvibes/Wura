const fs = require('fs');
const content = fs.readFileSync('server/routes/public.js', 'utf8');

const newRoutes = `
/* ======================== GUEST MESSAGING (public) ======================== */
import GuestMessage from '../models/GuestMessage.js';

router.post('/guest-messages', rateLimit, async (req, res, next) => {
  try {
    const { ref, name, email, text } = req.body || {};
    if (!ref || !name || !email || !text) {
      return res.status(400).json({ error: 'Booking reference, name, email, and message are required.' });
    }
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    const cleanRef = String(ref).trim();
    const cleanText = String(text).trim();
    if (cleanText.length > 2000) return res.status(400).json({ error: 'Message is too long (max 2000 characters).' });

    const refEsc = cleanRef.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const booking = await Booking.findOne({ ref: { $regex: '^' + refEsc + '$', $options: 'i' } })
      .populate('room', 'name room_number')
      .lean();
    if (!booking) return res.status(404).json({ error: 'No booking found with that reference.' });

    let thread = await GuestMessage.findOne({ booking: booking._id });
    if (!thread) {
      thread = await GuestMessage.create({
        booking: booking._id,
        guest_name: String(name).trim(),
        guest_email: String(email).trim(),
        room_name: booking.room?.name || '',
        room_number: booking.room?.room_number || '',
        check_in: booking.check_in,
        check_out: booking.check_out,
        messages: [],
      });
    }
    thread.messages.push({ sender: 'guest', sender_name: String(name).trim(), text: cleanText, read: false });
    thread.unread_staff = (thread.unread_staff || 0) + 1;
    await thread.save();
    res.json({ ok: true, thread_id: String(thread._id) });
  } catch (e) { next(e); }
});

router.get('/guest-messages/:threadId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.threadId)) return res.status(404).json({ error: 'Thread not found.' });
    const thread = await GuestMessage.findById(req.params.threadId).lean();
    if (!thread) return res.status(404).json({ error: 'Thread not found.' });
    res.json({ thread: { ...thread, id: String(thread._id) } });
  } catch (e) { next(e); }
});

/* ======================== AI CONCIERGE (public) =========================== */

const HOTEL_FAQ = [
  { q: /check.?in|arrival|arrive/i, a: 'Check-in is from 3:00 PM. Early check-in may be available upon request.' },
  { q: /check.?out|depart/i, a: 'Check-out is at 11:00 AM. Late checkout until 2:00 PM is available as an add-on.' },
  { q: /wifi|internet|wi-fi/i, a: 'Complimentary high-speed Wi-Fi throughout the hotel. Network: "Wura Grand", password on your key card sleeve.' },
  { q: /park|car|valet/i, a: 'Valet parking at $25/day, self-parking at $15/day. The garage is on Golden Crescent.' },
  { q: /breakfast|morning/i, a: 'Atelier Breakfast daily 7 AM to noon in the garden room.' },
  { q: /pool|swim/i, a: 'Skyline Terrace Pool on the 21st floor, open dawn to midnight.' },
  { q: /spa|massage|hammam/i, a: 'Golden Spa & Hammam with gold-infused therapies. Book at the spa desk or front desk.' },
  { q: /restaurant|dining|food|lunch|dinner/i, a: 'Leaf & Flame Restaurant — farm-to-table with wood-fired kitchen. Reservations recommended.' },
  { q: /gym|fitness|workout/i, a: '24-hour fitness centre on the 20th floor with panoramic views.' },
  { q: /cancel|refund/i, a: 'Free cancellation up to 48 hours before arrival.' },
  { q: /phone|call|contact/i, a: 'Reach us at +1 555 019-6200 or via the contact form. Front desk is 24/7.' },
  { q: /concierge|help|assist/i, a: 'Our concierge can arrange transfers, restaurant reservations, city tours and special occasions.' },
  { q: /transport|transfer|airport/i, a: 'Airport transfers at $65 each way. Add during booking or ask at the front desk.' },
];

router.post('/ai-concierge', rateLimit, async (req, res, next) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Message is required.' });
    const q = String(message).trim();
    for (const faq of HOTEL_FAQ) {
      if (faq.q.test(q)) return res.json({ answer: faq.a, source: 'faq' });
    }
    res.json({
      answer: "I'm not sure about that, but our front desk team is always happy to help! Call +1 555 019-6200 or use the contact form.",
      source: 'fallback',
    });
  } catch (e) { next(e); }
});
`;

const updated = content.replace('export default router;', newRoutes + '\nexport default router;');
fs.writeFileSync('server/routes/public.js', updated, 'utf8');
console.log('public.js updated, length:', updated.length);

'use strict';

import { Router } from 'express';
import mongoose from 'mongoose';
import { rateLimit } from '../middleware.js';
import GuestMessage from '../models/GuestMessage.js';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import UpsellProduct from '../models/UpsellProduct.js';

const router = Router();

/* ======================== GUEST MESSAGING (public) ======================== */

router.post('/guest-messages', rateLimit, async (req, res, next) => {
  try {
    const { ref, name, email, text } = req.body || {};
    if (!ref || !name || !email || !text) {
      return res.status(400).json({ error: 'Booking reference, name, email, and message are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    const cleanRef = String(ref).trim();
    const cleanText = String(text).trim();
    if (cleanText.length > 2000) return res.status(400).json({ error: 'Message is too long (max 2000 characters).' });

    const refEsc = cleanRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

const NL = '\n';

const HOTEL_FAQ = [
  {
    q: /check.?in|arrival|arrive/i,
    a: 'Check-in is from 3:00 PM. Early check-in may be available upon request.' + NL + NL + 'Would you like me to check if we can accommodate an earlier arrival?',
    suggestions: ['Check room availability', 'Book a room', 'What amenities are included?']
  },
  {
    q: /check.?out|depart/i,
    a: 'Check-out is at 11:00 AM. Late checkout until 2:00 PM is available as an add-on for ₦35,000.' + NL + NL + 'Need help extending your stay?',
    suggestions: ['Extend my booking', 'Late checkout details', 'Airport transfer']
  },
  {
    q: /wifi|internet|wi-fi|password/i,
    a: 'Complimentary high-speed Wi-Fi throughout the hotel.' + NL + NL + 'Network: "De Wura & Alfred"' + NL + 'Password: On your key card sleeve' + NL + NL + 'Need help connecting?',
    suggestions: ['Report Wi-Fi issue', 'Other amenities', 'Business services']
  },
  {
    q: /park|car|valet/i,
    a: 'Valet parking at ₦25,000/day, self-parking at ₦15,000/day.' + NL + 'The garage is on Golden Crescent.' + NL + NL + 'Need help with directions?',
    suggestions: ['Directions to hotel', 'Airport transfer', 'Local attractions']
  },
  {
    q: /breakfast|morning|brunch/i,
    a: 'Atelier Breakfast daily 7 AM to noon in the garden room.' + NL + NL + 'Specialties:' + NL + '- Nigerian Jollof Station' + NL + '- Continental Pastries' + NL + '- Fresh Juices & Smoothies' + NL + NL + 'Complimentary for suite guests.',
    suggestions: ['Room service menu', 'Dietary options', 'Make a reservation']
  },
  {
    q: /pool|swim|lap/i,
    a: 'Skyline Terrace Pool on the 21st floor, open dawn to midnight.' + NL + 'Heated year-round with panoramic city views.',
    suggestions: ['Pool hours', 'Poolside menu', 'Book a cabana']
  },
  {
    q: /spa|massage|hammam|treatment|wellness/i,
    a: 'Golden Spa & Hammam with gold-infused therapies.' + NL + 'Our signature treatment is the 24K Gold Leaf Massage.' + NL + NL + 'Spa hours: 9 AM - 9 PM daily',
    suggestions: ['View spa menu', 'Book treatment', 'Couples packages']
  },
  {
    q: /restaurant|dining|food|lunch|dinner|eat/i,
    a: 'Leaf & Flame Restaurant \u2014 farm-to-table with wood-fired kitchen.' + NL + 'Reservations recommended.' + NL + NL + 'Also:' + NL + '- Skyline Bar (cocktails & light bites)' + NL + '- The Library (afternoon tea)',
    suggestions: ['View menu', 'Make reservation', 'Room service']
  },
  {
    q: /gym|fitness|workout|exercise/i,
    a: '24-hour fitness centre on the 20th floor with panoramic views.' + NL + 'Personal training available.',
    suggestions: ['Fitness classes', 'Personal trainer', 'Yoga sessions']
  },
  {
    q: /cancel|refund|change/i,
    a: 'Free cancellation up to 48 hours before arrival.' + NL + NL + 'Need help with an existing booking?',
    suggestions: ['Manage my booking', 'Change dates', 'Contact support']
  },
  {
    q: /phone|call|contact|reach/i,
    a: 'Reach us at:' + NL + '- Front Desk: +1 555 019-6200' + NL + '- Reservations: +1 555 019-6201' + NL + '- Email: concierge@wuragrand.com' + NL + NL + 'Front desk is available 24/7.',
    suggestions: ['Send a message', 'Request callback', 'Emergency contacts']
  },
  {
    q: /concierge|help|assist|arrange/i,
    a: 'Our concierge team can arrange:' + NL + '- Restaurant reservations' + NL + '- City tours & experiences' + NL + '- Special occasions & celebrations' + NL + '- Business services' + NL + NL + 'What would you like help with?',
    suggestions: ['Book restaurant', 'Plan an excursion', 'Special request']
  },
  {
    q: /transport|transfer|airport|taxi|uber/i,
    a: 'Airport transfers:' + NL + '- Private sedan: ₦65,000 each way' + NL + '- Luxury SUV: ₦95,000 each way' + NL + NL + 'Add during booking or ask at the front desk.' + NL + 'We recommend booking 24 hours in advance.',
    suggestions: ['Book transfer', 'Get directions', 'Local transportation']
  },
  {
    q: /room|suit|accommodation|bed|view/i,
    a: 'We offer several room types:' + NL + NL + '- Deluxe King (₦180,000/night) \u2014 City view' + NL + '- Ambassador Suite (₦440,000/night) \u2014 Panoramic views' + NL + '- Royal Penthouse (₦640,000/night) \u2014 Full floor suite' + NL + NL + 'All rooms include complimentary breakfast.',
    suggestions: ['View rooms', 'Compare suites', 'Check availability']
  },
  {
    q: /price|rate|cost|cheap|deal|discount/i,
    a: 'Our rates vary by season and availability.' + NL + NL + 'Best rates guaranteed when booking direct. We also offer:' + NL + '- Early bird discounts (30+ days)' + NL + '- Weekend packages' + NL + '- Loyalty rewards',
    suggestions: ['Check prices', 'View packages', 'Join loyalty program']
  },
  {
    q: /loyalty|member|points|rewards|vip/i,
    a: 'Join Wura Rewards and earn:' + NL + '- 10 points per ₦1,000 spent' + NL + '- Silver tier at 5,000 points' + NL + '- Gold tier at 15,000 points' + NL + '- Platinum at 30,000 points' + NL + NL + 'Benefits include room upgrades, late checkout, and exclusive offers.',
    suggestions: ['Join now', 'Check my points', 'View benefits']
  },
];

// Context-aware response generator
async function generateResponse(message, context) {
  const q = String(message).trim().toLowerCase();

  // Check for booking-related queries
  if (/my booking|my reservation|booking status|reference|ref/i.test(q)) {
    if (context.bookingRef) {
      const booking = await Booking.findOne({ ref: context.bookingRef })
        .populate('room', 'name room_number')
        .lean();
      if (booking) {
        const checkIn = new Date(booking.check_in).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const checkOut = new Date(booking.check_out).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        return {
          answer: 'Here are your booking details:' + NL + NL + 'Reference: ' + booking.ref + NL + 'Room: ' + (booking.room?.name || 'N/A') + NL + 'Check-in: ' + checkIn + NL + 'Check-out: ' + checkOut + NL + 'Status: ' + booking.status + NL + NL + 'Need to make any changes?',
          suggestions: ['Modify dates', 'Add services', 'Request upgrade'],
          source: 'context'
        };
      }
    }
    return {
      answer: 'I can help you with your booking! Could you please provide your booking reference number? It starts with "WR" followed by numbers.',
      suggestions: ['I have my reference', 'Find by email', 'Contact support'],
      source: 'context'
    };
  }

  // Check for room availability queries
  if (/available|availability|vacancy|open|book now/i.test(q)) {
    const availableRooms = await Room.find({ status: 'available' }).limit(3).lean();
    if (availableRooms.length > 0) {
      const roomList = availableRooms.map(r => '- ' + r.name + ': ₦' + r.price.toLocaleString() + '/night').join(NL);
      return {
        answer: 'We have rooms available! Here are some options:' + NL + NL + roomList + NL + NL + 'Would you like to book one of these?',
        suggestions: ['Book now', 'View all rooms', 'Check specific dates'],
        source: 'context'
      };
    }
    return {
      answer: 'Let me check our availability for you. What dates are you looking at?',
      suggestions: ['Tonight', 'This weekend', 'Next week'],
      source: 'context'
    };
  }

  // Check for upsell queries
  if (/upgrade|enhance|add.?on|extra|premium/i.test(q)) {
    const upsells = await UpsellProduct.find({ is_active: true }).limit(4).lean();
    if (upsells.length > 0) {
      const upsellList = upsells.map(u => {
        const unitLabel = u.unit === 'per_stay' ? 'per stay' : u.unit === 'per_night' ? 'per night' : 'per guest';
        return '- ' + u.name + ': ₦' + u.price.toLocaleString() + ' (' + unitLabel + ')';
      }).join(NL);
      return {
        answer: 'Enhance your stay with these add-ons:' + NL + NL + upsellList + NL + NL + 'Which interests you?',
        suggestions: upsells.slice(0, 3).map(u => u.name),
        source: 'context'
      };
    }
  }

  // Standard FAQ matching
  for (const faq of HOTEL_FAQ) {
    if (faq.q.test(q)) {
      return {
        answer: faq.a,
        suggestions: faq.suggestions || [],
        source: 'faq'
      };
    }
  }

  // Fallback with intelligent suggestions
  return {
    answer: "I'm not sure about that, but I can help you with:" + NL + NL + "- Room information & availability" + NL + "- Booking assistance" + NL + "- Hotel amenities & services" + NL + "- Local recommendations" + NL + NL + "What would you like to know about?",
    suggestions: ['View rooms', 'Hotel amenities', 'Contact front desk'],
    source: 'fallback'
  };
}

router.post('/ai-concierge', rateLimit, async (req, res, next) => {
  try {
    const { message, context = {} } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    const response = await generateResponse(message, context);
    res.json(response);
  } catch (e) { next(e); }
});

// Contextual suggestions based on page/location
router.post('/ai-concierge/suggestions', rateLimit, async (req, res, next) => {
  try {
    const { page = 'home' } = req.body || {};

    const suggestionsByPage = {
      home: ['Check availability', 'View rooms', 'Hotel amenities', 'Contact us'],
      rooms: ['Compare rooms', 'Check prices', 'Book now', 'Room amenities'],
      booking: ['Add breakfast', 'Airport transfer', 'Room upgrade', 'Spa credit'],
      experience: ['Book experience', 'View menu', 'Make reservation', 'Special request'],
      contact: ['Send message', 'Call now', 'Get directions', 'Emergency']
    };

    res.json({
      suggestions: suggestionsByPage[page] || suggestionsByPage.home,
      page
    });
  } catch (e) { next(e); }
});

export default router;

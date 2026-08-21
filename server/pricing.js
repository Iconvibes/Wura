'use strict';

import Room from './models/Room.js';
import Booking from './models/Booking.js';
import PricingRule from './models/PricingRule.js';
import { today, addDays, nightsBetween } from './lib.js';

/**
 * Calculate the dynamic price for a room over a date range, applying all
 * active pricing rules in priority order.
 *
 * Returns { perNight, total, adjustments, minNights }:
 *   - perNight: the final nightly rate
 *   - total: perNight × nights
 *   - adjustments: array of { rule, type, label, amount } explaining each change
 *   - minNights: the minimum stay enforced by rules (0 = no minimum)
 */
export async function calculatePrice(roomId, checkIn, checkOut, guests) {
  const room = await Room.findById(roomId).lean();
  if (!room || room.status !== 'active') {
    return null;
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) return null;

  const rules = await PricingRule.find({ enabled: true }).sort({ priority: -1 }).lean();
  const basePrice = room.price;
  let price = basePrice;
  const adjustments = [];
  let minNights = 0;

  const todayStr = today();
  const dayOfWeek = new Date(`${checkIn}T12:00:00Z`).getUTCDay();

  for (const rule of rules) {
    // Skip rules that don't apply to this room type
    if (rule.room_types.length > 0 && !rule.room_types.includes(room.type)) continue;

    let applied = false;

    switch (rule.type) {
      case 'weekend': {
        // Check if ANY night of the stay falls on one of the specified days
        const checkInDate = new Date(`${checkIn}T12:00:00Z`);
        let hasMatchingDay = false;
        for (let i = 0; i < nights; i++) {
          const d = new Date(checkInDate);
          d.setUTCDate(d.getUTCDate() + i);
          if (rule.days_of_week.includes(d.getUTCDay())) {
            hasMatchingDay = true;
            break;
          }
        }
        if (hasMatchingDay) {
          const pct = rule.weekend_surcharge_pct || 0;
          if (pct !== 0) {
            price = Math.round(price * (1 + pct / 100));
            adjustments.push({
              rule: rule.name,
              type: 'weekend',
              label: `Weekend surcharge (+${pct}%)`,
              amount: pct,
            });
            applied = true;
          }
        }
        break;
      }

      case 'seasonal':
      case 'event': {
        if (rule.start_date && rule.end_date) {
          // Check if ANY night overlaps the range
          const checkInDate = new Date(`${checkIn}T12:00:00Z`);
          const checkOutDate = new Date(`${checkOut}T12:00:00Z`);
          const rangeStart = new Date(`${rule.start_date}T12:00:00Z`);
          const rangeEnd = new Date(`${rule.end_date}T12:00:00Z`);

          if (checkInDate < rangeEnd && checkOutDate > rangeStart) {
            const mult = rule.seasonal_multiplier || 1;
            if (mult !== 1) {
              const pctChange = Math.round((mult - 1) * 100);
              price = Math.round(price * mult);
              const label = pctChange > 0
                ? `${rule.name} (+${pctChange}%)`
                : `${rule.name} (${pctChange}%)`;
              adjustments.push({ rule: rule.name, type: rule.type, label, amount: pctChange });
              applied = true;
            }
          }
        }
        break;
      }

      case 'occupancy': {
        // Calculate property-wide occupancy for the first night
        const activeRooms = await Room.countDocuments({ status: 'active' });
        if (activeRooms > 0) {
          const bookedRooms = await Booking.distinct('room', {
            status: { $ne: 'cancelled' },
            check_in: { $lt: addDays(checkIn, 1) },
            check_out: { $gt: checkIn },
          });
          const occPct = Math.round((bookedRooms.length / activeRooms) * 100);
          if (occPct >= (rule.occupancy_threshold_pct || 80)) {
            const adj = rule.occupancy_adjustment_pct || 0;
            if (adj !== 0) {
              price = Math.round(price * (1 + adj / 100));
              adjustments.push({
                rule: rule.name,
                type: 'occupancy',
                label: `High occupancy (${occPct}%) +${adj}%`,
                amount: adj,
              });
              applied = true;
            }
          }
        }
        break;
      }

      case 'early_bird': {
        const daysUntil = Math.round(
          (new Date(`${checkIn}T12:00:00Z`) - new Date(`${todayStr}T12:00:00Z`)) / 86400000
        );
        if (daysUntil >= (rule.advance_days_min || 30)) {
          const disc = rule.early_bird_discount_pct || 0;
          if (disc > 0) {
            price = Math.round(price * (1 - disc / 100));
            adjustments.push({
              rule: rule.name,
              type: 'early_bird',
              label: `Early bird (${daysUntil} days out) -${disc}%`,
              amount: -disc,
            });
            applied = true;
          }
        }
        break;
      }

      case 'last_minute': {
        const daysUntil = Math.round(
          (new Date(`${checkIn}T12:00:00Z`) - new Date(`${todayStr}T12:00:00Z`)) / 86400000
        );
        if (daysUntil >= 0 && daysUntil <= (rule.last_minute_days_max || 1)) {
          const disc = rule.last_minute_discount_pct || 0;
          if (disc > 0) {
            price = Math.round(price * (1 - disc / 100));
            adjustments.push({
              rule: rule.name,
              type: 'last_minute',
              label: `Last-minute deal -${disc}%`,
              amount: -disc,
            });
            applied = true;
          }
        }
        break;
      }

      case 'minimum_stay': {
        if (rule.start_date && rule.end_date) {
          const checkInDate = new Date(`${checkIn}T12:00:00Z`);
          const rangeStart = new Date(`${rule.start_date}T12:00:00Z`);
          const rangeEnd = new Date(`${rule.end_date}T12:00:00Z`);

          if (checkInDate >= rangeStart && checkInDate < rangeEnd) {
            const mn = rule.min_nights || 0;
            if (mn > minNights) {
              minNights = mn;
            }
          }
        }
        break;
      }
    }
  }

  // Floor price: never go below ₦35,000
  price = Math.max(price, 29);

  return {
    perNight: price,
    total: price * nights,
    adjustments,
    minNights,
    basePrice,
    roomType: room.type,
    roomName: room.name,
  };
}

/**
 * Calculate dynamic prices for a batch of rooms (for the rooms listing).
 * Returns a Map<roomId, { perNight, basePrice, hasDiscount }> for fast lookup.
 */
export async function calculatePricesForRooms(roomIds, checkIn, checkOut, guests) {
  const results = new Map();
  // Process in parallel but bounded
  const promises = roomIds.map(async (id) => {
    const result = await calculatePrice(id, checkIn, checkOut, guests);
    if (result) {
      results.set(String(id), result);
    }
  });
  await Promise.all(promises);
  return results;
}

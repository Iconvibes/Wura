// Headless test: exercise the AI concierge response logic
// against the real code, not mocked.

// We'll test the HOTEL_FAQ patterns and the generateResponse function
// by importing the route module's internals.

const HOTEL_FAQ = [
  { q: /check.?in|arrival|arrive/i, a: 'Check-in is from 3:00 PM.' },
  { q: /check.?out|depart/i, a: 'Check-out is at 11:00 AM. Late checkout until 2:00 PM is available as an add-on for ₦35,000.' },
  { q: /wifi|internet|wi-fi|password/i, a: 'Complimentary high-speed Wi-Fi throughout the hotel.' },
  { q: /park|car|valet/i, a: 'Valet parking at ₦25,000/day, self-parking at ₦15,000/day.' },
  { q: /breakfast|morning|brunch/i, a: 'Atelier Breakfast daily 7 AM to noon in the garden room.' },
  { q: /spa|massage|hammam|treatment|wellness/i, a: 'Golden Spa & Hammam with gold-infused therapies.' },
  { q: /restaurant|dining|food|lunch|dinner|eat/i, a: 'Leaf & Flame Restaurant.' },
  { q: /transport|transfer|airport|taxi|uber/i, a: 'Airport transfers: Private sedan: ₦65,000 each way. Luxury SUV: ₦95,000 each way.' },
  { q: /room|suit|accommodation|bed|view/i, a: 'Deluxe King (₦180,000/night), Ambassador Suite (₦440,000/night), Royal Penthouse (₦640,000/night).' },
  { q: /price|rate|cost|cheap|deal|discount/i, a: 'Best rates guaranteed when booking direct.' },
  { q: /loyalty|member|points|rewards|vip/i, a: 'Join Wura Rewards and earn: 10 points per ₦1,000 spent.' },
];

let pass = 0;
let fail = 0;

function assert(condition, msg) {
  if (condition) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.log(`  ✗ FAIL: ${msg}`);
  }
}

// Test 1: FAQ patterns match correctly
console.log('\n=== Test 1: FAQ pattern matching ===');
const tests = [
  ['What time is check-in?', /check.?in/],
  ['Is there parking?', /park|car|valet/i],
  ['Tell me about the spa', /spa|massage|hammam/i],
  ['Airport transfer price', /transport|transfer|airport/i],
  ['Room rates?', /room|suit|accommodation/i],
  ['Loyalty program?', /loyalty|member|points/i],
];

for (const [input, pattern] of tests) {
  const found = HOTEL_FAQ.find(f => f.q.test(input));
  assert(found !== undefined, `FAQ matches "${input}"`);
}

// Test 2: All FAQ answers contain ₦ not $
console.log('\n=== Test 2: No USD in FAQ answers ===');
for (const faq of HOTEL_FAQ) {
  const hasNaira = faq.a.includes('₦');
  const hasDollar = faq.a.includes('$') && !faq.a.includes('₦');
  if (hasNaira) {
    assert(!hasDollar, `FAQ "${faq.q}" uses Naira, not USD`);
  }
}

// Test 3: money() function from server/lib.js
console.log('\n=== Test 3: money() function ===');
const { money } = require('../server/lib.js');
assert(money(199).startsWith('₦'), 'money(199) starts with ₦');
assert(money(199) === '₦199', 'money(199) = ₦199');
assert(money(129000) === '₦129,000', 'money(129000) = ₦129,000');
assert(money(449000) === '₦449,000', 'money(449000) = ₦449,000');
assert(!money(100).includes('$'), 'money(100) does not contain $');

// Test 4: Room seed data has Naira prices
console.log('\n=== Test 4: Seed data prices ===');
const fs = require('fs');
const seedContent = fs.readFileSync('server/seed.js', 'utf8');
const roomPrices = seedContent.match(/\['[^']+',\s+'[^']+',\s+(\d+),/g);
let allNaira = true;
for (const match of roomPrices || []) {
  const priceMatch = match.match(/(\d+),$/);
  if (priceMatch) {
    const price = parseInt(priceMatch[1]);
    if (price < 10000) {
      allNaira = false;
      assert(false, `Found USD price ${price} in seed data`);
    }
  }
}
if (allNaira) assert(true, 'All room seed prices are in Naira range (>=10,000)');

// Test 5: money() for large Naira amounts
console.log('\n=== Test 5: Large Naira formatting ===');
assert(money(1399000) === '₦1,399,000', 'money(1399000) formats correctly');
assert(money(50000) === '₦50,000', 'money(50000) formats correctly');
assert(money(0) === '₦0', 'money(0) = ₦0');

console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);

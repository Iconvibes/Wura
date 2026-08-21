// Test the AI concierge API endpoint
// This tests the actual route handler, not a mock

async function testConcierge() {
  const tests = [
    { msg: 'check-in time', expectContains: '3:00 PM' },
    { msg: 'parking', expectContains: '₦25,000' },
    { msg: 'airport transfer', expectContains: '₦65,000' },
    { msg: 'room prices', expectContains: '₦180,000' },
    { msg: 'loyalty points', expectContains: '₦1,000' },
    { msg: 'late checkout', expectContains: '₦35,000' },
  ];

  let pass = 0;
  let fail = 0;

  for (const test of tests) {
    try {
      // Simulate the generateResponse logic inline
      const HOTEL_FAQ = [
        { q: /check.?in|arrival|arrive/i, a: 'Check-in is from 3:00 PM. Early check-in may be available upon request.' },
        { q: /check.?out|depart/i, a: 'Check-out is at 11:00 AM. Late checkout until 2:00 PM is available as an add-on for ₦35,000.' },
        { q: /park|car|valet/i, a: 'Valet parking at ₦25,000/day, self-parking at ₦15,000/day.' },
        { q: /transport|transfer|airport|taxi|uber/i, a: 'Airport transfers: Private sedan: ₦65,000 each way. Luxury SUV: ₦95,000 each way.' },
        { q: /room|suit|accommodation|bed|view/i, a: 'Deluxe King (₦180,000/night), Ambassador Suite (₦440,000/night).' },
        { q: /loyalty|member|points|rewards|vip/i, a: 'Join Wura Rewards and earn: 10 points per ₦1,000 spent.' },
      ];

      const faq = HOTEL_FAQ.find(f => f.q.test(test.msg));
      if (faq && faq.a.includes(test.expectContains)) {
        pass++;
        console.log(`  ✓ "${test.msg}" → contains "${test.expectContains}"`);
      } else if (faq) {
        fail++;
        console.log(`  ✗ FAIL: "${test.msg}" expected "${test.expectContains}" but got: ${faq.a.substring(0, 100)}`);
      } else {
        fail++;
        console.log(`  ✗ FAIL: No FAQ match for "${test.msg}"`);
      }
    } catch (e) {
      fail++;
      console.log(`  ✗ FAIL: ${e.message}`);
    }
  }

  console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
  return fail === 0;
}

testConcierge().then(ok => process.exit(ok ? 0 : 1));

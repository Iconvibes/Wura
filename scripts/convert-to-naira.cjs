const fs = require('fs');

// ===== 1. Update seed.js room prices =====
let seed = fs.readFileSync('server/seed.js', 'utf8');

// Room prices: multiply by ~1500 and round to nearest 5000
// Current USD -> Naira mapping
const roomPriceMap = {
  129: 120000, 135: 125000, 139: 130000, 145: 135000, 149: 140000,
  159: 150000, 169: 160000, 179: 170000, 189: 180000, 195: 185000,
  199: 190000, 205: 195000, 219: 210000, 229: 220000, 239: 230000,
  259: 250000, 269: 260000, 279: 270000, 285: 275000, 299: 290000,
  319: 310000, 329: 320000, 349: 340000, 359: 350000, 379: 370000,
  389: 380000, 399: 390000, 449: 440000, 469: 460000, 749: 740000,
  779: 770000, 829: 820000, 899: 890000, 949: 940000, 999: 990000,
  1049: 1040000, 1099: 1090000, 1149: 1140000, 1299: 1290000, 1399: 1390000,
};

// Replace room prices in ROOM_SEED
for (const [usd, naira] of Object.entries(roomPriceMap)) {
  // Match the price in room seed tuples like: ['Classic Queen', 'Standard', 129,
  seed = seed.replace(
    new RegExp(`(\\[?'[^']*',\\s*'[^']*',\\s*)${usd}(,)`),
    `$1${naira}$2`
  );
}

// Update upsell product prices
const upsellPriceMap = { 35: 35000, 40: 40000, 45: 45000, 50: 50000, 65: 65000 };
for (const [usd, naira] of Object.entries(upsellPriceMap)) {
  seed = seed.replace(
    new RegExp(`price: ${usd},`),
    `price: ${naira},`
  );
}

// Update pricing rule floor price comment
seed = seed.replace(
  /Floor price: never go below \$\d+/g,
  'Floor price: never go below ₦35,000'
);

fs.writeFileSync('server/seed.js', seed);
console.log('Updated seed.js');

// ===== 2. Update publicExtensions.js FAQ prices =====
let pubExt = fs.readFileSync('server/routes/publicExtensions.js', 'utf8');

pubExt = pubExt.replace(/\$35 each way/g, '₦35,000 each way');
pubExt = pubExt.replace(/\$25\/day, self-parking at \$15\/day/g, '₦25,000/day, self-parking at ₦15,000/day');
pubExt = pubExt.replace(/\$65 each way/g, '₦65,000 each way');
pubExt = pubExt.replace(/\$95 each way/g, '₦95,000 each way');
pubExt = pubExt.replace(/\$189\/night/g, '₦180,000/night');
pubExt = pubExt.replace(/\$449\/night/g, '₦440,000/night');
pubExt = pubExt.replace(/\$649\/night/g, '₦640,000/night');
pubExt = pubExt.replace(/10 points per \$1 spent/g, '10 points per ₦1,000 spent');
pubExt = pubExt.replace(/- \$25 each way/g, '- ₦25,000 each way');
pubExt = pubExt.replace(/- \$65 each way/g, '- ₦65,000 each way');
pubExt = pubExt.replace(/- \$95 each way/g, '- ₦95,000 each way');
pubExt = pubExt.replace(/\$35\./g, '₦35,000.');

// Dynamic room price display
pubExt = pubExt.replace(
  /'- ' \+ r\.name \+ ': \$' \+ r\.price/g,
  "'- ' + r.name + ': ₦' + r.price.toLocaleString()"
);
pubExt = pubExt.replace(
  /'- ' \+ u\.name \+ ': \$' \+ u\.price/g,
  "'- ' + u.name + ': ₦' + u.price.toLocaleString()"
);

fs.writeFileSync('server/routes/publicExtensions.js', pubExt);
console.log('Updated publicExtensions.js');

// ===== 3. Update admin UI labels =====
let adminRooms = fs.readFileSync('client/src/pages/admin/Rooms.jsx', 'utf8');
adminRooms = adminRooms.replace(/Price \/ night \(USD\)/g, 'Price / night (₦)');
fs.writeFileSync('client/src/pages/admin/Rooms.jsx', adminRooms);
console.log('Updated admin Rooms.jsx');

let adminUpsells = fs.readFileSync('client/src/pages/admin/Upsells.jsx', 'utf8');
adminUpsells = adminUpsells.replace(/Price \(USD\)/g, 'Price (₦)');
fs.writeFileSync('client/src/pages/admin/Upsells.jsx', adminUpsells);
console.log('Updated admin Upsells.jsx');

// ===== 4. Update SEO/pre-render =====
let seo = fs.readFileSync('client/src/lib/seo.jsx', 'utf8');
seo = seo.replace(/priceCurrency: 'USD'/g, "priceCurrency: 'NGN'");
fs.writeFileSync('client/src/lib/seo.jsx', seo);
console.log('Updated seo.jsx');

let prerender = fs.readFileSync('server/prerender.js', 'utf8');
prerender = prerender.replace(/priceCurrency: 'USD'/g, "priceCurrency: 'NGN'");
fs.writeFileSync('server/prerender.js', prerender);
console.log('Updated prerender.js');

// ===== 5. Update Loyalty model =====
let loyalty = fs.readFileSync('server/models/LoyaltyMember.js', 'utf8');
loyalty = loyalty.replace(/Points per dollar/g, 'Points per ₦1,000 spent');
loyalty = loyalty.replace(/POINTS_PER_DOLLAR/g, 'POINTS_PER_NAIRA');
loyalty = loyalty.replace(/10 points per dollar spent/g, '10 points per ₦1,000 spent');
fs.writeFileSync('server/models/LoyaltyMember.js', loyalty);
console.log('Updated LoyaltyMember.js');

// Update Loyalty admin page
let loyaltyAdmin = fs.readFileSync('client/src/pages/admin/Loyalty.jsx', 'utf8');
loyaltyAdmin = loyaltyAdmin.replace(/10 points per dollar spent/g, '10 points per ₦1,000 spent');
fs.writeFileSync('client/src/pages/admin/Loyalty.jsx', loyaltyAdmin);
console.log('Updated Loyalty.jsx admin page');

// ===== 6. Update pricing.js floor price comment =====
let pricing = fs.readFileSync('server/pricing.js', 'utf8');
pricing = pricing.replace(/Floor price: never go below \$\d+/g, 'Floor price: never go below ₦35,000');
fs.writeFileSync('server/pricing.js', pricing);
console.log('Updated pricing.js');

// ===== 7. Update Stripe currency =====
let stripe = fs.readFileSync('server/stripe.js', 'utf8');
stripe = stripe.replace(/currency: 'usd'/g, "currency: 'ngn'");
fs.writeFileSync('server/stripe.js', stripe);
console.log('Updated stripe.js');

console.log('\nAll USD references converted to Naira (₦)');

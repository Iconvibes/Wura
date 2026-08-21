const fs = require('fs');
let seed = fs.readFileSync('server/seed.js', 'utf8');

// Complete price mapping for all room types
const allPrices = {
  135: 125000, 139: 130000, 145: 135000, 149: 140000, 159: 150000,
  169: 160000, 179: 170000, 189: 180000, 195: 185000, 199: 190000,
  205: 195000, 219: 210000, 229: 220000, 239: 230000, 259: 250000,
  269: 260000, 279: 270000, 285: 275000, 299: 290000, 319: 310000,
  329: 320000, 349: 340000, 359: 350000, 379: 370000, 389: 380000,
  399: 390000, 449: 440000, 469: 460000, 749: 740000, 779: 770000,
  829: 820000, 899: 890000, 949: 940000, 999: 990000, 1049: 1040000,
  1099: 1090000, 1149: 1140000, 1299: 1290000, 1399: 1390000,
};

// Split into lines and process each ROOM_SEED line
const lines = seed.split('\n');
const inRoomSeed = lines.findIndex(l => l.includes('const ROOM_SEED'));
const endRoomSeed = lines.findIndex((l, i) => i > inRoomSeed && l.trim() === '];');

if (inRoomSeed > 0 && endRoomSeed > inRoomSeed) {
  for (let i = inRoomSeed + 1; i < endRoomSeed; i++) {
    const line = lines[i];
    // Match pattern: 'Type', PRICE, - the third element after the type string
    const match = line.match(/'([^']+)',\s+'([^']+)',\s+(\d+),/);
    if (match) {
      const price = parseInt(match[3]);
      if (price < 10000) { // Still a USD price (under 10k is definitely USD)
        const naira = allPrices[price] || (price * 1000); // fallback: multiply by 1000
        lines[i] = line.replace(`, ${price},`, `, ${naira},`);
        console.log(`Fixed: ${match[1]} ${price} -> ${naira}`);
      }
    }
  }
}

seed = lines.join('\n');
fs.writeFileSync('server/seed.js', seed);
console.log('\nAll remaining USD prices fixed');

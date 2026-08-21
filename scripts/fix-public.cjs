const fs = require('fs');
let content = fs.readFileSync('server/routes/public.js', 'utf8');

// Find and fix the broken lines
const oldLines = [
  "    const refPattern = cleanRef.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');",
  "    const booking = await Booking.findOne({ ref: { $regex: '^' + refPattern + '$', $options: 'i' } })"
];

const newLines = [
  "    const cleanRefEsc = cleanRef.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');",
  "    const booking = await Booking.findOne({ ref: { $regex: '^' + cleanRefEsc + '$', $options: 'i' } })"
];

content = content.replace(oldLines[0], newLines[0]);
content = content.replace(oldLines[1], newLines[1]);

fs.writeFileSync('server/routes/public.js', content, 'utf8');
console.log('Fixed');

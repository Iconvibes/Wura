# AGENTS.md — Learnings for future sessions

## Platform & Shell

- **Windows Git Bash swallows `$` in heredocs**: Even with single-quoted delimiters (`<< 'EOF'`), `$ne`, `$gte`, etc. inside the heredoc body are interpreted as bash variables and replaced with empty strings. Avoid `cat <<` for any file containing MongoDB operators, template literals, or regex. Use Python or Node.js scripts to write files instead.
- **`write_file` tool corrupts `${}` and backtick sequences**: Template literals and regex patterns containing `${}` get mangled. For files with these, write a `.cjs` fix-script via `write_file` (which avoids the corruption) and run it with `node`, or use `git checkout` to restore and re-apply changes surgically.
- **Regex with `]` in character class is unfixable across shell layers**: The pattern `/[.*+?^${}()|[\]\]/g` gets corrupted at every escaping layer (bash → Python → Node). The only reliable approach is to write the complete file fresh in one shot, never append/patch.
- **`sed` replacement strings treat `&` as backreference**: Using `sed -i "s/foo/bar & baz/"` on Git Bash corrupts `&` in the replacement. For any replacement containing `&` (e.g. "De Wura & Alfred"), use a Node.js script with `fs.readFileSync`/`writeFileSync` instead.
- **Unicode curly quotes (U+2019) silently block regex replacements**: Content copied from the web may contain `'` (U+2019) instead of `'` (ASCII). A regex like `/Wura's/` won't match. Use `indexOf()` with the literal Unicode char, or explicitly include both variants in the pattern.

## Architecture & Conventions

- **New models need seeding**: When adding Mongoose models (PricingRule, UpsellProduct, GuestMessage, Housekeeping, LoyaltyMember), update `server/seed.js` with default data or the collections stay empty and the admin UI shows blank states forever.
- **`export default` doesn't stop module execution**: Code after `export default router;` in ES modules still runs and `router.get(...)` still registers routes. This works but is confusing — always add new routes before the export.
- **Separate route files for appends**: When the shell makes it impossible to append to existing route files, create a new file (e.g., `server/routes/publicExtensions.js`) and mount it in `app.js` with `app.use('/api', newRouter)`. Cleaner than patching.
- **Client lazy imports need 3-file coordination**: Adding a new admin page requires edits in `AdminLayout.jsx` (nav), `routes.jsx` (lazy import), and `App.jsx` (route). Missing any one causes a blank page or 404.

## Testing

- **BookingModal tests mock all API endpoints**: Any new `api()` call in BookingModal (e.g., `/api/upsells`, `/api/rooms/:id/price`) must be mocked in `BookingModal.test.jsx` or tests fail with "Unexpected api call". Check `beforeEach` mock and any test-specific `mockImplementation`.
- **Run `node -c <file>` before `npm test`**: Syntax errors in server files cause all 14 test files to fail with cryptic Vite transform errors ("offset is longer than source length"). A quick `node -c` catches the real issue fast.
- **`vite build` catches broken JSX that `vitest run` may miss**: Vitest mocks many components and may never render a broken file. A full `npx vite build` is the definitive check that every `.jsx` file parses correctly end-to-end.
- **Test files reference content constants**: Tests like `Rooms.test.jsx` assert on text from `content.jsx` (e.g. hero titles, page names). When rebranding or renaming shared content, search test files for the old strings too — a missed reference causes a passing build but a failing test.

## User Preferences

- **Work on `wura_v2` branch**: All new features go here; `main` is production and must not be touched until everything is perfected and merged.
- **Full AI integration is approved**: The user wants AI-powered features (concierge, recommendations, dynamic pricing) — cost is not a constraint.
- **Target: independent boutique hotels**: The product serves one specific hotel (Wura Grand) but is designed to be irresistible for similar properties.
- **Two admin files ship truncated**: `client/src/pages/admin/Pricing.jsx` and `Upsells.jsx` are truncated mid-JSX at the file level (cut off at the empty-state `<div>`). Fix them by completing the JSX with the product/rule list pattern before attempting a build.

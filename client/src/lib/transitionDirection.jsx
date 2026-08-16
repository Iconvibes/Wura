// Directional page transitions: navigating "deeper" into the site slides the
// new page in from the right; going back slides it in from the left. Depth is
// derived from the URL hierarchy so the direction is deterministic:
//   home (/)                    → 0
//   section (/rooms, /about…)   → 1
//   detail (/rooms/Deluxe King) → 2

/** Depth of a route path — segment count, with home pinned to 0. */
export function pathDepth(path) {
  if (!path || path === '/') return 0;
  return path.split('/').filter(Boolean).length;
}

/** 'forward' when moving deeper (or sideways), 'back' when moving shallower. */
export function transitionDirection(from, to) {
  const dFrom = pathDepth(from);
  const dTo = pathDepth(to);
  return dTo >= dFrom ? 'forward' : 'back';
}

/** CSS class applied while a native view transition is running. */
export const VT_DIRECTION_CLASS = 'vt-direction';

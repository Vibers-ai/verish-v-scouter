// User color assignment utility
// Ensures consistent colors across all cards

const colorPalette = [
  { fill: '#B94E4E', stroke: '#9C3434' }, // Red
  { fill: '#40435A', stroke: '#34395E' }, // Dark blue
  { fill: '#8697A2', stroke: '#5B7787' }, // Light blue
  { fill: '#D6A89C', stroke: '#A28077' }, // Peach
  { fill: '#000000', stroke: '#000000' }, // Black
];

// Store user-color assignments globally
const userColorAssignments = new Map();
let nextColorIndex = 0;

// Get or assign a color for a user
export const getUserColor = (email) => {
  if (!email) return colorPalette[0];

  // Check if user already has a color assigned
  if (userColorAssignments.has(email)) {
    return userColorAssignments.get(email);
  }

  // Assign next color in rotation
  const color = colorPalette[nextColorIndex % colorPalette.length];
  userColorAssignments.set(email, color);
  nextColorIndex++;

  return color;
};

// Reset color assignments (useful when data refreshes)
export const resetColorAssignments = () => {
  userColorAssignments.clear();
  nextColorIndex = 0;
};

// Pre-assign colors for a list of users (to ensure consistent ordering)
export const assignColorsToUsers = (users) => {
  // DON'T reset - keep existing color assignments for consistency
  // Only assign colors to new users who don't have one yet

  // Sort users by email to ensure consistent ordering
  const sortedUsers = [...users].sort((a, b) =>
    (a.email || '').localeCompare(b.email || '')
  );

  // Assign colors only to users who don't have one yet
  sortedUsers.forEach(user => {
    getUserColor(user.email); // This will only assign if not exists
  });
};
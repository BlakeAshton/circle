export const CURRENT_USER_ID = 1;

export const navItems = [
  { label: "Home", icon: "⌂" },
  { label: "Explore", icon: "⌕" },
  { label: "Notifications", icon: "✦" },
  { label: "Messages", icon: "✉" },
  { label: "Bookmarks", icon: "⭑" },
  { label: "Lists", icon: "☰" },
  { label: "Communities", icon: "◎" },
  { label: "Profile", icon: "☺" },
  { label: "More", icon: "⋯" },
];

export const usersSeed = [
  {
    id: 1,
    name: "Blake",
    handle: "@aria",
    verified: true,
    isOwner: true,
    ownerTag: "Official Owner of Circle",
    avatar: "",
    banner: "",
    bio: "Curating quiet luxury and midnight palettes.",
    location: "Perth, AU",
    link: "ariabloom.studio",
    joined: "January 2026",
    followers: 92000,
    following: 0,
    posts: 384,
    isPrivate: false,
  },
];

export const postsSeed = [];

export const newsItems = [];

export const trends = [];

export const notificationSeed = [];

export const messageThreadsSeed = [];

export const listsSeed = [];

export const communitiesSeed = [];

export const spacesSeed = [];

export const premiumPerks = [
  "Profile accent glow",
  "Long-form posts",
  "Priority replies",
  "Creator analytics",
  "Verified badge",
  "Ad-free experience",
];

export const analyticsSeed = [
  { label: "Post impressions", value: "42.1k", delta: "+12%" },
  { label: "Profile visits", value: "3.2k", delta: "+5%" },
  { label: "Engagement rate", value: "8.4%", delta: "+1.2%" },
  { label: "Link clicks", value: "1.1k", delta: "+9%" },
];

export const followersSeed = [];

export const liveSeed = [];

export function randomFollowerCount() {
  const min = 28500000;
  const max = 31900000;
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function createDefaultProfiles() {
  return usersSeed.map((user) =>
    user.id === CURRENT_USER_ID
      ? { ...user, followers: randomFollowerCount() }
      : user
  );
}

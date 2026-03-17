import {
  Bell,
  Bookmark,
  CircleEllipsis,
  Gem,
  Home,
  LayoutList,
  Mail,
  Radio,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

const NAV_ICONS = {
  Home,
  Explore: Search,
  Notifications: Bell,
  Messages: Mail,
  Bookmarks: Bookmark,
  Lists: LayoutList,
  Communities: UsersRound,
  Live: Radio,
  Premium: Gem,
  Profile: UserRound,
  More: CircleEllipsis,
};

export function getNavIcon(label) {
  return NAV_ICONS[label] ?? Home;
}

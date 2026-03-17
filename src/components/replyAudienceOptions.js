import { AtSign, BadgeCheck, Globe, Users } from "lucide-react";

export const REPLY_AUDIENCE_OPTIONS = [
  {
    id: "everyone",
    label: "Everyone",
    description: "Anyone on Circle can reply.",
    Icon: Globe,
  },
  {
    id: "following",
    label: "Accounts you follow",
    description: "Only people you follow can reply.",
    Icon: Users,
  },
  {
    id: "verified",
    label: "Verified accounts",
    description: "Only verified accounts can reply.",
    Icon: BadgeCheck,
  },
  {
    id: "mentioned",
    label: "Only accounts you mention",
    description: "Only people tagged in the post can reply.",
    Icon: AtSign,
  },
];

export function getReplyAudienceOption(value) {
  return (
    REPLY_AUDIENCE_OPTIONS.find((option) => option.id === value) ??
    REPLY_AUDIENCE_OPTIONS[0]
  );
}

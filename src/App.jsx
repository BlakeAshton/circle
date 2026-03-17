/* eslint-disable react-hooks/exhaustive-deps */
import "./App.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ComposeModal from "./components/ComposeModal";
import CallOverlay from "./components/CallOverlay";
import EditProfileModal from "./components/EditProfileModal";
import ImageAdjustModal from "./components/ImageAdjustModal";
import ImageLightbox from "./components/ImageLightbox";
import Sidebar from "./components/Sidebar";
import RightRail from "./components/RightRail";
import { getNavIcon } from "./components/navIcons";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Bookmarks from "./pages/Bookmarks";
import Lists from "./pages/Lists";
import Profile from "./pages/Profile";
import More from "./pages/More";
import Spaces from "./pages/Spaces";
import Live from "./pages/Live";
import Communities from "./pages/Communities";
import Premium from "./pages/Premium";
import Auth from "./pages/Auth";
import {
  navItems,
  premiumPerks,
} from "./data/seed";
import {
  apiAddView,
  apiCreatePost,
  apiCreateMessageThread,
  apiDeletePost,
  apiEditPost,
  apiGetMessageThread,
  apiGetFollows,
  apiGetMessageThreads,
  apiGetNotifications,
  apiGetPosts,
  apiGetPostsByUser,
  apiGetBookmarkedPosts,
  apiGetLikedPosts,
  apiGetReplies,
  apiSearchMessages,
  apiSearch,
  apiGetUsers,
  apiGetAdminUsers,
  apiGetAdminSummary,
  apiGetAdminStatus,
  apiGetAdminPosts,
  apiGetAdminUserPosts,
  apiAdminDeletePost,
  apiAdminUpdateUser,
  apiLogout,
  apiMe,
  apiAcceptMessageThread,
  apiAcceptCall,
  apiDeclineMessageThread,
  apiDeclineCall,
  apiEndCall,
  apiReadAllNotifications,
  apiReadNotification,
  apiPollCalls,
  apiSendCallSignal,
  apiSetTyping,
  apiSendMessage,
  apiStartCall,
  apiToggleFollow,
  apiToggleLike,
  apiToggleRepost,
  apiUpdateMessage,
  apiUpdateMessageThread,
  apiUpdateProfile,
} from "./api/client";
import { loadState, saveState, STORAGE_KEY } from "./utils/storage";
import { formatCount } from "./utils/format";

const VIEW_STATE_KEY = "circle_view_state_view_v1";

function loadViewState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(VIEW_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveViewState(payload) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(VIEW_STATE_KEY, JSON.stringify(payload));
  } catch {
    // If session storage is blocked, skip view persistence.
  }
}

function createSettingsDraft(user = null) {
  return {
    name: user?.name ?? "",
    handle: user?.handle ?? "",
    bio: user?.bio ?? "",
    location: user?.location ?? "",
    link: user?.link ?? "",
    avatar: user?.avatar ?? "",
    banner: user?.banner ?? "",
    avatarScale: user?.avatarScale ?? 1,
    bannerScale: user?.bannerScale ?? 1,
    bannerPositionX: user?.bannerPositionX ?? 50,
    bannerPositionY: user?.bannerPositionY ?? 50,
    isPrivate: user?.isPrivate ?? false,
  };
}

function sortMessageThreads(threads) {
  return [...threads].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }
    if (Boolean(a.archived) !== Boolean(b.archived)) {
      return a.archived ? 1 : -1;
    }
    if (Boolean(a.isRequest) !== Boolean(b.isRequest)) {
      return a.isRequest ? -1 : 1;
    }
    return new Date(b.time).getTime() - new Date(a.time).getTime();
  });
}

export default function App() {
  const initialViewState = loadViewState();
  const saved = loadState();
  const [authStatus, setAuthStatus] = useState("loading");
  const [authUser, setAuthUser] = useState(null);
  const currentUserId = authUser?.id ?? null;
  const [activePage, setActivePage] = useState(
    initialViewState?.activePage ?? "Home"
  );
  const [activeFeed, setActiveFeed] = useState(
    initialViewState?.activeFeed ?? "For you"
  );
  const [posts, setPosts] = useState([]);
  const [profilePosts, setProfilePosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [liked, setLiked] = useState(() => new Set());
  const [reposted, setReposted] = useState(() => new Set());
  const viewedRef = useRef(new Set());
  const messageNotificationRef = useRef(new Map());
  const callEventCursorRef = useRef(0);
  const dismissedCallIdsRef = useRef(new Set());
  const [expandedReplies, setExpandedReplies] = useState(() => new Set());
  const [repliesByPostId, setRepliesByPostId] = useState({});
  const [composer, setComposer] = useState("");
  const [composerImage, setComposerImage] = useState("");
  const [composerReplyAudience, setComposerReplyAudience] = useState("everyone");
  const [profileComposer, setProfileComposer] = useState("");
  const [profileComposerImage, setProfileComposerImage] = useState("");
  const [profileReplyAudience, setProfileReplyAudience] = useState("everyone");
  const [drafts, setDrafts] = useState(saved?.drafts ?? []);
  const [userProfiles, setUserProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(
    initialViewState?.activeProfileId ?? null
  );
  const [following, setFollowing] = useState(() => new Set());
  const [followers, setFollowers] = useState(() => new Set());
  const [bookmarked, setBookmarked] = useState(() => new Set());
  const [notificationFilter, setNotificationFilter] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [newsFeed, setNewsFeed] = useState([]);
  const [newsStatus, setNewsStatus] = useState("idle");
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [imageAdjustMedia, setImageAdjustMedia] = useState(null);
  const [profileTab, setProfileTab] = useState(
    initialViewState?.profileTab ?? "Posts"
  );
  const [moreSection, setMoreSection] = useState(
    initialViewState?.moreSection ?? "Settings"
  );
  const [settingsDraft, setSettingsDraft] = useState(() => createSettingsDraft());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [searchStatus, setSearchStatus] = useState("idle");
  const [messageThreads, setMessageThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [threadMessages, setThreadMessages] = useState({});
  const [messageSearchResults, setMessageSearchResults] = useState({
    threads: [],
    messages: [],
  });
  const [messageSearchStatus, setMessageSearchStatus] = useState("idle");
  const [activeCall, setActiveCall] = useState(null);
  const [callEvents, setCallEvents] = useState([]);
  const [lists, setLists] = useState(saved?.lists ?? []);
  const [communities, setCommunities] = useState(saved?.communities ?? []);
  const [communityDraft, setCommunityDraft] = useState({
    name: "",
    description: "",
  });
  const [joinedCommunities, setJoinedCommunities] = useState(
    () => new Set(saved?.joinedCommunities ?? [])
  );
  const [isPremium, setIsPremium] = useState(saved?.isPremium ?? false);
  const [spaces, setSpaces] = useState(saved?.spaces ?? []);
  const [joinedSpaces, setJoinedSpaces] = useState(
    () => new Set(saved?.joinedSpaces ?? [])
  );
  const [liveEvents, setLiveEvents] = useState(saved?.liveEvents ?? []);
  const [liveNotified, setLiveNotified] = useState(
    () => new Set(saved?.liveNotified ?? [])
  );
  const [scheduledPosts, setScheduledPosts] = useState(
    saved?.scheduledPosts ?? []
  );
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollVotes, setPollVotes] = useState(
    () => new Set(saved?.pollVotes ?? [])
  );
  const [pinnedPostId, setPinnedPostId] = useState(
    saved?.pinnedPostId ?? null
  );
  const [focusComposer, setFocusComposer] = useState(false);
  const [replyPostId, setReplyPostId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [muted, setMuted] = useState(() => new Set(saved?.muted ?? []));
  const [blocked, setBlocked] = useState(() => new Set(saved?.blocked ?? []));
  const [reports, setReports] = useState(saved?.reports ?? []);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminStatus, setAdminStatus] = useState("idle");
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminPosts, setAdminPosts] = useState([]);
  const [adminQuery, setAdminQuery] = useState("");
  const [adminSelectedUserId, setAdminSelectedUserId] = useState(null);
  const [adminSelectedUserPosts, setAdminSelectedUserPosts] = useState([]);
  const [adminSelectedUserPostsStatus, setAdminSelectedUserPostsStatus] =
    useState("idle");
  const [adminSystemStatus, setAdminSystemStatus] = useState(null);
  const [adminLastUpdatedAt, setAdminLastUpdatedAt] = useState(null);

  const currentUser = useMemo(
    () =>
      userProfiles.find((item) => item.id === currentUserId) ?? authUser,
    [userProfiles, currentUserId, authUser]
  );

  useEffect(() => {
    let active = true;
    apiMe()
      .then((data) => {
        if (!active) return;
        setAuthUser(data.user);
        setAuthStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setAuthStatus("ready");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authUser) return;
    callEventCursorRef.current = 0;
    dismissedCallIdsRef.current = new Set();
    setActiveCall(null);
    setCallEvents([]);
  }, [authUser]);

  useEffect(() => {
    saveViewState({
      activePage,
      activeFeed,
      activeProfileId: activePage === "Profile" ? activeProfileId : null,
      profileTab,
      moreSection,
    });
  }, [activePage, activeFeed, activeProfileId, profileTab, moreSection]);

  useEffect(() => {
    if (!authUser) return;
    const userKey = `circle_state_user_${authUser.id}`;
    const userSaved = loadState(userKey);
    if (userSaved) {
      setDrafts(userSaved.drafts ?? []);
      setLists(userSaved.lists ?? []);
      setCommunities(userSaved.communities ?? []);
      setJoinedCommunities(new Set(userSaved.joinedCommunities ?? []));
      setIsPremium(userSaved.isPremium ?? false);
      setSpaces(userSaved.spaces ?? []);
      setJoinedSpaces(new Set(userSaved.joinedSpaces ?? []));
      setLiveEvents(userSaved.liveEvents ?? []);
      setLiveNotified(new Set(userSaved.liveNotified ?? []));
      setScheduledPosts(userSaved.scheduledPosts ?? []);
      setPollVotes(new Set(userSaved.pollVotes ?? []));
      setPinnedPostId(userSaved.pinnedPostId ?? null);
      setMuted(new Set(userSaved.muted ?? []));
      setBlocked(new Set(userSaved.blocked ?? []));
      setReports(userSaved.reports ?? []);
    }
    setSettingsDraft(createSettingsDraft(authUser));
    setActiveProfileId((prev) => prev ?? authUser.id);
    (async () => {
      try {
        const [usersRes, followsRes, postsRes, notificationsRes, threadsRes] =
          await Promise.all([
            apiGetUsers(),
            apiGetFollows(),
            apiGetPosts(activeFeed === "Following" ? "following" : "for-you"),
            apiGetNotifications(),
            apiGetMessageThreads(),
          ]);
        setUserProfiles(usersRes.users ?? []);
        setFollowing(new Set(followsRes.following ?? []));
        setFollowers(new Set(followsRes.followers ?? []));
        setNotifications(notificationsRes.notifications ?? []);
        setMessageThreads(sortMessageThreads(threadsRes.threads ?? []));
        const nextPosts = postsRes.posts ?? [];
        setPosts(nextPosts);
        setLiked(new Set(nextPosts.filter((p) => p.likedByMe).map((p) => p.id)));
        setBookmarked(
          new Set(nextPosts.filter((p) => p.bookmarkedByMe).map((p) => p.id))
        );
        setReposted(
          new Set(nextPosts.filter((p) => p.repostedByMe).map((p) => p.id))
        );
      } catch {
        // If any request fails, keep existing UI state.
      }
    })();
  }, [authUser, activeFeed]);

  useEffect(() => {
    if (!authUser || !activeProfileId) return;
    setProfileComposer("");
    setProfileComposerImage("");
    apiGetPostsByUser(activeProfileId)
      .then((data) => {
        setProfilePosts(data.posts ?? []);
      })
      .catch(() => {
        setProfilePosts([]);
      });
  }, [authUser, activeProfileId]);

  useEffect(() => {
    if (!authUser) return;
    if (activePage !== "Profile") return;
    if (activeProfileId) return;
    setActiveProfileId(currentUserId);
  }, [authUser, activePage, activeProfileId, currentUserId]);

  useEffect(() => {
    if (!authUser) return;
    if (activePage !== "Profile") return;
    if (!activeProfileId) return;
    if (userProfiles.length === 0) return;
    const exists = userProfiles.some((user) => user.id === activeProfileId);
    if (!exists) {
      setActiveProfileId(currentUserId);
    }
  }, [authUser, activePage, activeProfileId, currentUserId, userProfiles]);

  useEffect(() => {
    if (!authUser || activePage !== "Bookmarks") return;
    apiGetBookmarkedPosts()
      .then((data) => setBookmarkedPosts(data.posts ?? []))
      .catch(() => setBookmarkedPosts([]));
  }, [authUser, activePage]);

  useEffect(() => {
    if (!authUser) return;
    if (activePage !== "Profile") return;
    if (profileTab !== "Likes") return;
    if (activeProfileId !== currentUserId) return;
    apiGetLikedPosts()
      .then((data) => setLikedPosts(data.posts ?? []))
      .catch(() => setLikedPosts([]));
  }, [authUser, activePage, profileTab, activeProfileId, currentUserId]);

  useEffect(() => {
    if (!authUser) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults({ users: [], posts: [] });
      setSearchStatus("idle");
      return;
    }
    setSearchStatus("loading");
    const timer = setTimeout(() => {
      apiSearch(q)
        .then((data) => {
          setSearchResults({
            users: data.users ?? [],
            posts: data.posts ?? [],
          });
          setSearchStatus("ready");
        })
        .catch(() => {
          setSearchResults({ users: [], posts: [] });
          setSearchStatus("error");
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [authUser, searchQuery]);

  const activeProfile = useMemo(
    () => userProfiles.find((item) => item.id === activeProfileId),
    [userProfiles, activeProfileId]
  );

  const threadsWithMessages = useMemo(
    () =>
      messageThreads.map((thread) => ({
        ...thread,
        messages: threadMessages[thread.id] ?? [],
      })),
    [messageThreads, threadMessages]
  );

  const messageUnreadCount = useMemo(
    () =>
      messageThreads.reduce(
        (total, thread) => total + (thread.unreadCount ?? 0),
        0
      ),
    [messageThreads]
  );

  useEffect(() => {
    if (messageThreads.length === 0) {
      setActiveThreadId(null);
      return;
    }
    if (
      !activeThreadId ||
      !messageThreads.some((thread) => thread.id === activeThreadId)
    ) {
      const preferredThread =
        messageThreads.find((thread) => !thread.archived) ?? messageThreads[0];
      handleSelectThread(preferredThread.id);
    }
  }, [activeThreadId, messageThreads]);

  useEffect(() => {
    if (!authUser) return;
    const timer = setInterval(() => {
      refreshMessageThreads();
    }, 12000);
    return () => clearInterval(timer);
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !activeThreadId) return;
    const timer = setInterval(() => {
      refreshActiveThread(activeThreadId, { silent: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [authUser, activeThreadId]);

  useEffect(() => {
    if (!authUser) return;
    refreshCalls();
    const timer = setInterval(() => {
      refreshCalls();
    }, 1600);
    return () => clearInterval(timer);
  }, [authUser]);

  useEffect(() => {
    if (!activeCall || !["ended", "declined", "canceled", "missed"].includes(activeCall.status)) {
      return undefined;
    }
    const timer = setTimeout(() => {
      dismissedCallIdsRef.current.add(activeCall.id);
      setActiveCall((prev) => (prev?.id === activeCall.id ? null : prev));
      setCallEvents([]);
    }, 2400);
    return () => clearTimeout(timer);
  }, [activeCall]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.Notification) return;
    if (activePage !== "Messages") return;
    if (window.Notification.permission !== "default") return;
    window.Notification.requestPermission().catch(() => {});
  }, [activePage]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.Notification) return;
    const supported = window.Notification.permission === "granted";
    if (!supported) return;

    for (const thread of messageThreads) {
      const cachedTime = messageNotificationRef.current.get(thread.id);
      if (thread.unreadCount > 0 && thread.time && cachedTime && cachedTime !== thread.time) {
        if (activePage !== "Messages" || activeThreadId !== thread.id) {
          new window.Notification(thread.name, {
            body: thread.typingUsers?.length
              ? `${thread.typingUsers[0].name} is typing...`
              : thread.preview || "New message",
          });
        }
      }
      if (thread.time) {
        messageNotificationRef.current.set(thread.id, thread.time);
      }
    }
  }, [activePage, activeThreadId, messageThreads]);

  const getAuthor = useCallback(
    (post) =>
      userProfiles.find((user) => user.id === post.userId) ?? {
        name: post.name,
        handle: post.handle,
        verified: post.verified,
        avatar: "",
      },
    [userProfiles]
  );

  const filteredPosts = useMemo(() => {
    let base = activePage === "Profile" ? profilePosts : posts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter((post) => {
        const author = getAuthor(post);
        return (
          post.text.toLowerCase().includes(q) ||
          author.name.toLowerCase().includes(q) ||
          author.handle.toLowerCase().includes(q)
        );
      });
    }
    base = base.filter((post) => !blocked.has(post.userId));
    if (activePage === "Profile") {
      if (!activeProfileId) return [];
      let next = base.filter(
        (post) =>
          post.userId === activeProfileId || post.targetUserId === activeProfileId
      );
      if (profileTab === "Replies") {
        next = next.filter((post) => post.replyTo);
      }
      if (profileTab === "Media") {
        next = next.filter((post) => post.image);
      }
      if (profileTab === "Likes") {
        if (activeProfileId === currentUserId) {
          next = likedPosts;
        } else {
          next = next.filter((post) => liked.has(post.id));
        }
      }
      if (profileTab === "Highlights") {
        next = next.filter(
          (post) => post.isHighlight || post.likes >= 1000 || post.image
        );
      }
      if (profileTab === "Articles") {
        next = next.filter(
          (post) => post.isArticle || (post.text && post.text.length > 140)
        );
      }
      return next;
    }
    if (activeFeed === "Following") {
      if (!currentUserId) return base;
      return base.filter(
        (post) => following.has(post.userId) || post.userId === currentUserId
      );
    }
    return base;
  }, [
    posts,
    activeFeed,
    activePage,
    activeProfileId,
    following,
    profileTab,
    liked,
    searchQuery,
    blocked,
    getAuthor,
  ]);

  const filteredNotifications = useMemo(() => {
    if (notificationFilter === "All") return notifications;
    return notifications.filter(
      (item) => item.type === notificationFilter.toLowerCase()
    );
  }, [notificationFilter, notifications]);

  function buildPoll() {
    if (!pollEnabled) return null;
    const options = pollOptions
      .map((option, index) => ({
        id: `p${index + 1}`,
        text: option.trim(),
        votes: 0,
      }))
      .filter((option) => option.text);
    if (options.length < 2) return null;
    return {
      question: pollQuestion.trim() || "Poll",
      options,
    };
  }

  function resetComposerExtras() {
    setPollEnabled(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setScheduleEnabled(false);
    setScheduleTime("");
  }

  function bumpPostCount(delta) {
    setUserProfiles((prev) =>
      prev.map((user) =>
        user.id === currentUserId
          ? { ...user, posts: Math.max(0, (user.posts ?? 0) + delta) }
          : user
      )
    );
  }

  function addToProfilePosts(post) {
    if (activeProfileId !== currentUserId) return;
    setProfilePosts((prev) => [post, ...prev]);
  }

  async function handlePost(event) {
    event.preventDefault();
    if (!composer.trim() && !composerImage) return;
    if (composer.trim().length > 280) return;
    let posted = false;
    try {
      const data = await apiCreatePost({
        text: composer.trim() || "New moment",
        image: composerImage,
        poll: buildPoll(),
        visibility: "home",
        replyAudience: composerReplyAudience,
      });
      if (data?.post) {
        posted = true;
        setPosts((prev) => [data.post, ...prev]);
        bumpPostCount(1);
        addToProfilePosts(data.post);
      }
    } catch {
      // Keep local composer state if posting fails.
    }
    if (!posted) return;
    setComposer("");
    setComposerImage("");
    resetComposerExtras();
    setComposerReplyAudience("everyone");
    setComposeModalOpen(false);
    setActivePage("Home");
  }

  function handleSaveDraft() {
    if (!composer.trim() && !composerImage) return;
    const draft = {
      id: Date.now(),
      text: composer.trim(),
      image: composerImage,
      poll: buildPoll(),
      replyAudience: composerReplyAudience,
    };
    setDrafts((prev) => [draft, ...prev]);
    setComposer("");
    setComposerImage("");
    resetComposerExtras();
    setComposerReplyAudience("everyone");
    setComposeModalOpen(false);
  }

  async function handlePostDraft(id) {
    const draft = drafts.find((item) => item.id === id);
    if (!draft) return;
    try {
      const data = await apiCreatePost({
        text: draft.text || "New moment",
        image: draft.image || "",
        poll: draft.poll ?? null,
        visibility: "home",
        replyAudience: draft.replyAudience ?? "everyone",
      });
      if (data?.post) {
        setPosts((prev) => [data.post, ...prev]);
        bumpPostCount(1);
        addToProfilePosts(data.post);
      }
    } catch {
      // Ignore errors for now.
    }
    setDrafts((prev) => prev.filter((item) => item.id !== id));
  }

  function handleDeleteDraft(id) {
    setDrafts((prev) => prev.filter((item) => item.id !== id));
  }

  async function handlePostToProfile(event) {
    event.preventDefault();
    if (!activeProfileId) return;
    if (!profileComposer.trim() && !profileComposerImage) return;
    if (profileComposer.trim().length > 280) return;
    try {
      const data = await apiCreatePost({
        text: profileComposer.trim() || "New moment",
        image: profileComposerImage,
        visibility: "profile",
        targetUserId: activeProfileId,
        replyAudience: profileReplyAudience,
      });
      if (data?.post) {
        setProfilePosts((prev) => [data.post, ...prev]);
      }
    } catch {
      // Ignore.
    }
    setProfileComposer("");
    setProfileComposerImage("");
    setProfileReplyAudience("everyone");
  }

  async function toggleLike(id) {
    try {
      const data = await apiToggleLike(id);
      setLiked((prev) => {
        const next = new Set(prev);
        if (data.liked) next.add(id);
        else next.delete(id);
        return next;
      });
      setPosts((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, likes: data.likes } : post
        )
      );
      setProfilePosts((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, likes: data.likes } : post
        )
      );
      setLikedPosts((prev) => {
        const exists = prev.some((post) => post.id === id);
        if (data.liked && !exists) {
          const source = posts.find((post) => post.id === id);
          return source ? [source, ...prev] : prev;
        }
        if (!data.liked && exists) {
          return prev.filter((post) => post.id !== id);
        }
        return prev;
      });
    } catch {
      // Ignore.
    }
  }

  async function toggleRepost(id) {
    try {
      const data = await apiToggleRepost(id);
      setReposted((prev) => {
        const next = new Set(prev);
        if (data.reposted) next.add(id);
        else next.delete(id);
        return next;
      });
      setPosts((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, reposts: data.reposts } : post
        )
      );
      setProfilePosts((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, reposts: data.reposts } : post
        )
      );
    } catch {
      // Ignore.
    }
  }

  function openProfile(userId) {
    if (!userId) return;
    setActiveProfileId(userId);
    setActivePage("Profile");
  }

  function openImageLightbox(media) {
    if (!media?.src) return;
    setLightboxMedia(media);
  }

  function closeImageLightbox() {
    setLightboxMedia(null);
  }

  function openComposeModal() {
    setComposerReplyAudience("everyone");
    setComposeModalOpen(true);
  }

  function closeComposeModal() {
    setComposerReplyAudience("everyone");
    setComposeModalOpen(false);
  }

  function openImageAdjuster(kind, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setImageAdjustMedia({
        kind,
        src: reader.result,
        scale: 1,
        positionX: 50,
        positionY: 50,
      });
    };
    reader.readAsDataURL(file);
  }

  function closeImageAdjuster() {
    setImageAdjustMedia(null);
  }

  function applyAdjustedImage({ src, scale, positionX, positionY }) {
    if (!imageAdjustMedia?.kind || !src) return;
    if (imageAdjustMedia.kind === "avatar") {
      setSettingsDraft((prev) => ({
        ...prev,
        avatar: src,
        avatarScale: scale,
      }));
    } else {
      setSettingsDraft((prev) => ({
        ...prev,
        banner: src,
        bannerScale: scale,
        bannerPositionX: positionX ?? 50,
        bannerPositionY: positionY ?? 50,
      }));
    }
    setImageAdjustMedia(null);
  }

  async function toggleFollow(userId) {
    try {
      const data = await apiToggleFollow(userId);
      setFollowing((prev) => {
        const next = new Set(prev);
        if (data.following) next.add(userId);
        else next.delete(userId);
        return next;
      });
      setUserProfiles((profiles) =>
        profiles.map((user) => {
          if (user.id === userId) {
            return { ...user, followers: data.followerCount };
          }
          if (user.id === currentUserId) {
            return { ...user, following: data.followingCount };
          }
          return user;
        })
      );
    } catch {
      // Ignore.
    }
  }

  function toggleFollower(userId) {
    setFollowers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  async function handleSettingsSave(event) {
    event?.preventDefault?.();
    try {
      const data = await apiUpdateProfile(settingsDraft);
      if (data?.user) {
        setAuthUser(data.user);
        setSettingsDraft(createSettingsDraft(data.user));
        setUserProfiles((prev) =>
          prev.map((user) =>
            user.id === currentUserId ? { ...user, ...data.user } : user
          )
        );
        return true;
      }
    } catch {
      // Ignore.
    }
    return false;
  }

  function handleImageSelect(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setComposerImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleProfileImageSelect(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileComposerImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleAvatarSelect(file) {
    openImageAdjuster("avatar", file);
  }

  function handleBannerSelect(file) {
    openImageAdjuster("banner", file);
  }

  function openEditProfileModal() {
    setSettingsDraft(createSettingsDraft(currentUser ?? authUser));
    setEditProfileOpen(true);
  }

  function closeEditProfileModal() {
    setEditProfileOpen(false);
  }

  async function toggleNotificationRead(id) {
    try {
      await apiReadNotification(id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, read: true } : item
        )
      );
    } catch {
      // Ignore.
    }
  }

  async function markAllNotificationsRead() {
    try {
      await apiReadAllNotifications();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch {
      // Ignore.
    }
  }

  function mergeMessageThreadSummary(nextThread) {
    if (!nextThread?.id) return;
    setMessageThreads((prev) => {
      const exists = prev.some((thread) => thread.id === nextThread.id);
      const next = exists
        ? prev.map((thread) =>
            thread.id === nextThread.id ? { ...thread, ...nextThread } : thread
          )
        : [nextThread, ...prev];
      return sortMessageThreads(next);
    });
  }

  function mergeCallSummary(nextCall) {
    if (!nextCall?.id) return;
    setActiveCall((prev) => {
      if (!prev || prev.id !== nextCall.id) return nextCall;
      return {
        ...prev,
        ...nextCall,
      };
    });
  }

  async function refreshCalls() {
    try {
      const data = await apiPollCalls(callEventCursorRef.current);
      const nextLastEventId = Number(data.lastEventId ?? callEventCursorRef.current);
      callEventCursorRef.current = Number.isFinite(nextLastEventId)
        ? nextLastEventId
        : callEventCursorRef.current;
      if (Array.isArray(data.events) && data.events.length > 0) {
        setCallEvents((prev) => {
          const seen = new Set(prev.map((event) => event.id));
          const merged = [...prev];
          for (const event of data.events) {
            if (seen.has(event.id)) continue;
            seen.add(event.id);
            merged.push(event);
          }
          return merged.slice(-160);
        });
      }
      if (data.call) {
        if (["ringing", "active"].includes(data.call.status)) {
          dismissedCallIdsRef.current.delete(data.call.id);
        }
        if (
          dismissedCallIdsRef.current.has(data.call.id) &&
          ["ended", "declined", "canceled", "missed"].includes(data.call.status)
        ) {
          setActiveCall(null);
          return;
        }
        mergeCallSummary(data.call);
      } else {
        setActiveCall(null);
        setCallEvents([]);
      }
    } catch {
      // Ignore polling errors.
    }
  }

  async function refreshMessageThreads() {
    try {
      const data = await apiGetMessageThreads();
      setMessageThreads(sortMessageThreads(data.threads ?? []));
    } catch {
      // Ignore.
    }
  }

  async function refreshActiveThread(threadId, options = {}) {
    try {
      const data = await apiGetMessageThread(threadId);
      if (!options.silent) {
        setActiveThreadId(threadId);
      }
      setThreadMessages((prev) => ({
        ...prev,
        [threadId]: data.messages ?? [],
      }));
      if (data.thread) {
        mergeMessageThreadSummary(data.thread);
      }
    } catch {
      // Ignore.
    }
  }

  async function handleSelectThread(threadId) {
    await refreshActiveThread(threadId);
  }

  async function handleCreateThread(payload) {
    try {
      const data = await apiCreateMessageThread(payload);
      if (!data?.thread?.id) return;
      setActivePage("Messages");
      mergeMessageThreadSummary(data.thread);
      await refreshMessageThreads();
      await refreshActiveThread(data.thread.id);
    } catch {
      // Ignore.
    }
  }

  async function handleMessageSearch(query) {
    const trimmed = `${query ?? ""}`.trim();
    if (!trimmed) {
      setMessageSearchResults({ threads: [], messages: [] });
      setMessageSearchStatus("idle");
      return;
    }
    setMessageSearchStatus("loading");
    try {
      const data = await apiSearchMessages(trimmed);
      setMessageSearchResults({
        threads: data.threads ?? [],
        messages: data.messages ?? [],
      });
      setMessageSearchStatus("ready");
    } catch {
      setMessageSearchResults({ threads: [], messages: [] });
      setMessageSearchStatus("error");
    }
  }

  async function handleSendMessage(threadId, payload) {
    try {
      const data = await apiSendMessage(threadId, payload);
      setThreadMessages((prev) => ({
        ...prev,
        [threadId]: data.messages ?? [],
      }));
      if (data.thread) {
        mergeMessageThreadSummary(data.thread);
      }
      await refreshMessageThreads();
    } catch {
      // Ignore.
    }
  }

  async function handleMessageThreadUpdate(threadId, payload) {
    try {
      const data = await apiUpdateMessageThread(threadId, payload);
      if (data.thread) {
        mergeMessageThreadSummary(data.thread);
      }
      if (activeThreadId === threadId) {
        await refreshActiveThread(threadId, { silent: true });
      }
    } catch {
      // Ignore.
    }
  }

  async function handleMessageAccept(threadId) {
    try {
      const data = await apiAcceptMessageThread(threadId);
      if (data.thread) {
        mergeMessageThreadSummary(data.thread);
      }
      await refreshActiveThread(threadId, { silent: true });
      await refreshMessageThreads();
    } catch {
      // Ignore.
    }
  }

  async function handleMessageDecline(threadId) {
    try {
      await apiDeclineMessageThread(threadId);
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
      setThreadMessages((prev) => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
      await refreshMessageThreads();
    } catch {
      // Ignore.
    }
  }

  async function handleMessageTyping(threadId, isTyping) {
    try {
      await apiSetTyping(threadId, isTyping);
    } catch {
      // Ignore.
    }
  }

  async function handleMessageAction(threadId, messageId, action) {
    try {
      const data = await apiUpdateMessage(messageId, { action });
      setThreadMessages((prev) => ({
        ...prev,
        [threadId]: data.messages ?? [],
      }));
      if (data.thread) {
        mergeMessageThreadSummary(data.thread);
      }
      await refreshMessageThreads();
    } catch {
      // Ignore.
    }
  }

  async function handleStartCall(threadId, mode) {
    try {
      const data = await apiStartCall(threadId, { mode });
      if (data.call) {
        setCallEvents([]);
        callEventCursorRef.current = 0;
        setActiveCall(data.call);
      }
      await refreshCalls();
    } catch {
      // Ignore.
    }
  }

  async function handleAcceptCall(callId) {
    try {
      const data = await apiAcceptCall(callId);
      if (data.call) {
        mergeCallSummary(data.call);
      }
      await refreshCalls();
    } catch {
      // Ignore.
    }
  }

  async function handleDeclineCall(callId) {
    dismissedCallIdsRef.current.add(callId);
    setActiveCall(null);
    setCallEvents([]);
    try {
      await apiDeclineCall(callId);
      await refreshCalls();
    } catch {
      // Ignore.
    }
  }

  async function handleEndCall(callId) {
    dismissedCallIdsRef.current.add(callId);
    setActiveCall(null);
    setCallEvents([]);
    try {
      await apiEndCall(callId);
      await refreshCalls();
    } catch {
      // Ignore.
    }
  }

  async function handleSendCallSignal(callId, type, payload) {
    try {
      const data = await apiSendCallSignal(callId, { type, payload });
      if (data.call) {
        mergeCallSummary(data.call);
      }
      return data;
    } catch {
      return null;
    }
  }

  function handleAddList(name) {
    setLists((prev) => [
      { id: Date.now(), name, members: 0 },
      ...prev,
    ]);
  }

  function handleRemoveList(id) {
    setLists((prev) => prev.filter((item) => item.id !== id));
  }

  function handleReplyToggle(postId) {
    setReplyPostId((prev) => (prev === postId ? null : postId));
    setReplyDraft("");
  }

  async function handleReplySubmit(event, postId) {
    event.preventDefault();
    if (!replyDraft.trim()) return;
    let posted = false;
    try {
      const data = await apiCreatePost({
        text: replyDraft.trim(),
        replyTo: postId,
      });
      if (data?.post) {
        posted = true;
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, comments: post.comments + 1 }
              : post
          )
        );
        bumpPostCount(1);
        addToProfilePosts(data.post);
      }
    } catch {
      // Ignore.
    }
    if (!posted) return;
    setReplyDraft("");
    setReplyPostId(null);
  }

  async function handleToggleReplies(postId) {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
    if (repliesByPostId[postId]) return;
    try {
      const data = await apiGetReplies(postId);
      setRepliesByPostId((prev) => ({
        ...prev,
        [postId]: data.posts ?? [],
      }));
    } catch {
      // Ignore.
    }
  }

  function handleShare(postId) {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, shares: (post.shares ?? 0) + 1 }
          : post
      )
    );
    const shareUrl = `${window.location.origin}/post/${postId}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
  }

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      // Ignore logout errors; clear local state anyway.
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
    window.location.reload();
  }

  async function handleView(postId) {
    if (viewedRef.current.has(postId)) return;
    viewedRef.current.add(postId);
    try {
      const data = await apiAddView(postId);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, views: data.views } : post
        )
      );
      setProfilePosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, views: data.views } : post
        )
      );
    } catch {
      // Ignore.
    }
  }

  async function fetchAdminUsers() {
    if (!authUser?.isOwner) return;
    try {
      setAdminStatus("loading");
      const [usersRes, summaryRes, postsRes, statusRes] = await Promise.all([
        apiGetAdminUsers(),
        apiGetAdminSummary(),
        apiGetAdminPosts(),
        apiGetAdminStatus(),
      ]);
      const nextUsers = usersRes.users ?? [];
      setAdminUsers(nextUsers);
      setAdminSummary(summaryRes ?? null);
      setAdminPosts(postsRes.posts ?? []);
      setAdminSystemStatus(statusRes ?? null);
      setAdminLastUpdatedAt(Date.now());
      setAdminStatus("ready");
      const nextSelectedUserId = nextUsers.some(
        (user) => user.id === adminSelectedUserId
      )
        ? adminSelectedUserId
        : nextUsers.find((user) => user.id === currentUserId)?.id ??
          nextUsers[0]?.id ??
          null;
      if (nextSelectedUserId) {
        await handleAdminSelectUser(nextSelectedUserId);
      } else {
        setAdminSelectedUserId(null);
        setAdminSelectedUserPosts([]);
        setAdminSelectedUserPostsStatus("idle");
      }
    } catch {
      setAdminStatus("error");
    }
  }

  async function handleAdminSelectUser(userId) {
    if (!authUser?.isOwner || !userId) return;
    setAdminSelectedUserId(userId);
    try {
      setAdminSelectedUserPostsStatus("loading");
      const data = await apiGetAdminUserPosts(userId);
      setAdminSelectedUserPosts(data.posts ?? []);
      setAdminSelectedUserPostsStatus("ready");
    } catch {
      setAdminSelectedUserPosts([]);
      setAdminSelectedUserPostsStatus("error");
    }
  }

  async function handleAdminUpdate(userId, payload) {
    try {
      const data = await apiAdminUpdateUser(userId, payload);
      setAdminUsers((prev) =>
        prev.map((user) => (user.id === userId ? data.user : user))
      );
      setUserProfiles((prev) =>
        prev.map((user) => (user.id === userId ? data.user : user))
      );
      if (data.user?.id === currentUserId) {
        setAuthUser((prev) => ({ ...prev, ...data.user }));
      }
    } catch {
      // Ignore.
    }
  }

  async function handleAdminDeletePost(postId) {
    try {
      await apiAdminDeletePost(postId);
      setAdminPosts((prev) => prev.filter((post) => post.id !== postId));
      setAdminSelectedUserPosts((prev) =>
        prev.filter((post) => post.id !== postId)
      );
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setProfilePosts((prev) => prev.filter((post) => post.id !== postId));
      setAdminSummary((prev) =>
        prev
          ? { ...prev, posts: Math.max(0, (prev.posts ?? 0) - 1) }
          : prev
      );
    } catch {
      // Ignore.
    }
  }

  async function handleDeletePost(postId) {
    try {
      await apiDeletePost(postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setProfilePosts((prev) => prev.filter((post) => post.id !== postId));
      setBookmarkedPosts((prev) => prev.filter((post) => post.id !== postId));
      setLikedPosts((prev) => prev.filter((post) => post.id !== postId));
      if (pinnedPostId === postId) {
        setPinnedPostId(null);
      }
      bumpPostCount(-1);
    } catch {
      // Ignore.
    }
  }

  async function handleEditPost(postId, text) {
    try {
      await apiEditPost(postId, { text });
      setPosts((prev) =>
        prev.map((post) => (post.id === postId ? { ...post, text } : post))
      );
      setProfilePosts((prev) =>
        prev.map((post) => (post.id === postId ? { ...post, text } : post))
      );
    } catch {
      // Ignore.
    }
  }

  function handlePinPost(postId) {
    setPinnedPostId((prev) => (prev === postId ? null : postId));
  }

  function handleVote(postId, optionId) {
    if (pollVotes.has(postId)) return;
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId || !post.poll) return post;
        return {
          ...post,
          poll: {
            ...post.poll,
            options: post.poll.options.map((option) =>
              option.id === optionId
                ? { ...option, votes: option.votes + 1 }
                : option
            ),
          },
        };
      })
    );
    setPollVotes((prev) => new Set(prev).add(postId));
  }

  function toggleMute(userId) {
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function toggleBlock(userId) {
    setBlocked((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function reportProfile(userId) {
    setReports((prev) => [
      { id: Date.now(), userId, time: "now" },
      ...prev,
    ]);
  }

  function handleStartSpace() {
    const next = {
      id: Date.now(),
      title: "My new space",
      host: currentUser?.name ?? "You",
      listeners: 1,
      live: true,
    };
    setSpaces((prev) => [next, ...prev]);
  }

  function handleToggleJoin(spaceId) {
    setJoinedSpaces((prev) => {
      const next = new Set(prev);
      const joining = !next.has(spaceId);
      if (joining) {
        next.add(spaceId);
      } else {
        next.delete(spaceId);
      }
      setSpaces((spacesPrev) =>
        spacesPrev.map((space) => {
          if (space.id !== spaceId) return space;
          const delta = joining ? 1 : -1;
          return { ...space, listeners: Math.max(0, space.listeners + delta) };
        })
      );
      return next;
    });
  }

  function handleGoLive() {
    const next = {
      id: Date.now(),
      title: "Live now",
      host: currentUser?.name ?? "You",
      viewers: 1,
      live: true,
    };
    setLiveEvents((prev) => [next, ...prev]);
  }

  function handleToggleNotify(liveId) {
    setLiveNotified((prev) => {
      const next = new Set(prev);
      if (next.has(liveId)) {
        next.delete(liveId);
      } else {
        next.add(liveId);
      }
      return next;
    });
  }

  function handleSchedule() {
    if (!scheduleTime) return;
    if (!composer.trim() && !composerImage) return;
    if (composer.trim().length > 280) return;
    const scheduled = {
      id: Date.now(),
      time: scheduleTime,
      text: composer.trim(),
      image: composerImage,
      poll: buildPoll(),
      replyAudience: composerReplyAudience,
    };
    setScheduledPosts((prev) => [scheduled, ...prev]);
    setComposer("");
    setComposerImage("");
    resetComposerExtras();
    setComposerReplyAudience("everyone");
  }

  async function handlePostScheduled(id) {
    const scheduled = scheduledPosts.find((item) => item.id === id);
    if (!scheduled) return;
    try {
      const data = await apiCreatePost({
        text: scheduled.text || "New moment",
        image: scheduled.image || "",
        poll: scheduled.poll ?? null,
        visibility: "home",
        replyAudience: scheduled.replyAudience ?? "everyone",
      });
      if (data?.post) {
        setPosts((prev) => [data.post, ...prev]);
        bumpPostCount(1);
        addToProfilePosts(data.post);
      }
    } catch {
      // Ignore.
    }
    setScheduledPosts((prev) => prev.filter((item) => item.id !== id));
  }

  function handleDeleteScheduled(id) {
    setScheduledPosts((prev) => prev.filter((item) => item.id !== id));
  }

  function handleCreateCommunity() {
    if (!communityDraft.name.trim()) return;
    const next = {
      id: Date.now(),
      name: communityDraft.name.trim(),
      description: communityDraft.description.trim() || "New community",
      members: 1,
    };
    setCommunities((prev) => [next, ...prev]);
    setJoinedCommunities((prev) => new Set(prev).add(next.id));
    setCommunityDraft({ name: "", description: "" });
  }

  function handleToggleCommunity(id) {
    setJoinedCommunities((prev) => {
      const next = new Set(prev);
      const joining = !next.has(id);
      if (joining) {
        next.add(id);
      } else {
        next.delete(id);
      }
      setCommunities((communitiesPrev) =>
        communitiesPrev.map((community) => {
          if (community.id !== id) return community;
          const delta = joining ? 1 : -1;
          return {
            ...community,
            members: Math.max(0, community.members + delta),
          };
        })
      );
      return next;
    });
  }

  useEffect(() => {
    const key = authUser ? `circle_state_user_${authUser.id}` : STORAGE_KEY;
    saveState({
      lists,
      communities,
      joinedCommunities: Array.from(joinedCommunities),
      isPremium,
      drafts,
      muted: Array.from(muted),
      blocked: Array.from(blocked),
      reports,
      spaces,
      joinedSpaces: Array.from(joinedSpaces),
      liveEvents,
      liveNotified: Array.from(liveNotified),
      scheduledPosts,
      pollVotes: Array.from(pollVotes),
      pinnedPostId,
    }, key);
  }, [
    lists,
    communities,
    joinedCommunities,
    isPremium,
    drafts,
    muted,
    blocked,
    reports,
    spaces,
    joinedSpaces,
    liveEvents,
    liveNotified,
    scheduledPosts,
    pollVotes,
    pinnedPostId,
    authUser,
  ]);

  async function fetchNews() {
    try {
      setNewsStatus("loading");
      const response = await fetch("/api/news");
      if (!response.ok) throw new Error("News request failed");
      const data = await response.json();
      setNewsFeed(data.items ?? []);
      setNewsStatus("ready");
    } catch {
      setNewsStatus("error");
      setNewsFeed([]);
    }
  }

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    if (!focusComposer) return;
    const timer = setTimeout(() => setFocusComposer(false), 200);
    return () => clearTimeout(timer);
  }, [focusComposer]);

  const bookmarksFeed =
    bookmarkedPosts.length > 0
      ? bookmarkedPosts
      : posts.filter((post) => bookmarked.has(post.id));
  const followingList =
    activeProfileId === currentUserId
      ? userProfiles.filter((user) => following.has(user.id))
      : userProfiles.filter(
          (user) => user.id !== activeProfileId && user.id !== currentUserId
        );
  const followersList =
    activeProfileId === currentUserId
      ? userProfiles.filter((user) => followers.has(user.id))
      : userProfiles.filter(
          (user) => user.id !== activeProfileId && user.id !== currentUserId
        );
  const pinnedPost =
    pinnedPostId != null
      ? posts.find(
          (post) => post.id === pinnedPostId && post.userId === activeProfileId
        )
      : null;

  const trends = useMemo(() => {
    const counts = new Map();
    posts.forEach((post) => {
      const matches = post.text?.match(/#[\\w-]+/g) ?? [];
      matches.forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, posts: count }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 8);
  }, [posts]);

  const analytics = useMemo(() => {
    const impressions = posts.reduce((sum, post) => sum + (post.views ?? 0), 0);
    const likesTotal = posts.reduce((sum, post) => sum + (post.likes ?? 0), 0);
    const commentsTotal = posts.reduce(
      (sum, post) => sum + (post.comments ?? 0),
      0
    );
    const engagement = impressions
      ? Math.round(((likesTotal + commentsTotal) / impressions) * 100)
      : 0;
    return [
      {
        label: "Post impressions",
        value: formatCount(impressions),
        delta: "0%",
      },
      {
        label: "Profile visits",
        value: formatCount(followers.size),
        delta: "0%",
      },
      {
        label: "Engagement rate",
        value: `${engagement}%`,
        delta: "0%",
      },
      {
        label: "Link clicks",
        value: formatCount(0),
        delta: "0%",
      },
    ];
  }, [posts, followers.size]);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const isMessagesPage = activePage === "Messages";

  if (authStatus === "loading") {
    return (
      <div className="app-shell auth-page">
        <main className="main-feed glass auth-shell">
          <div className="glass auth-card">
            <div className="auth-header">
              <h2>Loading Circle</h2>
              <p>Preparing your feed.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="app-shell auth-page">
        <main className="main-feed glass auth-shell">
          <Auth onAuth={setAuthUser} />
        </main>
      </div>
    );
  }

  return (
    <div className={isMessagesPage ? "app-shell messages-layout" : "app-shell"}>
      <Sidebar
        navItems={navItems}
        activePage={activePage}
        currentUser={currentUser}
        unreadCount={unreadCount}
        messageUnreadCount={messageUnreadCount}
        onNavigate={(label) => {
          if (label === "Profile") {
            openProfile(currentUserId);
          } else {
            setActivePage(label);
          }
        }}
        onOpenProfile={() => openProfile(currentUserId)}
        onOpenSettings={() => {
          setActivePage("More");
          setMoreSection("Settings");
        }}
        onLogout={handleLogout}
        onPostClick={openComposeModal}
      />

      <main className={isMessagesPage ? "main-feed glass messages-page-feed" : "main-feed glass"}>
        <div className="site-brand-header">
          <button
            type="button"
            className="site-brand-button"
            aria-label="Circle home"
            onClick={() => setActivePage("Home")}
          >
            <img
              className="site-brand-image"
              src="/assets/sidebar-mark-white.png"
              alt="Circle"
            />
          </button>
        </div>
        {activePage === "Home" ? (
          <Home
            activeFeed={activeFeed}
            onFeedChange={setActiveFeed}
            posts={filteredPosts}
            liked={liked}
            reposted={reposted}
            onLike={toggleLike}
            onRepost={toggleRepost}
            onShare={handleShare}
            onOpenProfile={openProfile}
            composer={composer}
            onComposerChange={setComposer}
            composerImage={composerImage}
            onImageSelect={handleImageSelect}
            onImageClear={() => setComposerImage("")}
            onPost={handlePost}
            onSaveDraft={handleSaveDraft}
            drafts={drafts}
            onPostDraft={handlePostDraft}
            onDeleteDraft={handleDeleteDraft}
            scheduledPosts={scheduledPosts}
            onPostScheduled={handlePostScheduled}
            onDeleteScheduled={handleDeleteScheduled}
            onSchedule={handleSchedule}
            scheduleEnabled={scheduleEnabled}
            onScheduleToggle={() => setScheduleEnabled((prev) => !prev)}
            scheduleTime={scheduleTime}
            onScheduleChange={setScheduleTime}
            pollEnabled={pollEnabled}
            onPollToggle={() => setPollEnabled((prev) => !prev)}
            pollQuestion={pollQuestion}
            onPollQuestionChange={setPollQuestion}
            pollOptions={pollOptions}
            onPollOptionsChange={setPollOptions}
            onPollReset={() => {
              setPollEnabled(false);
              setPollQuestion("");
              setPollOptions(["", ""]);
            }}
            getAuthor={getAuthor}
            focusComposer={focusComposer}
            replyPostId={replyPostId}
            replyDraft={replyDraft}
            onReplyToggle={handleReplyToggle}
            onReplyChange={setReplyDraft}
            onReplySubmit={handleReplySubmit}
            currentUser={currentUser}
            currentUserId={currentUserId}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
            onPinPost={handlePinPost}
            pinnedPostId={pinnedPostId}
            onVote={handleVote}
            pollVotes={pollVotes}
            onView={handleView}
            onOpenImage={openImageLightbox}
          />
        ) : null}

        {activePage === "Explore" ? (
          <Explore
            trends={trends}
            users={userProfiles}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            results={searchResults}
            status={searchStatus}
            onOpenProfile={openProfile}
          />
        ) : null}

        {activePage === "Notifications" ? (
          <Notifications
            items={filteredNotifications}
            filter={notificationFilter}
            onFilterChange={setNotificationFilter}
            onToggleRead={toggleNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
          />
        ) : null}

        {activePage === "Messages" ? (
          <Messages
            currentUser={currentUser}
            users={userProfiles}
            threads={threadsWithMessages}
            activeThreadId={activeThreadId}
            activeCall={activeCall}
            searchResults={messageSearchResults}
            searchStatus={messageSearchStatus}
            blocked={blocked}
            onSearch={handleMessageSearch}
            onSelect={handleSelectThread}
            onSend={handleSendMessage}
            onStartCall={handleStartCall}
            onCreateThread={handleCreateThread}
            onUpdateThread={handleMessageThreadUpdate}
            onAcceptThread={handleMessageAccept}
            onDeclineThread={handleMessageDecline}
            onTyping={handleMessageTyping}
            onUpdateMessage={handleMessageAction}
            onOpenProfile={openProfile}
            onBlockUser={toggleBlock}
            onReportUser={reportProfile}
          />
        ) : null}

        {activePage === "Bookmarks" ? (
          <Bookmarks
            posts={bookmarksFeed}
            liked={liked}
            reposted={reposted}
            onLike={toggleLike}
            onRepost={toggleRepost}
            onShare={handleShare}
            onOpenProfile={openProfile}
            getAuthor={getAuthor}
            currentUserId={currentUserId}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
            onPinPost={handlePinPost}
            pinnedPostId={pinnedPostId}
            onVote={handleVote}
            pollVotes={pollVotes}
            onView={handleView}
            repliesByPostId={repliesByPostId}
            expandedReplies={expandedReplies}
            onToggleReplies={handleToggleReplies}
            onOpenImage={openImageLightbox}
          />
        ) : null}

        {activePage === "Lists" ? (
          <Lists
            lists={lists}
            onAddList={handleAddList}
            onRemoveList={handleRemoveList}
          />
        ) : null}

        {activePage === "Communities" ? (
          <Communities
            communities={communities}
            joined={joinedCommunities}
            onToggleJoin={handleToggleCommunity}
            onCreate={handleCreateCommunity}
            draft={communityDraft}
            onDraftChange={setCommunityDraft}
          />
        ) : null}

        {activePage === "Spaces" ? (
          <Spaces
            spaces={spaces}
            onStart={handleStartSpace}
            onToggleJoin={handleToggleJoin}
            joined={joinedSpaces}
          />
        ) : null}

        {activePage === "Live" ? (
          <Live
            lives={liveEvents}
            onGoLive={handleGoLive}
            onToggleNotify={handleToggleNotify}
            notified={liveNotified}
          />
        ) : null}

        {activePage === "Premium" ? (
          <Premium
            perks={premiumPerks}
            isPremium={isPremium}
            onToggle={() => setIsPremium((prev) => !prev)}
          />
        ) : null}

        {activePage === "Profile" ? (
          <Profile
            profile={activeProfile}
            profileTab={profileTab}
            onProfileTabChange={setProfileTab}
            posts={filteredPosts}
            postCount={filteredPosts.length}
            liked={liked}
            reposted={reposted}
            onLike={toggleLike}
            onRepost={toggleRepost}
            onShare={handleShare}
            onOpenProfile={openProfile}
            getAuthor={getAuthor}
            isFollowing={following.has(activeProfileId)}
            onFollowToggle={() => toggleFollow(activeProfileId)}
            isCurrentUser={activeProfileId === currentUserId}
            composer={profileComposer}
            onComposerChange={setProfileComposer}
            composerImage={profileComposerImage}
            onImageSelect={handleProfileImageSelect}
            onImageClear={() => setProfileComposerImage("")}
            onPostToProfile={handlePostToProfile}
            replyAudience={profileReplyAudience}
            onReplyAudienceChange={setProfileReplyAudience}
            currentUser={currentUser}
            replyPostId={replyPostId}
            replyDraft={replyDraft}
            onReplyToggle={handleReplyToggle}
            onReplyChange={setReplyDraft}
            onReplySubmit={handleReplySubmit}
            onOpenSettings={openEditProfileModal}
            isMuted={muted.has(activeProfileId)}
            isBlocked={blocked.has(activeProfileId)}
            onMuteToggle={() => toggleMute(activeProfileId)}
            onBlockToggle={() => toggleBlock(activeProfileId)}
            onReport={() => reportProfile(activeProfileId)}
            followingList={followingList}
            followersList={followersList}
            onToggleFollow={toggleFollow}
            onToggleFollower={toggleFollower}
            currentUserId={currentUserId}
            pinnedPost={pinnedPost}
            pinnedPostId={pinnedPostId}
            onPinPost={handlePinPost}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
            onVote={handleVote}
            pollVotes={pollVotes}
            onView={handleView}
            repliesByPostId={repliesByPostId}
            expandedReplies={expandedReplies}
            onToggleReplies={handleToggleReplies}
            onOpenImage={openImageLightbox}
          />
        ) : null}

        {activePage === "More" ? (
          <More
            section={moreSection}
            onSectionChange={setMoreSection}
            settingsDraft={settingsDraft}
            onDraftChange={setSettingsDraft}
            onSave={handleSettingsSave}
            onAvatarSelect={handleAvatarSelect}
            onBannerSelect={handleBannerSelect}
            analytics={analytics}
            isOwner={currentUser?.isOwner}
            adminUsers={adminUsers}
            adminStatus={adminStatus}
            onRefreshAdmin={fetchAdminUsers}
            onOpenProfile={openProfile}
            adminSummary={adminSummary}
            adminPosts={adminPosts}
            adminQuery={adminQuery}
            onAdminQueryChange={setAdminQuery}
            adminSelectedUserId={adminSelectedUserId}
            adminSelectedUserPosts={adminSelectedUserPosts}
            adminSelectedUserPostsStatus={adminSelectedUserPostsStatus}
            adminSystemStatus={adminSystemStatus}
            adminLastUpdatedAt={adminLastUpdatedAt}
            onAdminSelectUser={handleAdminSelectUser}
            onAdminUpdate={handleAdminUpdate}
            onAdminDeletePost={handleAdminDeletePost}
          />
        ) : null}
      </main>

      {!isMessagesPage ? (
        <RightRail
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          newsItems={newsFeed}
          newsStatus={newsStatus}
          onRefreshNews={fetchNews}
          trends={trends}
          users={userProfiles}
          following={following}
          onFollowToggle={toggleFollow}
          currentUserId={currentUserId}
        />
      ) : null}

      {composeModalOpen ? (
        <ComposeModal
          currentUser={currentUser}
          composer={composer}
          onComposerChange={setComposer}
          composerImage={composerImage}
          onImageSelect={handleImageSelect}
          onImageClear={() => setComposerImage("")}
          onSubmit={handlePost}
          onSaveDraft={handleSaveDraft}
          onSchedule={handleSchedule}
          scheduleEnabled={scheduleEnabled}
          onScheduleToggle={() => setScheduleEnabled((prev) => !prev)}
          scheduleTime={scheduleTime}
          onScheduleChange={setScheduleTime}
          pollEnabled={pollEnabled}
          onPollToggle={() => setPollEnabled((prev) => !prev)}
          pollQuestion={pollQuestion}
          onPollQuestionChange={setPollQuestion}
          pollOptions={pollOptions}
          onPollOptionsChange={setPollOptions}
          onPollReset={() => {
            setPollEnabled(false);
            setPollQuestion("");
            setPollOptions(["", ""]);
          }}
          replyAudience={composerReplyAudience}
          onReplyAudienceChange={setComposerReplyAudience}
          onClose={closeComposeModal}
          onOpenDrafts={() => {
            setActivePage("Home");
            closeComposeModal();
          }}
        />
      ) : null}

      {activeCall ? (
        <CallOverlay
          key={activeCall.id}
          currentUserId={currentUserId}
          call={activeCall}
          events={callEvents}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onEnd={handleEndCall}
          onSendSignal={handleSendCallSignal}
        />
      ) : null}

      <EditProfileModal
        open={editProfileOpen}
        draft={settingsDraft}
        onDraftChange={setSettingsDraft}
        onAvatarSelect={handleAvatarSelect}
        onBannerSelect={handleBannerSelect}
        onSave={handleSettingsSave}
        onClose={closeEditProfileModal}
      />

      <nav className="mobile-nav glass" aria-label="Primary">
        {["Home", "Explore", "Notifications", "Messages", "Profile", "More"].map(
          (label) => {
            const Icon = getNavIcon(label);
            return (
              <button
                key={label}
                type="button"
                className={activePage === label ? "nav-button active" : "nav-button"}
                aria-label={label}
                onClick={() => {
                  if (label === "Profile") {
                    openProfile(currentUserId);
                  } else {
                    setActivePage(label);
                  }
                }}
              >
                <span className="nav-icon">
                  <Icon aria-hidden="true" />
                </span>
              </button>
            );
          }
        )}
      </nav>

      <ImageLightbox
        key={
          lightboxMedia
            ? `${lightboxMedia.src}-${lightboxMedia.profileMedia?.userId ?? "media"}-${
                lightboxMedia.profileMedia?.kind ?? "generic"
              }`
            : "image-lightbox-empty"
        }
        media={lightboxMedia}
        onClose={closeImageLightbox}
      />
      <ImageAdjustModal
        key={
          imageAdjustMedia
            ? `${imageAdjustMedia.kind}-${imageAdjustMedia.src}`
            : "image-adjust-empty"
        }
        media={imageAdjustMedia}
        onApply={applyAdjustedImage}
        onClose={closeImageAdjuster}
      />
    </div>
  );
}






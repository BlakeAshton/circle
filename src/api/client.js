const API_BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function apiRegister(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiLogin(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiLogout() {
  return request("/auth/logout", { method: "POST" });
}

export function apiMe() {
  return request("/auth/me");
}

export function apiUpdateProfile(payload) {
  return request("/users/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function apiGetProfileMedia(userId, kind) {
  return request(`/profile-media/${userId}/${encodeURIComponent(kind)}`);
}

export function apiToggleProfileMediaLike(userId, kind) {
  return request(`/profile-media/${userId}/${encodeURIComponent(kind)}/like`, {
    method: "POST",
  });
}

export function apiCommentProfileMedia(userId, kind, payload) {
  return request(`/profile-media/${userId}/${encodeURIComponent(kind)}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiGetUsers() {
  return request("/users");
}

export function apiGetFollows() {
  return request("/follows");
}

export function apiToggleFollow(userId) {
  return request(`/follow/${userId}`, { method: "POST" });
}

export function apiGetPosts(mode = "for-you") {
  return request(`/posts?mode=${encodeURIComponent(mode)}`);
}

export function apiGetPostsByUser(userId) {
  return request(`/posts/user/${userId}`);
}

export function apiGetReplies(postId) {
  return request(`/posts/${postId}/replies`);
}

export function apiGetBookmarkedPosts() {
  return request("/posts/bookmarks");
}

export function apiGetLikedPosts() {
  return request("/posts/likes");
}

export function apiSearch(query) {
  return request(`/search?q=${encodeURIComponent(query)}`);
}

export function apiGetAdminUsers() {
  return request("/admin/users");
}

export function apiGetAdminSummary() {
  return request("/admin/summary");
}

export function apiGetAdminStatus() {
  return request("/admin/status");
}

export function apiGetAdminPosts() {
  return request("/admin/posts");
}

export function apiGetAdminUserPosts(userId) {
  return request(`/admin/users/${userId}/posts`);
}

export function apiAdminDeletePost(postId) {
  return request(`/admin/posts/${postId}`, { method: "DELETE" });
}

export function apiAdminUpdateUser(userId, payload) {
  return request(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function apiCreatePost(payload) {
  return request("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiEditPost(postId, payload) {
  return request(`/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function apiDeletePost(postId) {
  return request(`/posts/${postId}`, { method: "DELETE" });
}

export function apiToggleLike(postId) {
  return request(`/posts/${postId}/like`, { method: "POST" });
}

export function apiToggleBookmark(postId) {
  return request(`/posts/${postId}/bookmark`, { method: "POST" });
}

export function apiToggleRepost(postId) {
  return request(`/posts/${postId}/repost`, { method: "POST" });
}

export function apiAddView(postId) {
  return request(`/posts/${postId}/view`, { method: "POST" });
}

export function apiGetNotifications() {
  return request("/notifications");
}

export function apiReadNotification(id) {
  return request(`/notifications/${id}/read`, { method: "POST" });
}

export function apiReadAllNotifications() {
  return request("/notifications/read-all", { method: "POST" });
}

export function apiGetMessageThreads() {
  return request("/messages/threads");
}

export function apiSearchMessages(query) {
  return request(`/messages/search?q=${encodeURIComponent(query)}`);
}

export function apiCreateMessageThread(payload) {
  return request("/messages/threads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiGetMessageThread(threadId) {
  return request(`/messages/threads/${threadId}`);
}

export function apiUpdateMessageThread(threadId, payload) {
  return request(`/messages/threads/${threadId}/settings`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function apiAcceptMessageThread(threadId) {
  return request(`/messages/threads/${threadId}/accept`, {
    method: "POST",
  });
}

export function apiDeclineMessageThread(threadId) {
  return request(`/messages/threads/${threadId}/decline`, {
    method: "DELETE",
  });
}

export function apiSetTyping(threadId, isTyping) {
  return request(`/messages/threads/${threadId}/typing`, {
    method: "POST",
    body: JSON.stringify({ isTyping }),
  });
}

export function apiSendMessage(threadId, payload) {
  return request(`/messages/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiUpdateMessage(messageId, payload) {
  return request(`/messages/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function apiPollCalls(afterId = 0) {
  return request(`/messages/calls/poll?afterId=${encodeURIComponent(afterId)}`);
}

export function apiGetCallConfig() {
  return request("/messages/calls/config");
}

export function apiStartCall(threadId, payload) {
  return request(`/messages/threads/${threadId}/calls/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiAcceptCall(callId) {
  return request(`/messages/calls/${callId}/accept`, {
    method: "POST",
  });
}

export function apiDeclineCall(callId) {
  return request(`/messages/calls/${callId}/decline`, {
    method: "POST",
  });
}

export function apiEndCall(callId) {
  return request(`/messages/calls/${callId}/end`, {
    method: "POST",
  });
}

export function apiSendCallSignal(callId, payload) {
  return request(`/messages/calls/${callId}/signal`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

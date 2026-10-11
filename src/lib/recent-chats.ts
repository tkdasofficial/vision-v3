/** Chats shown under "Recent": project chats live only in their project; pinned chats come first. */
export function recentChats<T extends { projectId?: string | null; pinned?: boolean }>(chats: T[]): T[] {
  const loose = chats.filter((c) => !c.projectId);
  return [...loose.filter((c) => c.pinned), ...loose.filter((c) => !c.pinned)];
}

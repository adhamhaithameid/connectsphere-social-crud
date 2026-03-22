import { Heart, MessageCircle, Repeat2, UserPlus } from "lucide-react";
import type { Interaction, Profile } from "../types";

interface NotificationsPageProps {
  interactions: Interaction[];
  profileMap: Map<string, Profile>;
  activeProfileId: string;
}

export default function NotificationsPage({
  interactions,
  profileMap,
  activeProfileId,
}: NotificationsPageProps) {
  // Show interactions relevant to the active user's posts
  const relevantNotifications = interactions
    .filter((i) => {
      // Show interactions by other people (not self)
      return i.authorId !== activeProfileId;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);

  const getIcon = (type: string) => {
    switch (type) {
      case "LIKE": return <Heart size={20} className="x-notif-icon x-notif-icon--like" fill="currentColor" />;
      case "COMMENT": return <MessageCircle size={20} className="x-notif-icon x-notif-icon--reply" />;
      case "SHARE": return <Repeat2 size={20} className="x-notif-icon x-notif-icon--repost" />;
      default: return <UserPlus size={20} className="x-notif-icon" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case "LIKE": return "liked your post";
      case "COMMENT": return "replied to your post";
      case "SHARE": return "reposted your post";
      default: return "interacted with your post";
    }
  };

  return (
    <>
      <header className="x-main-header">
        <h1>Notifications</h1>
      </header>

      <div className="x-page-content">
        {relevantNotifications.length === 0 ? (
          <div className="x-empty-page">
            <UserPlus size={48} strokeWidth={1.2} />
            <h3>Nothing to see here — yet</h3>
            <p>Likes, replies, and reposts to your posts will show up here.</p>
          </div>
        ) : (
          <div className="x-notif-list">
            {relevantNotifications.map((notif) => {
              const author = profileMap.get(notif.authorId);
              const avatarUrl = author?.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${author?.username || "unknown"}`;
              return (
                <article key={notif.id} className="x-notif-item">
                  <div className="x-notif-icon-col">
                    {getIcon(notif.type)}
                  </div>
                  <div className="x-notif-body">
                    <img src={avatarUrl} alt="" className="x-notif-avatar" />
                    <p className="x-notif-text">
                      <strong>{author?.displayName ?? "Someone"}</strong> {getLabel(notif.type)}
                    </p>
                    {notif.content ? (
                      <p className="x-notif-content">{notif.content}</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

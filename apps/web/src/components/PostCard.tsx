import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MoreHorizontal,
  BarChart2,
  Bookmark,
} from "lucide-react";
import type { Interaction, Post, Profile, Visibility } from "../types";

interface PostCardProps {
  post: Post;
  author: Profile | undefined;
  metrics: { likes: number; comments: number; shares: number };
  comments: Interaction[];
  likedByActive: boolean;
  canManagePost: boolean;
  activeProfile: Profile | null;
  profileMap: Map<string, Profile>;
  commentDraft: string;
  editingCommentId: string | null;
  commentEditDraft: string;
  onToggleLike: (postId: string) => Promise<void>;
  onShare: (postId: string) => Promise<void>;
  onCommentSubmit: (postId: string) => Promise<void>;
  onCommentDraftChange: (postId: string, value: string) => void;
  onStartPostEdit: (post: Post) => void;
  onDeletePost: (postId: string) => Promise<void>;
  onBeginCommentEdit: (interaction: Interaction) => void;
  onSaveCommentEdit: () => Promise<void>;
  onCancelCommentEdit: () => void;
  onCommentEditDraftChange: (value: string) => void;
  onDeleteComment: (commentId: string) => Promise<void>;
}

const visibilityOptions: Visibility[] = ["PUBLIC", "FRIENDS", "PRIVATE"];

function timeAgo(value: string): string {
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor((now - then) / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const days = Math.floor(diffHours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((t) => t[0].toUpperCase())
    .join("") || "U";
}

export default function PostCard({
  post,
  author,
  metrics,
  comments,
  likedByActive,
  canManagePost,
  activeProfile,
  profileMap,
  commentDraft,
  editingCommentId,
  commentEditDraft,
  onToggleLike,
  onShare,
  onCommentSubmit,
  onCommentDraftChange,
  onStartPostEdit,
  onDeletePost,
  onBeginCommentEdit,
  onSaveCommentEdit,
  onCancelCommentEdit,
  onCommentEditDraftChange,
  onDeleteComment,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const showComments = expanded || comments.length > 0;
  const viewCount = Math.floor(
    (metrics.likes * 12 + metrics.comments * 8 + metrics.shares * 15) * 1.7 + 42
  );

  const avatarUrl = author?.avatarUrl || (author ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${author.username}` : undefined);

  return (
    <article className="x-post">
      <img
        src={avatarUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=unknown"}
        alt={author?.displayName ?? "User"}
        className="x-post-avatar"
      />

      <div className="x-post-body">
        {/* Header */}
        <div className="x-post-header">
          <div className="x-post-meta">
            <span className="x-post-author">{author?.displayName ?? "Deleted user"}</span>
            <span className="x-post-handle">@{author?.username ?? "unknown"}</span>
            <span className="x-post-dot">·</span>
            <span className="x-post-time">{timeAgo(post.createdAt)}</span>
          </div>
          {canManagePost ? (
            <div className="x-post-menu-wrapper">
              <button
                type="button"
                className="x-icon-btn"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreHorizontal size={18} />
              </button>
              {showMenu ? (
                <div className="x-post-dropdown">
                  <button type="button" onClick={() => { onStartPostEdit(post); setShowMenu(false); }}>
                    Edit post
                  </button>
                  <button type="button" className="x-post-dropdown-danger" onClick={() => { onDeletePost(post.id); setShowMenu(false); }}>
                    Delete post
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Content */}
        <p className="x-post-text">{post.content}</p>
        {post.imageUrl ? (
          <img src={post.imageUrl} alt="Post attachment" className="x-post-media" />
        ) : null}

        {/* Visibility badge if not public */}
        {post.visibility !== "PUBLIC" ? (
          <span className="x-visibility-pill">{post.visibility}</span>
        ) : null}

        {/* Action Bar */}
        <div className="x-post-actions">
          <button
            type="button"
            className="x-action-btn x-action-reply"
            onClick={() => setExpanded(!expanded)}
          >
            <MessageCircle size={18} />
            <span>{metrics.comments || ""}</span>
          </button>
          <button
            type="button"
            className="x-action-btn x-action-repost"
            onClick={() => onShare(post.id)}
            disabled={!activeProfile}
          >
            <Repeat2 size={18} />
            <span>{metrics.shares || ""}</span>
          </button>
          <button
            type="button"
            className={likedByActive ? "x-action-btn x-action-like active" : "x-action-btn x-action-like"}
            onClick={() => onToggleLike(post.id)}
            disabled={!activeProfile}
          >
            <Heart size={18} fill={likedByActive ? "currentColor" : "none"} />
            <span>{metrics.likes || ""}</span>
          </button>
          <button type="button" className="x-action-btn x-action-views" disabled>
            <BarChart2 size={18} />
            <span>{viewCount}</span>
          </button>
          <div className="x-action-btn-group">
            <button type="button" className="x-action-btn" disabled>
              <Bookmark size={18} />
            </button>
            <button type="button" className="x-action-btn" disabled>
              <Share size={18} />
            </button>
          </div>
        </div>

        {/* Comments */}
        {showComments ? (
          <div className="x-comments-zone">
            {comments.map((comment) => {
              const commentAuthor = profileMap.get(comment.authorId);
              const commentAvatarUrl = commentAuthor?.avatarUrl || (commentAuthor ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${commentAuthor.username}` : "https://api.dicebear.com/9.x/avataaars/svg?seed=unknown");
              const canManageComment = activeProfile?.id === comment.authorId;

              return (
                <article key={comment.id} className="x-reply">
                  <img src={commentAvatarUrl} alt="" className="x-reply-avatar" />
                  <div className="x-reply-body">
                    <div className="x-post-meta">
                      <span className="x-post-author">{commentAuthor?.displayName ?? "Unknown"}</span>
                      <span className="x-post-handle">@{commentAuthor?.username ?? "unknown"}</span>
                      <span className="x-post-dot">·</span>
                      <span className="x-post-time">{formatDate(comment.createdAt)}</span>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="x-reply-edit">
                        <textarea
                          rows={2}
                          value={commentEditDraft}
                          onChange={(e) => onCommentEditDraftChange(e.target.value)}
                          className="x-reply-textarea"
                        />
                        <div className="x-reply-edit-actions">
                          <button type="button" className="x-primary-button" onClick={onSaveCommentEdit}>Save</button>
                          <button type="button" className="x-outline-button" onClick={onCancelCommentEdit}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="x-reply-text">{comment.content}</p>
                    )}

                    {canManageComment && editingCommentId !== comment.id ? (
                      <div className="x-reply-manage">
                        <button type="button" onClick={() => onBeginCommentEdit(comment)}>Edit</button>
                        <button type="button" onClick={() => onDeleteComment(comment.id)}>Delete</button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {/* Reply Composer */}
            <div className="x-reply-compose">
              <img
                src={activeProfile?.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${activeProfile?.username || "me"}`}
                alt=""
                className="x-reply-avatar"
              />
              <input
                className="x-reply-input"
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(post.id, e.target.value)}
                placeholder="Post your reply"
              />
              <button
                type="button"
                className="x-reply-btn"
                disabled={!activeProfile || !commentDraft.trim()}
                onClick={() => onCommentSubmit(post.id)}
              >
                Reply
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

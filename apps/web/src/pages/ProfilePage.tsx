import { MapPin, Calendar, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Post, Profile } from "../types";

interface ProfilePageProps {
  activeProfile: Profile | null;
  posts: Post[];
  onEditProfile: (profile: Profile) => void;
}

export default function ProfilePage({
  activeProfile,
  posts,
  onEditProfile,
}: ProfilePageProps) {
  const navigate = useNavigate();

  if (!activeProfile) {
    return (
      <>
        <header className="x-main-header">
          <button type="button" className="x-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1>Profile</h1>
        </header>
        <div className="x-empty-page">
          <h3>No profile selected</h3>
          <p>Create a profile to get started.</p>
        </div>
      </>
    );
  }

  const userPosts = posts.filter((p) => p.authorId === activeProfile.id);
  const avatarUrl = activeProfile.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${activeProfile.username}`;
  const joinDate = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(activeProfile.createdAt)
  );

  return (
    <>
      <header className="x-main-header">
        <button type="button" className="x-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="x-header-info">
          <h1>{activeProfile.displayName}</h1>
          <span className="x-header-subtitle">{userPosts.length} posts</span>
        </div>
      </header>

      {/* Cover + Avatar */}
      <div className="x-profile-hero">
        <div className="x-profile-cover" />
        <img src={avatarUrl} alt={activeProfile.displayName} className="x-profile-avatar-lg" />
      </div>

      {/* Profile Info */}
      <div className="x-profile-info">
        <div className="x-profile-info-header">
          <div>
            <h2 className="x-profile-name">{activeProfile.displayName}</h2>
            <p className="x-profile-handle">@{activeProfile.username}</p>
          </div>
          <button
            type="button"
            className="x-outline-button"
            onClick={() => onEditProfile(activeProfile)}
          >
            Edit profile
          </button>
        </div>

        {activeProfile.bio ? <p className="x-profile-bio">{activeProfile.bio}</p> : null}

        <div className="x-profile-details">
          {activeProfile.location ? (
            <span className="x-profile-detail">
              <MapPin size={16} /> {activeProfile.location}
            </span>
          ) : null}
          <span className="x-profile-detail">
            <Calendar size={16} /> Joined {joinDate}
          </span>
        </div>

        <div className="x-profile-stats">
          <span><strong>{userPosts.length}</strong> Posts</span>
          <span><strong>{Math.floor(Math.random() * 200) + 10}</strong> Following</span>
          <span><strong>{Math.floor(Math.random() * 500) + 20}</strong> Followers</span>
        </div>
      </div>

      {/* User's Posts */}
      <div className="x-profile-tabs">
        <button type="button" className="x-feed-tab active">Posts</button>
        <button type="button" className="x-feed-tab">Replies</button>
        <button type="button" className="x-feed-tab">Media</button>
        <button type="button" className="x-feed-tab">Likes</button>
      </div>

      <div className="x-page-content">
        {userPosts.length === 0 ? (
          <div className="x-empty-page">
            <h3>No posts yet</h3>
            <p>When {activeProfile.displayName} posts, they'll show up here.</p>
          </div>
        ) : (
          userPosts.map((post) => (
            <article key={post.id} className="x-post">
              <img src={avatarUrl} alt="" className="x-post-avatar" />
              <div className="x-post-body">
                <div className="x-post-meta">
                  <span className="x-post-author">{activeProfile.displayName}</span>
                  <span className="x-post-handle">@{activeProfile.username}</span>
                  <span className="x-post-dot">·</span>
                  <span className="x-post-time">
                    {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(post.createdAt))}
                  </span>
                </div>
                <p className="x-post-text">{post.content}</p>
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="" className="x-post-media" />
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );
}

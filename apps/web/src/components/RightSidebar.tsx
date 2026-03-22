import { Search } from "lucide-react";
import type { Profile, Post } from "../types";

interface RightSidebarProps {
  feedSearch: string;
  onSearchChange: (value: string) => void;
  trendingTopics: [string, number][];
  profiles: Profile[];
  recentPosts: Post[];
  activeProfileId: string;
  onFollowProfile: (id: string) => void;
  followedIds: Set<string>;
}

export default function RightSidebar({
  feedSearch,
  onSearchChange,
  trendingTopics,
  profiles,
  recentPosts,
  activeProfileId,
  onFollowProfile,
  followedIds,
}: RightSidebarProps) {
  // Only show profiles the active user hasn't "followed" and isn't themselves
  const suggestedProfiles = profiles.filter(
    (p) => p.id !== activeProfileId && !followedIds.has(p.id)
  );

  return (
    <aside className="x-right-column">
      <div className="x-right-inner">
        {/* Search */}
        <div className="x-search-box">
          <Search size={18} className="x-search-box-icon" />
          <input
            className="x-search-box-input"
            value={feedSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
          />
        </div>

        {/* What's Happening / Trends */}
        <section className="x-widget">
          <h2 className="x-widget-title">What's happening</h2>
          {trendingTopics.length === 0 ? (
            <p className="x-widget-empty">Nothing is trending right now.</p>
          ) : null}
          {trendingTopics.map(([topic, count]) => (
            <article key={topic} className="x-trend-row">
              <span className="x-trend-category">Trending</span>
              <span className="x-trend-name">#{topic}</span>
              <span className="x-trend-count">{count} posts</span>
            </article>
          ))}
          {trendingTopics.length > 0 ? (
            <button type="button" className="x-widget-show-more">
              Show more
            </button>
          ) : null}
        </section>

        {/* Who to Follow */}
        {suggestedProfiles.length > 0 ? (
          <section className="x-widget">
            <h2 className="x-widget-title">Who to follow</h2>
            {suggestedProfiles.slice(0, 3).map((profile) => (
              <article key={profile.id} className="x-follow-row">
                <img
                  src={profile.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.username}`}
                  alt={profile.displayName}
                  className="x-follow-avatar"
                />
                <div className="x-follow-info">
                  <span className="x-follow-name">{profile.displayName}</span>
                  <span className="x-follow-handle">@{profile.username}</span>
                  {profile.bio ? (
                    <span className="x-follow-bio">{profile.bio}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="x-follow-btn"
                  onClick={() => onFollowProfile(profile.id)}
                >
                  Follow
                </button>
              </article>
            ))}
            <button type="button" className="x-widget-show-more">
              Show more
            </button>
          </section>
        ) : null}

        {/* Recent Activity */}
        {recentPosts.length > 0 ? (
          <section className="x-widget">
            <h2 className="x-widget-title">Latest posts</h2>
            {recentPosts.slice(0, 3).map((post) => (
              <article key={post.id} className="x-trend-row">
                <span className="x-trend-category">
                  {post.author?.displayName ?? "Unknown"}
                </span>
                <span className="x-trend-name x-trend-name--post">
                  {post.content.length > 80
                    ? post.content.slice(0, 80) + "…"
                    : post.content}
                </span>
                <span className="x-trend-count">
                  {post._count?.interactions ?? 0} interactions
                </span>
              </article>
            ))}
          </section>
        ) : null}

        <footer className="x-right-footer">
          <p>© 2026 Orbit Corp.</p>
        </footer>
      </div>
    </aside>
  );
}

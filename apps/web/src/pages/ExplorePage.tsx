import { Search, TrendingUp } from "lucide-react";
import type { Post, Profile } from "../types";

interface ExplorePageProps {
  trendingTopics: [string, number][];
  profiles: Profile[];
  feedSearch: string;
  onSearchChange: (value: string) => void;
}

export default function ExplorePage({
  trendingTopics,
  profiles,
  feedSearch,
  onSearchChange,
}: ExplorePageProps) {
  return (
    <>
      <header className="x-main-header">
        <div className="x-search-box x-search-box--page">
          <Search size={18} className="x-search-box-icon" />
          <input
            className="x-search-box-input"
            value={feedSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
          />
        </div>
      </header>

      <div className="x-page-content">
        <section className="x-explore-section">
          <h2 className="x-section-title">Trending topics</h2>
          {trendingTopics.length === 0 ? (
            <div className="x-empty-page">
              <TrendingUp size={48} strokeWidth={1.2} />
              <h3>No trends yet</h3>
              <p>When people start posting, trending topics will appear here.</p>
            </div>
          ) : (
            <div className="x-explore-list">
              {trendingTopics.map(([topic, count], index) => (
                <article key={topic} className="x-explore-item">
                  <span className="x-explore-rank">{index + 1}</span>
                  <div className="x-explore-info">
                    <span className="x-trend-category">Trending</span>
                    <span className="x-explore-topic">#{topic}</span>
                    <span className="x-trend-count">{count} posts</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="x-explore-section">
          <h2 className="x-section-title">People on Orbit</h2>
          <div className="x-explore-people">
            {profiles.map((p) => (
              <article key={p.id} className="x-explore-person">
                <img
                  src={p.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${p.username}`}
                  alt={p.displayName}
                  className="x-explore-person-avatar"
                />
                <div className="x-explore-person-info">
                  <span className="x-post-author">{p.displayName}</span>
                  <span className="x-post-handle">@{p.username}</span>
                  {p.bio ? <span className="x-explore-person-bio">{p.bio}</span> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Profile } from "../types";

interface FollowPageProps {
  profiles: Profile[];
  activeProfileId: string;
  followedIds: Set<string>;
  onFollow: (id: string) => void;
}

export default function FollowPage({
  profiles,
  activeProfileId,
  followedIds,
  onFollow,
}: FollowPageProps) {
  const navigate = useNavigate();
  const suggested = profiles.filter((p) => p.id !== activeProfileId);

  return (
    <>
      <header className="x-main-header">
        <button type="button" className="x-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>Follow</h1>
      </header>

      <div className="x-follow-tabs">
        <button type="button" className="x-feed-tab active">Suggested for you</button>
        <button type="button" className="x-feed-tab">Creators for you</button>
      </div>

      <div className="x-page-content">
        {suggested.length === 0 ? (
          <div className="x-empty-page">
            <h3>No suggestions</h3>
            <p>Create more profiles to see suggestions here.</p>
          </div>
        ) : (
          <div className="x-follow-list">
            {suggested.map((profile) => {
              const avatarUrl = profile.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.username}`;
              const isFollowed = followedIds.has(profile.id);
              return (
                <article key={profile.id} className="x-follow-list-item">
                  <img src={avatarUrl} alt="" className="x-follow-list-avatar" />
                  <div className="x-follow-list-info">
                    <span className="x-post-author">{profile.displayName}</span>
                    <span className="x-post-handle">@{profile.username}</span>
                    {profile.bio ? (
                      <p className="x-follow-list-bio">{profile.bio}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={isFollowed ? "x-follow-btn x-follow-btn--following" : "x-follow-btn"}
                    onClick={() => onFollow(profile.id)}
                  >
                    {isFollowed ? "Following" : "Follow"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

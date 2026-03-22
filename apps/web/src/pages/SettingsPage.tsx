import { Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Profile } from "../types";

interface SettingsPageProps {
  activeProfile: Profile | null;
  profiles: Profile[];
  onSelectProfile: (id: string) => void;
  onEditProfile: (profile: Profile) => void;
  onDeleteProfile: (id: string) => void;
  onOpenProfileCreator: () => void;
}

export default function SettingsPage({
  activeProfile,
  profiles,
  onSelectProfile,
  onEditProfile,
  onDeleteProfile,
  onOpenProfileCreator,
}: SettingsPageProps) {
  const navigate = useNavigate();

  return (
    <>
      <header className="x-main-header">
        <button type="button" className="x-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>Settings</h1>
      </header>

      <div className="x-page-content">
        <section className="x-settings-section">
          <h2 className="x-section-title">Manage accounts</h2>
          <p className="x-settings-desc">Switch between accounts or create new ones.</p>

          <div className="x-settings-accounts">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfile?.id;
              const avatarUrl = profile.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${profile.username}`;
              return (
                <article key={profile.id} className={isActive ? "x-settings-account active" : "x-settings-account"}>
                  <img src={avatarUrl} alt="" className="x-settings-account-avatar" />
                  <div className="x-settings-account-info">
                    <span className="x-post-author">{profile.displayName}</span>
                    <span className="x-post-handle">@{profile.username}</span>
                  </div>
                  <div className="x-settings-account-actions">
                    {!isActive ? (
                      <button
                        type="button"
                        className="x-primary-button"
                        onClick={() => onSelectProfile(profile.id)}
                      >
                        Switch
                      </button>
                    ) : (
                      <span className="x-settings-active-badge">Active</span>
                    )}
                    <button
                      type="button"
                      className="x-outline-button"
                      onClick={() => onEditProfile(profile)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="x-danger-button"
                      onClick={() => onDeleteProfile(profile.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <button
            type="button"
            className="x-primary-button"
            style={{ marginTop: 16 }}
            onClick={onOpenProfileCreator}
          >
            Add new account
          </button>
        </section>
      </div>
    </>
  );
}

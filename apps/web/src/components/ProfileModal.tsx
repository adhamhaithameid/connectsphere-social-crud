import type { Profile } from "../types";

interface ProfileModalProps {
  open: boolean;
  editingProfileId: string | null;
  profileDraft: {
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string;
    location: string;
  };
  onDraftChange: (field: string, value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export default function ProfileModal({
  open,
  editingProfileId,
  profileDraft,
  onDraftChange,
  onSubmit,
  onClose,
}: ProfileModalProps) {
  if (!open) return null;

  return (
    <div className="x-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="x-modal-card">
        <div className="x-modal-header">
          <button type="button" className="x-modal-close" onClick={onClose}>✕</button>
          <h2>{editingProfileId ? "Edit profile" : "Create profile"}</h2>
        </div>
        <form onSubmit={onSubmit} className="x-profile-form">
          <label>
            <span>Username</span>
            <input
              className="x-input"
              value={profileDraft.username}
              onChange={(e) => onDraftChange("username", e.target.value)}
              disabled={Boolean(editingProfileId)}
              required
            />
          </label>
          <label>
            <span>Display name</span>
            <input
              className="x-input"
              value={profileDraft.displayName}
              onChange={(e) => onDraftChange("displayName", e.target.value)}
              required
            />
          </label>
          <label>
            <span>Bio</span>
            <textarea
              className="x-textarea"
              rows={3}
              value={profileDraft.bio}
              onChange={(e) => onDraftChange("bio", e.target.value)}
            />
          </label>
          <label>
            <span>Avatar URL</span>
            <input
              className="x-input"
              value={profileDraft.avatarUrl}
              onChange={(e) => onDraftChange("avatarUrl", e.target.value)}
              placeholder="Leave blank for auto-generated avatar"
            />
          </label>
          <label>
            <span>Location</span>
            <input
              className="x-input"
              value={profileDraft.location}
              onChange={(e) => onDraftChange("location", e.target.value)}
            />
          </label>
          <div className="x-modal-footer">
            <button type="submit" className="x-primary-button">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

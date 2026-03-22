import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  Bell,
  UserPlus,
  MessageCircle,
  Users,
  Bookmark,
  User,
  Settings,
  MoreHorizontal,
  Feather,
} from "lucide-react";
import type { Profile } from "../types";

interface SidebarProps {
  activeProfile: Profile | null;
  onOpenProfileCreator: () => void;
}

const navItems = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Explore", icon: Search, path: "/explore" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Follow", icon: UserPlus, path: "/follow" },
  { label: "Messages", icon: MessageCircle, path: "/messages" },
  { label: "Communities", icon: Users, path: "/communities" },
  { label: "Bookmarks", icon: Bookmark, path: "/bookmarks" },
  { label: "Profile", icon: User, path: "/profile" },
  { label: "Settings", icon: Settings, path: "/settings" },
] as const;

export default function Sidebar({
  activeProfile,
  onOpenProfileCreator,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="x-left-column">
      <div className="x-left-inner">
        {/* Logo */}
        <button
          type="button"
          className="x-logo-button"
          aria-label="Orbit Home"
          onClick={() => navigate("/")}
        >
          <svg viewBox="0 0 24 24" className="x-orbit-logo">
            <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.5" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </button>

        {/* Navigation */}
        <nav className="x-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={isActive ? "x-nav-item active" : "x-nav-item"}
                onClick={() => navigate(item.path)}
              >
                <span className="x-nav-icon">
                  <Icon
                    size={26}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Post Button */}
        <button
          type="button"
          className="x-post-cta"
          disabled={!activeProfile}
          onClick={() => {
            navigate("/");
            setTimeout(() => {
              document.getElementById("composer")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }, 100);
          }}
        >
          <span className="x-post-cta-text">Post</span>
          <Feather size={22} className="x-post-cta-icon" />
        </button>

        {/* Account Switcher at Bottom */}
        {activeProfile ? (
          <button
            type="button"
            className="x-account-pill"
            onClick={onOpenProfileCreator}
          >
            <img
              src={activeProfile.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${activeProfile.username}`}
              alt={activeProfile.displayName}
              className="x-account-pill-avatar"
            />
            <div className="x-account-pill-info">
              <span className="x-account-pill-name">{activeProfile.displayName}</span>
              <span className="x-account-pill-handle">@{activeProfile.username}</span>
            </div>
            <MoreHorizontal size={18} className="x-account-pill-more" />
          </button>
        ) : (
          <button
            type="button"
            className="x-outline-button"
            onClick={onOpenProfileCreator}
            style={{ marginTop: 12 }}
          >
            Create Profile
          </button>
        )}
      </div>
    </aside>
  );
}

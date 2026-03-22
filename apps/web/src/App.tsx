import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Routes, Route, useNavigate } from "react-router-dom";
import { MessageCircle, Users, Bookmark } from "lucide-react";
import {
  client,
  getErrorMessage,
  type FeedSortMode,
  type InteractionInput,
  type InteractionUpdateInput,
  type PostInput,
  type PostUpdateInput,
  type ProfileInput,
} from "./api";
import type { Interaction, Post, Profile, Visibility } from "./types";
import Sidebar from "./components/Sidebar";
import RightSidebar from "./components/RightSidebar";
import PostCard from "./components/PostCard";
import ProfileModal from "./components/ProfileModal";
import ExplorePage from "./pages/ExplorePage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import FollowPage from "./pages/FollowPage";
import StubPage from "./pages/StubPage";
import "./App.css";

const visibilityOptions: Visibility[] = ["PUBLIC", "FRIENDS", "PRIVATE"];
const EMPTY_PROFILES: Profile[] = [];
const EMPTY_POSTS: Post[] = [];
const EMPTY_INTERACTIONS: Interaction[] = [];

function optionalText(v: string): string | undefined {
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((t) => t[0].toUpperCase())
      .join("") || "U"
  );
}

/* ─── Home Feed Component ─── */
interface HomeFeedProps {
  posts: Post[];
  isLoading: boolean;
  feedMode: FeedSortMode;
  setFeedMode: (m: FeedSortMode) => void;
  feedSearch: string;
  setFeedSearch: (s: string) => void;
  activeProfile: Profile | null;
  profileMap: Map<string, Profile>;
  interactionsByPost: Map<string, Interaction[]>;
  interactionMetricsByPost: Map<string, { likes: number; comments: number; shares: number }>;
  likeByPostAndAuthor: Map<string, Interaction>;
  commentDrafts: Record<string, string>;
  editingCommentId: string | null;
  commentEditDraft: string;
  composerDraft: { content: string; imageUrl: string; visibility: Visibility };
  setComposerDraft: React.Dispatch<React.SetStateAction<{ content: string; imageUrl: string; visibility: Visibility }>>;
  onPublishPost: (e: React.FormEvent<HTMLFormElement>) => void;
  onToggleLike: (pid: string) => Promise<void>;
  onShare: (pid: string) => Promise<void>;
  onCommentSubmit: (pid: string) => Promise<void>;
  onCommentDraftChange: (pid: string, v: string) => void;
  onStartPostEdit: (post: Post) => void;
  onDeletePost: (postId: string) => Promise<void>;
  onBeginCommentEdit: (i: Interaction) => void;
  onSaveCommentEdit: () => Promise<void>;
  onCancelCommentEdit: () => void;
  onCommentEditDraftChange: (v: string) => void;
  onDeleteComment: (id: string) => Promise<void>;
  globalError: string | null;
}

function HomeFeed(props: HomeFeedProps) {
  const remainingChars = 280 - props.composerDraft.content.length;

  return (
    <>
      {/* Header */}
      <header className="x-main-header">
        <h1>Home</h1>
      </header>

      {/* Feed Tabs */}
      <div className="x-feed-tabs">
        <button
          type="button"
          className={props.feedMode === "recent" ? "x-feed-tab active" : "x-feed-tab"}
          onClick={() => props.setFeedMode("recent")}
        >
          For you
        </button>
        <button
          type="button"
          className={props.feedMode === "popular" ? "x-feed-tab active" : "x-feed-tab"}
          onClick={() => props.setFeedMode("popular")}
        >
          Following
        </button>
      </div>

      {/* Composer */}
      <section id="composer" className="x-composer">
        <img
          src={
            props.activeProfile?.avatarUrl ||
            `https://api.dicebear.com/9.x/avataaars/svg?seed=${props.activeProfile?.username || "me"}`
          }
          alt=""
          className="x-composer-avatar"
        />
        <form onSubmit={props.onPublishPost} className="x-composer-form">
          <textarea
            rows={2}
            value={props.composerDraft.content}
            onChange={(e) =>
              props.setComposerDraft((prev) => ({ ...prev, content: e.target.value }))
            }
            placeholder="What is happening?!"
            className="x-composer-textarea"
          />
          <div className="x-composer-bottom">
            <div className="x-composer-tools">
              <input
                className="x-composer-url"
                value={props.composerDraft.imageUrl}
                onChange={(e) =>
                  props.setComposerDraft((prev) => ({ ...prev, imageUrl: e.target.value }))
                }
                placeholder="Image URL (optional)"
              />
              <select
                className="x-composer-visibility"
                value={props.composerDraft.visibility}
                onChange={(e) =>
                  props.setComposerDraft((prev) => ({
                    ...prev,
                    visibility: e.target.value as Visibility,
                  }))
                }
              >
                {visibilityOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt.charAt(0) + opt.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div className="x-composer-submit">
              <span className={remainingChars < 20 ? "x-char-count warn" : "x-char-count"}>
                {remainingChars}
              </span>
              <button
                type="submit"
                className="x-post-btn"
                disabled={!props.activeProfile || !props.composerDraft.content.trim() || remainingChars < 0}
              >
                Post
              </button>
            </div>
          </div>
        </form>
      </section>

      {props.globalError ? <p className="x-error-banner">{props.globalError}</p> : null}

      {/* Timeline */}
      <section className="x-timeline">
        {props.isLoading ? <p className="x-loading">Loading…</p> : null}
        {!props.isLoading && props.posts.length === 0 ? (
          <div className="x-empty-page">
            <h3>Welcome to Orbit</h3>
            <p>This is the best place to see what's happening. Start posting!</p>
          </div>
        ) : null}

        {props.posts.map((post) => {
          const author = props.profileMap.get(post.authorId);
          const metrics = props.interactionMetricsByPost.get(post.id) ?? {
            likes: 0,
            comments: 0,
            shares: 0,
          };
          const comments = (props.interactionsByPost.get(post.id) ?? []).filter(
            (i) => i.type === "COMMENT"
          );
          const likedByActive = props.activeProfile
            ? props.likeByPostAndAuthor.has(`${post.id}:${props.activeProfile.id}`)
            : false;
          const canManagePost = props.activeProfile?.id === post.authorId;

          return (
            <PostCard
              key={post.id}
              post={post}
              author={author}
              metrics={metrics}
              comments={comments}
              likedByActive={likedByActive}
              canManagePost={canManagePost}
              activeProfile={props.activeProfile}
              profileMap={props.profileMap}
              commentDraft={props.commentDrafts[post.id] ?? ""}
              editingCommentId={props.editingCommentId}
              commentEditDraft={props.commentEditDraft}
              onToggleLike={props.onToggleLike}
              onShare={props.onShare}
              onCommentSubmit={props.onCommentSubmit}
              onCommentDraftChange={props.onCommentDraftChange}
              onStartPostEdit={props.onStartPostEdit}
              onDeletePost={props.onDeletePost}
              onBeginCommentEdit={props.onBeginCommentEdit}
              onSaveCommentEdit={props.onSaveCommentEdit}
              onCancelCommentEdit={props.onCancelCommentEdit}
              onCommentEditDraftChange={props.onCommentEditDraftChange}
              onDeleteComment={props.onDeleteComment}
            />
          );
        })}
      </section>
    </>
  );
}

/* ─── Main App ─── */
function App() {
  const queryClient = useQueryClient();

  const [feedSearch, setFeedSearch] = useState("");
  const [feedMode, setFeedMode] = useState<FeedSortMode>("recent");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const [composerDraft, setComposerDraft] = useState({
    content: "",
    imageUrl: "",
    visibility: "PUBLIC" as Visibility,
  });

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postEditDraft, setPostEditDraft] = useState({
    content: "",
    imageUrl: "",
    visibility: "PUBLIC" as Visibility,
  });

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentEditDraft, setCommentEditDraft] = useState("");

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    username: "",
    displayName: "",
    bio: "",
    avatarUrl: "",
    location: "",
  });

  const profilesQuery = useQuery({ queryKey: ["profiles"], queryFn: () => client.listProfiles() });
  const postsQuery = useQuery({ queryKey: ["posts", feedSearch, feedMode], queryFn: () => client.listPosts(feedSearch, feedMode) });
  const interactionsQuery = useQuery({ queryKey: ["interactions"], queryFn: () => client.listInteractions() });
  const overviewQuery = useQuery({ queryKey: ["overview"], queryFn: client.getOverview });

  const profiles = profilesQuery.data ?? EMPTY_PROFILES;
  const posts = postsQuery.data ?? EMPTY_POSTS;
  const interactions = interactionsQuery.data ?? EMPTY_INTERACTIONS;
  const overview = overviewQuery.data;

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const interactionsByPost = useMemo(() => {
    const map = new Map<string, Interaction[]>();
    interactions.forEach((i) => {
      const arr = map.get(i.postId);
      if (arr) arr.push(i);
      else map.set(i.postId, [i]);
    });
    map.forEach((arr) => arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    return map;
  }, [interactions]);

  const interactionMetricsByPost = useMemo(() => {
    const map = new Map<string, { likes: number; comments: number; shares: number }>();
    interactions.forEach((i) => {
      const m = map.get(i.postId) ?? { likes: 0, comments: 0, shares: 0 };
      if (i.type === "LIKE") m.likes++;
      if (i.type === "COMMENT") m.comments++;
      if (i.type === "SHARE") m.shares++;
      map.set(i.postId, m);
    });
    return map;
  }, [interactions]);

  const likeByPostAndAuthor = useMemo(() => {
    const map = new Map<string, Interaction>();
    interactions.forEach((i) => {
      if (i.type === "LIKE") map.set(`${i.postId}:${i.authorId}`, i);
    });
    return map;
  }, [interactions]);

  const trendingTopics = useMemo(() => {
    const stopWords = new Set(["the", "and", "for", "you", "that", "with", "this", "from", "have", "your", "about", "today", "still"]);
    const counter = new Map<string, number>();
    posts.forEach((post) => {
      post.content.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
        .filter((t) => t.length > 3 && !stopWords.has(t))
        .forEach((t) => counter.set(t, (counter.get(t) ?? 0) + 1));
    });
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [posts]);

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) ?? profiles[0] ?? null;
  const activeProfileId = activeProfile?.id ?? "";

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["profiles"] }),
      queryClient.invalidateQueries({ queryKey: ["posts"] }),
      queryClient.invalidateQueries({ queryKey: ["interactions"] }),
      queryClient.invalidateQueries({ queryKey: ["overview"] }),
    ]);
  };

  const profileCreateMutation = useMutation({ mutationFn: client.createProfile, onSuccess: invalidateAll });
  const profileUpdateMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Partial<ProfileInput> }) => client.updateProfile(id, payload), onSuccess: invalidateAll });
  const profileDeleteMutation = useMutation({ mutationFn: client.deleteProfile, onSuccess: invalidateAll });
  const postCreateMutation = useMutation({ mutationFn: client.createPost, onSuccess: invalidateAll });
  const postUpdateMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: PostUpdateInput }) => client.updatePost(id, payload), onSuccess: invalidateAll });
  const postDeleteMutation = useMutation({ mutationFn: client.deletePost, onSuccess: invalidateAll });
  const interactionCreateMutation = useMutation({ mutationFn: client.createInteraction, onSuccess: invalidateAll });
  const interactionUpdateMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: InteractionUpdateInput }) => client.updateInteraction(id, payload), onSuccess: invalidateAll });
  const interactionDeleteMutation = useMutation({ mutationFn: client.deleteInteraction, onSuccess: invalidateAll });

  const globalError = useMemo(() => {
    const err = profileCreateMutation.error ?? profileUpdateMutation.error ?? profileDeleteMutation.error ??
      postCreateMutation.error ?? postUpdateMutation.error ?? postDeleteMutation.error ??
      interactionCreateMutation.error ?? interactionUpdateMutation.error ?? interactionDeleteMutation.error;
    return err ? getErrorMessage(err) : null;
  }, [profileCreateMutation.error, profileUpdateMutation.error, profileDeleteMutation.error, postCreateMutation.error, postUpdateMutation.error, postDeleteMutation.error, interactionCreateMutation.error, interactionUpdateMutation.error, interactionDeleteMutation.error]);

  const handlePublishPost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeProfile) return;
    const payload: PostInput = { authorId: activeProfile.id, content: composerDraft.content.trim(), imageUrl: optionalText(composerDraft.imageUrl), visibility: composerDraft.visibility };
    if (!payload.content) return;
    await postCreateMutation.mutateAsync(payload);
    setComposerDraft({ content: "", imageUrl: "", visibility: "PUBLIC" });
  };

  const handleToggleLike = async (postId: string) => {
    if (!activeProfile) return;
    const existing = likeByPostAndAuthor.get(`${postId}:${activeProfile.id}`);
    if (existing) { await interactionDeleteMutation.mutateAsync(existing.id); return; }
    await interactionCreateMutation.mutateAsync({ postId, authorId: activeProfile.id, type: "LIKE" });
  };

  const handleShare = async (postId: string) => {
    if (!activeProfile) return;
    await interactionCreateMutation.mutateAsync({ postId, authorId: activeProfile.id, type: "SHARE" });
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!activeProfile) return;
    const content = (commentDrafts[postId] ?? "").trim();
    if (!content) return;
    await interactionCreateMutation.mutateAsync({ postId, authorId: activeProfile.id, type: "COMMENT", content });
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
  };

  const handleStartPostEdit = (post: Post) => {
    setEditingPostId(post.id);
    setPostEditDraft({ content: post.content, imageUrl: post.imageUrl ?? "", visibility: post.visibility });
  };

  const handlePostSave = async () => {
    if (!editingPostId) return;
    const content = postEditDraft.content.trim();
    if (!content) return;
    await postUpdateMutation.mutateAsync({ id: editingPostId, payload: { content, imageUrl: optionalText(postEditDraft.imageUrl), visibility: postEditDraft.visibility } });
    setEditingPostId(null);
  };

  const openProfileCreator = () => {
    setEditingProfileId(null);
    setProfileDraft({ username: "", displayName: "", bio: "", avatarUrl: "", location: "" });
    setProfileModalOpen(true);
  };

  const openProfileEditor = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setProfileDraft({ username: profile.username, displayName: profile.displayName, bio: profile.bio ?? "", avatarUrl: profile.avatarUrl ?? "", location: profile.location ?? "" });
    setProfileModalOpen(true);
  };

  const submitProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload: ProfileInput = { username: profileDraft.username.trim(), displayName: profileDraft.displayName.trim(), bio: optionalText(profileDraft.bio), avatarUrl: optionalText(profileDraft.avatarUrl), location: optionalText(profileDraft.location) };
    if (!payload.username || !payload.displayName) return;
    if (editingProfileId) { await profileUpdateMutation.mutateAsync({ id: editingProfileId, payload }); }
    else { await profileCreateMutation.mutateAsync(payload); }
    setProfileModalOpen(false);
    setEditingProfileId(null);
  };

  const deleteProfile = async (profileId: string) => {
    if (!window.confirm("Delete this profile and all related data?")) return;
    await profileDeleteMutation.mutateAsync(profileId);
    if (activeProfileId === profileId) setSelectedProfileId("");
  };

  const handleFollow = (id: string) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const beginCommentEdit = (interaction: Interaction) => {
    setEditingCommentId(interaction.id);
    setCommentEditDraft(interaction.content ?? "");
  };

  const saveCommentEdit = async () => {
    if (!editingCommentId) return;
    const content = commentEditDraft.trim();
    if (!content) return;
    await interactionUpdateMutation.mutateAsync({ id: editingCommentId, payload: { type: "COMMENT", content } });
    setEditingCommentId(null);
    setCommentEditDraft("");
  };

  return (
    <div className="x-app">
      <div className="x-shell">
        <Sidebar
          activeProfile={activeProfile}
          onOpenProfileCreator={openProfileCreator}
        />

        <main className="x-main-column">
          <Routes>
            <Route
              path="/"
              element={
                <HomeFeed
                  posts={posts}
                  isLoading={postsQuery.isLoading}
                  feedMode={feedMode}
                  setFeedMode={setFeedMode}
                  feedSearch={feedSearch}
                  setFeedSearch={setFeedSearch}
                  activeProfile={activeProfile}
                  profileMap={profileMap}
                  interactionsByPost={interactionsByPost}
                  interactionMetricsByPost={interactionMetricsByPost}
                  likeByPostAndAuthor={likeByPostAndAuthor}
                  commentDrafts={commentDrafts}
                  editingCommentId={editingCommentId}
                  commentEditDraft={commentEditDraft}
                  composerDraft={composerDraft}
                  setComposerDraft={setComposerDraft}
                  onPublishPost={handlePublishPost}
                  onToggleLike={handleToggleLike}
                  onShare={handleShare}
                  onCommentSubmit={handleCommentSubmit}
                  onCommentDraftChange={(pid, v) => setCommentDrafts((prev) => ({ ...prev, [pid]: v }))}
                  onStartPostEdit={handleStartPostEdit}
                  onDeletePost={async (id) => { if (window.confirm("Delete this post?")) await postDeleteMutation.mutateAsync(id); }}
                  onBeginCommentEdit={beginCommentEdit}
                  onSaveCommentEdit={saveCommentEdit}
                  onCancelCommentEdit={() => { setEditingCommentId(null); setCommentEditDraft(""); }}
                  onCommentEditDraftChange={setCommentEditDraft}
                  onDeleteComment={async (id) => { if (window.confirm("Delete this reply?")) await interactionDeleteMutation.mutateAsync(id); }}
                  globalError={globalError}
                />
              }
            />
            <Route
              path="/explore"
              element={
                <ExplorePage
                  trendingTopics={trendingTopics}
                  profiles={profiles}
                  feedSearch={feedSearch}
                  onSearchChange={setFeedSearch}
                />
              }
            />
            <Route
              path="/notifications"
              element={
                <NotificationsPage
                  interactions={interactions}
                  profileMap={profileMap}
                  activeProfileId={activeProfileId}
                />
              }
            />
            <Route
              path="/follow"
              element={
                <FollowPage
                  profiles={profiles}
                  activeProfileId={activeProfileId}
                  followedIds={followedIds}
                  onFollow={handleFollow}
                />
              }
            />
            <Route
              path="/messages"
              element={
                <StubPage
                  title="Messages"
                  description="Send private messages to people you follow. Coming soon."
                  icon={<MessageCircle size={48} strokeWidth={1.2} />}
                />
              }
            />
            <Route
              path="/communities"
              element={
                <StubPage
                  title="Communities"
                  description="Join and create communities on shared interests. Coming soon."
                  icon={<Users size={48} strokeWidth={1.2} />}
                />
              }
            />
            <Route
              path="/bookmarks"
              element={
                <StubPage
                  title="Bookmarks"
                  description="Save posts for later. Coming soon."
                  icon={<Bookmark size={48} strokeWidth={1.2} />}
                />
              }
            />
            <Route
              path="/profile"
              element={
                <ProfilePage
                  activeProfile={activeProfile}
                  posts={posts}
                  onEditProfile={openProfileEditor}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  activeProfile={activeProfile}
                  profiles={profiles}
                  onSelectProfile={setSelectedProfileId}
                  onEditProfile={openProfileEditor}
                  onDeleteProfile={(id) => void deleteProfile(id)}
                  onOpenProfileCreator={openProfileCreator}
                />
              }
            />
          </Routes>
        </main>

        <RightSidebar
          feedSearch={feedSearch}
          onSearchChange={setFeedSearch}
          trendingTopics={trendingTopics}
          profiles={profiles}
          recentPosts={overview?.recentPosts ?? []}
          activeProfileId={activeProfileId}
          onFollowProfile={handleFollow}
          followedIds={followedIds}
        />
      </div>

      <ProfileModal
        open={profileModalOpen}
        editingProfileId={editingProfileId}
        profileDraft={profileDraft}
        onDraftChange={(field, value) => setProfileDraft((prev) => ({ ...prev, [field]: value }))}
        onSubmit={submitProfile}
        onClose={() => { setProfileModalOpen(false); setEditingProfileId(null); }}
      />
    </div>
  );
}

export default App;

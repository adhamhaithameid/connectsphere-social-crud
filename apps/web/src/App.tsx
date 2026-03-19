import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  client,
  getErrorMessage,
  type FeedSortMode,
  type InteractionInput,
  type InteractionUpdateInput,
  type PostInput,
  type PostUpdateInput,
  type ProfileInput
} from "./api";
import type { Interaction, Post, Profile, Visibility } from "./types";
import "./App.css";

const visibilityOptions: Visibility[] = ["PUBLIC", "FRIENDS", "PRIVATE"];
const EMPTY_PROFILES: Profile[] = [];
const EMPTY_POSTS: Post[] = [];
const EMPTY_INTERACTIONS: Interaction[] = [];
const xNavItems = [
  { label: "Stream", icon: "S" },
  { label: "Discover", icon: "D" },
  { label: "Alerts", icon: "A" },
  { label: "Messages", icon: "M" },
  { label: "Groups", icon: "G" },
  { label: "Saved", icon: "V" },
  { label: "Profile", icon: "P" },
  { label: "Settings", icon: "T" }
] as const;

interface ProfileDraft {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  location: string;
}

interface PostDraft {
  content: string;
  imageUrl: string;
  visibility: Visibility;
}

function optionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function timeAgo(value: string): string {
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor((now - then) / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return `${Math.floor(diffHours / 24)}d`;
}

function initials(name: string): string {
  const tokens = name
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "U";
  }

  return tokens.map((token) => token[0].toUpperCase()).join("");
}

function App() {
  const queryClient = useQueryClient();

  const [feedSearch, setFeedSearch] = useState("");
  const [feedMode, setFeedMode] = useState<FeedSortMode>("recent");
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const [composerDraft, setComposerDraft] = useState<PostDraft>({
    content: "",
    imageUrl: "",
    visibility: "PUBLIC"
  });

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postEditDraft, setPostEditDraft] = useState<PostDraft>({
    content: "",
    imageUrl: "",
    visibility: "PUBLIC"
  });

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentEditDraft, setCommentEditDraft] = useState("");

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    username: "",
    displayName: "",
    bio: "",
    avatarUrl: "",
    location: ""
  });

  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: () => client.listProfiles()
  });

  const postsQuery = useQuery({
    queryKey: ["posts", feedSearch, feedMode],
    queryFn: () => client.listPosts(feedSearch, feedMode)
  });

  const interactionsQuery = useQuery({
    queryKey: ["interactions"],
    queryFn: () => client.listInteractions()
  });

  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: client.getOverview
  });

  const profiles = profilesQuery.data ?? EMPTY_PROFILES;
  const posts = postsQuery.data ?? EMPTY_POSTS;
  const interactions = interactionsQuery.data ?? EMPTY_INTERACTIONS;
  const overview = overviewQuery.data;

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.id, profile]));
  }, [profiles]);

  const interactionsByPost = useMemo(() => {
    const map = new Map<string, Interaction[]>();

    interactions.forEach((interaction) => {
      const existing = map.get(interaction.postId);
      if (existing) {
        existing.push(interaction);
      } else {
        map.set(interaction.postId, [interaction]);
      }
    });

    map.forEach((postInteractions) => {
      postInteractions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });

    return map;
  }, [interactions]);

  const interactionMetricsByPost = useMemo(() => {
    const metrics = new Map<string, { likes: number; comments: number; shares: number }>();

    interactions.forEach((interaction) => {
      const bucket = metrics.get(interaction.postId) ?? { likes: 0, comments: 0, shares: 0 };

      if (interaction.type === "LIKE") {
        bucket.likes += 1;
      }

      if (interaction.type === "COMMENT") {
        bucket.comments += 1;
      }

      if (interaction.type === "SHARE") {
        bucket.shares += 1;
      }

      metrics.set(interaction.postId, bucket);
    });

    return metrics;
  }, [interactions]);

  const likeByPostAndAuthor = useMemo(() => {
    const lookup = new Map<string, Interaction>();

    interactions.forEach((interaction) => {
      if (interaction.type === "LIKE") {
        lookup.set(`${interaction.postId}:${interaction.authorId}`, interaction);
      }
    });

    return lookup;
  }, [interactions]);

  const trendingTopics = useMemo(() => {
    const stopWords = new Set([
      "the",
      "and",
      "for",
      "you",
      "that",
      "with",
      "this",
      "from",
      "have",
      "your",
      "about",
      "today",
      "still"
    ]);

    const counter = new Map<string, number>();

    posts.forEach((post) => {
      post.content
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 3 && !stopWords.has(token))
        .forEach((token) => {
          counter.set(token, (counter.get(token) ?? 0) + 1);
        });
    });

    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [posts]);

  const activeProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0] ?? null;
  const activeProfileId = activeProfile?.id ?? "";
  const remainingComposerChars = 500 - composerDraft.content.length;

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["profiles"] }),
      queryClient.invalidateQueries({ queryKey: ["posts"] }),
      queryClient.invalidateQueries({ queryKey: ["interactions"] }),
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    ]);
  };

  const profileCreateMutation = useMutation({
    mutationFn: client.createProfile,
    onSuccess: invalidateAll
  });

  const profileUpdateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProfileInput> }) =>
      client.updateProfile(id, payload),
    onSuccess: invalidateAll
  });

  const profileDeleteMutation = useMutation({
    mutationFn: client.deleteProfile,
    onSuccess: invalidateAll
  });

  const postCreateMutation = useMutation({
    mutationFn: client.createPost,
    onSuccess: invalidateAll
  });

  const postUpdateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PostUpdateInput }) =>
      client.updatePost(id, payload),
    onSuccess: invalidateAll
  });

  const postDeleteMutation = useMutation({
    mutationFn: client.deletePost,
    onSuccess: invalidateAll
  });

  const interactionCreateMutation = useMutation({
    mutationFn: client.createInteraction,
    onSuccess: invalidateAll
  });

  const interactionUpdateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InteractionUpdateInput }) =>
      client.updateInteraction(id, payload),
    onSuccess: invalidateAll
  });

  const interactionDeleteMutation = useMutation({
    mutationFn: client.deleteInteraction,
    onSuccess: invalidateAll
  });

  const globalError = useMemo(() => {
    const mutationError =
      profileCreateMutation.error ??
      profileUpdateMutation.error ??
      profileDeleteMutation.error ??
      postCreateMutation.error ??
      postUpdateMutation.error ??
      postDeleteMutation.error ??
      interactionCreateMutation.error ??
      interactionUpdateMutation.error ??
      interactionDeleteMutation.error;

    return mutationError ? getErrorMessage(mutationError) : null;
  }, [
    profileCreateMutation.error,
    profileUpdateMutation.error,
    profileDeleteMutation.error,
    postCreateMutation.error,
    postUpdateMutation.error,
    postDeleteMutation.error,
    interactionCreateMutation.error,
    interactionUpdateMutation.error,
    interactionDeleteMutation.error
  ]);

  const handlePublishPost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeProfile) {
      return;
    }

    const payload: PostInput = {
      authorId: activeProfile.id,
      content: composerDraft.content.trim(),
      imageUrl: optionalText(composerDraft.imageUrl),
      visibility: composerDraft.visibility
    };

    if (!payload.content) {
      return;
    }

    await postCreateMutation.mutateAsync(payload);
    setComposerDraft({ content: "", imageUrl: "", visibility: "PUBLIC" });
  };

  const handleToggleLike = async (postId: string) => {
    if (!activeProfile) {
      return;
    }

    const existing = likeByPostAndAuthor.get(`${postId}:${activeProfile.id}`);

    if (existing) {
      await interactionDeleteMutation.mutateAsync(existing.id);
      return;
    }

    const payload: InteractionInput = {
      postId,
      authorId: activeProfile.id,
      type: "LIKE"
    };

    await interactionCreateMutation.mutateAsync(payload);
  };

  const handleShare = async (postId: string) => {
    if (!activeProfile) {
      return;
    }

    const payload: InteractionInput = {
      postId,
      authorId: activeProfile.id,
      type: "SHARE"
    };

    await interactionCreateMutation.mutateAsync(payload);
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!activeProfile) {
      return;
    }

    const content = (commentDrafts[postId] ?? "").trim();
    if (!content) {
      return;
    }

    const payload: InteractionInput = {
      postId,
      authorId: activeProfile.id,
      type: "COMMENT",
      content
    };

    await interactionCreateMutation.mutateAsync(payload);
    setCommentDrafts((previous) => ({
      ...previous,
      [postId]: ""
    }));
  };

  const handleStartPostEdit = (post: Post) => {
    setEditingPostId(post.id);
    setPostEditDraft({
      content: post.content,
      imageUrl: post.imageUrl ?? "",
      visibility: post.visibility
    });
  };

  const handlePostSave = async () => {
    if (!editingPostId) {
      return;
    }

    const content = postEditDraft.content.trim();
    if (!content) {
      return;
    }

    const payload: PostUpdateInput = {
      content,
      imageUrl: optionalText(postEditDraft.imageUrl),
      visibility: postEditDraft.visibility
    };

    await postUpdateMutation.mutateAsync({
      id: editingPostId,
      payload
    });

    setEditingPostId(null);
  };

  const openProfileCreator = () => {
    setEditingProfileId(null);
    setProfileDraft({
      username: "",
      displayName: "",
      bio: "",
      avatarUrl: "",
      location: ""
    });
    setProfileModalOpen(true);
  };

  const openProfileEditor = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setProfileDraft({
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      location: profile.location ?? ""
    });
    setProfileModalOpen(true);
  };

  const submitProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: ProfileInput = {
      username: profileDraft.username.trim(),
      displayName: profileDraft.displayName.trim(),
      bio: optionalText(profileDraft.bio),
      avatarUrl: optionalText(profileDraft.avatarUrl),
      location: optionalText(profileDraft.location)
    };

    if (!payload.username || !payload.displayName) {
      return;
    }

    if (editingProfileId) {
      await profileUpdateMutation.mutateAsync({
        id: editingProfileId,
        payload
      });
    } else {
      await profileCreateMutation.mutateAsync(payload);
    }

    setProfileModalOpen(false);
    setEditingProfileId(null);
  };

  const deleteProfile = async (profileId: string) => {
    if (!window.confirm("Delete this profile and all related posts/interactions?")) {
      return;
    }

    await profileDeleteMutation.mutateAsync(profileId);

    if (activeProfileId === profileId) {
      setSelectedProfileId("");
    }
  };

  const beginCommentEdit = (interaction: Interaction) => {
    setEditingCommentId(interaction.id);
    setCommentEditDraft(interaction.content ?? "");
  };

  const saveCommentEdit = async () => {
    if (!editingCommentId) {
      return;
    }

    const content = commentEditDraft.trim();
    if (!content) {
      return;
    }

    const payload: InteractionUpdateInput = {
      type: "COMMENT",
      content
    };

    await interactionUpdateMutation.mutateAsync({
      id: editingCommentId,
      payload
    });

    setEditingCommentId(null);
    setCommentEditDraft("");
  };

  return (
    <div className="x-app">
      <div className="x-shell">
        <aside className="x-left-column">
          <div className="x-left-inner">
            <button type="button" className="x-logo-button" aria-label="Orbit Home">
              O
            </button>

            <section className="x-brand-card">
              <p className="x-brand-kicker">Orbit Social</p>
              <p className="x-brand-copy">Share ideas, build communities, and keep your circle in sync.</p>
            </section>

            <nav className="x-nav">
              {xNavItems.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  className={index === 0 ? "x-nav-item active" : "x-nav-item"}
                >
                  <span className="x-nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <button
              type="button"
              className="x-primary-button x-primary-button--wide"
              disabled={!activeProfile}
              onClick={() => {
                document.getElementById("composer")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start"
                });
              }}
            >
              Create
            </button>

            <section className="x-panel x-account-panel">
              <p className="x-panel-kicker">Active account</p>
              {activeProfile ? (
                <>
                  <div className="x-user-row">
                    <div className="x-avatar">
                      {activeProfile.avatarUrl ? (
                        <img src={activeProfile.avatarUrl} alt={activeProfile.displayName} />
                      ) : (
                        <span>{initials(activeProfile.displayName)}</span>
                      )}
                    </div>
                    <div>
                      <p className="x-user-name">{activeProfile.displayName}</p>
                      <p className="x-user-handle">@{activeProfile.username}</p>
                    </div>
                  </div>

                  <select
                    className="x-select"
                    value={activeProfileId}
                    onChange={(event) => setSelectedProfileId(event.target.value)}
                  >
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.displayName}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <p className="x-muted">Create a profile to start posting.</p>
              )}

              <button type="button" className="x-outline-button" onClick={openProfileCreator}>
                Create Profile
              </button>
            </section>

            <section className="x-panel x-metrics-panel">
              <p className="x-panel-kicker">Network</p>
              <div className="x-metrics-grid">
                <article>
                  <strong>{overview?.totals.profiles ?? 0}</strong>
                  <span>Profiles</span>
                </article>
                <article>
                  <strong>{overview?.totals.posts ?? 0}</strong>
                  <span>Posts</span>
                </article>
                <article>
                  <strong>{overview?.totals.interactions ?? 0}</strong>
                  <span>Interactions</span>
                </article>
              </div>
            </section>
          </div>
        </aside>

        <main className="x-main-column">
          <header className="x-main-header">
            <h1>Stream</h1>
          </header>

          <section className="x-feed-mode-tabs">
            <button
              type="button"
              className={feedMode === "recent" ? "x-feed-tab active" : "x-feed-tab"}
              onClick={() => setFeedMode("recent")}
            >
              Latest
            </button>
            <button
              type="button"
              className={feedMode === "popular" ? "x-feed-tab active" : "x-feed-tab"}
              onClick={() => setFeedMode("popular")}
            >
              Top
            </button>
          </section>

          <section className="x-inline-search">
            <input
              className="x-input"
              value={feedSearch}
              onChange={(event) => setFeedSearch(event.target.value)}
              placeholder="Search posts or people"
            />
          </section>

          <section id="composer" className="x-composer">
            <div className="x-avatar">
              {activeProfile?.avatarUrl ? (
                <img src={activeProfile.avatarUrl} alt={activeProfile.displayName} />
              ) : (
                <span>{activeProfile ? initials(activeProfile.displayName) : "?"}</span>
              )}
            </div>

            <form onSubmit={handlePublishPost} className="x-composer-form">
              <textarea
                rows={3}
                value={composerDraft.content}
                onChange={(event) =>
                  setComposerDraft((previous) => ({
                    ...previous,
                    content: event.target.value
                  }))
                }
                placeholder="Share an update with your community..."
              />

              <div className="x-composer-footer">
                <div className="x-composer-fields">
                  <input
                    className="x-input"
                    value={composerDraft.imageUrl}
                    onChange={(event) =>
                      setComposerDraft((previous) => ({
                        ...previous,
                        imageUrl: event.target.value
                      }))
                    }
                    placeholder="Optional image URL"
                  />

                  <select
                    className="x-select"
                    value={composerDraft.visibility}
                    onChange={(event) =>
                      setComposerDraft((previous) => ({
                        ...previous,
                        visibility: event.target.value as Visibility
                      }))
                    }
                  >
                    {visibilityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="x-composer-actions">
                  <p className={remainingComposerChars < 60 ? "x-char-hint warning" : "x-char-hint"}>
                    {remainingComposerChars}
                  </p>
                  <button
                    type="submit"
                    className="x-primary-button"
                    disabled={!activeProfile || !composerDraft.content.trim() || remainingComposerChars < 0}
                  >
                    Share
                  </button>
                </div>
              </div>
            </form>
          </section>

          {globalError ? <p className="x-error-banner">{globalError}</p> : null}

          <section className="x-timeline">
            {postsQuery.isLoading ? <p className="x-muted x-state">Loading timeline...</p> : null}
            {!postsQuery.isLoading && posts.length === 0 ? (
              <article className="x-empty-state">
                <p className="x-user-name">No posts found</p>
                <p className="x-muted">Try another search or publish the first post.</p>
              </article>
            ) : null}

            {posts.map((post) => {
              const author = profileMap.get(post.authorId);
              const metrics = interactionMetricsByPost.get(post.id) ?? {
                likes: 0,
                comments: 0,
                shares: 0
              };
              const comments = (interactionsByPost.get(post.id) ?? []).filter(
                (interaction) => interaction.type === "COMMENT"
              );
              const likedByActive = activeProfile
                ? likeByPostAndAuthor.has(`${post.id}:${activeProfile.id}`)
                : false;
              const canManagePost = activeProfile?.id === post.authorId;

              return (
                <article key={post.id} className="x-post">
                  <div className="x-avatar small">
                    {author?.avatarUrl ? (
                      <img src={author.avatarUrl} alt={author.displayName} />
                    ) : (
                      <span>{initials(author?.displayName ?? "User")}</span>
                    )}
                  </div>

                  <div className="x-post-body">
                    <header className="x-post-header">
                      <div>
                        <p className="x-user-name">{author?.displayName ?? "Deleted user"}</p>
                        <p className="x-user-handle">
                          @{author?.username ?? "unknown"} · {timeAgo(post.createdAt)}
                        </p>
                      </div>
                      <span className="x-visibility-pill">{post.visibility}</span>
                    </header>

                    {editingPostId === post.id ? (
                      <div className="x-edit-box">
                        <textarea
                          rows={4}
                          value={postEditDraft.content}
                          onChange={(event) =>
                            setPostEditDraft((previous) => ({
                              ...previous,
                              content: event.target.value
                            }))
                          }
                        />

                        <div className="x-inline-row">
                          <input
                            className="x-input"
                            value={postEditDraft.imageUrl}
                            onChange={(event) =>
                              setPostEditDraft((previous) => ({
                                ...previous,
                                imageUrl: event.target.value
                              }))
                            }
                            placeholder="Optional image URL"
                          />
                          <select
                            className="x-select"
                            value={postEditDraft.visibility}
                            onChange={(event) =>
                              setPostEditDraft((previous) => ({
                                ...previous,
                                visibility: event.target.value as Visibility
                              }))
                            }
                          >
                            {visibilityOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="x-inline-actions">
                          <button type="button" className="x-primary-button" onClick={handlePostSave}>
                            Save
                          </button>
                          <button
                            type="button"
                            className="x-outline-button"
                            onClick={() => setEditingPostId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="x-post-text">{post.content}</p>
                        {post.imageUrl ? (
                          <img src={post.imageUrl} alt="Post attachment" className="x-post-media" />
                        ) : null}
                      </>
                    )}

                    <div className="x-post-actions">
                      <button
                        type="button"
                        className={likedByActive ? "x-action-button liked" : "x-action-button"}
                        onClick={() => handleToggleLike(post.id)}
                        disabled={!activeProfile}
                      >
                        <span className="x-action-label">Like</span>
                        <span className="x-action-count">{metrics.likes}</span>
                      </button>
                      <button
                        type="button"
                        className="x-action-button"
                        onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                      >
                        <span className="x-action-label">Comment</span>
                        <span className="x-action-count">{metrics.comments}</span>
                      </button>
                      <button
                        type="button"
                        className="x-action-button"
                        onClick={() => handleShare(post.id)}
                        disabled={!activeProfile}
                      >
                        <span className="x-action-label">Repost</span>
                        <span className="x-action-count">{metrics.shares}</span>
                      </button>
                    </div>

                    {canManagePost ? (
                      <div className="x-inline-actions">
                        <button type="button" className="x-outline-button" onClick={() => handleStartPostEdit(post)}>
                          Edit Post
                        </button>
                        <button
                          type="button"
                          className="x-danger-button"
                          onClick={async () => {
                            if (!window.confirm("Delete this post and all comments/likes/shares?")) {
                              return;
                            }
                            await postDeleteMutation.mutateAsync(post.id);
                          }}
                        >
                          Delete Post
                        </button>
                      </div>
                    ) : null}

                    {expandedPostId === post.id || comments.length > 0 ? (
                      <div className="x-comments-zone">
                        {comments.map((comment) => {
                          const commentAuthor = profileMap.get(comment.authorId);
                          const canManageComment = activeProfile?.id === comment.authorId;

                          return (
                            <article key={comment.id} className="x-comment-item">
                              <p className="x-comment-meta">
                                <strong>{commentAuthor?.displayName ?? "Unknown"}</strong> · {formatDate(comment.createdAt)}
                              </p>

                              {editingCommentId === comment.id ? (
                                <>
                                  <textarea
                                    rows={3}
                                    value={commentEditDraft}
                                    onChange={(event) => setCommentEditDraft(event.target.value)}
                                  />
                                  <div className="x-inline-actions">
                                    <button type="button" className="x-primary-button" onClick={saveCommentEdit}>
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      className="x-outline-button"
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setCommentEditDraft("");
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <p className="x-comment-text">{comment.content}</p>
                              )}

                              {canManageComment && editingCommentId !== comment.id ? (
                                <div className="x-inline-actions">
                                  <button
                                    type="button"
                                    className="x-outline-button"
                                    onClick={() => beginCommentEdit(comment)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="x-danger-button"
                                    onClick={async () => {
                                      if (!window.confirm("Delete this comment?")) {
                                        return;
                                      }
                                      await interactionDeleteMutation.mutateAsync(comment.id);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </article>
                          );
                        })}

                        <div className="x-comment-compose">
                          <input
                            className="x-input"
                            value={commentDrafts[post.id] ?? ""}
                            onChange={(event) =>
                              setCommentDrafts((previous) => ({
                                ...previous,
                                [post.id]: event.target.value
                              }))
                            }
                            placeholder="Write a reply"
                          />
                          <button
                            type="button"
                            className="x-primary-button"
                            disabled={!activeProfile}
                            onClick={() => handleCommentSubmit(post.id)}
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        </main>

        <aside className="x-right-column">
          <div className="x-right-inner">
            <section className="x-search-card">
              <input
                className="x-input"
                value={feedSearch}
                onChange={(event) => setFeedSearch(event.target.value)}
                placeholder="Quick search"
              />
            </section>

            <section className="x-panel">
              <h2 className="x-panel-title">Topics bubbling up</h2>
              {trendingTopics.length === 0 ? <p className="x-muted">No trends yet.</p> : null}
              <div className="x-trend-list">
                {trendingTopics.map(([topic, score]) => (
                  <article key={topic}>
                    <p className="x-user-name">#{topic}</p>
                    <p className="x-muted">{score} posts</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="x-panel">
              <h2 className="x-panel-title">Community</h2>
              <div className="x-people-list">
                {profiles.map((profile) => (
                  <article key={profile.id} className="x-profile-row">
                    <div className="x-profile-row-head">
                      <p className="x-user-name">{profile.displayName}</p>
                      <p className="x-user-handle">@{profile.username}</p>
                    </div>
                    <div className="x-profile-row-actions">
                      <button
                        type="button"
                        className="x-outline-button"
                        onClick={() => setSelectedProfileId(profile.id)}
                      >
                        Switch
                      </button>
                      <button type="button" className="x-outline-button" onClick={() => openProfileEditor(profile)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="x-danger-button"
                        onClick={() => void deleteProfile(profile.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="x-panel">
              <h2 className="x-panel-title">Fresh activity</h2>
              <div className="x-recent-list">
                {(overview?.recentPosts ?? []).map((post) => (
                  <article key={post.id}>
                    <p className="x-user-name">{post.author?.displayName ?? "Unknown"}</p>
                    <p className="x-muted">{post.content}</p>
                    <p className="x-user-handle">{post._count?.interactions ?? 0} interactions</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>

      {profileModalOpen ? (
        <div className="x-modal-backdrop">
          <div className="x-modal-card">
            <h2>{editingProfileId ? "Edit Profile" : "Create Profile"}</h2>
            <form onSubmit={submitProfile} className="x-profile-form">
              <label>
                Username
                <input
                  className="x-input"
                  value={profileDraft.username}
                  onChange={(event) =>
                    setProfileDraft((previous) => ({
                      ...previous,
                      username: event.target.value
                    }))
                  }
                  disabled={Boolean(editingProfileId)}
                  required
                />
              </label>

              <label>
                Display Name
                <input
                  className="x-input"
                  value={profileDraft.displayName}
                  onChange={(event) =>
                    setProfileDraft((previous) => ({
                      ...previous,
                      displayName: event.target.value
                    }))
                  }
                  required
                />
              </label>

              <label>
                Bio
                <textarea
                  className="x-textarea"
                  rows={3}
                  value={profileDraft.bio}
                  onChange={(event) =>
                    setProfileDraft((previous) => ({
                      ...previous,
                      bio: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                Avatar URL
                <input
                  className="x-input"
                  value={profileDraft.avatarUrl}
                  onChange={(event) =>
                    setProfileDraft((previous) => ({
                      ...previous,
                      avatarUrl: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                Location
                <input
                  className="x-input"
                  value={profileDraft.location}
                  onChange={(event) =>
                    setProfileDraft((previous) => ({
                      ...previous,
                      location: event.target.value
                    }))
                  }
                />
              </label>

              <div className="x-inline-actions x-modal-actions">
                <button type="submit" className="x-primary-button">
                  Save
                </button>
                <button
                  type="button"
                  className="x-outline-button"
                  onClick={() => {
                    setProfileModalOpen(false);
                    setEditingProfileId(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;

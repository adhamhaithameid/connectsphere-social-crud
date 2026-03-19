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
    <div className="social-shell">
      <aside className="column left-column">
        <section className="ds-card card brand-card">
          <p className="brand-mark">ConnectSphere</p>
          <h1>Social HQ</h1>
          <p className="muted">A real timeline-style social platform for your internship showcase.</p>
        </section>

        <section className="ds-card card active-profile-card">
          <p className="section-title">Active User</p>
          {activeProfile ? (
            <>
              <div className="identity-row">
                <div className="avatar">
                  {activeProfile.avatarUrl ? (
                    <img src={activeProfile.avatarUrl} alt={activeProfile.displayName} />
                  ) : (
                    <span>{initials(activeProfile.displayName)}</span>
                  )}
                </div>
                <div>
                  <p className="name">{activeProfile.displayName}</p>
                  <p className="handle">@{activeProfile.username}</p>
                </div>
              </div>

              <select
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
            <p className="muted">Create your first profile to start posting.</p>
          )}

          <button type="button" className="ds-button ds-button--primary solid" onClick={openProfileCreator}>
            Create Profile
          </button>
        </section>

        <section className="ds-card card metrics-card">
          <p className="section-title">Network Snapshot</p>
          <div className="metric-grid">
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
      </aside>

      <main className="column center-column">
        <section className="ds-card card search-card">
          <div className="feed-mode-tabs">
            <button
              type="button"
              className={feedMode === "recent" ? "ds-button tab active" : "ds-button tab"}
              onClick={() => setFeedMode("recent")}
            >
              Recent
            </button>
            <button
              type="button"
              className={feedMode === "popular" ? "ds-button tab active" : "ds-button tab"}
              onClick={() => setFeedMode("popular")}
            >
              Popular
            </button>
          </div>
          <input
            value={feedSearch}
            onChange={(event) => setFeedSearch(event.target.value)}
            placeholder="Search timeline by text or author"
          />
        </section>

        <section className="ds-card card composer-card">
          <p className="section-title">Compose Post</p>
          <form onSubmit={handlePublishPost} className="composer-form">
            <textarea
              rows={4}
              value={composerDraft.content}
              onChange={(event) =>
                setComposerDraft((previous) => ({
                  ...previous,
                  content: event.target.value
                }))
              }
              placeholder="What is happening right now?"
            />
            <p className={remainingComposerChars < 60 ? "char-hint warning" : "char-hint"}>
              {remainingComposerChars} characters remaining
            </p>

            <div className="composer-row">
              <input
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

            <button
              type="submit"
              className="ds-button ds-button--primary solid"
              disabled={!activeProfile || !composerDraft.content.trim() || remainingComposerChars < 0}
            >
              Publish
            </button>
          </form>
        </section>

        {globalError ? <p className="error-banner">{globalError}</p> : null}

        <section className="timeline-list">
          {postsQuery.isLoading ? <p className="muted">Loading timeline...</p> : null}
          {!postsQuery.isLoading && posts.length === 0 ? (
            <article className="ds-card card post-card">
              <p className="name">No posts found</p>
              <p className="muted">
                Try another search term or publish the first post from your active profile.
              </p>
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
              <article key={post.id} className="ds-card card post-card">
                <div className="post-head">
                  <div className="identity-row">
                    <div className="avatar small">
                      {author?.avatarUrl ? (
                        <img src={author.avatarUrl} alt={author.displayName} />
                      ) : (
                        <span>{initials(author?.displayName ?? "User")}</span>
                      )}
                    </div>
                    <div>
                      <p className="name">{author?.displayName ?? "Deleted user"}</p>
                      <p className="handle">
                        @{author?.username ?? "unknown"} · {timeAgo(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  <span className="visibility-pill">{post.visibility}</span>
                </div>

                {editingPostId === post.id ? (
                  <div className="edit-box">
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
                    <div className="composer-row">
                      <input
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
                    <div className="action-row compact">
                      <button type="button" className="ds-button ds-button--primary solid" onClick={handlePostSave}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="ds-button ds-button--ghost ghost"
                        onClick={() => setEditingPostId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="post-text">{post.content}</p>
                    {post.imageUrl ? (
                      <img src={post.imageUrl} alt="Post attachment" className="post-media" />
                    ) : null}
                  </>
                )}

                <div className="action-row">
                  <button
                    type="button"
                    className={likedByActive ? "ds-button ds-button--ghost action liked" : "ds-button ds-button--ghost action"}
                    onClick={() => handleToggleLike(post.id)}
                    disabled={!activeProfile}
                  >
                    Like · {metrics.likes}
                  </button>
                  <button
                    type="button"
                    className="ds-button ds-button--ghost action"
                    onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                  >
                    Comment · {metrics.comments}
                  </button>
                  <button
                    type="button"
                    className="ds-button ds-button--ghost action"
                    onClick={() => handleShare(post.id)}
                    disabled={!activeProfile}
                  >
                    Share · {metrics.shares}
                  </button>
                </div>

                {canManagePost ? (
                  <div className="action-row compact">
                    <button type="button" className="ds-button ds-button--ghost ghost" onClick={() => handleStartPostEdit(post)}>
                      Edit Post
                    </button>
                    <button
                      type="button"
                      className="ds-button ds-button--danger danger"
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
                  <div className="comments-zone">
                    {comments.map((comment) => {
                      const commentAuthor = profileMap.get(comment.authorId);
                      const canManageComment = activeProfile?.id === comment.authorId;

                      return (
                        <article key={comment.id} className="comment-item">
                          <p className="comment-meta">
                            <strong>{commentAuthor?.displayName ?? "Unknown"}</strong> · {formatDate(comment.createdAt)}
                          </p>

                          {editingCommentId === comment.id ? (
                            <>
                              <textarea
                                rows={3}
                                value={commentEditDraft}
                                onChange={(event) => setCommentEditDraft(event.target.value)}
                              />
                              <div className="action-row compact">
                                <button type="button" className="ds-button ds-button--primary solid" onClick={saveCommentEdit}>
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="ds-button ds-button--ghost ghost"
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
                            <p>{comment.content}</p>
                          )}

                          {canManageComment && editingCommentId !== comment.id ? (
                            <div className="action-row compact">
                              <button
                                type="button"
                                className="ds-button ds-button--ghost ghost"
                                onClick={() => beginCommentEdit(comment)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ds-button ds-button--danger danger"
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

                    <div className="comment-compose">
                      <input
                        value={commentDrafts[post.id] ?? ""}
                        onChange={(event) =>
                          setCommentDrafts((previous) => ({
                            ...previous,
                            [post.id]: event.target.value
                          }))
                        }
                        placeholder="Write a comment"
                      />
                      <button
                        type="button"
                        className="ds-button ds-button--primary solid"
                        disabled={!activeProfile}
                        onClick={() => handleCommentSubmit(post.id)}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </main>

      <aside className="column right-column">
        <section className="ds-card card">
          <p className="section-title">Trending</p>
          {trendingTopics.length === 0 ? <p className="muted">No trends yet.</p> : null}
          <div className="trend-list">
            {trendingTopics.map(([topic, score]) => (
              <article key={topic}>
                <p className="name">#{topic}</p>
                <p className="muted">{score} mentions</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ds-card card">
          <p className="section-title">People</p>
          <div className="profile-list">
            {profiles.map((profile) => (
              <article key={profile.id} className="profile-row">
                <div>
                  <p className="name">{profile.displayName}</p>
                  <p className="handle">@{profile.username}</p>
                </div>
                <div className="profile-actions">
                  <button
                    type="button"
                    className="ds-button ds-button--ghost ghost"
                    onClick={() => setSelectedProfileId(profile.id)}
                  >
                    Switch
                  </button>
                  <button type="button" className="ds-button ds-button--ghost ghost" onClick={() => openProfileEditor(profile)}>
                    Edit
                  </button>
                  <button type="button" className="ds-button ds-button--danger danger" onClick={() => void deleteProfile(profile.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ds-card card">
          <p className="section-title">Recent Activity</p>
          <div className="recent-list">
            {(overview?.recentPosts ?? []).map((post) => (
              <article key={post.id}>
                <p className="name">{post.author?.displayName ?? "Unknown"}</p>
                <p className="muted">{post.content}</p>
                <p className="handle">{post._count?.interactions ?? 0} interactions</p>
              </article>
            ))}
          </div>
        </section>
      </aside>

      {profileModalOpen ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>{editingProfileId ? "Edit Profile" : "Create Profile"}</h2>
            <form onSubmit={submitProfile} className="profile-form">
              <label>
                Username
                <input
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
                  value={profileDraft.location}
                  onChange={(event) =>
                    setProfileDraft((previous) => ({
                      ...previous,
                      location: event.target.value
                    }))
                  }
                />
              </label>

              <div className="modal-actions">
                <button type="submit" className="ds-button ds-button--primary solid">
                  Save
                </button>
                <button
                  type="button"
                  className="ds-button ds-button--ghost ghost"
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

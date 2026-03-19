import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import {
  client,
  getErrorMessage,
  type InteractionInput,
  type InteractionUpdateInput,
  type PostInput,
  type PostUpdateInput,
  type ProfileInput
} from "./api";
import type { Interaction, InteractionType, Post, Profile, Visibility } from "./types";
import "./App.css";

const visibilityOptions: Visibility[] = ["PUBLIC", "FRIENDS", "PRIVATE"];
const interactionTypeOptions: InteractionType[] = ["LIKE", "COMMENT", "SHARE"];
const EMPTY_PROFILES: Profile[] = [];
const EMPTY_POSTS: Post[] = [];
const EMPTY_INTERACTIONS: Interaction[] = [];

interface ProfileFormValues {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  location: string;
}

interface PostFormValues {
  authorId: string;
  content: string;
  imageUrl: string;
  visibility: Visibility;
}

interface InteractionFormValues {
  postId: string;
  authorId: string;
  type: InteractionType;
  content: string;
}

function toOptionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toProfileInput(values: ProfileFormValues): ProfileInput {
  return {
    username: values.username.trim(),
    displayName: values.displayName.trim(),
    bio: toOptionalText(values.bio),
    avatarUrl: toOptionalText(values.avatarUrl),
    location: toOptionalText(values.location)
  };
}

function toPostInput(values: PostFormValues): PostInput {
  return {
    authorId: values.authorId,
    content: values.content.trim(),
    imageUrl: toOptionalText(values.imageUrl),
    visibility: values.visibility
  };
}

function toPostUpdateInput(values: PostFormValues): PostUpdateInput {
  return {
    content: values.content.trim(),
    imageUrl: toOptionalText(values.imageUrl),
    visibility: values.visibility
  };
}

function toInteractionInput(values: InteractionFormValues): InteractionInput {
  return {
    postId: values.postId,
    authorId: values.authorId,
    type: values.type,
    content: values.type === "COMMENT" ? toOptionalText(values.content) : undefined
  };
}

function toInteractionUpdateInput(values: InteractionFormValues): InteractionUpdateInput {
  return {
    type: values.type,
    content: values.type === "COMMENT" ? toOptionalText(values.content) : undefined
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function shortContent(content: string, max = 130): string {
  if (content.length <= max) {
    return content;
  }

  return content.slice(0, max) + "...";
}

function App() {
  const queryClient = useQueryClient();

  const [profileSearch, setProfileSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [interactionSearch, setInteractionSearch] = useState("");

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);

  const profilesQuery = useQuery({
    queryKey: ["profiles", profileSearch],
    queryFn: () => client.listProfiles(profileSearch)
  });

  const postsQuery = useQuery({
    queryKey: ["posts", postSearch],
    queryFn: () => client.listPosts(postSearch)
  });

  const interactionsQuery = useQuery({
    queryKey: ["interactions", interactionSearch],
    queryFn: () => client.listInteractions(interactionSearch)
  });

  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: client.getOverview
  });

  const profiles = profilesQuery.data ?? EMPTY_PROFILES;
  const posts = postsQuery.data ?? EMPTY_POSTS;
  const interactions = interactionsQuery.data ?? EMPTY_INTERACTIONS;
  const overview = overviewQuery.data;

  const profileForm = useForm<ProfileFormValues>({
    defaultValues: {
      username: "",
      displayName: "",
      bio: "",
      avatarUrl: "",
      location: ""
    }
  });

  const postForm = useForm<PostFormValues>({
    defaultValues: {
      authorId: "",
      content: "",
      imageUrl: "",
      visibility: "PUBLIC"
    }
  });

  const interactionForm = useForm<InteractionFormValues>({
    defaultValues: {
      postId: "",
      authorId: "",
      type: "LIKE",
      content: ""
    }
  });

  useEffect(() => {
    if (profiles.length > 0 && postForm.getValues("authorId") === "") {
      postForm.setValue("authorId", profiles[0].id);
    }
  }, [profiles, postForm]);

  useEffect(() => {
    if (profiles.length > 0 && interactionForm.getValues("authorId") === "") {
      interactionForm.setValue("authorId", profiles[0].id);
    }

    if (posts.length > 0 && interactionForm.getValues("postId") === "") {
      interactionForm.setValue("postId", posts[0].id);
    }
  }, [profiles, posts, interactionForm]);

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

  const profileError = useMemo(() => {
    const error =
      profileCreateMutation.error ??
      profileUpdateMutation.error ??
      profileDeleteMutation.error;

    return error ? getErrorMessage(error) : null;
  }, [profileCreateMutation.error, profileUpdateMutation.error, profileDeleteMutation.error]);

  const postError = useMemo(() => {
    const error = postCreateMutation.error ?? postUpdateMutation.error ?? postDeleteMutation.error;
    return error ? getErrorMessage(error) : null;
  }, [postCreateMutation.error, postUpdateMutation.error, postDeleteMutation.error]);

  const interactionError = useMemo(() => {
    const error =
      interactionCreateMutation.error ??
      interactionUpdateMutation.error ??
      interactionDeleteMutation.error;

    return error ? getErrorMessage(error) : null;
  }, [interactionCreateMutation.error, interactionUpdateMutation.error, interactionDeleteMutation.error]);

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = async (values) => {
    const payload = toProfileInput(values);

    if (editingProfile) {
      await profileUpdateMutation.mutateAsync({
        id: editingProfile.id,
        payload
      });
      setEditingProfile(null);
    } else {
      await profileCreateMutation.mutateAsync(payload);
    }

    profileForm.reset({
      username: "",
      displayName: "",
      bio: "",
      avatarUrl: "",
      location: ""
    });
  };

  const onPostSubmit: SubmitHandler<PostFormValues> = async (values) => {
    if (!values.authorId) {
      return;
    }

    if (editingPost) {
      await postUpdateMutation.mutateAsync({
        id: editingPost.id,
        payload: toPostUpdateInput(values)
      });
      setEditingPost(null);
    } else {
      await postCreateMutation.mutateAsync(toPostInput(values));
    }

    postForm.reset({
      authorId: profiles[0]?.id ?? "",
      content: "",
      imageUrl: "",
      visibility: "PUBLIC"
    });
  };

  const onInteractionSubmit: SubmitHandler<InteractionFormValues> = async (values) => {
    if (!values.authorId || !values.postId) {
      return;
    }

    if (editingInteraction) {
      await interactionUpdateMutation.mutateAsync({
        id: editingInteraction.id,
        payload: toInteractionUpdateInput(values)
      });
      setEditingInteraction(null);
    } else {
      await interactionCreateMutation.mutateAsync(toInteractionInput(values));
    }

    interactionForm.reset({
      postId: posts[0]?.id ?? "",
      authorId: profiles[0]?.id ?? "",
      type: "LIKE",
      content: ""
    });
  };

  const startProfileEdit = (profile: Profile) => {
    setEditingProfile(profile);
    profileForm.reset({
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      location: profile.location ?? ""
    });
  };

  const cancelProfileEdit = () => {
    setEditingProfile(null);
    profileForm.reset({
      username: "",
      displayName: "",
      bio: "",
      avatarUrl: "",
      location: ""
    });
  };

  const startPostEdit = (post: Post) => {
    setEditingPost(post);
    postForm.reset({
      authorId: post.authorId,
      content: post.content,
      imageUrl: post.imageUrl ?? "",
      visibility: post.visibility
    });
  };

  const cancelPostEdit = () => {
    setEditingPost(null);
    postForm.reset({
      authorId: profiles[0]?.id ?? "",
      content: "",
      imageUrl: "",
      visibility: "PUBLIC"
    });
  };

  const startInteractionEdit = (interaction: Interaction) => {
    setEditingInteraction(interaction);
    interactionForm.reset({
      postId: interaction.postId,
      authorId: interaction.authorId,
      type: interaction.type,
      content: interaction.content ?? ""
    });
  };

  const cancelInteractionEdit = () => {
    setEditingInteraction(null);
    interactionForm.reset({
      postId: posts[0]?.id ?? "",
      authorId: profiles[0]?.id ?? "",
      type: "LIKE",
      content: ""
    });
  };

  return (
    <div className="page-shell">
      <header className="hero-section">
        <p className="kicker">Internship Portfolio Project</p>
        <h1>ConnectSphere Social CRUD Platform</h1>
        <p className="hero-copy">
          Full-stack social media dashboard with complete CRUD support for profiles, posts, and
          interactions.
        </p>

        <div className="stats-grid">
          <article className="stat-card">
            <p className="stat-title">Profiles</p>
            <p className="stat-value">{overview?.totals.profiles ?? 0}</p>
          </article>
          <article className="stat-card">
            <p className="stat-title">Posts</p>
            <p className="stat-value">{overview?.totals.posts ?? 0}</p>
          </article>
          <article className="stat-card">
            <p className="stat-title">Interactions</p>
            <p className="stat-value">{overview?.totals.interactions ?? 0}</p>
          </article>
          <article className="stat-card wide">
            <p className="stat-title">Interaction Mix</p>
            <p className="stat-line">
              Likes: {overview?.interactionBreakdown.LIKE ?? 0} | Comments:{" "}
              {overview?.interactionBreakdown.COMMENT ?? 0} | Shares:{" "}
              {overview?.interactionBreakdown.SHARE ?? 0}
            </p>
          </article>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Profiles</h2>
            <input
              value={profileSearch}
              onChange={(event) => setProfileSearch(event.target.value)}
              placeholder="Search profiles"
            />
          </div>

          <form className="stack-form" onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <label>
              Username
              <input
                {...profileForm.register("username", { required: "Username is required" })}
                placeholder="sam.dev"
                disabled={Boolean(editingProfile)}
              />
              {profileForm.formState.errors.username ? (
                <small>{profileForm.formState.errors.username.message}</small>
              ) : null}
            </label>

            <label>
              Display Name
              <input
                {...profileForm.register("displayName", { required: "Display name is required" })}
                placeholder="Samir Aziz"
              />
              {profileForm.formState.errors.displayName ? (
                <small>{profileForm.formState.errors.displayName.message}</small>
              ) : null}
            </label>

            <label>
              Bio
              <textarea
                rows={3}
                {...profileForm.register("bio")}
                placeholder="Short profile summary"
              />
            </label>

            <label>
              Avatar URL
              <input {...profileForm.register("avatarUrl")} placeholder="https://..." />
            </label>

            <label>
              Location
              <input {...profileForm.register("location")} placeholder="Cairo, Egypt" />
            </label>

            {profileError ? <p className="error-line">{profileError}</p> : null}

            <div className="form-actions">
              <button
                type="submit"
                disabled={profileCreateMutation.isPending || profileUpdateMutation.isPending}
              >
                {editingProfile ? "Update Profile" : "Create Profile"}
              </button>
              {editingProfile ? (
                <button type="button" className="ghost" onClick={cancelProfileEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div className="list-wrap">
            {profilesQuery.isLoading ? <p className="muted">Loading profiles...</p> : null}
            {profiles.map((profile) => (
              <article key={profile.id} className="list-card">
                <div className="row-between">
                  <div>
                    <h3>{profile.displayName}</h3>
                    <p className="muted">@{profile.username}</p>
                  </div>
                  <span className="badge">{profile._count?.posts ?? 0} posts</span>
                </div>
                {profile.bio ? <p>{profile.bio}</p> : <p className="muted">No bio available.</p>}
                <p className="muted">{profile.location ?? "No location"}</p>
                <p className="tiny">Created {formatDate(profile.createdAt)}</p>
                <div className="card-actions">
                  <button type="button" className="ghost" onClick={() => startProfileEdit(profile)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={async () => {
                      if (!window.confirm("Delete this profile and related data?")) {
                        return;
                      }
                      await profileDeleteMutation.mutateAsync(profile.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Posts</h2>
            <input
              value={postSearch}
              onChange={(event) => setPostSearch(event.target.value)}
              placeholder="Search posts"
            />
          </div>

          <form className="stack-form" onSubmit={postForm.handleSubmit(onPostSubmit)}>
            <label>
              Author
              <select
                {...postForm.register("authorId", { required: "Author is required" })}
                disabled={profiles.length === 0 || Boolean(editingPost)}
              >
                {profiles.length === 0 ? <option value="">Create a profile first</option> : null}
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Content
              <textarea
                rows={4}
                {...postForm.register("content", { required: "Post content is required" })}
                placeholder="What is happening today?"
              />
              {postForm.formState.errors.content ? (
                <small>{postForm.formState.errors.content.message}</small>
              ) : null}
            </label>

            <label>
              Image URL
              <input {...postForm.register("imageUrl")} placeholder="https://..." />
            </label>

            <label>
              Visibility
              <select {...postForm.register("visibility")}>
                {visibilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            {postError ? <p className="error-line">{postError}</p> : null}

            <div className="form-actions">
              <button
                type="submit"
                disabled={postCreateMutation.isPending || postUpdateMutation.isPending || profiles.length === 0}
              >
                {editingPost ? "Update Post" : "Create Post"}
              </button>
              {editingPost ? (
                <button type="button" className="ghost" onClick={cancelPostEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div className="list-wrap">
            {postsQuery.isLoading ? <p className="muted">Loading posts...</p> : null}
            {posts.map((post) => (
              <article key={post.id} className="list-card">
                <div className="row-between">
                  <h3>{post.author?.displayName ?? "Unknown author"}</h3>
                  <span className="badge">{post.visibility}</span>
                </div>
                <p>{post.content}</p>
                {post.imageUrl ? (
                  <a href={post.imageUrl} target="_blank" rel="noreferrer" className="tiny-link">
                    Open image
                  </a>
                ) : null}
                <p className="tiny">
                  {post._count?.interactions ?? 0} interactions | {formatDate(post.createdAt)}
                </p>
                <div className="card-actions">
                  <button type="button" className="ghost" onClick={() => startPostEdit(post)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={async () => {
                      if (!window.confirm("Delete this post and related interactions?")) {
                        return;
                      }
                      await postDeleteMutation.mutateAsync(post.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Interactions</h2>
            <input
              value={interactionSearch}
              onChange={(event) => setInteractionSearch(event.target.value)}
              placeholder="Search interactions"
            />
          </div>

          <form className="stack-form" onSubmit={interactionForm.handleSubmit(onInteractionSubmit)}>
            <label>
              Post
              <select
                {...interactionForm.register("postId", { required: "Post is required" })}
                disabled={posts.length === 0 || Boolean(editingInteraction)}
              >
                {posts.length === 0 ? <option value="">Create a post first</option> : null}
                {posts.map((post) => (
                  <option key={post.id} value={post.id}>
                    {shortContent(post.content, 45)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Actor
              <select
                {...interactionForm.register("authorId", { required: "Actor is required" })}
                disabled={profiles.length === 0 || Boolean(editingInteraction)}
              >
                {profiles.length === 0 ? <option value="">Create a profile first</option> : null}
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Type
              <select {...interactionForm.register("type")}>
                {interactionTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Comment Content (only for COMMENT)
              <textarea rows={3} {...interactionForm.register("content")} placeholder="Write a comment" />
            </label>

            {interactionError ? <p className="error-line">{interactionError}</p> : null}

            <div className="form-actions">
              <button
                type="submit"
                disabled={
                  interactionCreateMutation.isPending ||
                  interactionUpdateMutation.isPending ||
                  profiles.length === 0 ||
                  posts.length === 0
                }
              >
                {editingInteraction ? "Update Interaction" : "Create Interaction"}
              </button>
              {editingInteraction ? (
                <button type="button" className="ghost" onClick={cancelInteractionEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div className="list-wrap">
            {interactionsQuery.isLoading ? <p className="muted">Loading interactions...</p> : null}
            {interactions.map((interaction) => (
              <article key={interaction.id} className="list-card">
                <div className="row-between">
                  <h3>{interaction.author?.displayName ?? "Unknown user"}</h3>
                  <span className={"chip " + interaction.type.toLowerCase()}>{interaction.type}</span>
                </div>
                <p className="muted">On post: {shortContent(interaction.post?.content ?? "Unknown post", 70)}</p>
                {interaction.content ? <p>{interaction.content}</p> : null}
                <p className="tiny">{formatDate(interaction.createdAt)}</p>
                <div className="card-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => startInteractionEdit(interaction)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={async () => {
                      if (!window.confirm("Delete this interaction?")) {
                        return;
                      }
                      await interactionDeleteMutation.mutateAsync(interaction.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <section className="recent-strip">
        <h2>Latest Activity</h2>
        <div className="recent-grid">
          {(overview?.recentPosts ?? []).map((post) => (
            <article key={post.id} className="recent-card">
              <p className="muted">{post.author?.displayName ?? "Unknown"}</p>
              <p>{shortContent(post.content, 100)}</p>
              <p className="tiny">{post._count?.interactions ?? 0} interactions</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;

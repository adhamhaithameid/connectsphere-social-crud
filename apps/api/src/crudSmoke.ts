import "dotenv/config";

const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface ApiResult<T> {
  status: number;
  body: T;
}

async function request<T>(method: HttpMethod, path: string, payload?: unknown): Promise<ApiResult<T>> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: payload ? JSON.stringify(payload) : undefined
  });

  const text = await response.text();
  const body = text.length > 0 ? (JSON.parse(text) as T) : ({} as T);

  return {
    status: response.status,
    body
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const unique = Date.now();
  const username = `crud.test.${unique}`;

  const createProfile = await request<{ data: { id: string } }>("POST", "/api/profiles", {
    username,
    displayName: "CRUD Tester",
    bio: "Automated CRUD smoke test profile",
    location: "Cairo"
  });

  assert(createProfile.status === 201, "Profile creation failed");
  const profileId = createProfile.body.data.id;

  const readProfile = await request<{ data: { id: string; displayName: string } }>(
    "GET",
    `/api/profiles/${profileId}`
  );
  assert(readProfile.status === 200, "Profile read failed");

  const updateProfile = await request<{ data: { displayName: string } }>("PATCH", `/api/profiles/${profileId}`, {
    displayName: "CRUD Tester Updated"
  });
  assert(updateProfile.status === 200, "Profile update failed");

  const createPost = await request<{ data: { id: string; content: string } }>("POST", "/api/posts", {
    authorId: profileId,
    content: "This post validates CREATE and READ for posts.",
    visibility: "PUBLIC"
  });

  assert(createPost.status === 201, "Post creation failed");
  const postId = createPost.body.data.id;

  const updatePost = await request<{ data: { content: string } }>("PATCH", `/api/posts/${postId}`, {
    content: "This post validates UPDATE for posts.",
    visibility: "FRIENDS"
  });
  assert(updatePost.status === 200, "Post update failed");

  const createInteraction = await request<{ data: { id: string } }>("POST", "/api/interactions", {
    postId,
    authorId: profileId,
    type: "COMMENT",
    content: "This comment validates interaction create"
  });

  assert(createInteraction.status === 201, "Interaction creation failed");
  const interactionId = createInteraction.body.data.id;

  const updateInteraction = await request<{ data: { content: string } }>(
    "PATCH",
    `/api/interactions/${interactionId}`,
    {
      type: "COMMENT",
      content: "This comment validates interaction update"
    }
  );

  assert(updateInteraction.status === 200, "Interaction update failed");

  const deleteInteraction = await request("DELETE", `/api/interactions/${interactionId}`);
  assert(deleteInteraction.status === 204, "Interaction delete failed");

  const deletePost = await request("DELETE", `/api/posts/${postId}`);
  assert(deletePost.status === 204, "Post delete failed");

  const deleteProfile = await request("DELETE", `/api/profiles/${profileId}`);
  assert(deleteProfile.status === 204, "Profile delete failed");

  const profileAfterDelete = await request<{ error: string }>("GET", `/api/profiles/${profileId}`);
  assert(profileAfterDelete.status === 404, "Profile should not exist after delete");

  console.log("CRUD smoke test passed for profiles, posts, and interactions.");
}

main().catch((error) => {
  console.error("CRUD smoke test failed:", error.message);
  process.exit(1);
});

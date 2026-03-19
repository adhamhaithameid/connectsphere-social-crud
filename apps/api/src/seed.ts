import "dotenv/config";
import { createId, nowIso, writeDatabase } from "./lib/store.js";
import { DatabaseState } from "./lib/models.js";

function buildSeedData(): DatabaseState {
  const profileNoraId = createId();
  const profileSamId = createId();
  const profileLinaId = createId();

  const postAId = createId();
  const postBId = createId();
  const postCId = createId();

  const now = nowIso();

  return {
    profiles: [
      {
        id: profileNoraId,
        username: "nora.codes",
        displayName: "Nora Abdellah",
        bio: "Frontend engineer building delightful products.",
        location: "Cairo, Egypt",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
        createdAt: now,
        updatedAt: now
      },
      {
        id: profileSamId,
        username: "sam.dev",
        displayName: "Samir Aziz",
        bio: "Full-stack builder and coffee enthusiast.",
        location: "Alexandria, Egypt",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
        createdAt: now,
        updatedAt: now
      },
      {
        id: profileLinaId,
        username: "lina.pm",
        displayName: "Lina Mostafa",
        bio: "Product manager focused on social impact apps.",
        location: "Giza, Egypt",
        avatarUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
        createdAt: now,
        updatedAt: now
      }
    ],
    posts: [
      {
        id: postAId,
        authorId: profileNoraId,
        content: "Shipped a new accessibility update today. Small details, big impact.",
        visibility: "PUBLIC",
        createdAt: now,
        updatedAt: now
      },
      {
        id: postBId,
        authorId: profileSamId,
        content: "Building a CRUD API is still one of the best ways to master backend fundamentals.",
        visibility: "PUBLIC",
        createdAt: now,
        updatedAt: now
      },
      {
        id: postCId,
        authorId: profileLinaId,
        content: "Team syncs are better when every voice gets heard.",
        visibility: "FRIENDS",
        createdAt: now,
        updatedAt: now
      }
    ],
    interactions: [
      {
        id: createId(),
        type: "LIKE",
        postId: postAId,
        authorId: profileSamId,
        createdAt: now,
        updatedAt: now
      },
      {
        id: createId(),
        type: "COMMENT",
        postId: postAId,
        authorId: profileLinaId,
        content: "Love this. Accessibility should be a default, not an afterthought.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: createId(),
        type: "SHARE",
        postId: postBId,
        authorId: profileNoraId,
        createdAt: now,
        updatedAt: now
      },
      {
        id: createId(),
        type: "COMMENT",
        postId: postCId,
        authorId: profileSamId,
        content: "Completely agree. Better product outcomes every time.",
        createdAt: now,
        updatedAt: now
      }
    ]
  };
}

async function main() {
  await writeDatabase(buildSeedData());
  console.log("Seeded profiles, posts, and interactions.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

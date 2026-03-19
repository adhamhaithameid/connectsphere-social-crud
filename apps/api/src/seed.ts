import "dotenv/config";
import { createId, nowIso, writeDatabase } from "./lib/store.js";
import { DatabaseState } from "./lib/models.js";

function buildSeedData(): DatabaseState {
  const profileNoraId = createId();
  const profileSamId = createId();
  const profileLinaId = createId();
  const profileOmarId = createId();

  const postAId = createId();
  const postBId = createId();
  const postCId = createId();
  const postDId = createId();
  const postEId = createId();
  const postFId = createId();

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
      },
      {
        id: profileOmarId,
        username: "omar.ai",
        displayName: "Omar Fathy",
        bio: "ML engineer sharing experiments and tiny build logs.",
        location: "Mansoura, Egypt",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
        createdAt: now,
        updatedAt: now
      }
    ],
    posts: [
      {
        id: postAId,
        authorId: profileNoraId,
        content: "Shipped a new accessibility update today. Small details, big impact. #frontend #a11y",
        visibility: "PUBLIC",
        createdAt: now,
        updatedAt: now
      },
      {
        id: postBId,
        authorId: profileSamId,
        content: "Building a CRUD API is still one of the best ways to master backend fundamentals. #nodejs #typescript",
        visibility: "PUBLIC",
        createdAt: now,
        updatedAt: now
      },
      {
        id: postCId,
        authorId: profileLinaId,
        content: "Team syncs are better when every voice gets heard. #product #teamwork",
        visibility: "FRIENDS",
        createdAt: now,
        updatedAt: now
      },
      {
        id: postDId,
        authorId: profileOmarId,
        content: "Testing a recommendation model for a social feed ranking experiment. #machinelearning #social",
        visibility: "PUBLIC",
        createdAt: now,
        updatedAt: now
      },
      {
        id: postEId,
        authorId: profileNoraId,
        content: "Design QA checklist for mobile timeline cards is now done. DM me if you want the template. #designsystems",
        visibility: "PUBLIC",
        createdAt: now,
        updatedAt: now
      },
      {
        id: postFId,
        authorId: profileSamId,
        content: "Refactored comment services to make moderation easier and faster. #backend #performance",
        visibility: "PUBLIC",
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
        postId: postAId,
        authorId: profileOmarId,
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
        type: "LIKE",
        postId: postBId,
        authorId: profileOmarId,
        createdAt: now,
        updatedAt: now
      },
      {
        id: createId(),
        type: "COMMENT",
        postId: postBId,
        authorId: profileLinaId,
        content: "This should be required practice for every intern project.",
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
      },
      {
        id: createId(),
        type: "LIKE",
        postId: postDId,
        authorId: profileNoraId,
        createdAt: now,
        updatedAt: now
      },
      {
        id: createId(),
        type: "LIKE",
        postId: postDId,
        authorId: profileSamId,
        createdAt: now,
        updatedAt: now
      },
      {
        id: createId(),
        type: "COMMENT",
        postId: postDId,
        authorId: profileSamId,
        content: "Would love to see the ranking metrics snapshot.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: createId(),
        type: "SHARE",
        postId: postEId,
        authorId: profileLinaId,
        createdAt: now,
        updatedAt: now
      },
      {
        id: createId(),
        type: "LIKE",
        postId: postFId,
        authorId: profileLinaId,
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

import { Router } from "express";
import { readDatabase } from "../lib/store.js";
import { asyncHandler } from "../lib/http.js";

export const feedRouter = Router();

feedRouter.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const db = await readDatabase();

    const recentPosts = db.posts
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((post) => {
        const author = db.profiles.find((profile) => profile.id === post.authorId);

        return {
          ...post,
          author: author
            ? {
                id: author.id,
                username: author.username,
                displayName: author.displayName,
                avatarUrl: author.avatarUrl
              }
            : undefined,
          _count: {
            interactions: db.interactions.filter((interaction) => interaction.postId === post.id).length
          }
        };
      });

    const interactionBreakdown = {
      LIKE: db.interactions.filter((interaction) => interaction.type === "LIKE").length,
      COMMENT: db.interactions.filter((interaction) => interaction.type === "COMMENT").length,
      SHARE: db.interactions.filter((interaction) => interaction.type === "SHARE").length
    };

    res.json({
      data: {
        totals: {
          profiles: db.profiles.length,
          posts: db.posts.length,
          interactions: db.interactions.length
        },
        interactionBreakdown,
        recentPosts
      }
    });
  })
);

import { Router } from "express";
import { asyncHandler, HttpError } from "../lib/http.js";
import { createId, mutateDatabase, nowIso, readDatabase } from "../lib/store.js";
import { postCreateSchema, postListQuerySchema, postUpdateSchema } from "../lib/validators.js";

export const postsRouter = Router();

postsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { q, limit = 20, page = 1, authorId, visibility, sort = "recent" } =
      postListQuerySchema.parse(req.query);
    const needle = q?.toLowerCase();

    const db = await readDatabase();
    const interactionCountByPost = new Map<string, number>();

    db.interactions.forEach((interaction) => {
      interactionCountByPost.set(
        interaction.postId,
        (interactionCountByPost.get(interaction.postId) ?? 0) + 1
      );
    });

    const filtered = db.posts
      .filter((post) => {
        if (authorId && post.authorId !== authorId) {
          return false;
        }

        if (visibility && post.visibility !== visibility) {
          return false;
        }

        if (!needle) {
          return true;
        }

        const authorName =
          db.profiles.find((profile) => profile.id === post.authorId)?.displayName ?? "";

        return [post.content, authorName].join(" ").toLowerCase().includes(needle);
      })
      .sort((a, b) => {
        if (sort === "popular") {
          const scoreA = interactionCountByPost.get(a.id) ?? 0;
          const scoreB = interactionCountByPost.get(b.id) ?? 0;

          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
        }

        return b.createdAt.localeCompare(a.createdAt);
      });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit).map((post) => {
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
          interactions: interactionCountByPost.get(post.id) ?? 0
        }
      };
    });

    res.json({
      data: items,
      meta: {
        total,
        page,
        limit,
        hasNextPage: page * limit < total
      }
    });
  })
);

postsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = await readDatabase();
    const post = db.posts.find((item) => item.id === req.params.id);

    if (!post) {
      throw new HttpError(404, "Post not found");
    }

    const author = db.profiles.find((profile) => profile.id === post.authorId);
    const interactions = db.interactions
      .filter((interaction) => interaction.postId === post.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((interaction) => {
        const interactionAuthor = db.profiles.find((profile) => profile.id === interaction.authorId);

        return {
          ...interaction,
          author: interactionAuthor
            ? {
                id: interactionAuthor.id,
                username: interactionAuthor.username,
                displayName: interactionAuthor.displayName,
                avatarUrl: interactionAuthor.avatarUrl
              }
            : undefined
        };
      });

    res.json({
      data: {
        ...post,
        author: author
          ? {
              id: author.id,
              username: author.username,
              displayName: author.displayName,
              avatarUrl: author.avatarUrl
            }
          : undefined,
        interactions
      }
    });
  })
);

postsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = postCreateSchema.parse(req.body);

    const created = await mutateDatabase((db) => {
      const author = db.profiles.find((profile) => profile.id === payload.authorId);

      if (!author) {
        throw new HttpError(404, "Author profile not found");
      }

      const timestamp = nowIso();
      const post = {
        id: createId(),
        authorId: payload.authorId,
        content: payload.content,
        imageUrl: payload.imageUrl,
        visibility: payload.visibility ?? "PUBLIC",
        createdAt: timestamp,
        updatedAt: timestamp
      };

      db.posts.push(post);

      return {
        ...post,
        author: {
          id: author.id,
          username: author.username,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl
        }
      };
    });

    res.status(201).json({ data: created });
  })
);

postsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const payload = postUpdateSchema.parse(req.body);

    const updated = await mutateDatabase((db) => {
      const index = db.posts.findIndex((post) => post.id === req.params.id);

      if (index === -1) {
        throw new HttpError(404, "Post not found");
      }

      const post = {
        ...db.posts[index],
        ...payload,
        updatedAt: nowIso()
      };

      db.posts[index] = post;

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
          : undefined
      };
    });

    res.json({ data: updated });
  })
);

postsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await mutateDatabase((db) => {
      const postExists = db.posts.some((post) => post.id === req.params.id);

      if (!postExists) {
        throw new HttpError(404, "Post not found");
      }

      db.posts = db.posts.filter((post) => post.id !== req.params.id);
      db.interactions = db.interactions.filter((interaction) => interaction.postId !== req.params.id);
    });

    res.status(204).send();
  })
);

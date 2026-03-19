import { Router } from "express";
import { asyncHandler, HttpError } from "../lib/http.js";
import { createId, mutateDatabase, nowIso, readDatabase } from "../lib/store.js";
import { interactionCreateSchema, interactionListQuerySchema, interactionUpdateSchema } from "../lib/validators.js";

export const interactionsRouter = Router();

interactionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { q, limit = 20, page = 1, postId, authorId, type } = interactionListQuerySchema.parse(req.query);
    const needle = q?.toLowerCase();

    const db = await readDatabase();
    const filtered = db.interactions
      .filter((interaction) => {
        if (postId && interaction.postId !== postId) {
          return false;
        }

        if (authorId && interaction.authorId !== authorId) {
          return false;
        }

        if (type && interaction.type !== type) {
          return false;
        }

        if (!needle) {
          return true;
        }

        const authorName =
          db.profiles.find((profile) => profile.id === interaction.authorId)?.displayName ?? "";
        const postContent = db.posts.find((post) => post.id === interaction.postId)?.content ?? "";

        return [interaction.content ?? "", authorName, postContent]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit).map((interaction) => {
      const actor = db.profiles.find((profile) => profile.id === interaction.authorId);
      const post = db.posts.find((item) => item.id === interaction.postId);

      return {
        ...interaction,
        author: actor
          ? {
              id: actor.id,
              username: actor.username,
              displayName: actor.displayName,
              avatarUrl: actor.avatarUrl
            }
          : undefined,
        post: post
          ? {
              id: post.id,
              content: post.content
            }
          : undefined
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

interactionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = interactionCreateSchema.parse(req.body);

    const created = await mutateDatabase((db) => {
      const actor = db.profiles.find((profile) => profile.id === payload.authorId);
      const post = db.posts.find((item) => item.id === payload.postId);

      if (!actor) {
        throw new HttpError(404, "Interaction author not found");
      }

      if (!post) {
        throw new HttpError(404, "Target post not found");
      }

      const timestamp = nowIso();
      const interaction = {
        id: createId(),
        postId: payload.postId,
        authorId: payload.authorId,
        type: payload.type,
        content: payload.type === "COMMENT" ? payload.content : undefined,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      db.interactions.push(interaction);

      return {
        ...interaction,
        author: {
          id: actor.id,
          username: actor.username,
          displayName: actor.displayName,
          avatarUrl: actor.avatarUrl
        },
        post: {
          id: post.id,
          content: post.content
        }
      };
    });

    res.status(201).json({ data: created });
  })
);

interactionsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const payload = interactionUpdateSchema.parse(req.body);

    const updated = await mutateDatabase((db) => {
      const index = db.interactions.findIndex((interaction) => interaction.id === req.params.id);

      if (index === -1) {
        throw new HttpError(404, "Interaction not found");
      }

      const existing = db.interactions[index];
      const nextType = payload.type ?? existing.type;
      const nextContent = payload.content ?? existing.content;

      if (nextType === "COMMENT" && !nextContent) {
        throw new HttpError(400, "Comment interactions require content");
      }

      const interaction = {
        ...existing,
        ...payload,
        type: nextType,
        content: nextType === "COMMENT" ? nextContent : undefined,
        updatedAt: nowIso()
      };

      db.interactions[index] = interaction;

      const actor = db.profiles.find((profile) => profile.id === interaction.authorId);
      const post = db.posts.find((item) => item.id === interaction.postId);

      return {
        ...interaction,
        author: actor
          ? {
              id: actor.id,
              username: actor.username,
              displayName: actor.displayName,
              avatarUrl: actor.avatarUrl
            }
          : undefined,
        post: post
          ? {
              id: post.id,
              content: post.content
            }
          : undefined
      };
    });

    res.json({ data: updated });
  })
);

interactionsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await mutateDatabase((db) => {
      const exists = db.interactions.some((interaction) => interaction.id === req.params.id);

      if (!exists) {
        throw new HttpError(404, "Interaction not found");
      }

      db.interactions = db.interactions.filter((interaction) => interaction.id !== req.params.id);
    });

    res.status(204).send();
  })
);

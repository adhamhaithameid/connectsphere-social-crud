import { Router } from "express";
import { asyncHandler, HttpError } from "../lib/http.js";
import { createId, mutateDatabase, nowIso, readDatabase } from "../lib/store.js";
import { listQuerySchema, profileCreateSchema, profileUpdateSchema } from "../lib/validators.js";

export const profilesRouter = Router();

profilesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { q, limit = 20, page = 1 } = listQuerySchema.parse(req.query);
    const needle = q?.toLowerCase();

    const db = await readDatabase();
    const filtered = db.profiles
      .filter((profile) => {
        if (!needle) {
          return true;
        }

        return [profile.username, profile.displayName, profile.bio ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit).map((profile) => ({
      ...profile,
      _count: {
        posts: db.posts.filter((post) => post.authorId === profile.id).length,
        interactions: db.interactions.filter((interaction) => interaction.authorId === profile.id).length
      }
    }));

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

profilesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = await readDatabase();
    const profile = db.profiles.find((item) => item.id === req.params.id);

    if (!profile) {
      throw new HttpError(404, "Profile not found");
    }

    const profilePosts = db.posts
      .filter((post) => post.authorId === profile.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3)
      .map((post) => ({
        id: post.id,
        content: post.content,
        visibility: post.visibility,
        createdAt: post.createdAt
      }));

    res.json({
      data: {
        ...profile,
        _count: {
          posts: db.posts.filter((post) => post.authorId === profile.id).length,
          interactions: db.interactions.filter((interaction) => interaction.authorId === profile.id).length
        },
        posts: profilePosts
      }
    });
  })
);

profilesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = profileCreateSchema.parse(req.body);

    const created = await mutateDatabase((db) => {
      const exists = db.profiles.some(
        (profile) => profile.username.toLowerCase() === payload.username.toLowerCase()
      );

      if (exists) {
        throw new HttpError(409, "Username already exists");
      }

      const timestamp = nowIso();
      const profile = {
        id: createId(),
        ...payload,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      db.profiles.push(profile);
      return profile;
    });

    res.status(201).json({ data: created });
  })
);

profilesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const payload = profileUpdateSchema.parse(req.body);

    const updated = await mutateDatabase((db) => {
      const index = db.profiles.findIndex((profile) => profile.id === req.params.id);

      if (index === -1) {
        throw new HttpError(404, "Profile not found");
      }

      const existingProfile = db.profiles[index];
      const nextUsername = payload.username ?? existingProfile.username;

      const usernameConflict = db.profiles.some(
        (profile) =>
          profile.id !== existingProfile.id &&
          profile.username.toLowerCase() === nextUsername.toLowerCase()
      );

      if (usernameConflict) {
        throw new HttpError(409, "Username already exists");
      }

      const profile = {
        ...existingProfile,
        ...payload,
        updatedAt: nowIso()
      };

      db.profiles[index] = profile;
      return profile;
    });

    res.json({ data: updated });
  })
);

profilesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await mutateDatabase((db) => {
      const hasProfile = db.profiles.some((profile) => profile.id === req.params.id);

      if (!hasProfile) {
        throw new HttpError(404, "Profile not found");
      }

      const deletedPostIds = new Set(
        db.posts.filter((post) => post.authorId === req.params.id).map((post) => post.id)
      );

      db.profiles = db.profiles.filter((profile) => profile.id !== req.params.id);
      db.posts = db.posts.filter((post) => post.authorId !== req.params.id);
      db.interactions = db.interactions.filter(
        (interaction) =>
          interaction.authorId !== req.params.id &&
          !deletedPostIds.has(interaction.postId)
      );
    });

    res.status(204).send();
  })
);

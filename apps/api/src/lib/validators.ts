import { z } from "zod";
import { interactionTypeValues, visibilityValues } from "./models.js";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional()
});

export const profileCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9._]+$/, "Username can only include letters, numbers, dot, and underscore"),
  displayName: z.string().trim().min(2).max(60),
  bio: optionalTrimmedString(240),
  avatarUrl: z.string().trim().url().optional(),
  location: optionalTrimmedString(80)
});

export const profileUpdateSchema = profileCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required"
});

export const postCreateSchema = z.object({
  authorId: z.string().uuid(),
  content: z.string().trim().min(1).max(500),
  imageUrl: z.string().trim().url().optional(),
  visibility: z.enum(visibilityValues).optional()
});

export const postUpdateSchema = postCreateSchema
  .omit({ authorId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export const postListQuerySchema = listQuerySchema.extend({
  authorId: z.string().uuid().optional(),
  visibility: z.enum(visibilityValues).optional()
});

export const interactionCreateSchema = z
  .object({
    postId: z.string().uuid(),
    authorId: z.string().uuid(),
    type: z.enum(interactionTypeValues),
    content: optionalTrimmedString(400)
  })
  .superRefine((value, ctx) => {
    if (value.type === "COMMENT" && !value.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Content is required when type is COMMENT"
      });
    }

    if (value.type !== "COMMENT" && value.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Content is only allowed for COMMENT interactions"
      });
    }
  });

export const interactionUpdateSchema = z
  .object({
    type: z.enum(interactionTypeValues).optional(),
    content: optionalTrimmedString(400)
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  })
  .superRefine((value, ctx) => {
    if (value.type === "COMMENT" && value.content === undefined) {
      return;
    }

    if (value.type && value.type !== "COMMENT" && value.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Only COMMENT interactions can include content"
      });
    }
  });

export const interactionListQuerySchema = listQuerySchema.extend({
  postId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  type: z.enum(interactionTypeValues).optional()
});

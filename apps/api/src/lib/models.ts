export const visibilityValues = ["PUBLIC", "FRIENDS", "PRIVATE"] as const;
export type Visibility = (typeof visibilityValues)[number];

export const interactionTypeValues = ["LIKE", "COMMENT", "SHARE"] as const;
export type InteractionType = (typeof interactionTypeValues)[number];

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  type: InteractionType;
  postId: string;
  authorId: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseState {
  profiles: Profile[];
  posts: Post[];
  interactions: Interaction[];
}

export const defaultDatabaseState: DatabaseState = {
  profiles: [],
  posts: [],
  interactions: []
};

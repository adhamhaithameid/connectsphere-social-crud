export type Visibility = "PUBLIC" | "FRIENDS" | "PRIVATE";

export type InteractionType = "LIKE" | "COMMENT" | "SHARE";

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    posts: number;
    interactions: number;
  };
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  imageUrl?: string | null;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  _count?: {
    interactions: number;
  };
}

export interface Interaction {
  id: string;
  postId: string;
  authorId: string;
  type: InteractionType;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  post?: {
    id: string;
    content: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
  };
}

export interface SingleResponse<T> {
  data: T;
}

export interface FeedOverview {
  totals: {
    profiles: number;
    posts: number;
    interactions: number;
  };
  interactionBreakdown: {
    LIKE: number;
    COMMENT: number;
    SHARE: number;
  };
  recentPosts: Post[];
}

export interface FeedOverviewResponse {
  data: FeedOverview;
}

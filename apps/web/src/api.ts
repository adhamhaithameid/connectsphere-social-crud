import axios from "axios";
import type {
  FeedOverviewResponse,
  Interaction,
  InteractionType,
  PaginatedResponse,
  Post,
  Profile,
  Visibility
} from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
  headers: {
    "Content-Type": "application/json"
  }
});

export interface ProfileInput {
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
}

export interface PostInput {
  authorId: string;
  content: string;
  imageUrl?: string;
  visibility: Visibility;
}

export interface PostUpdateInput {
  content?: string;
  imageUrl?: string;
  visibility?: Visibility;
}

export type FeedSortMode = "recent" | "popular";

export interface InteractionInput {
  postId: string;
  authorId: string;
  type: InteractionType;
  content?: string;
}

export interface InteractionUpdateInput {
  type?: InteractionType;
  content?: string;
}

export const client = {
  async getOverview() {
    const { data } = await api.get<FeedOverviewResponse>("/api/feed/overview");
    return data.data;
  },

  async listProfiles(q?: string) {
    const { data } = await api.get<PaginatedResponse<Profile>>("/api/profiles", {
      params: { q, limit: 50 }
    });
    return data.data;
  },

  async createProfile(payload: ProfileInput) {
    const { data } = await api.post<{ data: Profile }>("/api/profiles", payload);
    return data.data;
  },

  async updateProfile(id: string, payload: Partial<ProfileInput>) {
    const { data } = await api.patch<{ data: Profile }>(`/api/profiles/${id}`, payload);
    return data.data;
  },

  async deleteProfile(id: string) {
    await api.delete(`/api/profiles/${id}`);
  },

  async listPosts(q?: string, sort: FeedSortMode = "recent") {
    const { data } = await api.get<PaginatedResponse<Post>>("/api/posts", {
      params: { q, sort, limit: 50 }
    });
    return data.data;
  },

  async createPost(payload: PostInput) {
    const { data } = await api.post<{ data: Post }>("/api/posts", payload);
    return data.data;
  },

  async updatePost(id: string, payload: PostUpdateInput) {
    const { data } = await api.patch<{ data: Post }>(`/api/posts/${id}`, payload);
    return data.data;
  },

  async deletePost(id: string) {
    await api.delete(`/api/posts/${id}`);
  },

  async listInteractions(q?: string) {
    const { data } = await api.get<PaginatedResponse<Interaction>>("/api/interactions", {
      params: { q, limit: 50 }
    });
    return data.data;
  },

  async createInteraction(payload: InteractionInput) {
    const normalizedPayload = {
      ...payload,
      content: payload.type === "COMMENT" ? payload.content : undefined
    };

    const { data } = await api.post<{ data: Interaction }>("/api/interactions", normalizedPayload);
    return data.data;
  },

  async updateInteraction(id: string, payload: InteractionUpdateInput) {
    const { data } = await api.patch<{ data: Interaction }>(`/api/interactions/${id}`, payload);
    return data.data;
  },

  async deleteInteraction(id: string) {
    await api.delete(`/api/interactions/${id}`);
  }
};

export function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Something went wrong. Please try again.";
  }

  return error.response?.data?.error ?? error.message;
}

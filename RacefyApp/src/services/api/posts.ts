import { getImageMimeType, getMediaMimeType, getFilename } from '../../utils/mime';
import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function PostsMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class PostsMixin extends Base {
    // ============ FEED & POSTS ============

    async getFeed(page = 1): Promise<Types.PaginatedResponse<Types.Post>> {
      return this.request(`/feed?page=${page}`);
    }

    async getPosts(params?: {
      user_id?: number;
      page?: number;
    }): Promise<Types.PaginatedResponse<Types.Post>> {
      const query = new URLSearchParams();
      if (params?.user_id) query.append('user_id', String(params.user_id));
      if (params?.page) query.append('page', String(params.page));
      return this.request(`/posts?${query}`);
    }

    async getPost(id: number): Promise<Types.Post> {
      const response =
        await this.request<Types.ApiResponse<Types.Post>>(`/posts/${id}`);
      return response.data;
    }

    async createPost(data: Types.CreatePostRequest): Promise<Types.Post> {
      const response = await this.request<Types.ApiResponse<Types.Post>>(
        '/posts',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    }

    async updatePost(
      id: number,
      data: Partial<Types.CreatePostRequest>
    ): Promise<Types.Post> {
      const response = await this.request<Types.ApiResponse<Types.Post>>(
        `/posts/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    }

    async deletePost(id: number): Promise<void> {
      await this.request(`/posts/${id}`, { method: 'DELETE' });
    }

    async reportPost(id: number, reason: string): Promise<void> {
      await this.request(`/posts/${id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
    }

    async likePost(id: number): Promise<void> {
      await this.request(`/posts/${id}/like`, { method: 'POST' });
    }

    async unlikePost(id: number): Promise<void> {
      await this.request(`/posts/${id}/like`, { method: 'DELETE' });
    }

    // ============ DRAFTS ============

    async getDrafts(params?: {
      page?: number;
      per_page?: number;
    }): Promise<Types.DraftsResponse> {
      const query = new URLSearchParams();
      if (params?.page) query.append('page', String(params.page));
      if (params?.per_page) query.append('per_page', String(params.per_page));
      const queryString = query.toString();
      return this.request(`/posts/drafts${queryString ? `?${queryString}` : ''}`);
    }

    async publishDraft(postId: number): Promise<Types.Post> {
      return this.updatePost(postId, { status: 'published' });
    }

    async deleteDraft(postId: number): Promise<void> {
      return this.deletePost(postId);
    }

    // ============ COMMENTS ============

    async getComments(postId: number): Promise<Types.Comment[]> {
      const response = await this.request<Types.ApiResponse<Types.Comment[]>>(
        `/posts/${postId}/comments`
      );
      return response.data;
    }

    async createComment(
      postId: number,
      data: Types.CreateCommentRequest
    ): Promise<Types.Comment> {
      // Use FormData if photo is included
      if (data.photo) {
        const formData = new FormData();
        formData.append('content', data.content);
        if (data.parent_id) {
          formData.append('parent_id', String(data.parent_id));
        }

        const filename = getFilename(data.photo.uri, 'photo.jpg');
        formData.append('photo', {
          uri: data.photo.uri,
          name: filename,
          type: getImageMimeType(data.photo.uri),
        } as any);

        const result = await this.request<Types.ApiResponse<Types.Comment>>(
          `/posts/${postId}/comments`,
          { method: 'POST', body: formData }
        );
        return result.data;
      }

      const response = await this.request<Types.ApiResponse<Types.Comment>>(
        `/posts/${postId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    }

    async deleteComment(id: number): Promise<void> {
      await this.request(`/comments/${id}`, { method: 'DELETE' });
    }

    async likeComment(id: number): Promise<void> {
      await this.request(`/comments/${id}/like`, { method: 'POST' });
    }

    async unlikeComment(id: number): Promise<void> {
      await this.request(`/comments/${id}/like`, { method: 'DELETE' });
    }

    async updateComment(
      id: number,
      content: string,
      photo?: Types.MediaItem
    ): Promise<Types.Comment> {
      // Use FormData if photo is included (replaces existing photos)
      if (photo) {
        const formData = new FormData();
        formData.append('content', content);

        const filename = getFilename(photo.uri, 'photo.jpg');
        formData.append('photo', {
          uri: photo.uri,
          name: filename,
          type: getImageMimeType(photo.uri),
        } as any);

        const result = await this.request<Types.ApiResponse<Types.Comment>>(
          `/comments/${id}`,
          { method: 'PUT', body: formData }
        );
        return result.data;
      }

      const response = await this.request<Types.ApiResponse<Types.Comment>>(
        `/comments/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ content }),
        }
      );
      return response.data;
    }

    async addCommentPhoto(commentId: number, photo: Types.MediaItem): Promise<Types.Photo> {
      const formData = new FormData();
      const filename = getFilename(photo.uri, 'photo.jpg');
      formData.append('photo', {
        uri: photo.uri,
        name: filename,
        type: getImageMimeType(photo.uri),
      } as any);

      const result = await this.request<Types.ApiResponse<Types.Photo>>(
        `/comments/${commentId}/photos`,
        { method: 'POST', body: formData }
      );
      return result.data;
    }

    async deleteCommentPhoto(commentId: number, photoId: number): Promise<void> {
      await this.request(`/comments/${commentId}/photos/${photoId}`, { method: 'DELETE' });
    }

    // ============ PHOTOS ============

    async uploadPostPhoto(postId: number, formData: FormData): Promise<Types.Photo> {
      const result = await this.request<Types.ApiResponse<Types.Photo>>(
        `/posts/${postId}/photos`,
        { method: 'POST', body: formData }
      );
      return result.data;
    }

    async uploadPostMedia(postId: number, mediaItem: Types.MediaItem): Promise<Types.Media> {
      const formData = new FormData();
      const filename = getFilename(mediaItem.uri, 'file');
      const fieldName = mediaItem.type === 'video' ? 'video' : 'photo';
      formData.append(fieldName, {
        uri: mediaItem.uri,
        name: filename,
        type: getMediaMimeType(mediaItem.uri, mediaItem.type === 'video' ? 'video' : 'image'),
      } as any);

      if (mediaItem.duration) {
        formData.append('duration', String(mediaItem.duration));
      }

      // Use separate endpoints for photos and videos
      const mediaEndpoint = mediaItem.type === 'video' ? 'videos' : 'photos';
      const result = await this.request<Types.ApiResponse<Types.Media>>(
        `/posts/${postId}/${mediaEndpoint}`,
        { method: 'POST', body: formData }
      );
      return result.data;
    }

    async deletePhoto(id: number): Promise<void> {
      await this.request(`/photos/${id}`, { method: 'DELETE' });
    }

    async deleteVideo(id: number): Promise<void> {
      await this.request(`/videos/${id}`, { method: 'DELETE' });
    }

    async deletePostMedia(mediaId: number, mediaType: 'image' | 'video'): Promise<void> {
      const endpoint = mediaType === 'video' ? 'videos' : 'photos';
      await this.request(`/${endpoint}/${mediaId}`, { method: 'DELETE' });
    }

    // ============ SOCIAL SHARING ============

    /**
     * Get shareable link for a post
     * Generates a secure share token and returns platform-specific share URLs
     */
    async getPostShareLink(id: number): Promise<Types.ShareLinkResponse> {
      const response = await this.request<Types.ApiResponse<Types.ShareLinkResponse>>(
        `/posts/${id}/share-link`
      );
      return response.data;
    }

    /**
     * Get shareable link for a comment
     * Note: This endpoint may need to be added to the backend API
     */
    async getCommentShareLink(id: number): Promise<Types.ShareLinkResponse> {
      const response = await this.request<Types.ApiResponse<Types.ShareLinkResponse>>(
        `/comments/${id}/share-link`
      );
      return response.data;
    }
  };
}

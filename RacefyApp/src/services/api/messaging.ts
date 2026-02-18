import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export function MessagingMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class MessagingMixin extends Base {
    // ============ MESSAGING ============

    async getConversations(
      page = 1
    ): Promise<Types.PaginatedResponse<Types.Conversation>> {
      return this.request(`/conversations?page=${page}`);
    }

    async startConversation(
      userId: number
    ): Promise<Types.ApiResponse<Types.Conversation>> {
      return this.request('/conversations', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    }

    async getConversation(id: number): Promise<Types.Conversation> {
      const response = await this.request<Types.ApiResponse<Types.Conversation>>(
        `/conversations/${id}`
      );
      return response.data;
    }

    async deleteConversation(id: number): Promise<void> {
      await this.request(`/conversations/${id}`, { method: 'DELETE' });
    }

    async getMessages(
      conversationId: number,
      page = 1
    ): Promise<Types.PaginatedResponse<Types.Message>> {
      return this.request(`/conversations/${conversationId}/messages?page=${page}`);
    }

    async sendMessage(
      conversationId: number,
      content: string
    ): Promise<Types.ApiResponse<Types.Message>> {
      return this.request(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, type: 'text' }),
      });
    }

    async markConversationAsRead(conversationId: number): Promise<void> {
      await this.request(`/conversations/${conversationId}/read`, {
        method: 'POST',
      });
    }

    async getUnreadCount(): Promise<number> {
      const response = await this.request<{ unread_count: number }>(
        '/conversations/unread-count'
      );
      return response.unread_count;
    }

    // ============ DEBUG LOGS ============

    /**
     * Send debug logs to server for analysis
     * Used during development to help diagnose issues
     */
    async sendDebugLogs(
      payload: Types.DebugLogsRequest
    ): Promise<Types.DebugLogsResponse> {
      const response = await this.request<Types.DebugLogsResponse>(
        '/debug/logs',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      return response;
    }

    // ============ NOTIFICATIONS ============

    /**
     * Get paginated notifications
     */
    async getNotifications(
      page: number = 1,
      perPage: number = 20
    ): Promise<Types.NotificationListResponse> {
      return await this.request<Types.NotificationListResponse>(
        `/notifications?per_page=${perPage}&page=${page}`
      );
    }

    /**
     * Get unread notification count
     */
    async getUnreadNotificationCount(): Promise<Types.UnreadCountResponse> {
      return await this.request<Types.UnreadCountResponse>(
        '/notifications/unread-count'
      );
    }

    /**
     * Mark a notification as read
     */
    async markNotificationAsRead(
      notificationId: string
    ): Promise<Types.MarkAsReadResponse> {
      return await this.request<Types.MarkAsReadResponse>(
        `/notifications/${notificationId}/read`,
        { method: 'POST' }
      );
    }

    /**
     * Mark all notifications as read
     */
    async markAllNotificationsAsRead(): Promise<Types.MarkAllAsReadResponse> {
      return await this.request<Types.MarkAllAsReadResponse>(
        '/notifications/read-all',
        { method: 'POST' }
      );
    }

    // ============ DEVICE REGISTRATION (Push Notifications) ============

    /**
     * Register device for push notifications
     * @param fcmToken - Push token (Expo or FCM)
     * @param deviceType - 'ios' or 'android'
     */
    async registerDevice(
      fcmToken: string,
      deviceType: Types.DeviceType
    ): Promise<Types.DeviceRegistrationResponse> {
      return this.request<Types.DeviceRegistrationResponse>('/device/register', {
        method: 'POST',
        body: JSON.stringify({
          fcm_token: fcmToken,
          device_type: deviceType,
        }),
      });
    }

    /**
     * Unregister device from push notifications
     * Called on logout to remove the device token
     */
    async unregisterDevice(): Promise<Types.DeviceUnregisterResponse> {
      return this.request<Types.DeviceUnregisterResponse>('/device/unregister', {
        method: 'POST',
      });
    }
  };
}

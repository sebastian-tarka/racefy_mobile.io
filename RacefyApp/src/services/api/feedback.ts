import { Platform, Dimensions, PixelRatio, NativeModules } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import type * as Types from '../../types/api';
import type { ApiBase } from './base';

type Constructable<T = object> = new (...args: any[]) => T;

export async function collectDeviceInfo(): Promise<{
  platform: 'ios' | 'android';
  app_version: string;
  os_version: string;
  device_model: string;
  device_info: Types.DeviceInfoPayload;
}> {
  const { width, height } = Dimensions.get('window');

  // Get locale from platform
  const locale =
    Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale || 'en_US'
      : NativeModules.I18nManager?.localeIdentifier || 'en_US';

  return {
    platform: Platform.OS as 'ios' | 'android',
    app_version: Application.nativeApplicationVersion || '0.0.0',
    os_version: Device.osVersion || '0',
    device_model: Device.modelName || 'Unknown',
    device_info: {
      screen_width: width,
      screen_height: height,
      pixel_ratio: PixelRatio.get(),
      locale,
      is_tablet: Device.deviceType === Device.DeviceType.TABLET,
    },
  };
}

export function FeedbackMixin<TBase extends Constructable<ApiBase>>(Base: TBase) {
  return class FeedbackMixin extends Base {
    // ============ FEEDBACK ============

    async getFeedbacks(params?: {
      page?: number;
      per_page?: number;
      status?: Types.FeedbackStatus;
      type?: Types.FeedbackType;
    }): Promise<Types.PaginatedResponse<Types.Feedback>> {
      const query = new URLSearchParams();
      if (params?.page) query.append('page', String(params.page));
      if (params?.per_page) query.append('per_page', String(params.per_page));
      if (params?.status) query.append('status', params.status);
      if (params?.type) query.append('type', params.type);
      return this.request(`/feedback?${query}`);
    }

    async getFeedback(id: number): Promise<Types.Feedback> {
      const response = await this.request<Types.ApiResponse<Types.Feedback>>(`/feedback/${id}`);
      return response.data;
    }

    async createFeedback(data: {
      type: Types.FeedbackType;
      subject: string;
      description: string;
      priority?: Types.FeedbackPriority;
      platform: 'ios' | 'android';
      app_version: string;
      os_version: string;
      device_model: string;
      device_info?: Types.DeviceInfoPayload;
      url?: string;
      attachments?: { uri: string; name: string; type: string }[];
    }): Promise<Types.Feedback> {
      const formData = new FormData();
      formData.append('type', data.type);
      formData.append('subject', data.subject);
      formData.append('description', data.description);
      if (data.priority) formData.append('priority', data.priority);
      formData.append('platform', data.platform);
      formData.append('app_version', data.app_version);
      formData.append('os_version', data.os_version);
      formData.append('device_model', data.device_model);
      if (data.device_info) {
        for (const [key, value] of Object.entries(data.device_info)) {
          if (value !== undefined && value !== null) {
            formData.append(`device_info[${key}]`, String(value));
          }
        }
      }
      if (data.url) formData.append('url', data.url);

      if (data.attachments) {
        for (const attachment of data.attachments) {
          formData.append('attachments[]', {
            uri: attachment.uri,
            name: attachment.name,
            type: attachment.type,
          } as any);
        }
      }

      const response = await this.request<Types.ApiResponse<Types.Feedback>>('/feedback', {
        method: 'POST',
        body: formData,
      });
      return response.data;
    }

    async replyToFeedback(
      feedbackId: number,
      data: {
        body: string;
        attachments?: { uri: string; name: string; type: string }[];
      }
    ): Promise<Types.FeedbackReply> {
      const formData = new FormData();
      formData.append('body', data.body);

      if (data.attachments) {
        for (const attachment of data.attachments) {
          formData.append('attachments[]', {
            uri: attachment.uri,
            name: attachment.name,
            type: attachment.type,
          } as any);
        }
      }

      const response = await this.request<Types.ApiResponse<Types.FeedbackReply>>(
        `/feedback/${feedbackId}/replies`,
        { method: 'POST', body: formData }
      );
      return response.data;
    }
  };
}

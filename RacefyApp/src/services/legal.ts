import { Platform } from 'react-native';
import { api } from './api';
import type {
  CurrentDocumentsResponse,
  LanguagesResponse,
  SubmitConsentRequest,
  ConsentStatusResponse,
  UserConsentsResponse,
} from '../types/legal';

// Get current documents for consent modal (auth required)
export const getCurrentDocuments = async (
  language?: string
): Promise<CurrentDocumentsResponse> => {
  const params = language ? `?lang=${language}` : '';
  return api.request<CurrentDocumentsResponse>(
    `/legal/documents/current${params}`
  );
};

// Get public documents (for legal pages, no auth needed)
export const getPublicDocuments = async (
  language?: string
): Promise<CurrentDocumentsResponse> => {
  const params = language ? `?lang=${language}` : '';
  return api.request<CurrentDocumentsResponse>(
    `/legal/documents/public${params}`
  );
};

// Get supported languages
export const getAvailableLanguages = async (): Promise<LanguagesResponse> => {
  return api.request<LanguagesResponse>('/legal/languages');
};

// Submit consent form
export const submitConsent = async (
  consents: SubmitConsentRequest
): Promise<void> => {
  await api.request('/legal/consent', {
    method: 'POST',
    body: JSON.stringify(consents),
    headers: {
      'X-Consent-Source': Platform.OS,
    },
  });
};

// Check if user has accepted all required consents
export const getConsentStatus = async (): Promise<ConsentStatusResponse> => {
  return api.request<ConsentStatusResponse>('/user/consents/status');
};

// Get user's consent history (for Settings screen)
export const getUserConsents = async (): Promise<UserConsentsResponse> => {
  return api.request<UserConsentsResponse>('/user/consents');
};

// Toggle optional consent (marketing, cookies)
export const updateOptionalConsent = async (
  versionId: number,
  accepted: boolean
): Promise<void> => {
  await api.request(`/user/consents/${versionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ accepted }),
  });
};

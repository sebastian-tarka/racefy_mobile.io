// Legal document types available in the system
export type LegalDocumentType = 'terms' | 'privacy' | 'marketing' | 'cookies';

// Single legal document with its current version
export interface LegalDocument {
  id: number;
  type: LegalDocumentType;
  is_required: boolean;
  version: string;
  version_id: number;
  language: string;
  content: string;
  published_at: string;
}

// Response from GET /legal/documents/current
export interface CurrentDocumentsResponse {
  documents: LegalDocument[];
}

// Response from GET /legal/languages
export interface LanguagesResponse {
  supported: string[];
  fallback: {
    [key: string]: string[];
  };
}

// Request body for POST /legal/consent
export interface SubmitConsentRequest {
  consents: {
    [versionId: string]: boolean;
  };
}

// Response from GET /user/consents/status
export interface ConsentStatusResponse {
  accepted: boolean;
}

// Single consent entry from user's history
export interface UserConsent {
  type: LegalDocumentType;
  is_required: boolean;
  version: string;
  language: string;
  version_id: number;
  accepted: boolean;
  accepted_at: string | null;
}

// Response from GET /user/consents
export interface UserConsentsResponse {
  consents: UserConsent[];
}

// Request body for PATCH /user/consents/{versionId}
export interface UpdateConsentRequest {
  accepted: boolean;
}

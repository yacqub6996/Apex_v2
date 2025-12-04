import { OpenAPI } from '@/api/core/OpenAPI';
import { request as __request } from '@/api/core/request';

export const EmailVerificationService = {
  requestVerification(): Promise<void> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/v1/request-email-verification',
    }).then(() => undefined);
  },
  verifyEmail(token: string): Promise<void> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/v1/verify-email',
      body: { token },
      mediaType: 'application/json',
    }).then(() => undefined);
  },
};

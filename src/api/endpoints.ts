import { http } from './client';
import type {
  AuthResult,
  Bank,
  ConsentBody,
  DeliveriesView,
  Delivery,
  Job,
  KycStatus,
  KycVerification,
  KycVerifyBody,
  Onboarding,
  OtpRequested,
  Page,
  Payout,
  PayoutAccount,
  PayoutAccountBody,
  RequestOtpBody,
  RiderLocationBody,
  RiderProfile,
  RiderSummary,
  SetPinBody,
  Statement,
  UpdateProfileBody,
  UpdateRiderBody,
  User,
  VerifyOtpBody,
  WalletSummary,
} from './types';

const pub = { auth: false } as const;

export const authApi = {
  requestOtp: (body: RequestOtpBody) => http.post<OtpRequested>('/auth/otp/request', body, pub),
  verifyOtp: (body: VerifyOtpBody) => http.post<AuthResult>('/auth/otp/verify', body, pub),
  me: () => http.get<User>('/auth/me'),
  updateProfile: (body: UpdateProfileBody) => http.put<User>('/users/profile/update', body),
  onboarding: () => http.get<Onboarding>('/auth/me/onboarding', { query: { role: 'rider' } }),
  completeStep: (step: string) => http.post<void>(`/auth/me/onboarding/${step}`),
  logout: () => http.post<void>('/auth/logout'),
  logoutAll: () => http.post<void>('/auth/logout-all'),
  registerPushToken: (body: { deviceId: string; platform: string; pushToken: string }) =>
    http.put<void>('/auth/devices/push-token', body),
};

export const riderApi = {
  me: () => http.get<RiderProfile>('/riders/me'),
  update: (body: UpdateRiderBody) => http.patch<RiderProfile>('/riders/me', body),
  summary: () => http.get<RiderSummary>('/riders/me/summary'),
  /** Going online needs a position; the server finds jobs around it. */
  setOnline: (online: boolean, at?: { lat: number; lng: number }) =>
    http.put<RiderProfile>('/riders/me/status', { online, ...at }),
  location: (body: RiderLocationBody) =>
    http.post<{ ok: boolean; streamedTo: number }>('/riders/me/location', body, { timeoutMs: 10_000 }),
  jobs: () => http.get<Job[]>('/riders/me/jobs'),
  claim: (orderId: string) => http.post<unknown>(`/riders/me/jobs/${orderId}/claim`),
  deliveries: (view: DeliveriesView, page = 1) =>
    http.get<Page<Delivery>>('/riders/me/deliveries', { query: { view, page, limit: 30 } }),
};

export const deliveryApi = {
  /** Collected the food from the kitchen. */
  pickedUp: (id: string) => http.patch<unknown>(`/orders/${id}/pickup`),
  /** Trust-Lock: the customer's 4-digit code releases payment. */
  confirm: (id: string, pin: string) => http.patch<unknown>(`/orders/${id}/deliver-verify-pin`, { pin }),
  /** Short-lived QR the customer scans with their phone camera (opens the web confirm page). */
  qr: (id: string) =>
    http.post<{ token: string; expiresAt: string; deepLink: string }>(`/orders/${id}/delivery-qr`),
};

export const walletApi = {
  summary: () => http.get<WalletSummary>('/wallet'),
  statement: (before?: string) =>
    http.get<Statement>('/wallet/statement', { query: { before, limit: 20 } }),
  banks: () => http.get<Bank[]>('/wallet/banks'),
  setPayoutAccount: (body: PayoutAccountBody) => http.put<PayoutAccount>('/wallet/payout-account', body),
  setPin: (body: SetPinBody) => http.put<void>('/wallet/pin', body),
  payouts: () => http.get<Payout[]>('/wallet/payouts'),
  withdraw: (amountKobo: number, pin: string, idempotencyKey: string) =>
    http.post<{ reference: string; amountKobo: number; status: string }>(
      '/wallet/payouts',
      { amountKobo, pin },
      { idempotencyKey, timeoutMs: 30_000 },
    ),
};

export const kycApi = {
  status: () => http.get<KycStatus>('/kyc/status'),
  consent: (body: ConsentBody) => http.post<unknown>('/kyc/consents', body),
  verify: (body: KycVerifyBody) =>
    http.post<KycVerification>('/kyc/verifications', body, { timeoutMs: 60_000 }),
};

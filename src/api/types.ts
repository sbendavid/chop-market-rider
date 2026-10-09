/**
 * Request types are generated from the backend's OpenAPI spec (schema.d.ts,
 * built from the same Zod schemas the server validates with). Regenerate with
 * `npm run gen:api` after backend changes.
 *
 * The spec does not describe response bodies yet, so the models below mirror
 * the backend services (chopbase-server/src/...) by hand. Money is integer kobo.
 */
import type { paths } from './schema';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type Op<P extends keyof paths, M extends Method> = NonNullable<paths[P][M]>;

export type BodyOf<P extends keyof paths, M extends Method> =
  Op<P, M> extends { requestBody: { content: { 'application/json': infer B } } } ? B : never;

export type QueryOf<P extends keyof paths, M extends Method> =
  Op<P, M> extends { parameters: { query?: infer Q } } ? NonNullable<Q> : never;

// ---------------------------------------------------------------- requests

export type RequestOtpBody = BodyOf<'/auth/otp/request', 'post'>;
export type VerifyOtpBody = BodyOf<'/auth/otp/verify', 'post'>;
export type UpdateProfileBody = BodyOf<'/users/profile/update', 'put'>;
export type UpdateRiderBody = BodyOf<'/riders/me', 'patch'>;
export type RiderLocationBody = BodyOf<'/riders/me/location', 'post'>;
export type DeliveriesView = NonNullable<QueryOf<'/riders/me/deliveries', 'get'>['view']>;
export type KycVerifyBody = BodyOf<'/kyc/verifications', 'post'>;
export type ConsentBody = BodyOf<'/kyc/consents', 'post'>;
export type PayoutAccountBody = BodyOf<'/wallet/payout-account', 'put'>;
export type SetPinBody = BodyOf<'/wallet/pin', 'put'>;

// ---------------------------------------------------------------- envelopes

export type Envelope<T> = { message: string; data: T };
export type Page<T> = { data: T[]; total: number; page: number; limit: number };

// ---------------------------------------------------------------- auth & onboarding

export type User = {
  _id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  role: string;
  roles: string[];
  kycLevel: number;
  status: string;
};

export type Tokens = { accessToken: string; refreshToken: string; accessTokenExpiresIn: string };
export type OtpRequested = { expiresIn: number; resendIn: number; devCode?: string };
export type AuthResult = Tokens & { isNewUser?: boolean; user: User };

export type OnboardingStep = {
  key: string;
  label: string;
  required: boolean;
  auto?: boolean;
  done: boolean;
};
export type Onboarding = { role: string; steps: OnboardingStep[]; complete: boolean };

// ---------------------------------------------------------------- rider

export type VehicleType = NonNullable<UpdateRiderBody['vehicleType']>;

export type OrderStatus =
  | 'awaiting_payment'
  | 'pending_vendor'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'ready_for_pickup'
  | 'rider_assigned'
  | 'picked_up'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type DeliveryMode = 'standard' | 'economy' | 'pickup';

/** GET /riders/me */
export type RiderProfile = {
  _id: string;
  vehicleType: VehicleType;
  plateNumber?: string;
  isOnline: boolean;
  rating: number;
  ratingCount: number;
  totalDeliveries: number;
};

/** GET /riders/me/summary (today is a Lagos day). */
export type RiderSummary = {
  isOnline: boolean;
  activeJobs: number;
  todayDeliveries: number;
  todayEarningsKobo: number;
  totalDeliveries: number;
  rating: number | null;
  ratingCount: number;
};

type Place = { address: string | null; lat: number | null; lng: number | null };

/** GET /riders/me/jobs: an unassigned delivery nearby. No customer details until claimed. */
export type Job = {
  orderId: string;
  status: OrderStatus;
  deliveryMode: DeliveryMode;
  kitchen: { name: string; address: string | null; lat: number; lng: number };
  dropoff: Place & { landmark: string | null };
  toPickupMeters: number;
  tripMeters: number | null;
  payoutKobo: number;
  createdAt: string;
};

/**
 * GET /riders/me/deliveries. Phone numbers are present only while the job is
 * active; history returns null for them.
 */
export type Delivery = {
  _id: string;
  ref: string;
  status: OrderStatus;
  deliveryMode: DeliveryMode;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
  deliveredAt: string | null;
  cancellationReason: string | null;
  kitchen: Place & { name: string; phone: string | null };
  dropoff: Place & { landmark: string | null };
  customer: { firstName: string; phone: string | null };
  items: { dishName: string; quantity: number }[];
  itemCount: number;
  payoutKobo: number;
  tripMeters: number | null;
};

// ---------------------------------------------------------------- money

export type PayoutAccount = {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

export type WalletSummary = {
  availableKobo: number;
  /** Earnings on hold (new sellers only; rider pay is available at delivery). */
  pendingKobo: number;
  status: string;
  payoutAccount: PayoutAccount | null;
  hasTransactionPin: boolean;
};

export type LedgerTxType =
  | 'wallet_funding'
  | 'escrow_funding'
  | 'escrow_release'
  | 'escrow_refund'
  | 'pending_release'
  | 'payout_initiated'
  | 'payout_settled'
  | 'payout_reversed'
  | 'adjustment';

export type StatementEntry = {
  _id: string;
  type: LedgerTxType;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};
export type Statement = { items: StatementEntry[]; nextCursor: string | null };

export type Payout = {
  _id: string;
  reference: string;
  amountKobo: number;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'reversed';
  destination: PayoutAccount;
  failureReason?: string;
  createdAt: string;
};

export type Bank = { code: string; name: string };

export type KycVerification = {
  id: string;
  idType: 'NIN' | 'BVN';
  idNumberMasked: string;
  status: 'pending' | 'verified' | 'manual_review' | 'failed';
  failureReason: string | null;
};
export type KycStatus = {
  kycLevel: number;
  legalName: { firstName: string; lastName: string } | null;
  latest: KycVerification | null;
};

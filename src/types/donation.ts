export type DonationStatus = "pending" | "verified" | "rejected";

export interface Campaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number; // yen, integer
  isActive: boolean;
  createdAt: string;
}

export interface Donation {
  id: number;
  code: string;
  campaignId: string;
  donorName: string;
  isAnonymous: boolean;
  amount: number; // yen, integer
  message: string;
  contact: string;
  status: DonationStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  adminNote: string;
  createdAt: string;
}

/** Public-facing donation row — never carries `contact` or admin fields. */
export interface PublicDonor {
  name: string; // "Hamba Allah" when isAnonymous
  amount: number;
  message: string;
  createdAt: string;
}

export interface DonationStats {
  campaignId: string;
  /** Current month being tracked, e.g. "2026-09" — progress resets every month. */
  month: string;
  target: number;
  /** Verified donations within `month` only. */
  collected: number;
  /** Donor count within `month` only. */
  donorCount: number;
  /** Verified donations within `month`, most recent first. */
  recentDonors: PublicDonor[];
  /** Verified donations across all time, for historical context on the laporan page. */
  allTimeCollected: number;
}

export interface CampaignUpdateInput {
  title?: string;
  description?: string;
  targetAmount: number;
}

export interface DonationCreateInput {
  campaignId: string;
  donorName: string;
  isAnonymous: boolean;
  amount: number;
  message?: string;
  contact?: string;
  /** Honeypot field — must be empty. Named innocuously on the client. */
  website?: string;
  captchaToken: string;
  captchaAnswer: number;
}

export interface DonationCreateResponse {
  code: string;
}

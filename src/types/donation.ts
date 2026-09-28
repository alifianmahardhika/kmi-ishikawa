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
  target: number;
  collected: number;
  donorCount: number;
  recentDonors: PublicDonor[];
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

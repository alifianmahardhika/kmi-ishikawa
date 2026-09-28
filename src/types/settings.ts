export interface RekeningInfo {
  bankName: string;
  branchNumber: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
}

export interface WhatsappTreasurer {
  name: string;
  phone: string; // E.164 without leading '+', e.g. "818012345678"
}

export interface SiteSettings {
  rekening: RekeningInfo;
  whatsappTreasurer: WhatsappTreasurer;
}

export type SiteSettingsUpdateInput = Partial<SiteSettings>;

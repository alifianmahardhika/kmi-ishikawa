/** Single source of truth for bank/Yucho transfer details shown on the donation
 * success page. Update here only — every page that shows account info reads this. */
export const REKENING = {
  bankName: "Japan Post Bank (Yucho Ginko)",
  branchNumber: "TODO", // e.g. "三一八" / "318"
  accountType: "Tabungan (普通)",
  accountNumber: "TODO",
  accountHolder: "TODO Nama Pemegang Rekening",
} as const;

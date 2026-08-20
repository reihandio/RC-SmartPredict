/**
 * Static IDX exchange-member (broker) code → firm-name reference map.
 *
 * Sources (public IDX documents; snapshot taken 2026-08-20):
 *  - IDX Annual Report 2019 member list (https://www.idx.co.id/media/8773/2019.pdf)
 *  - IDX Annual Report 2022 member list
 *    (https://www.idx.co.id/Media/ccrhy5gi/laporan-tahunan-pt-bursa-efek-indonesia-tahun-2022-230627.pdf)
 *  - IDX "Most Active Brokerage Houses" statistical reports (Jan/Feb 2025)
 *    (https://idx.co.id/en/market-data/statistical-reports/digital-statistic/monthly/most-active-brokerage)
 *
 * Firm names can change over time (mergers, rebrands). Codes missing from
 * this map are displayed as the bare code in the UI — never with an invented
 * name. Bandarmology practitioners conventionally refer to brokers by code.
 */
export const BROKER_NAMES: Record<string, string> = {
  AF: "Harita Kencana Sekuritas",
  AG: "Kiwoom Sekuritas Indonesia",
  AK: "UBS Sekuritas Indonesia",
  AO: "Erdikha Elit Sekuritas",
  AR: "Binaartha Sekuritas",
  BF: "Inti Fikasa Sekuritas",
  BK: "J.P. Morgan Sekuritas Indonesia",
  BQ: "Korea Investment and Sekuritas Indonesia",
  BS: "Equity Sekuritas Indonesia",
  BZ: "Batavia Prosperindo Sekuritas",
  CC: "Mandiri Sekuritas",
  CG: "Citigroup Sekuritas Indonesia",
  CP: "Ciptadana Sekuritas Asia",
  CS: "Credit Suisse Sekuritas Indonesia",
  DB: "Deutsche Sekuritas Indonesia",
  DP: "DBS Vickers Sekuritas Indonesia",
  DX: "Bahana Sekuritas",
  EL: "Evergreen Sekuritas Indonesia",
  ES: "Ekokapital Sekuritas",
  FO: "Forte Global Sekuritas",
  GA: "BNC Sekuritas Indonesia",
  GW: "HSBC Sekuritas Indonesia",
  HD: "KGI Sekuritas Indonesia",
  HP: "Henan Putihrai Sekuritas",
  ID: "Anugerah Sekuritas Indonesia",
  II: "Danatama Makmur Sekuritas",
  IN: "Investindo Nusantara Sekuritas",
  IP: "Indosurya Bersinar Sekuritas",
  IT: "Inti Teladan Sekuritas",
  IU: "Indo Capital Sekuritas",
  KI: "Ciptadana Sekuritas Asia",
  KS: "Kresna Sekuritas",
  KW: "Corpus Sekuritas Indonesia",
  KZ: "CLSA Sekuritas Indonesia",
  LG: "Trimegah Sekuritas Indonesia",
  MG: "Semesta Indovest Sekuritas",
  MK: "Ekuator Swarna Sekuritas",
  NI: "BNI Sekuritas",
  OD: "Danareksa Sekuritas",
  PC: "FAC Sekuritas Indonesia",
  PD: "Indo Premier Sekuritas",
  PF: "Danasakti Sekuritas Indonesia",
  PP: "Aldiracita Sekuritas Indonesia",
  RF: "Buana Capital Sekuritas",
  RX: "Macquarie Sekuritas Indonesia",
  SA: "Bosowa Sekuritas",
  SC: "IMG Sekuritas",
  SH: "Artha Sekuritas Indonesia",
  SQ: "BCA Sekuritas",
  TS: "Dwidana Sakti Sekuritas",
  TX: "Dhanawibawa Sekuritas Indonesia",
  XL: "Stockbit Sekuritas Digital",
  YB: "Jasa Utama Capital Sekuritas",
  YJ: "Lotus Andalan Sekuritas",
  YO: "Amantara Sekuritas Indonesia",
  YP: "Mirae Asset Sekuritas Indonesia",
  YU: "CGS International Sekuritas Indonesia",
  ZP: "Maybank Sekuritas Indonesia",
  ZR: "Bumiputera Sekuritas",
};

export function brokerName(code: string): string {
  return BROKER_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

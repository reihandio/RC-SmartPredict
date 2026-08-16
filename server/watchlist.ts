/**
 * Tracked IDX universe — a watchlist of real Yahoo Finance `.JK` symbols.
 * This is NOT mock data: quotes, market caps, and history all come from Yahoo.
 * Symbols that fail to resolve are skipped at fetch time.
 */
export const WATCHLIST: string[] = [
  // Banks
  "BBCA.JK", "BBRI.JK", "BMRI.JK", "BBNI.JK", "BRIS.JK", "ARTO.JK", "BBTN.JK",
  // Consumer
  "UNVR.JK", "ICBP.JK", "INDF.JK", "MYOR.JK", "GGRM.JK", "HMSP.JK", "ULTJ.JK",
  "CMRY.JK", "AMRT.JK", "MIDI.JK", "ACES.JK", "MAPI.JK", "ERAA.JK", "RALS.JK", "LPPF.JK",
  // Energy & Mining
  "ADRO.JK", "PTBA.JK", "ITMG.JK", "INCO.JK", "ANTM.JK", "MDKA.JK", "MEDC.JK",
  "PGAS.JK", "AKRA.JK", "ESSA.JK", "HRUM.JK", "TINS.JK", "DOID.JK", "INDY.JK",
  "BREN.JK", "BRMS.JK", "MBMA.JK", "POWR.JK",
  // Telco & Tech
  "TLKM.JK", "ISAT.JK", "EXCL.JK", "MTEL.JK", "TBIG.JK", "TOWR.JK", "GOTO.JK", "EMTK.JK", "DCII.JK",
  // Infrastructure & Construction
  "SMGR.JK", "INTP.JK", "WIKA.JK", "PTPP.JK", "ADHI.JK", "JSMR.JK", "WTON.JK",
  // Property
  "CTRA.JK", "BSDE.JK", "PWON.JK", "LPKR.JK", "APLN.JK", "SMRA.JK", "PANI.JK",
  // Healthcare
  "SIDO.JK", "MIKA.JK", "HEAL.JK", "KLBF.JK",
  // Media
  "SCMA.JK", "MNCN.JK", "FILM.JK",
  // Agro & Feed
  "AALI.JK", "LSIP.JK", "CPIN.JK", "JPFA.JK", "MAIN.JK",
  // Industrial & Misc
  "ASII.JK", "GJTL.JK", "AVIA.JK", "BRPT.JK", "TPIA.JK", "INKP.JK",
];

export const IHSG_SYMBOL = "^JKSE";

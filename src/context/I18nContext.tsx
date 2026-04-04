import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Locale = "en" | "id";

const translations = {
  en: {
    // Navbar
    home: "Home",
    myInventory: "My Inventory",
    gachaCoins: "Gacha Coins",

    // Hero
    wayOfFortune: "⚔️ The Way of Fortune",
    drawYour: "Draw Your",
    destiny: "Destiny",
    heroDesc: "Limited pools. Rare prizes. Every draw brings you closer to the ultimate reward.",
    testYourLuck: "Test Your Luck Now!",

    // Features
    verifiedFair: "Verified Fair",
    verifiedFairDesc: "Provably fair draws with transparent odds",
    limitedPools: "Limited Pools",
    limitedPoolsDesc: "Once tickets sell out, the campaign ends",
    pitySystem: "Pity System",
    pitySystemDesc: "Guaranteed rare after a set number of draws",
    lastOnePrize: "Last One Prize",
    lastOnePrizeDesc: "The final ticket wins a special bonus prize",

    // Index
    liveNow: "Live Now",
    featuredCampaigns: "Featured Campaigns",
    allRightsReserved: "© 2026 BUSHIDO GACHA — All rights reserved",

    // Campaign Card
    ticket: "/ticket",
    remaining: "Remaining",
    hot: "HOT",
    almostGone: "Almost Gone!",

    // Campaign Detail
    backToCampaigns: "Back to Campaigns",
    prizePool: "Prize Pool",
    left: "left",
    lastOnePrizeTitle: "Last One Prize",
    lastOnePrizeDetail: "The person who draws the very last ticket wins an exclusive bonus reward!",
    price: "Price",
    draw1x: "Draw 1x",
    draw10x: "Draw 10x",
    drawing: "Drawing...",
    drawingMulti: "Drawing {count}x...",

    // Prize tiers
    grandPrize: "Grand Prize",
    tierA: "Tier A",
    tierB: "Tier B",
    tierC: "Tier C",

    // Prize Reveal Modal
    drawResult: "{count}x Draw Result",
    youDrew: "You Drew",
    grandPrizeFire: "🔥 GRAND PRIZE 🔥",
    claimReward: "Claim Reward!",
    continue: "Continue",

    // Inventory
    totalItems: "Total Items",
    rareItems: "Rare+ Items",
    recyclable: "Recyclable",
    pityCounter: "Pity Counter",
    moreDrawsForTierA: "more draws for guaranteed Tier A!",
    draws: "draws",
    all: "All",
    grand: "Grand",
    noItemsCategory: "No items in this category",
    noPrizesYet: "No prizes yet — go draw some!",
    recycle: "Recycle",
    recycledTitle: "Recycled \"{name}\"",
    recycledDesc: "+{value} Gacha Coins earned!",
    yourCollection: "Your collection of prizes from Bushido Gacha draws.",

    // Draw History
    drawHistory: "Draw History",
    drawHistoryDesc: "A log of all your past gacha draws.",
    noDrawsYet: "No draws yet — go try your luck!",

    // Sold Out
    soldOut: "Sold Out",
    soldOutDesc: "All tickets have been drawn!",

    // Top Up
    topUpCoins: "Top Up Coins",
    topUpDesc: "Choose a coin package to power your gacha draws",
    bestValue: "BEST VALUE",
    perCoin: "coin",
    paymentMethods: "Available payment methods (simulation)",
    confirmPurchase: "Confirm Purchase",
    confirmPurchaseDesc: "Review your order before proceeding",
    purchaseSuccess: "Purchase Successful!",
    purchaseSuccessDesc: "+{coins} Gacha Coins added!",
    processing: "Processing...",
    payNow: "Pay Now",
    simulationNote: "This is a simulated purchase — no real payment is charged.",
    topUp: "Top Up",

    // 404
    pageNotFound: "Oops! Page not found",
    returnHome: "Return to Home",
  },
  id: {
    // Navbar
    home: "Beranda",
    myInventory: "Inventori Saya",
    gachaCoins: "Koin Gacha",

    // Hero
    wayOfFortune: "⚔️ Jalan Keberuntungan",
    drawYour: "Tarik",
    destiny: "Takdirmu",
    heroDesc: "Pool terbatas. Hadiah langka. Setiap tarikan membawamu lebih dekat ke hadiah utama.",
    testYourLuck: "Coba Keberuntunganmu!",

    // Features
    verifiedFair: "Dijamin Adil",
    verifiedFairDesc: "Undian adil terverifikasi dengan peluang transparan",
    limitedPools: "Pool Terbatas",
    limitedPoolsDesc: "Setelah tiket habis, kampanye berakhir",
    pitySystem: "Sistem Pity",
    pitySystemDesc: "Jaminan langka setelah sejumlah tarikan",
    lastOnePrize: "Hadiah Terakhir",
    lastOnePrizeDesc: "Tiket terakhir memenangkan hadiah bonus spesial",

    // Index
    liveNow: "Sedang Berlangsung",
    featuredCampaigns: "Kampanye Unggulan",
    allRightsReserved: "© 2026 BUSHIDO GACHA — Hak cipta dilindungi",

    // Campaign Card
    ticket: "/tiket",
    remaining: "Tersisa",
    hot: "POPULER",
    almostGone: "Hampir Habis!",

    // Campaign Detail
    backToCampaigns: "Kembali ke Kampanye",
    prizePool: "Kolam Hadiah",
    left: "tersisa",
    lastOnePrizeTitle: "Hadiah Terakhir",
    lastOnePrizeDetail: "Orang yang menarik tiket terakhir memenangkan hadiah bonus eksklusif!",
    price: "Harga",
    draw1x: "Tarik 1x",
    draw10x: "Tarik 10x",
    drawing: "Menarik...",
    drawingMulti: "Menarik {count}x...",

    // Prize tiers
    grandPrize: "Hadiah Utama",
    tierA: "Tingkat A",
    tierB: "Tingkat B",
    tierC: "Tingkat C",

    // Prize Reveal Modal
    drawResult: "Hasil Tarikan {count}x",
    youDrew: "Kamu Mendapat",
    grandPrizeFire: "🔥 HADIAH UTAMA 🔥",
    claimReward: "Klaim Hadiah!",
    continue: "Lanjutkan",

    // Inventory
    totalItems: "Total Item",
    rareItems: "Item Langka+",
    recyclable: "Bisa Didaur Ulang",
    pityCounter: "Penghitung Pity",
    moreDrawsForTierA: "tarikan lagi untuk jaminan Tingkat A!",
    draws: "tarikan",
    all: "Semua",
    grand: "Utama",
    noItemsCategory: "Tidak ada item di kategori ini",
    noPrizesYet: "Belum ada hadiah — ayo tarik!",
    recycle: "Daur Ulang",
    recycledTitle: "Didaur ulang \"{name}\"",
    recycledDesc: "+{value} Koin Gacha diperoleh!",
    yourCollection: "Koleksi hadiah dari tarikan Bushido Gacha kamu.",

    // Draw History
    drawHistory: "Riwayat Tarikan",
    drawHistoryDesc: "Catatan semua tarikan gacha kamu.",
    noDrawsYet: "Belum ada tarikan — ayo coba keberuntunganmu!",

    // Sold Out
    soldOut: "Habis Terjual",
    soldOutDesc: "Semua tiket sudah ditarik!",

    // Top Up
    topUpCoins: "Isi Ulang Koin",
    topUpDesc: "Pilih paket koin untuk tarikan gacha kamu",
    bestValue: "TERBAIK",
    perCoin: "koin",
    paymentMethods: "Metode pembayaran tersedia (simulasi)",
    confirmPurchase: "Konfirmasi Pembelian",
    confirmPurchaseDesc: "Periksa pesananmu sebelum melanjutkan",
    purchaseSuccess: "Pembelian Berhasil!",
    purchaseSuccessDesc: "+{coins} Koin Gacha ditambahkan!",
    processing: "Memproses...",
    payNow: "Bayar Sekarang",
    simulationNote: "Ini adalah pembelian simulasi — tidak ada pembayaran sungguhan.",
    topUp: "Isi Ulang",

    // 404
    pageNotFound: "Oops! Halaman tidak ditemukan",
    returnHome: "Kembali ke Beranda",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nState | null>(null);

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
};

const STORAGE_KEY = "bushido-gacha-locale";

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "id" || saved === "en") return saved;
    } catch {}
    return "en";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    let str: string = translations[locale][key] || translations.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

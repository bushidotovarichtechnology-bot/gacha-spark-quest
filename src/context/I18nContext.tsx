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
    companyName: "PT. BUSHIDO TOVARICH TECHNOLOGY",
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
    skipAll: "Skip All",
    drawSummary: "Summary",

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
    recycleConfirmTitle: "Recycle this prize?",
    recycleConfirmDesc: "You will receive +{value} Gacha Coins. This action cannot be undone.",
    yourCollection: "Your collection of prizes from Bushido Gacha draws.",

    // Draw History
    drawHistory: "Draw History",
    drawHistoryDesc: "A log of all your past gacha draws.",
    noDrawsYet: "No draws yet — go try your luck!",

    // Sold Out
    soldOut: "Sold Out",
    soldOutDesc: "All tickets have been drawn!",
    insufficientCoins: "Not enough coins! Top up to continue drawing.",
    pityReady: "🔥 Next draw guarantees Tier A or higher!",

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

    // Auth
    login: "Login",
    loginDesc: "Sign in to your Bushido Gacha account",
    loginFailed: "Login failed",
    loginSuccess: "Welcome back!",
    loginWithGoogle: "Sign in with Google",
    register: "Register",
    registerDesc: "Create a new Bushido Gacha account",
    registerFailed: "Registration failed",
    registerSuccess: "Registration successful!",
    checkEmail: "Please check your email to verify your account.",
    password: "Password",
    confirmPassword: "Confirm Password",
    passwordMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 6 characters",
    signUpWithGoogle: "Sign up with Google",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    or: "or",
    logout: "Logout",
    forgotPassword: "Forgot Password",
    forgotPasswordDesc: "Enter your email and we'll send you a reset link.",
    sendResetLink: "Send Reset Link",
    resetEmailSent: "Reset link sent!",
    resetEmailSentDesc: "Check your email for a password reset link. It may take a few minutes.",
    backToLogin: "Back to Login",
    resetFailed: "Reset failed",
    resetPassword: "Reset Password",
    resetPasswordDesc: "Enter your new password below.",
    newPassword: "New Password",
    passwordResetSuccess: "Password updated successfully!",
    invalidResetLink: "This reset link is invalid or has expired. Please request a new one.",
    forgotPasswordLink: "Forgot password?",

    // Claim Prize
    claimPrize: "Claim Prize",
    claimPrizeBtn: "Claim",
    stepRecipient: "Recipient",
    stepAddress: "Address",
    stepShipping: "Shipping",
    recipientName: "Recipient Name",
    recipientNamePh: "Full name",
    phoneNumber: "Phone Number",
    fullAddress: "Full Address",
    fullAddressPh: "Street, building, unit number...",
    city: "City",
    cityPh: "e.g. Jakarta",
    province: "Province",
    provincePh: "e.g. DKI Jakarta",
    postalCode: "Postal Code",
    shippingMethod: "Shipping Method",
    claimNotes: "Notes (optional)",
    claimNotesPh: "Special instructions...",
    free: "FREE",
    nextStep: "Next",
    back: "Back",
    submitClaim: "Submit Claim",
    claimSubmitted: "Claim Submitted!",
    claimSubmittedDesc: "Your prize claim has been submitted. We'll process it soon!",
    claimFailed: "Claim failed",
    tierSLabel: "Grand Prize",
    tierALabel: "Tier A",
    tierBLabel: "Tier B",
    tierCLabel: "Tier C",

    // Claim History
    claimHistory: "Claim History",
    claimHistoryDesc: "Track the status of your prize claims.",
    noClaimsYet: "No claims yet — claim a prize from your inventory!",

    // About Us
    aboutUs: "About Us",
    aboutTitle: "About PT. BUSHIDO TOVARICH TECHNOLOGY",
    aboutSubtitle: "The fusion of Japanese discipline and bold innovation — powering the future of digital entertainment in Southeast Asia.",
    aboutStoryTitle: "Our Story",
    aboutStoryP1: "PT. BUSHIDO TOVARICH TECHNOLOGY was founded with a singular vision: to bring the thrill of gacha culture to a wider audience through fair, transparent, and exciting digital experiences. Inspired by the Bushido code of honor, we believe every player deserves a fair chance at winning.",
    aboutStoryP2: "Based in Indonesia, our team combines cutting-edge technology with a deep passion for gaming culture. From provably fair draw algorithms to our unique pity system, every feature is designed to put the player first.",
    aboutValuesTitle: "Our Values",
    aboutValueFairTitle: "Fairness First",
    aboutValueFairDesc: "Every draw uses provably fair algorithms with transparent odds — no hidden manipulation.",
    aboutValueInnovationTitle: "Bold Innovation",
    aboutValueInnovationDesc: "We push boundaries with features like pity systems, last-one prizes, and real-time prize pools.",
    aboutValueCommunityTitle: "Community Driven",
    aboutValueCommunityDesc: "Built by gamers, for gamers. Your feedback shapes every update we ship.",
    aboutValueTransparencyTitle: "Full Transparency",
    aboutValueTransparencyDesc: "Open odds, public prize pools, and clear rules — what you see is what you get.",
    aboutCtaTitle: "Ready to Draw Your Destiny?",
    aboutCtaDesc: "Join thousands of players and test your luck today.",

    // Contact Us
    contactUs: "Contact Us",
    contactTitle: "Contact Us",
    contactSubtitle: "Have a question, feedback, or partnership inquiry? We'd love to hear from you.",
    contactName: "Name",
    contactNamePh: "Your full name",
    contactSubject: "Subject",
    contactSubjectPh: "What is this about?",
    contactMessage: "Message",
    contactMessagePh: "Write your message here...",
    contactSend: "Send Message",
    contactSuccess: "Message Sent!",
    contactSuccessDesc: "Thank you for reaching out. We'll get back to you soon.",
    contactFailed: "Failed to send message",
    contactFieldRequired: "This field is required",

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
    companyName: "PT. BUSHIDO TOVARICH TECHNOLOGY",
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
    skipAll: "Lewati Semua",
    drawSummary: "Ringkasan",

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
    recycleConfirmTitle: "Daur ulang hadiah ini?",
    recycleConfirmDesc: "Kamu akan mendapat +{value} Koin Gacha. Tindakan ini tidak bisa dibatalkan.",
    yourCollection: "Koleksi hadiah dari tarikan Bushido Gacha kamu.",

    // Draw History
    drawHistory: "Riwayat Tarikan",
    drawHistoryDesc: "Catatan semua tarikan gacha kamu.",
    noDrawsYet: "Belum ada tarikan — ayo coba keberuntunganmu!",

    // Sold Out
    soldOut: "Habis Terjual",
    soldOutDesc: "Semua tiket sudah ditarik!",
    insufficientCoins: "Koin tidak cukup! Isi ulang untuk melanjutkan tarikan.",
    pityReady: "🔥 Tarikan berikutnya dijamin Tingkat A atau lebih tinggi!",

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

    // Auth
    login: "Masuk",
    loginDesc: "Masuk ke akun Bushido Gacha kamu",
    loginFailed: "Gagal masuk",
    loginSuccess: "Selamat datang kembali!",
    loginWithGoogle: "Masuk dengan Google",
    register: "Daftar",
    registerDesc: "Buat akun Bushido Gacha baru",
    registerFailed: "Gagal mendaftar",
    registerSuccess: "Pendaftaran berhasil!",
    checkEmail: "Silakan cek email untuk verifikasi akun.",
    password: "Kata Sandi",
    confirmPassword: "Konfirmasi Kata Sandi",
    passwordMismatch: "Kata sandi tidak cocok",
    passwordTooShort: "Kata sandi minimal 6 karakter",
    signUpWithGoogle: "Daftar dengan Google",
    noAccount: "Belum punya akun?",
    hasAccount: "Sudah punya akun?",
    or: "atau",
    logout: "Keluar",
    forgotPassword: "Lupa Kata Sandi",
    forgotPasswordDesc: "Masukkan email dan kami akan mengirimkan link reset.",
    sendResetLink: "Kirim Link Reset",
    resetEmailSent: "Link reset terkirim!",
    resetEmailSentDesc: "Cek email kamu untuk link reset kata sandi. Mungkin butuh beberapa menit.",
    backToLogin: "Kembali ke Login",
    resetFailed: "Reset gagal",
    resetPassword: "Reset Kata Sandi",
    resetPasswordDesc: "Masukkan kata sandi baru kamu di bawah.",
    newPassword: "Kata Sandi Baru",
    passwordResetSuccess: "Kata sandi berhasil diperbarui!",
    invalidResetLink: "Link reset ini tidak valid atau sudah kedaluwarsa. Silakan minta yang baru.",
    forgotPasswordLink: "Lupa kata sandi?",

    // Claim Prize
    claimPrize: "Ambil Hadiah",
    claimPrizeBtn: "Ambil",
    stepRecipient: "Penerima",
    stepAddress: "Alamat",
    stepShipping: "Pengiriman",
    recipientName: "Nama Penerima",
    recipientNamePh: "Nama lengkap",
    phoneNumber: "Nomor Telepon",
    fullAddress: "Alamat Lengkap",
    fullAddressPh: "Jalan, gedung, nomor unit...",
    city: "Kota",
    cityPh: "contoh: Jakarta",
    province: "Provinsi",
    provincePh: "contoh: DKI Jakarta",
    postalCode: "Kode Pos",
    shippingMethod: "Metode Pengiriman",
    claimNotes: "Catatan (opsional)",
    claimNotesPh: "Instruksi khusus...",
    free: "GRATIS",
    nextStep: "Selanjutnya",
    back: "Kembali",
    submitClaim: "Kirim Klaim",
    claimSubmitted: "Klaim Terkirim!",
    claimSubmittedDesc: "Klaim hadiahmu telah dikirim. Kami akan segera memprosesnya!",
    claimFailed: "Klaim gagal",
    tierSLabel: "Hadiah Utama",
    tierALabel: "Tingkat A",
    tierBLabel: "Tingkat B",
    tierCLabel: "Tingkat C",

    // Claim History
    claimHistory: "Riwayat Klaim",
    claimHistoryDesc: "Pantau status klaim hadiah kamu.",
    noClaimsYet: "Belum ada klaim — ambil hadiah dari inventori kamu!",

    // About Us
    aboutUs: "Tentang Kami",
    aboutTitle: "Tentang PT. BUSHIDO TOVARICH TECHNOLOGY",
    aboutSubtitle: "Perpaduan disiplin Jepang dan inovasi berani — menggerakkan masa depan hiburan digital di Asia Tenggara.",
    aboutStoryTitle: "Cerita Kami",
    aboutStoryP1: "PT. BUSHIDO TOVARICH TECHNOLOGY didirikan dengan visi tunggal: menghadirkan sensasi budaya gacha kepada audiens yang lebih luas melalui pengalaman digital yang adil, transparan, dan seru. Terinspirasi oleh kode kehormatan Bushido, kami percaya setiap pemain berhak mendapat kesempatan yang adil untuk menang.",
    aboutStoryP2: "Berbasis di Indonesia, tim kami menggabungkan teknologi mutakhir dengan passion mendalam terhadap budaya gaming. Dari algoritma undian yang terbukti adil hingga sistem pity unik kami, setiap fitur dirancang untuk mengutamakan pemain.",
    aboutValuesTitle: "Nilai-Nilai Kami",
    aboutValueFairTitle: "Keadilan Utama",
    aboutValueFairDesc: "Setiap undian menggunakan algoritma yang terbukti adil dengan peluang transparan — tanpa manipulasi tersembunyi.",
    aboutValueInnovationTitle: "Inovasi Berani",
    aboutValueInnovationDesc: "Kami mendorong batas dengan fitur seperti sistem pity, hadiah terakhir, dan pool hadiah real-time.",
    aboutValueCommunityTitle: "Berbasis Komunitas",
    aboutValueCommunityDesc: "Dibuat oleh gamer, untuk gamer. Masukan kamu membentuk setiap update yang kami rilis.",
    aboutValueTransparencyTitle: "Transparansi Penuh",
    aboutValueTransparencyDesc: "Peluang terbuka, pool hadiah publik, dan aturan jelas — apa yang kamu lihat adalah yang kamu dapatkan.",
    aboutCtaTitle: "Siap Menarik Takdirmu?",
    aboutCtaDesc: "Bergabung dengan ribuan pemain dan coba keberuntunganmu hari ini.",

    // Contact Us
    contactUs: "Hubungi Kami",
    contactTitle: "Hubungi Kami",
    contactSubtitle: "Punya pertanyaan, masukan, atau ingin bekerja sama? Kami senang mendengar dari kamu.",
    contactName: "Nama",
    contactNamePh: "Nama lengkap kamu",
    contactSubject: "Subjek",
    contactSubjectPh: "Tentang apa ini?",
    contactMessage: "Pesan",
    contactMessagePh: "Tulis pesan kamu di sini...",
    contactSend: "Kirim Pesan",
    contactSuccess: "Pesan Terkirim!",
    contactSuccessDesc: "Terima kasih telah menghubungi kami. Kami akan segera membalas.",
    contactFailed: "Gagal mengirim pesan",
    contactFieldRequired: "Kolom ini wajib diisi",

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

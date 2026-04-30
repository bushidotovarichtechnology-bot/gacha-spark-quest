import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Locale = "en" | "id";

const translations = {
  en: {
    // Navbar
    home: "Home",
    myInventory: "My Inventory",
    bushidoCoins: "Bushido Coin",

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
    limitedPoolsDesc: "Once coins sell out, the campaign ends",
    pitySystem: "Pity System",
    pitySystemDesc: "Guaranteed rare after a set number of draws",
    lastOnePrize: "Last One Prize",
    lastOnePrizeDesc: "The final draw wins a special bonus prize",

    // Index
    liveNow: "Live Now",
    featuredCampaigns: "Featured Campaigns",
    companyName: "PT. BUSHIDO TOVARICH TECHNOLOGY",
    allRightsReserved: "© 2026 BUSHIDO GACHA — All rights reserved",

    // Campaign Card
    ticket: " coins",
    remaining: "Remaining",
    hot: "HOT",
    almostGone: "Almost Gone!",

    // Campaign Detail
    backToCampaigns: "Back to Campaigns",
    prizePool: "Prize Pool",
    left: "left",
    lastOnePrizeTitle: "Last One Prize",
    lastOnePrizeDetail: "The person who makes the very last draw wins an exclusive bonus reward!",
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
    sharePrize: "Share Prize",
    shareTitle: "Share your win!",
    shareDesc: "Let your friends know what you won at BushidoGacha",
    shareWhatsapp: "WhatsApp",
    shareFacebook: "Facebook",
    shareTwitter: "Twitter / X",
    shareInstagram: "Instagram",
    shareCopyLink: "Copy Link",
    shareMore: "More",
    shareCopied: "Link copied! Paste it on Instagram.",
    shareInstagramHint: "Instagram doesn't allow direct web sharing. We've copied the link — paste it in your Story or DM.",
    shareCaption: "🎉 I just won {prize} (Tier {tier}) from the {campaign} campaign on BushidoGacha! ✨ Try your luck and grab yours 👉",
    shareCaptionNoCampaign: "🎉 I just won {prize} (Tier {tier}) on BushidoGacha! ✨ Try your luck and grab yours 👉",
    shareAsImage: "Share as Image",
    shareCardTitle: "Your Prize Card",
    shareCardDesc: "A shareable image — perfect for WhatsApp & Instagram Story.",
    shareCardGenerating: "Designing your card…",
    shareCardDownload: "Download",
    shareCardShare: "Share",
    shareCardSaveShare: "Save & Share",
    shareCardHint: "Tip: download the image, then upload it to your Instagram Story.",
    shareCardDownloaded: "Image saved! Share it on Instagram or WhatsApp.",
    shareCardFallbackHint: "Caption copied & image downloaded — paste anywhere!",
    shareCardFailed: "Failed to generate image. Please try again.",

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
    recycleConfirmDesc: "You will receive +{value} Bushido Coin. This action cannot be undone.",
    yourCollection: "Your collection of prizes from Bushido Gacha draws.",

    // Draw History
    drawHistory: "Draw History",
    drawHistoryDesc: "A log of all your past gacha draws.",
    noDrawsYet: "No draws yet — go try your luck!",

    // Sold Out
    soldOut: "Sold Out",
    soldOutDesc: "All prizes have been drawn!",
    insufficientCoins: "Not enough coins! Top up to continue drawing.",
    pityReady: "🔥 Next draw guarantees Tier A or higher!",
    pityProgress: "Pity Meter Updated!",
    pityProgressDesc: "You're getting closer to a guaranteed prize.",
    pityReset: "Pity Meter Reset!",
    pityResetDesc: "You won a rare prize — meter restarts.",
    pityReadyPopupDesc: "Your pity reward is ready to claim.",
    pityNextDrawGuaranteed: "Next draw guarantees Tier {tier}!",
    drawNow: "Draw Now",
    keepDrawing: "Keep Drawing",

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
    aboutSubtitle: "We build Bushido Gacha — Indonesia's trusted online gacha platform — with a focus on Fair Play, Transparency, and Community.",
    aboutStoryTitle: "Our Story",
    aboutStoryP1: "PT. BUSHIDO TOVARICH TECHNOLOGY is an Indonesian technology company that develops digital entertainment products with a Fair Play mindset. Bushido Gacha is born from one simple belief: every player deserves an honest chance, transparent odds, and a fun experience without hidden tricks.",
    aboutStoryP2: "We combine Japanese discipline (Bushido) with bold local innovation (Tovarich) to create a trusted online gacha platform. From provably fair draw algorithms, a transparent Pity System, to peer-to-peer coin transfer — every feature is designed for the Indonesian community first.",
    aboutValuesTitle: "Our Values",
    aboutValueFairTitle: "Fair Play",
    aboutValueFairDesc: "Provably fair draws, public odds, no hidden manipulation. A truly fair gacha system from start to finish.",
    aboutValueInnovationTitle: "Bold Innovation",
    aboutValueInnovationDesc: "Pity System, Last-One Prize, social coin transfer, and a real-time prize pool — pushing what an online gacha platform can be.",
    aboutValueCommunityTitle: "Community First",
    aboutValueCommunityDesc: "Built by gamers for gamers. Your feedback shapes every Bushido Gacha update.",
    aboutValueTransparencyTitle: "Full Transparency",
    aboutValueTransparencyDesc: "Open odds, public prize pools, clear rules, and a coin ledger — what you see is exactly what you get.",
    aboutCtaTitle: "Ready to Draw Your Destiny?",
    aboutCtaDesc: "Join thousands of players and feel a trusted gacha simulation today.",

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

    // SEO Homepage long-form copy
    seoHomeTitle: "Bushido Gacha — Trusted Online Gacha Platform in Indonesia",
    seoHomeDesc: "Bushido Gacha is a trusted online gacha simulation platform in Indonesia. Fair gacha system, transparent Pity System, and peer-to-peer coin transfer.",
    seoSectionWhyTitle: "Why Bushido Gacha is the Trusted Online Gacha Platform in Indonesia",
    seoSectionWhyP1: "Bushido Gacha is an online gacha platform built by PT. BUSHIDO TOVARICH TECHNOLOGY for the Indonesian community that wants a trusted gacha simulation experience. Every draw uses a fair gacha system with provably fair algorithms — odds are public, prize pools are real-time, and there is no hidden manipulation behind the scenes.",
    seoSectionWhyP2: "Unlike conventional gacha sites, our pool is limited. Once stock runs out, the campaign closes — no infinite loops, no inflated illusions. This is what makes Bushido Gacha one of the most transparent online gacha platforms in Indonesia today.",
    seoPityTitle: "Transparent Pity System Guarantee",
    seoPityP1: "We understand the frustration of bad luck streaks. That is why we built a Pity System that guarantees a rare-tier prize after a specific number of draws. The pity counter is fully visible on your inventory page — no guessing, no fake hope. This is our commitment to a fair gacha system that keeps every player in the game.",
    seoPityP2: "When the pity meter is full, your next draw is guaranteed Tier A or higher. Once claimed, the meter resets transparently — exactly like the rules say.",
    seoCoinTransferTitle: "Social Feature: Send Coins to Other Players",
    seoCoinTransferP1: "Bushido Gacha is more than a solo experience. With our peer-to-peer Coin Transfer feature, you can send Bushido Coin directly to friends — to celebrate a win, help a teammate, or set up a community event.",
    seoCoinTransferHowTitle: "How to Send Coins to Other Players",
    seoCoinTransferStep1: "Open the Send Coins menu from your profile.",
    seoCoinTransferStep2: "Enter the recipient's email and the coin amount.",
    seoCoinTransferStep3: "Confirm the transfer — coins arrive instantly in the recipient's wallet.",
    seoCoinTransferP2: "Every transfer is recorded in the coin ledger so both sender and receiver have a fully transparent record.",
    seoUspTitle: "Indonesia's Trusted Gacha Simulation",
    seoUspP1: "From limited pool campaigns, real-time prize pools, exclusive Last-One Prize, ticket-based redeem store, to community leaderboards — every feature on Bushido Gacha is designed so you feel an honest, exciting, and rewarding gacha experience.",
    seoUspP2: "Join thousands of Indonesian players who already trust Bushido Gacha as their go-to online gacha platform. Test your luck today and feel the difference of a truly fair gacha system.",
    seoSendCoins: "Send Coins",
    seoLearnMore: "Learn More",

    // Legal
    termsAndConditions: "Terms & Conditions",
    privacyPolicy: "Privacy Policy",

    // 404
    pageNotFound: "Oops! Page not found",
    returnHome: "Return to Home",
  },
  id: {
    // Navbar
    home: "Beranda",
    myInventory: "Inventori Saya",
    bushidoCoins: "Bushido Coin",

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
    limitedPoolsDesc: "Setelah koin habis, kampanye berakhir",
    pitySystem: "Sistem Pity",
    pitySystemDesc: "Jaminan langka setelah sejumlah tarikan",
    lastOnePrize: "Hadiah Terakhir",
    lastOnePrizeDesc: "Tarikan terakhir memenangkan hadiah bonus spesial",

    // Index
    liveNow: "Sedang Berlangsung",
    featuredCampaigns: "Kampanye Unggulan",
    companyName: "PT. BUSHIDO TOVARICH TECHNOLOGY",
    allRightsReserved: "© 2026 BUSHIDO GACHA — Hak cipta dilindungi",

    // Campaign Card
    ticket: " koin",
    remaining: "Tersisa",
    hot: "POPULER",
    almostGone: "Hampir Habis!",

    // Campaign Detail
    backToCampaigns: "Kembali ke Kampanye",
    prizePool: "Kolam Hadiah",
    left: "tersisa",
    lastOnePrizeTitle: "Hadiah Terakhir",
    lastOnePrizeDetail: "Orang yang melakukan tarikan terakhir memenangkan hadiah bonus eksklusif!",
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
    sharePrize: "Bagikan Hadiah",
    shareTitle: "Pamerkan Kemenanganmu!",
    shareDesc: "Bagikan ke teman-temanmu apa yang kamu menangkan di BushidoGacha",
    shareWhatsapp: "WhatsApp",
    shareFacebook: "Facebook",
    shareTwitter: "Twitter / X",
    shareInstagram: "Instagram",
    shareCopyLink: "Salin Tautan",
    shareMore: "Lainnya",
    shareCopied: "Tautan disalin! Tempel di Instagram.",
    shareInstagramHint: "Instagram tidak mengizinkan share langsung dari web. Kami sudah menyalin tautannya — tempel di Story atau DM kamu.",
    shareCaption: "🎉 Aku baru saja dapat {prize} (Tier {tier}) dari campaign {campaign} di BushidoGacha! ✨ Coba keberuntunganmu juga 👉",
    shareCaptionNoCampaign: "🎉 Aku baru saja dapat {prize} (Tier {tier}) di BushidoGacha! ✨ Coba keberuntunganmu juga 👉",
    shareAsImage: "Bagikan sebagai Gambar",
    shareCardTitle: "Kartu Hadiahmu",
    shareCardDesc: "Gambar siap-bagikan — cocok untuk WhatsApp & Instagram Story.",
    shareCardGenerating: "Mendesain kartumu…",
    shareCardDownload: "Unduh",
    shareCardShare: "Bagikan",
    shareCardSaveShare: "Simpan & Bagikan",
    shareCardHint: "Tip: unduh gambarnya, lalu upload ke Instagram Story.",
    shareCardDownloaded: "Gambar tersimpan! Bagikan ke Instagram atau WhatsApp.",
    shareCardFallbackHint: "Caption disalin & gambar diunduh — tempel di mana saja!",
    shareCardFailed: "Gagal membuat gambar. Silakan coba lagi.",

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
    recycleConfirmDesc: "Kamu akan mendapat +{value} Bushido Coin. Tindakan ini tidak bisa dibatalkan.",
    yourCollection: "Koleksi hadiah dari tarikan Bushido Gacha kamu.",

    // Draw History
    drawHistory: "Riwayat Tarikan",
    drawHistoryDesc: "Catatan semua tarikan gacha kamu.",
    noDrawsYet: "Belum ada tarikan — ayo coba keberuntunganmu!",

    // Sold Out
    soldOut: "Habis Terjual",
    soldOutDesc: "Semua hadiah sudah ditarik!",
    insufficientCoins: "Koin tidak cukup! Isi ulang untuk melanjutkan tarikan.",
    pityReady: "🔥 Tarikan berikutnya dijamin Tingkat A atau lebih tinggi!",
    pityProgress: "Pity Meter Bertambah!",
    pityProgressDesc: "Kamu makin dekat dengan hadiah jaminan.",
    pityReset: "Pity Meter Reset!",
    pityResetDesc: "Kamu menang hadiah langka — meter dimulai ulang.",
    pityReadyPopupDesc: "Hadiah pity kamu siap diklaim.",
    pityNextDrawGuaranteed: "Tarikan berikutnya dijamin Tingkat {tier}!",
    drawNow: "Tarik Sekarang",
    keepDrawing: "Lanjut Tarik",

    // Top Up
    topUpCoins: "Isi Ulang Bushido Coin",
    topUpDesc: "Pilih paket koin untuk tarikan gacha kamu",
    bestValue: "TERBAIK",
    perCoin: "koin",
    paymentMethods: "Metode pembayaran tersedia (simulasi)",
    confirmPurchase: "Konfirmasi Pembelian",
    confirmPurchaseDesc: "Periksa pesananmu sebelum melanjutkan",
    purchaseSuccess: "Pembelian Berhasil!",
    purchaseSuccessDesc: "+{coins} Bushido Coin ditambahkan!",
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
    aboutSubtitle: "Kami membangun Bushido Gacha — platform gacha online Indonesia terpercaya — dengan fokus pada Fair Play, Transparansi, dan Komunitas.",
    aboutStoryTitle: "Cerita Kami",
    aboutStoryP1: "PT. BUSHIDO TOVARICH TECHNOLOGY adalah perusahaan teknologi asal Indonesia yang membangun produk hiburan digital dengan semangat Fair Play. Bushido Gacha lahir dari satu keyakinan sederhana: setiap pemain berhak mendapat kesempatan jujur, peluang yang transparan, dan pengalaman seru tanpa trik tersembunyi.",
    aboutStoryP2: "Kami menggabungkan disiplin Jepang (Bushido) dengan keberanian inovasi lokal (Tovarich) untuk menghadirkan platform gacha online yang terpercaya. Mulai dari algoritma undian yang terbukti adil, sistem Pity yang transparan, hingga fitur kirim koin antar pemain — semua dirancang untuk komunitas Indonesia.",
    aboutValuesTitle: "Nilai-Nilai Kami",
    aboutValueFairTitle: "Fair Play",
    aboutValueFairDesc: "Setiap undian provably fair, peluang dipublikasikan, tanpa manipulasi tersembunyi. Sistem gacha adil dari awal sampai akhir.",
    aboutValueInnovationTitle: "Inovasi Berani",
    aboutValueInnovationDesc: "Pity System, Last-One Prize, transfer koin sosial, dan prize pool real-time — mendorong batas pengalaman gacha online.",
    aboutValueCommunityTitle: "Komunitas Utama",
    aboutValueCommunityDesc: "Dibangun oleh gamer untuk gamer. Masukan kamu membentuk setiap update Bushido Gacha.",
    aboutValueTransparencyTitle: "Transparansi Penuh",
    aboutValueTransparencyDesc: "Peluang terbuka, pool hadiah publik, aturan jelas, dan ledger koin — apa yang kamu lihat adalah yang kamu dapatkan.",
    aboutCtaTitle: "Siap Menarik Takdirmu?",
    aboutCtaDesc: "Bergabung dengan ribuan pemain dan rasakan simulasi gacha terpercaya hari ini.",

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

    // SEO Homepage long-form copy
    seoHomeTitle: "Bushido Gacha — Platform Gacha Online Indonesia Terpercaya",
    seoHomeDesc: "Bushido Gacha adalah platform gacha online Indonesia terpercaya. Simulasi gacha terpercaya, sistem gacha adil, jaminan Pity System, dan transfer koin antar pemain.",
    seoSectionWhyTitle: "Kenapa Bushido Gacha Jadi Platform Gacha Online Indonesia Terpercaya",
    seoSectionWhyP1: "Bushido Gacha adalah platform gacha online yang dibangun oleh PT. BUSHIDO TOVARICH TECHNOLOGY untuk komunitas Indonesia yang ingin pengalaman simulasi gacha terpercaya. Setiap tarikan menggunakan sistem gacha adil dengan algoritma provably fair — peluang dipublikasikan, prize pool real-time, dan tidak ada manipulasi tersembunyi di balik layar.",
    seoSectionWhyP2: "Berbeda dengan situs gacha biasa, pool kami terbatas. Begitu stok habis, kampanye ditutup — tidak ada loop tak terbatas, tidak ada ilusi prize yang dilebih-lebihkan. Inilah yang membuat Bushido Gacha jadi salah satu platform gacha online di Indonesia yang paling transparan saat ini.",
    seoPityTitle: "Jaminan Pity System yang Transparan",
    seoPityP1: "Kami paham frustrasi saat keberuntungan sedang tidak berpihak. Karena itu kami membangun Pity System yang menjamin kamu mendapat hadiah tier langka setelah sejumlah tarikan tertentu. Penghitung pity ditampilkan jelas di halaman inventori kamu — tanpa tebak-tebakan, tanpa janji palsu. Inilah komitmen kami pada sistem gacha adil yang membuat setiap pemain tetap di permainan.",
    seoPityP2: "Saat pity meter penuh, tarikan berikutnya dijamin Tingkat A atau lebih tinggi. Setelah hadiah pity diklaim, meter direset secara transparan — sesuai aturan yang berlaku.",
    seoCoinTransferTitle: "Fitur Sosial: Kirim Koin ke Player Lain",
    seoCoinTransferP1: "Bushido Gacha bukan hanya pengalaman solo. Lewat fitur Coin Transfer peer-to-peer, kamu bisa mengirim Bushido Coin langsung ke teman — buat merayakan kemenangan, membantu rekan satu komunitas, atau ngadain event bareng.",
    seoCoinTransferHowTitle: "Cara Kirim Koin ke Player Lain",
    seoCoinTransferStep1: "Buka menu Kirim Koin dari halaman profil kamu.",
    seoCoinTransferStep2: "Masukkan email penerima dan jumlah koin.",
    seoCoinTransferStep3: "Konfirmasi transfer — koin langsung sampai ke dompet penerima secara instan.",
    seoCoinTransferP2: "Setiap transfer tercatat di coin ledger sehingga pengirim dan penerima sama-sama punya catatan yang transparan.",
    seoUspTitle: "Simulasi Gacha Terpercaya untuk Indonesia",
    seoUspP1: "Mulai dari kampanye limited pool, prize pool real-time, hadiah Last-One eksklusif, redeem store berbasis ticket, hingga leaderboard komunitas — setiap fitur di Bushido Gacha dirancang supaya kamu merasakan pengalaman gacha yang jujur, seru, dan rewarding.",
    seoUspP2: "Bergabung dengan ribuan pemain Indonesia yang sudah percaya Bushido Gacha sebagai platform gacha online andalan mereka. Coba keberuntunganmu hari ini dan rasakan bedanya sistem gacha adil yang sesungguhnya.",
    seoSendCoins: "Kirim Koin",
    seoLearnMore: "Pelajari Lebih Lanjut",

    // Legal
    termsAndConditions: "Syarat & Ketentuan",
    privacyPolicy: "Kebijakan Privasi",

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

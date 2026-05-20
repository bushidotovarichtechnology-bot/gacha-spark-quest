import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Locale = "en" | "id";

const translations = {
  en: {
    // Navbar
    home: "Home",
    myInventory: "My Inventory",
    bushidoCoins: "Bushido Coin",

    // Hero
    wayOfFortune: "⚔️ Exclusive Collectibles Await",
    drawYour: "Unbox Your",
    destiny: "Collection",
    heroDesc: "Limited stock. Exclusive products. Every purchase brings you closer to the ultimate collectible.",
    testYourLuck: "Start Your Collection Now!",

    // Features
    verifiedFair: "Verified Fair",
    verifiedFairDesc: "Verified purchases with transparent odds",
    limitedPools: "Limited Stock",
    limitedPoolsDesc: "Once stock sells out, the collection closes",
    pitySystem: "Product Guarantee",
    pitySystemDesc: "Guaranteed exclusive product after a set number of purchases",
    lastOnePrize: "Last Buyer Bonus",
    lastOnePrizeDesc: "The last buyer gets an exclusive bonus product",

    // Index
    liveNow: "Live Now",
    featuredCampaigns: "Featured Campaigns",
    companyName: "PT. BUSHIDO TOVARICH TECHNOLOGY",
    allRightsReserved: "© 2026 BUSHIDO VAULT — All rights reserved",

    // Campaign Card
    ticket: " coins",
    remaining: "Remaining",
    hot: "HOT",
    almostGone: "Almost Gone!",

    // Campaign Detail
    backToCampaigns: "Back to Campaigns",
    prizePool: "Prize Pool",
    left: "left",
    lastOnePrizeTitle: "Last Buyer Bonus",
    lastOnePrizeDetail: "The last buyer gets an exclusive bonus product!",
    price: "Price",
    draw1x: "Buy 1x",
    draw10x: "Buy 10x",
    drawing: "Processing...",
    drawingMulti: "Processing {count}x...",

    // Prize tiers
    grandPrize: "Main Product",
    tierA: "Collection A",
    tierB: "Collection B",
    tierC: "Collection C",

    // Prize Reveal Modal
    drawResult: "{count}x Purchase Result",
    youDrew: "You Got",
    grandPrizeFire: "🔥 MAIN PRODUCT 🔥",
    claimReward: "Claim Product!",
    continue: "Continue",
    skipAll: "Skip All",
    drawSummary: "Summary",
    sharePrize: "Share Prize",
    shareTitle: "Share your win!",
    shareDesc: "Let your friends know what collectible you got at Bushido Vault",
    shareWhatsapp: "WhatsApp",
    shareFacebook: "Facebook",
    shareTwitter: "Twitter / X",
    shareInstagram: "Instagram",
    shareCopyLink: "Copy Link",
    shareMore: "More",
    shareCopied: "Link copied! Paste it on Instagram.",
    shareInstagramHint: "Instagram doesn't allow direct web sharing. We've copied the link — paste it in your Story or DM.",
    shareCaption: "🎉 I just got {prize} (Collection {tier}) from the {campaign} campaign on Bushido Vault! ✨ Get yours too 👉",
    shareCaptionNoCampaign: "🎉 I just got {prize} (Collection {tier}) on Bushido Vault! ✨ Get yours too 👉",
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
    shareFacebookHint: "Caption copied! Paste it in the Facebook composer. Facebook will pull the prize image automatically from the link.",
    shareCardFailed: "Failed to generate image. Please try again.",
    shareCardPreview: "Preview",
    shareCaptionPreview: "Caption preview",
    shareCardPreviewHint: "Tap outside to close",

    // Inventory
    totalItems: "Total Items",
    rareItems: "Rare+ Items",
    recyclable: "Recyclable",
    pityCounter: "Pity Counter",
    moreDrawsForTierA: "more purchases for guaranteed Collection A!",
    draws: "purchases",
    all: "All",
    grand: "Grand",
    noItemsCategory: "No items in this category",
    noPrizesYet: "No products yet — start your collection!",
    recycle: "Recycle",
    recycledTitle: "Recycled \"{name}\"",
    recycledDesc: "+{value} Bushido Coins earned!",
    recycleConfirmTitle: "Recycle this prize?",
    recycleConfirmDesc: "You will receive +{value} Bushido Coin. This action cannot be undone.",
    yourCollection: "Your exclusive product collection from Bushido Vault.",

    // Draw History
    drawHistory: "Purchase History",
    drawHistoryDesc: "A log of all your past purchases.",
    noDrawsYet: "No purchases yet — start your collection!",

    // Sold Out
    soldOut: "Sold Out",
    soldOutDesc: "All prizes have been drawn!",
    insufficientCoins: "Not enough coins! Top up to continue purchasing.",
    pityReady: "🔥 Next purchase guarantees Collection A or higher!",
    pityProgress: "Product Guarantee Updated!",
    pityProgressDesc: "You're getting closer to a guaranteed product.",
    pityReset: "Product Guarantee Reset!",
    pityResetDesc: "You got an exclusive product — guarantee restarts.",
    pityReadyPopupDesc: "Your guaranteed product is ready to claim.",
    pityNextDrawGuaranteed: "Next purchase guarantees Collection {tier}!",
    drawNow: "Buy Now",
    keepDrawing: "Keep Buying",

    // Top Up
    topUpCoins: "Top Up Coins",
    topUpDesc: "Choose a coin package to start shopping exclusive collectibles",
    bestValue: "BEST VALUE",
    perCoin: "coin",
    paymentMethods: "Available payment methods (simulation)",
    confirmPurchase: "Confirm Purchase",
    confirmPurchaseDesc: "Review your order before proceeding",
    purchaseSuccess: "Purchase Successful!",
    purchaseSuccessDesc: "+{coins} Bushido Coins added!",
    processing: "Processing...",
    payNow: "Pay Now",
    simulationNote: "This is a simulated purchase — no real payment is charged.",
    topUp: "Top Up",

    // Auth
    login: "Login",
    loginDesc: "Sign in to your Bushido Vault account",
    loginFailed: "Login failed",
    loginSuccess: "Welcome back!",
    loginWithGoogle: "Sign in with Google",
    register: "Register",
    registerDesc: "Create a new Bushido Vault account",
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
    claimPrize: "Claim Product",
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
    claimSubmittedDesc: "Your product claim has been submitted. We'll process it soon!",
    claimFailed: "Claim failed",
    tierSLabel: "Main Product",
    tierALabel: "Collection A",
    tierBLabel: "Collection B",
    tierCLabel: "Collection C",

    // Claim History
    claimHistory: "Claim History",
    claimHistoryDesc: "Track the status of your product claims.",
    noClaimsYet: "No claims yet — claim a product from your inventory!",

    // About Us
    aboutUs: "About Us",
    aboutTitle: "About PT. BUSHIDO TOVARICH TECHNOLOGY",
    aboutSubtitle: "We build Bushido Vault — Indonesia's trusted online collectibles platform — with a focus on Fair Play, Transparency, and Community.",
    aboutStoryTitle: "Our Story",
    aboutStoryP1: "PT. BUSHIDO TOVARICH TECHNOLOGY is an Indonesian technology company that develops digital entertainment products with a Fair Play mindset. Bushido Vault is born from one simple belief: every player deserves an honest chance, transparent odds, and a fun experience without hidden tricks.",
    aboutStoryP2: "We combine Japanese discipline (Bushido) with bold local innovation (Tovarich) to create a trusted online collectible platform. From provably fair purchases algorithms, a transparent Product Guarantee, to peer-to-peer coin transfer — every feature is designed for the Indonesian community first.",
    aboutValuesTitle: "Our Values",
    aboutValueFairTitle: "Fair Play",
    aboutValueFairDesc: "Verified transparent purchases, public odds, no hidden manipulation. A truly fair collectible system from start to finish.",
    aboutValueInnovationTitle: "Bold Innovation",
    aboutValueInnovationDesc: "Product Guarantee, Last Buyer Bonus, social coin transfer, and real-time stock — pushing what an online collectibles platform can be.",
    aboutValueCommunityTitle: "Community First",
    aboutValueCommunityDesc: "Built by collectors for collectors. Your feedback shapes every Bushido Vault update.",
    aboutValueTransparencyTitle: "Full Transparency",
    aboutValueTransparencyDesc: "Open odds, public prize pools, clear rules, and a coin ledger — what you see is exactly what you get.",
    aboutCtaTitle: "Ready to Start Your Collection?",
    aboutCtaDesc: "Join thousands of collectors and get your exclusive products today.",

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
    seoHomeTitle: "Bushido Vault — Trusted Online Mystery Box Collectibles Platform in Indonesia",
    seoHomeDesc: "Bushido Vault is a trusted online collectibles simulation platform in Indonesia. Fair collectibles system, transparent Pity System, and peer-to-peer coin transfer.",
    seoSectionWhyTitle: "Why Bushido Vault is the Trusted Online Collectibles Platform in Indonesia",
    seoSectionWhyP1: "Bushido Vault is an online collectible platform built by PT. BUSHIDO TOVARICH TECHNOLOGY for the Indonesian community that wants a trusted collectible simulation experience. Every purchase uses a fair purchase system with provably fair algorithms — odds are public, prize pools are real-time, and there is no hidden manipulation behind the scenes.",
    seoSectionWhyP2: "Unlike conventional collectible sites, our pool is limited. Once stock runs out, the campaign closes — no infinite loops, no inflated illusions. This is what makes Bushido Vault one of the most transparent online collectible platforms in Indonesia today.",
    seoPityTitle: "Transparent Product Guarantee System",
    seoPityP1: "We understand the frustration of waiting for the right product. That is why we built a Product Guarantee that guarantees an exclusive product after a specific number of purchases. The pity counter is fully visible on your inventory page — no guessing, no fake hope. This is our commitment to a fair gacha system that keeps every player in the game.",
    seoPityP2: "When the guarantee meter is full, your next purchase is guaranteed Collection A or higher. Once claimed, the meter resets transparently — exactly like the rules say.",
    seoCoinTransferTitle: "Social Feature: Send Coins to Other Players",
    seoCoinTransferP1: "Bushido Vault is more than a solo experience. With our peer-to-peer Coin Transfer feature, you can send Bushido Coin directly to friends — to celebrate a win, help a teammate, or set up a community event.",
    seoCoinTransferHowTitle: "How to Send Coins to Other Users",
    seoCoinTransferStep1: "Open the Send Coins menu from your profile.",
    seoCoinTransferStep2: "Enter the recipient's email and the coin amount.",
    seoCoinTransferStep3: "Confirm the transfer — coins arrive instantly in the recipient's wallet.",
    seoCoinTransferP2: "Every transfer is recorded in the coin ledger so both sender and receiver have a fully transparent record.",
    seoUspTitle: "Indonesia's Trusted Mystery Box Collectibles Platform",
    seoUspP1: "From limited pool campaigns, real-time prize pools, exclusive Last Buyer Bonus, ticket-based redeem store, to community leaderboards — every feature on Bushido Vault is designed so you feel an honest, exciting, and rewarding collectibles experience.",
    seoUspP2: "Join thousands of Indonesian players who already trust Bushido Vault as their go-to online collectibles platform. Test your collection today and feel the difference of a truly transparent system.",
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
    wayOfFortune: "⚔️ Koleksi Eksklusif Menanti",
    drawYour: "Buka",
    destiny: "Koleksimu",
    heroDesc: "Stok terbatas. Produk eksklusif. Setiap pembelian membawamu lebih dekat ke item kolektibel utama.",
    testYourLuck: "Mulai Koleksi Sekarang!",

    // Features
    verifiedFair: "Dijamin Adil",
    verifiedFairDesc: "Setiap pembelian terverifikasi dengan sistem transparan",
    limitedPools: "Stok Terbatas",
    limitedPoolsDesc: "Setelah stok habis, koleksi ditutup",
    pitySystem: "Jaminan Produk",
    pitySystemDesc: "Jaminan mendapat produk eksklusif setelah sejumlah pembelian",
    lastOnePrize: "Bonus Pembeli Terakhir",
    lastOnePrizeDesc: "Pembeli terakhir mendapatkan bonus produk eksklusif",

    // Index
    liveNow: "Sedang Berlangsung",
    featuredCampaigns: "Kampanye Unggulan",
    companyName: "PT. BUSHIDO TOVARICH TECHNOLOGY",
    allRightsReserved: "© 2026 BUSHIDO VAULT — Hak cipta dilindungi",

    // Campaign Card
    ticket: " koin",
    remaining: "Tersisa",
    hot: "POPULER",
    almostGone: "Hampir Habis!",

    // Campaign Detail
    backToCampaigns: "Kembali ke Kampanye",
    prizePool: "Kolam Hadiah",
    left: "tersisa",
    lastOnePrizeTitle: "Bonus Pembeli Terakhir",
    lastOnePrizeDetail: "Pembeli terakhir mendapatkan bonus produk eksklusif!",
    price: "Harga",
    draw1x: "Beli 1x",
    draw10x: "Beli 10x",
    drawing: "Memproses...",
    drawingMulti: "Memproses {count}x...",

    // Prize tiers
    grandPrize: "Produk Utama",
    tierA: "Koleksi A",
    tierB: "Koleksi B",
    tierC: "Koleksi C",

    // Prize Reveal Modal
    drawResult: "Hasil Pembelian {count}x",
    youDrew: "Kamu Mendapatkan",
    grandPrizeFire: "🔥 PRODUK UTAMA 🔥",
    claimReward: "Ambil Produk!",
    continue: "Lanjutkan",
    skipAll: "Lewati Semua",
    drawSummary: "Ringkasan",
    sharePrize: "Bagikan Hadiah",
    shareTitle: "Pamerkan Kemenanganmu!",
    shareDesc: "Bagikan ke teman-temanmu produk kolektibel yang kamu dapatkan di Bushido Vault",
    shareWhatsapp: "WhatsApp",
    shareFacebook: "Facebook",
    shareTwitter: "Twitter / X",
    shareInstagram: "Instagram",
    shareCopyLink: "Salin Tautan",
    shareMore: "Lainnya",
    shareCopied: "Tautan disalin! Tempel di Instagram.",
    shareInstagramHint: "Instagram tidak mengizinkan share langsung dari web. Kami sudah menyalin tautannya — tempel di Story atau DM kamu.",
    shareCaption: "🎉 Aku baru saja mendapat {prize} (Koleksi {tier}) dari campaign {campaign} di Bushido Vault! ✨ Dapatkan koleksimu juga 👉",
    shareCaptionNoCampaign: "🎉 Aku baru saja mendapat {prize} (Koleksi {tier}) di Bushido Vault! ✨ Dapatkan koleksimu juga 👉",
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
    shareFacebookHint: "Caption disalin! Tempel di kolom posting Facebook. Facebook akan otomatis menarik gambar hadiah dari tautannya.",
    shareCardFailed: "Gagal membuat gambar. Silakan coba lagi.",
    shareCardPreview: "Pratinjau",
    shareCaptionPreview: "Pratinjau caption",
    shareCardPreviewHint: "Klik di luar untuk menutup",

    // Inventory
    totalItems: "Total Item",
    rareItems: "Item Langka+",
    recyclable: "Bisa Didaur Ulang",
    pityCounter: "Penghitung Pity",
    moreDrawsForTierA: "pembelian lagi untuk jaminan Koleksi A!",
    draws: "pembelian",
    all: "Semua",
    grand: "Utama",
    noItemsCategory: "Tidak ada item di kategori ini",
    noPrizesYet: "Belum ada produk — ayo mulai koleksi!",
    recycle: "Daur Ulang",
    recycledTitle: "Didaur ulang \"{name}\"",
    recycledDesc: "+{value} Bushido Coin diperoleh!",
    recycleConfirmTitle: "Daur ulang hadiah ini?",
    recycleConfirmDesc: "Kamu akan mendapat +{value} Bushido Coin. Tindakan ini tidak bisa dibatalkan.",
    yourCollection: "Koleksi produk eksklusif Bushido Vault kamu.",

    // Draw History
    drawHistory: "Riwayat Pembelian",
    drawHistoryDesc: "Catatan semua pembelian koleksi kamu.",
    noDrawsYet: "Belum ada pembelian — ayo mulai koleksi!",

    // Sold Out
    soldOut: "Habis Terjual",
    soldOutDesc: "Semua hadiah sudah ditarik!",
    insufficientCoins: "Koin tidak cukup! Isi ulang untuk melanjutkan pembelian.",
    pityReady: "🔥 Pembelian berikutnya dijamin Koleksi A atau lebih tinggi!",
    pityProgress: "Jaminan Produk Bertambah!",
    pityProgressDesc: "Kamu makin dekat dengan produk jaminan.",
    pityReset: "Jaminan Produk Reset!",
    pityResetDesc: "Kamu mendapat produk eksklusif — jaminan dimulai ulang.",
    pityReadyPopupDesc: "Produk jaminan kamu siap diambil.",
    pityNextDrawGuaranteed: "Pembelian berikutnya dijamin Koleksi {tier}!",
    drawNow: "Beli Sekarang",
    keepDrawing: "Lanjut Beli",

    // Top Up
    topUpCoins: "Isi Ulang Bushido Coin",
    topUpDesc: "Pilih paket koin untuk mulai berbelanja koleksi eksklusifmu",
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
    loginDesc: "Masuk ke akun Bushido Vault kamu",
    loginFailed: "Gagal masuk",
    loginSuccess: "Selamat datang kembali!",
    loginWithGoogle: "Masuk dengan Google",
    register: "Daftar",
    registerDesc: "Buat akun Bushido Vault baru",
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
    claimPrize: "Ambil Produk",
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
    claimSubmittedDesc: "Permintaan pengambilanmu telah dikirim. Kami akan segera memprosesnya!",
    claimFailed: "Klaim gagal",
    tierSLabel: "Produk Utama",
    tierALabel: "Koleksi A",
    tierBLabel: "Koleksi B",
    tierCLabel: "Koleksi C",

    // Claim History
    claimHistory: "Riwayat Klaim",
    claimHistoryDesc: "Pantau status pengambilan produk kamu.",
    noClaimsYet: "Belum ada klaim — ambil produk dari inventori kamu!",

    // About Us
    aboutUs: "Tentang Kami",
    aboutTitle: "Tentang PT. BUSHIDO TOVARICH TECHNOLOGY",
    aboutSubtitle: "Kami membangun Bushido Vault — platform kolektibel online Indonesia terpercaya — dengan fokus pada Fair Play, Transparansi, dan Komunitas.",
    aboutStoryTitle: "Cerita Kami",
    aboutStoryP1: "PT. BUSHIDO TOVARICH TECHNOLOGY adalah perusahaan teknologi asal Indonesia yang membangun produk hiburan digital dengan semangat Fair Play. Bushido Vault lahir dari satu keyakinan sederhana: setiap pemain berhak mendapat kesempatan jujur, peluang yang transparan, dan pengalaman seru tanpa trik tersembunyi.",
    aboutStoryP2: "Kami menggabungkan disiplin Jepang (Bushido) dengan keberanian inovasi lokal (Tovarich) untuk menghadirkan platform kolektibel online yang terpercaya. Mulai dari algoritma pembelian yang terbukti adil, sistem Pity yang transparan, hingga fitur kirim koin antar pemain — semua dirancang untuk komunitas Indonesia.",
    aboutValuesTitle: "Nilai-Nilai Kami",
    aboutValueFairTitle: "Fair Play",
    aboutValueFairDesc: "Setiap pembelian terverifikasi secara transparan, peluang dipublikasikan, tanpa manipulasi tersembunyi. Sistem kolektibel yang adil dari awal sampai akhir.",
    aboutValueInnovationTitle: "Inovasi Berani",
    aboutValueInnovationDesc: "Jaminan Produk, Bonus Pembeli Terakhir, transfer koin sosial, dan stok real-time — mendorong batas pengalaman belanja kolektibel online.",
    aboutValueCommunityTitle: "Komunitas Utama",
    aboutValueCommunityDesc: "Dibangun oleh kolektor untuk kolektor. Masukan kamu membentuk setiap update Bushido Vault.",
    aboutValueTransparencyTitle: "Transparansi Penuh",
    aboutValueTransparencyDesc: "Peluang terbuka, pool hadiah publik, aturan jelas, dan ledger koin — apa yang kamu lihat adalah yang kamu dapatkan.",
    aboutCtaTitle: "Siap Mulai Koleksimu?",
    aboutCtaDesc: "Bergabung dengan ribuan kolektor dan dapatkan produk eksklusif pilihanmu hari ini.",

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
    seoHomeTitle: "Bushido Vault — Platform Kolektibel Mystery Box Online Indonesia Terpercaya",
    seoHomeDesc: "Bushido Vault adalah platform mystery box kolektibel online Indonesia terpercaya. Sistem transparan, jaminan produk eksklusif, dan transfer koin antar pengguna.",
    seoSectionWhyTitle: "Kenapa Bushido Vault Jadi Platform Kolektibel Online Indonesia Terpercaya",
    seoSectionWhyP1: "Bushido Vault adalah platform kolektibel online yang dibangun oleh PT. BUSHIDO TOVARICH TECHNOLOGY untuk komunitas Indonesia yang ingin pengalaman kolektibel terpercaya. Setiap pembelian menggunakan sistem kolektibel adil dengan algoritma provably fair — peluang dipublikasikan, prize pool real-time, dan tidak ada manipulasi tersembunyi di balik layar.",
    seoSectionWhyP2: "Berbeda dengan situs kolektibel biasa, pool kami terbatas. Begitu stok habis, kampanye ditutup — tidak ada loop tak terbatas, tidak ada ilusi prize yang dilebih-lebihkan. Inilah yang membuat Bushido Vault jadi salah satu platform kolektibel online di Indonesia yang paling transparan saat ini.",
    seoPityTitle: "Sistem Jaminan Produk yang Transparan",
    seoPityP1: "Kami paham frustrasi saat stok produk yang diinginkan belum muncul. Karena itu kami membangun Jaminan Produk yang menjamin kamu mendapat produk eksklusif setelah sejumlah pembelian tertentu. Penghitung pity ditampilkan jelas di halaman inventori kamu — tanpa tebak-tebakan, tanpa janji palsu. Inilah komitmen kami pada sistem yang adil yang membuat setiap pemain tetap di permainan.",
    seoPityP2: "Saat pity meter penuh, pembelian berikutnya dijamin Koleksi A atau lebih tinggi. Setelah produk jaminan diklaim, meter direset secara transparan — sesuai aturan yang berlaku.",
    seoCoinTransferTitle: "Fitur Sosial: Kirim Koin ke Player Lain",
    seoCoinTransferP1: "Bushido Vault bukan hanya pengalaman solo. Lewat fitur Coin Transfer peer-to-peer, kamu bisa mengirim Bushido Coin langsung ke teman — buat merayakan kemenangan, membantu rekan satu komunitas, atau ngadain event bareng.",
    seoCoinTransferHowTitle: "Cara Kirim Koin ke Pengguna Lain",
    seoCoinTransferStep1: "Buka menu Kirim Koin dari halaman profil kamu.",
    seoCoinTransferStep2: "Masukkan email penerima dan jumlah koin.",
    seoCoinTransferStep3: "Konfirmasi transfer — koin langsung sampai ke dompet penerima secara instan.",
    seoCoinTransferP2: "Setiap transfer tercatat di coin ledger sehingga pengirim dan penerima sama-sama punya catatan yang transparan.",
    seoUspTitle: "Platform Kolektibel Mystery Box Terpercaya untuk Indonesia",
    seoUspP1: "Mulai dari kampanye limited pool, prize pool real-time, Bonus Pembeli Terakhir eksklusif, redeem store berbasis tiket, hingga leaderboard komunitas — setiap fitur di Bushido Vault dirancang supaya kamu merasakan pengalaman kolektibel yang jujur, seru, dan rewarding.",
    seoUspP2: "Bergabung dengan ribuan pemain Indonesia yang sudah percaya Bushido Vault sebagai platform kolektibel online andalan mereka. Coba koleksimu hari ini dan rasakan bedanya sistem transparan yang sesungguhnya.",
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

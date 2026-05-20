import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  HelpCircle,
  Swords,
  Settings2,
  Coins,
  Gift,
  Ticket,
  Repeat,
  Package,
  ShieldCheck,
  Phone,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FAQItem = { q: string; a: string };
type FAQCategory = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FAQItem[];
};

const categories: FAQCategory[] = [
  {
    id: "tentang",
    title: "Tentang Bushido Vault",
    icon: Swords,
    items: [
      {
        q: "Apa itu Bushido Vault?",
        a: "Bushido Vault adalah platform kolektibel online berproduk fisik yang beroperasi di Indonesia. Kamu bisa melakukan pembelian untuk mendapatkan berbagai produk menarik seperti PlayStation 5, Nintendo Switch, action figure, dan masih banyak lagi — semua produk dikirim secara fisik ke alamatmu.",
      },
      {
        q: "Apakah Bushido Vault aman dan terpercaya?",
        a: "Ya. Bushido Vault beroperasi secara transparan dengan menampilkan drop rate setiap produk secara terbuka. Setiap produk yang berhasil diklaim akan dikirimkan secara fisik melalui jasa ekspedisi ke alamat penerima. Kamu juga bisa melihat riwayat penerima di halaman Wall of Winners kami.",
      },
      {
        q: "Apakah Bushido Vault termasuk judi online?",
        a: "Tidak. Bushido Vault berbeda dari judi online karena setiap pembelian yang kamu lakukan dijamin menghasilkan produk fisik nyata. Kami juga memiliki sistem pity yang menjamin kamu mendapatkan produk tertentu setelah melakukan pembelian dalam jumlah yang sudah ditentukan — artinya tidak ada istilah \"zonk\" atau kehilangan uang tanpa hasil.",
      },
    ],
  },
  {
    id: "pity",
    title: "Sistem Pity",
    icon: Settings2,
    items: [
      {
        q: "Apa itu sistem pity?",
        a: "Sistem pity adalah mekanisme garansi produk di Bushido Vault. Setiap kali kamu melakukan pembelian, progress pity-mu akan bertambah. Setelah mencapai jumlah pembelian tertentu yang sudah ditentukan di setiap campaign, kamu dijamin mendapatkan produk utama — terlepas dari faktor keberuntungan.",
      },
      {
        q: "Apakah progress pity saya akan hilang setelah dapat produk pity?",
        a: "Ya, progress pity akan direset setelah kamu mendapatkan produk melalui sistem pity. Namun kamu bisa mulai mengumpulkan progress pity kembali dari awal.",
      },
      {
        q: "Di mana saya bisa melihat progress pity saya?",
        a: "Progress pity bisa kamu lihat secara real-time di halaman campaign kolektibel dalam bentuk progress bar, serta di halaman profil kamu.",
      },
    ],
  },
  {
    id: "koin",
    title: "Koin & Pembelian",
    icon: Coins,
    items: [
      {
        q: "Bagaimana cara mendapatkan koin?",
        a: "Koin bisa dibeli langsung melalui halaman pembelian di website kami menggunakan berbagai metode pembayaran yang tersedia.",
      },
      {
        q: "Metode pembayaran apa saja yang tersedia?",
        a: "Kami menerima pembayaran melalui transfer bank, QRIS, dan berbagai e-wallet populer yang didukung oleh Midtrans.",
      },
      {
        q: "Apakah koin bisa di-refund?",
        a: "Koin yang sudah dibeli tidak dapat di-refund. Pastikan kamu sudah memahami cara kerja sistem kolektibel dan pity sebelum melakukan pembelian. Jika ada kendala teknis dalam proses pembelian, segera hubungi tim kami.",
      },
      {
        q: "Apakah koin memiliki masa berlaku?",
        a: "Koin tidak memiliki masa berlaku selama akunmu masih aktif.",
      },
    ],
  },
  {
    id: "gift",
    title: "Gift Koin",
    icon: Gift,
    items: [
      {
        q: "Apa itu fitur Gift Koin?",
        a: "Fitur Gift Koin memungkinkan kamu mengirimkan koin ke sesama pengguna Bushido Vault. Cocok untuk berbagi kesenangan berbelanja kolektibel bersama teman atau hadiah spesial untuk orang terdekat.",
      },
      {
        q: "Apakah ada batas minimum atau maksimum untuk gift koin?",
        a: "Tidak ada batas minimum untuk gift koin. Kamu bebas mengirimkan koin berapa pun sesuai saldo yang kamu miliki.",
      },
      {
        q: "Bagaimana cara melakukan gift koin?",
        a: "Masuk ke fitur Gift Koin, masukkan username atau ID penerima, tentukan jumlah koin yang ingin dikirim, lalu konfirmasi pengiriman. Koin akan langsung masuk ke akun penerima.",
      },
    ],
  },
  {
    id: "ticket",
    title: "Bushido Ticket",
    icon: Ticket,
    items: [
      {
        q: "Apa itu Bushido Ticket?",
        a: "Bushido Ticket adalah tiket yang kamu dapatkan setiap kali melakukan 1x pembelian. Tiket ini bisa dikumpulkan dan ditukarkan dengan produk pilihan di halaman Bushido Ticket.",
      },
      {
        q: "Berapa tiket yang didapat per pembelian?",
        a: "Setiap 1x pembelian memberikan 1 Bushido Ticket, terlepas dari produk yang kamu dapatkan.",
      },
      {
        q: "Apakah Bushido Ticket bisa expired?",
        a: "Informasi masa berlaku Bushido Ticket akan ditampilkan di halaman Bushido Ticket. Pastikan kamu menukarkan tiket sebelum masa berlakunya habis.",
      },
    ],
  },
  {
    id: "trade",
    title: "Trade Produk",
    icon: Repeat,
    items: [
      {
        q: "Apa itu fitur Trade Produk?",
        a: "Trade Produk adalah fitur yang memungkinkan kamu menukarkan produk yang sudah kamu dapatkan dengan produk milik pengguna lain. Cocok jika kamu mendapatkan produk yang kurang sesuai selera dan ingin menukarnya dengan produk yang lebih kamu inginkan.",
      },
      {
        q: "Bagaimana cara melakukan trade produk?",
        a: "Masuk ke halaman Trade, pilih produk milikmu yang ingin ditukar, lalu cari penawaran trade dari pengguna lain yang sesuai. Kedua pihak harus menyetujui trade sebelum produk berpindah tangan.",
      },
      {
        q: "Apakah trade produk aman?",
        a: "Ya. Sistem trade kami dirancang agar kedua pihak harus menyetujui pertukaran terlebih dahulu sebelum produk berpindah. Tidak ada produk yang berpindah secara sepihak.",
      },
    ],
  },
  {
    id: "klaim",
    title: "Pengambilan & Pengiriman Produk",
    icon: Package,
    items: [
      {
        q: "Bagaimana cara klaim produk?",
        a: "Buka halaman Inventory, pilih produk yang ingin diklaim, lalu isi form pengiriman dengan nama lengkap, nomor WA aktif, dan alamat lengkap beserta kode pos. Setelah klaim diverifikasi, produk akan segera diproses untuk pengiriman.",
      },
      {
        q: "Berapa lama produk sampai setelah diklaim?",
        a: "Produk akan dikirimkan dalam estimasi 7–10 hari kerja setelah klaim berhasil diverifikasi. Nomor resi pengiriman akan tersedia di halaman Claim History kamu setelah paket dikirim.",
      },
      {
        q: "Apakah ada batas maksimal klaim produk?",
        a: "Tidak ada batas maksimal klaim produk per bulan. Selama kamu memiliki produk di inventory, kamu bebas melakukan klaim kapan saja.",
      },
      {
        q: "Bagaimana jika produk rusak atau tidak sesuai saat diterima?",
        a: "Segera hubungi tim Bushido Vault melalui kontak resmi kami dalam waktu 2x24 jam setelah paket diterima dengan menyertakan foto kondisi paket. Tim kami akan membantu menyelesaikan masalah tersebut.",
      },
      {
        q: "Ke mana saya bisa melacak status pengiriman produk saya?",
        a: "Nomor resi pengiriman bisa kamu temukan di halaman Claim History setelah paket dikirim. Gunakan nomor resi tersebut untuk melacak paket di website ekspedisi yang bersangkutan.",
      },
    ],
  },
  {
    id: "akun",
    title: "Akun & Keamanan",
    icon: ShieldCheck,
    items: [
      {
        q: "Bagaimana cara mendaftar di Bushido Vault?",
        a: "Klik tombol Daftar di halaman utama, isi data diri yang diperlukan, lalu verifikasi akunmu. Setelah itu kamu langsung bisa mulai bermain.",
      },
      {
        q: "Apakah data pribadi saya aman?",
        a: "Ya. Kami berkomitmen menjaga kerahasiaan data pribadimu sesuai dengan Kebijakan Privasi yang bisa kamu baca di halaman Privacy Policy kami.",
      },
      {
        q: "Apa yang harus dilakukan jika lupa password?",
        a: "Gunakan fitur \"Lupa Password\" di halaman login. Instruksi reset password akan dikirimkan ke email yang terdaftar.",
      },
    ],
  },
  {
    id: "kontak",
    title: "Bantuan & Kontak",
    icon: Phone,
    items: [
      {
        q: "Bagaimana cara menghubungi tim Bushido Vault?",
        a: "Kamu bisa menghubungi kami melalui WhatsApp di 082231283948 atau email yang tersedia di halaman About Us. Tim kami siap membantu di hari dan jam kerja.",
      },
    ],
  },
];

const highlight = (text: string, query: string) => {
  if (!query.trim()) return text;
  const q = query.trim();
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded bg-primary/30 px-0.5 text-foreground">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
};

const FAQ = () => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [query]);

  const totalResults = filtered.reduce((acc, c) => acc + c.items.length, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="FAQ — Pertanyaan yang Sering Diajukan | Bushido Vault"
        description="Temukan jawaban atas pertanyaan seputar Bushido Vault: sistem pity, koin, gift, Bushido Ticket, trade produk, klaim & pengiriman, serta akun & keamanan."
        canonicalPath="/faq"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: categories.flatMap((c) =>
            c.items.map((it) => ({
              "@type": "Question",
              name: it.q,
              acceptedAnswer: { "@type": "Answer", text: it.a },
            })),
          ),
        }}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Pertanyaan yang Sering Diajukan
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Cari jawaban cepat tentang Bushido Vault — dari jaminan produk, koin, hingga pengambilan koleksi.
            </p>

            {/* Search */}
            <div className="mx-auto mt-7 max-w-xl">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari pertanyaan, misalnya: pity, koin, klaim..."
                  className="h-12 pl-10 pr-4 text-base"
                  aria-label="Cari FAQ"
                />
              </div>
              {query.trim() && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {totalResults} hasil ditemukan untuk &quot;{query.trim()}&quot;
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="pb-20">
        <div className="container mx-auto max-w-4xl px-4">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-card p-10 text-center">
              <p className="text-muted-foreground">
                Tidak ada hasil. Coba kata kunci lain atau hubungi tim kami.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {filtered.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.35, delay: idx * 0.03 }}
                    className="rounded-2xl border border-border/50 bg-card/60 p-4 md:p-6"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="font-display text-lg font-bold tracking-tight md:text-xl">
                        {cat.title}
                      </h2>
                      <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        {cat.items.length}
                      </span>
                    </div>

                    <Accordion
                      type="multiple"
                      defaultValue={query.trim() ? cat.items.map((_, i) => `${cat.id}-${i}`) : []}
                      className="w-full"
                    >
                      {cat.items.map((it, i) => (
                        <AccordionItem
                          key={`${cat.id}-${i}`}
                          value={`${cat.id}-${i}`}
                          className="border-border/50"
                        >
                          <AccordionTrigger className="text-left text-sm font-medium md:text-base">
                            <span className="pr-3">{highlight(it.q, query)}</span>
                          </AccordionTrigger>
                          <AccordionContent className="text-sm leading-relaxed text-muted-foreground md:text-base">
                            {highlight(it.a, query)}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default FAQ;

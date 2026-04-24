import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import TableOfContents, { type TocItem } from "@/components/TableOfContents";
import { useI18n } from "@/context/I18nContext";

const TOC: TocItem[] = [
  { id: "komitmen", label: "Komitmen Kami Terhadap Privasi Anda" },
  { id: "bab-1", label: "BAB I — Data Pribadi yang Kami Kumpulkan" },
  { id: "bab-2", label: "BAB II — Tujuan dan Dasar Hukum Pemrosesan" },
  { id: "bab-3", label: "BAB III — Pengungkapan dan Berbagi Data" },
  { id: "bab-4", label: "BAB IV — Cookies dan Teknologi Pelacak" },
  { id: "bab-5", label: "BAB V — Retensi dan Keamanan Data" },
  { id: "bab-6", label: "BAB VI — Hak-Hak Pengguna" },
  { id: "bab-7", label: "BAB VII — Privasi Anak" },
  { id: "bab-8", label: "BAB VIII — Perubahan Kebijakan Privasi" },
  { id: "bab-9", label: "BAB IX — Hubungi Kami" },
];

const Privacy = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Kebijakan Privasi — Bushido Gacha"
        description="Kebijakan privasi Bushido Gacha. Pelajari bagaimana PT. BUSHIDO TOVARICH TECHNOLOGY mengumpulkan, menggunakan, dan melindungi data pribadi pengguna platform gacha online Indonesia."
        canonicalPath="/privacy"
      />
      <Navbar />

      <section className="relative overflow-hidden pt-24 pb-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Kebijakan Privasi</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
              www.bushidogacha.com · Terakhir diperbarui: 18 April 2025
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 md:mb-8">
              <TableOfContents items={TOC} />
            </div>
          </div>
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-border/50 bg-card p-6 leading-relaxed text-muted-foreground md:p-10"
          >
            <section id="komitmen" className="space-y-3 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-foreground">Komitmen Kami Terhadap Privasi Anda</h2>
              <p>
                PT Perorangan Bushido Gacha selaku pengelola Platform BUSHIDO GACHA ("kami") berkomitmen melindungi dan
                menghormati privasi setiap Pengguna. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan,
                memproses, menyimpan, dan melindungi data pribadi Anda sesuai UU No. 27 Tahun 2022 (UU PDP) dan peraturan
                perundang-undangan Indonesia yang berlaku.
              </p>
              <p>
                Dengan menggunakan layanan kami, Anda menyatakan telah membaca dan memahami Kebijakan Privasi ini. Apabila
                tidak setuju, mohon untuk tidak menggunakan Platform kami.
              </p>
            </section>

            <section id="bab-1" className="space-y-3 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-foreground">BAB I — Data Pribadi yang Kami Kumpulkan</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 1 — Kategori Data</h3>

              <h4 className="font-display text-sm font-semibold text-foreground">A. Data yang Anda Berikan Secara Langsung</h4>
              <ul className="list-disc space-y-1 pl-6">
                <li>Identitas: nama lengkap, tanggal lahir, jenis kelamin, nomor identitas (KTP/SIM/Paspor).</li>
                <li>Informasi kontak: alamat surel, nomor telepon, alamat pengiriman fisik.</li>
                <li>Kredensial akun: nama pengguna, kata sandi (disimpan terenkripsi).</li>
                <li>Informasi pembayaran: nomor kartu (diproses gateway pihak ketiga), data rekening bank, akun e-wallet.</li>
                <li>Informasi tambahan saat menghubungi layanan pelanggan.</li>
              </ul>

              <h4 className="font-display text-sm font-semibold text-foreground">B. Data yang Dikumpulkan Secara Otomatis</h4>
              <ul className="list-disc space-y-1 pl-6">
                <li>Data perangkat: jenis perangkat, OS, identifikasi unik (device ID).</li>
                <li>Data jaringan: alamat IP, jenis & versi peramban, ISP.</li>
                <li>Data penggunaan: halaman dikunjungi, durasi, fitur yang digunakan, riwayat klik.</li>
                <li>Data lokasi: perkiraan berdasarkan IP (bukan GPS presisi).</li>
                <li>Cookies dan teknologi pelacak serupa.</li>
              </ul>

              <h4 className="font-display text-sm font-semibold text-foreground">C. Data dari Pihak Ketiga</h4>
              <ul className="list-disc space-y-1 pl-6">
                <li>Informasi verifikasi identitas dari penyedia verifikasi.</li>
                <li>Data dari platform media sosial saat login dengan akun media sosial.</li>
                <li>Informasi dari mitra bisnis dan afiliasi.</li>
              </ul>
            </section>

            <section id="bab-2" className="space-y-3 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-foreground">BAB II — Tujuan dan Dasar Hukum Pemrosesan</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 2 — Tujuan Penggunaan</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Pembuatan, pengelolaan, dan verifikasi akun.</li>
                <li>Pemenuhan transaksi, pemrosesan pembayaran, pengiriman hadiah.</li>
                <li>Pengelolaan mekanisme gacha & distribusi hadiah.</li>
                <li>Layanan dukungan pelanggan & penyelesaian pengaduan.</li>
                <li>Informasi kampanye, promosi, dan pembaruan layanan (dengan persetujuan).</li>
                <li>Deteksi & pencegahan fraud serta pelanggaran keamanan.</li>
                <li>Pemenuhan kewajiban hukum dan regulasi.</li>
                <li>Peningkatan layanan via analisis data agregat.</li>
              </ul>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 3 — Dasar Hukum Pemrosesan</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Pelaksanaan perjanjian.</li>
                <li>Persetujuan eksplisit (untuk pemasaran).</li>
                <li>Kewajiban hukum.</li>
                <li>Kepentingan yang sah (keamanan & pencegahan penipuan).</li>
              </ul>
            </section>

            <section id="bab-3" className="space-y-3 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-foreground">BAB III — Pengungkapan dan Berbagi Data</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 4 — Berbagi dengan Pihak Ketiga</h3>
              <p>Kami tidak menjual atau menyewakan data pribadi Anda. Kami dapat berbagi data dalam keadaan terbatas:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Penyedia layanan (gateway pembayaran, layanan pengiriman, infrastruktur cloud) tunduk pada kerahasiaan ketat.</li>
                <li>Otoritas berwenang sesuai kewajiban hukum.</li>
                <li>Penerus usaha dalam hal merger/akuisisi/pengalihan aset.</li>
                <li>Pihak lain atas persetujuan eksplisit Anda.</li>
              </ul>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 5 — Transfer Data Lintas Batas</h3>
              <p>
                Pengiriman data ke luar Indonesia dilakukan dengan memastikan negara penerima memiliki tingkat perlindungan
                setara, sesuai Pasal 56 UU PDP.
              </p>
            </section>

            <section id="bab-4" className="space-y-3 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-foreground">BAB IV — Cookies dan Teknologi Pelacak</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 6 — Penggunaan Cookies</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li><strong className="text-foreground">Cookies esensial</strong> — operasional dasar Platform, tidak dapat dinonaktifkan.</li>
                <li><strong className="text-foreground">Cookies fungsional</strong> — menyimpan preferensi pengguna.</li>
                <li><strong className="text-foreground">Cookies analitik</strong> — memahami interaksi secara agregat & anonim.</li>
                <li><strong className="text-foreground">Cookies pemasaran</strong> — konten promosi relevan (dengan persetujuan).</li>
              </ul>
              <p>
                Anda dapat mengatur preferensi cookies melalui peramban Anda. Menonaktifkan cookies tertentu dapat
                memengaruhi fungsionalitas Platform.
              </p>
            </section>

            <section id="bab-5" className="space-y-3 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-foreground">BAB V — Retensi dan Keamanan Data</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 7 — Jangka Waktu Penyimpanan</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Akun aktif: selama akun masih digunakan.</li>
                <li>Setelah penutupan akun: 5 tahun untuk audit, sengketa, dan kewajiban hukum.</li>
                <li>Data transaksi keuangan: sesuai ketentuan perpajakan dan keuangan.</li>
              </ul>
              <p>Setelah masa retensi berakhir, data dihapus atau dianonimisasi secara aman.</p>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 8 — Langkah Keamanan</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Enkripsi: SSL/TLS untuk data transit, AES-256 untuk data tersimpan.</li>
                <li>Kontrol akses berbasis peran (RBAC) yang ketat.</li>
                <li>Pemantauan sistem berkala terhadap ancaman keamanan.</li>
                <li>Penetration testing periodik.</li>
                <li>Pelatihan kesadaran keamanan data bagi seluruh personel.</li>
              </ul>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 9 — Pemberitahuan Pelanggaran Data</h3>
              <p>
                Apabila terjadi data breach yang berpotensi merugikan Pengguna, kami memberitahu Pengguna terdampak dan
                Badan Pengawas Perlindungan Data Pribadi sesuai jangka waktu UU PDP.
              </p>
            </section>

            <section id="bab-6" className="space-y-3 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-foreground">BAB VI — Hak-Hak Pengguna</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 10 — Hak Anda atas Data Pribadi</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li><strong className="text-foreground">Hak akses</strong> — mengetahui data yang kami miliki tentang Anda.</li>
                <li><strong className="text-foreground">Hak koreksi</strong> — meminta perbaikan data yang tidak akurat.</li>
                <li><strong className="text-foreground">Hak penghapusan</strong> — meminta penghapusan dalam kondisi tertentu.</li>
                <li><strong className="text-foreground">Hak pembatasan pemrosesan</strong> — membatasi pemrosesan dalam situasi tertentu.</li>
                <li><strong className="text-foreground">Hak portabilitas data</strong> — menerima salinan data dalam format terstruktur.</li>
                <li><strong className="text-foreground">Hak menolak</strong> — menolak pemrosesan untuk pemasaran langsung.</li>
                <li><strong className="text-foreground">Hak menarik persetujuan</strong> — mencabut persetujuan sewaktu-waktu.</li>
              </ul>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 11 — Cara Mengajukan Permintaan Hak</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Surel: privacy@bushidogacha.com</li>
                <li>Formulir online: www.bushidogacha.com/privacy-request</li>
              </ul>
              <p>
                Kami merespons dalam 14 hari kerja. Verifikasi identitas dapat diminta sebelum memproses permohonan.
              </p>
            </section>

            <section id="bab-7" className="space-y-3 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-foreground">BAB VII — Privasi Anak</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 12 — Perlindungan Data Anak</h3>
              <p>
                Platform tidak ditujukan untuk pengguna di bawah 18 tahun. Apabila kami mengetahui data anak di bawah umur
                terkumpul tanpa persetujuan orang tua/wali, kami akan menghapusnya segera. Orang tua/wali yang mengetahui
                hal ini dapat menghubungi kami melalui kontak resmi.
              </p>
            </section>

            <section id="bab-8" className="space-y-3 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-foreground">BAB VIII — Perubahan Kebijakan Privasi</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 13 — Pembaruan Kebijakan</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Notifikasi pada Platform setidaknya 30 hari sebelum efektif.</li>
                <li>Pemberitahuan melalui surel terdaftar pada akun Anda.</li>
              </ul>
              <p>Penggunaan Platform setelah tanggal efektif merupakan persetujuan terhadap kebijakan baru.</p>
            </section>

            <section id="bab-9" className="space-y-3 scroll-mt-24">
              <h2 className="font-display text-xl font-bold text-foreground">BAB IX — Hubungi Kami</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 14 — Pejabat Perlindungan Data (DPO)</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Situs Web: www.bushidogacha.com</li>
                <li>Email: support@bushidotovarichtechnology.com</li>
                <li>Alamat: Jl. Semolowaru Indah II Blok Q 11, Surabaya, 60119</li>
              </ul>
            </section>
          </motion.article>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 text-center">
          <span className="font-display text-sm font-bold tracking-wider text-foreground">
            BUSHIDO<span className="text-accent"> GACHA</span>
          </span>
          <p className="text-xs text-muted-foreground">{t("companyName")}</p>
          <p className="font-display text-xs tracking-wider text-muted-foreground">{t("allRightsReserved")}</p>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;

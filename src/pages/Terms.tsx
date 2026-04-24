import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";
import Navbar from "@/components/Navbar";
import TableOfContents, { type TocItem } from "@/components/TableOfContents";
import { useI18n } from "@/context/I18nContext";

const TOC: TocItem[] = [
  { id: "pendahuluan", label: "Pendahuluan" },
  { id: "bab-1", label: "BAB I — Definisi" },
  { id: "bab-2", label: "BAB II — Pendaftaran dan Akun Pengguna" },
  { id: "bab-3", label: "BAB III — Mekanisme Gacha dan Hadiah" },
  { id: "bab-4", label: "BAB IV — Transaksi dan Pembayaran" },
  { id: "bab-5", label: "BAB V — Hak Kekayaan Intelektual" },
  { id: "bab-6", label: "BAB VI — Larangan dan Pembatasan Penggunaan" },
  { id: "bab-7", label: "BAB VII — Penyelesaian Sengketa" },
  { id: "bab-8", label: "BAB VIII — Ketentuan Penutup" },
];

const Terms = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="relative overflow-hidden pt-24 pb-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <ScrollText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Syarat & Ketentuan Penggunaan
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
              www.bushidogacha.com · Berlaku sejak: 18 April 2025
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto px-4">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-border/50 bg-card p-6 leading-relaxed text-muted-foreground md:p-10"
          >
            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-foreground">Pendahuluan</h2>
              <p>
                Dokumen Syarat dan Ketentuan ini ("Perjanjian") merupakan perjanjian yang mengikat secara hukum antara Anda
                ("Pengguna") dan PT Perorangan Bushido Gacha ("Perusahaan", "kami", "milik kami"), selaku pengelola platform
                digital BUSHIDO GACHA yang dapat diakses melalui www.bushidogacha.com.
              </p>
              <p>
                Dengan mengakses, mendaftarkan akun, atau menggunakan layanan yang tersedia pada platform ini, Pengguna
                dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan yang diatur dalam Perjanjian ini. Apabila
                Pengguna tidak menyetujui sebagian atau seluruh ketentuan ini, Pengguna dilarang menggunakan layanan kami.
              </p>
              <p>Perjanjian ini disusun berdasarkan dan tunduk pada peraturan perundang-undangan Republik Indonesia, termasuk:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Undang-Undang No. 8 Tahun 1999 tentang Perlindungan Konsumen</li>
                <li>Undang-Undang No. 11 Tahun 2008 jo. No. 19 Tahun 2016 tentang Informasi dan Transaksi Elektronik (UU ITE)</li>
                <li>Undang-Undang No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP)</li>
                <li>Peraturan Pemerintah No. 71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi Elektronik</li>
                <li>Peraturan Menteri Komunikasi dan Informatika yang berlaku</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-foreground">BAB I — Definisi</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 1 — Pengertian Umum</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li><strong className="text-foreground">Platform</strong> — layanan digital BUSHIDO GACHA yang dapat diakses melalui www.bushidogacha.com beserta seluruh subdomain, aplikasi, dan antarmuka terkait.</li>
                <li><strong className="text-foreground">Pengguna</strong> — setiap orang perseorangan yang mengakses dan/atau menggunakan Platform.</li>
                <li><strong className="text-foreground">Akun</strong> — identitas digital Pengguna yang dibuat setelah proses registrasi berhasil.</li>
                <li><strong className="text-foreground">Pull/Gacha</strong> — mekanisme permainan berbasis keberuntungan untuk memenangkan hadiah secara acak.</li>
                <li><strong className="text-foreground">Tier Hadiah</strong> — pengelompokan hadiah Tier S (tertinggi), A, B, dan C.</li>
                <li><strong className="text-foreground">Kredit/Token</strong> — satuan nilai digital sebagai alat tukar dalam pull.</li>
                <li><strong className="text-foreground">Hadiah</strong> — barang/layanan fisik maupun digital yang diperoleh melalui pull.</li>
                <li><strong className="text-foreground">Konten Pengguna</strong> — informasi/data/materi yang diunggah Pengguna ke Platform.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-foreground">BAB II — Pendaftaran dan Akun Pengguna</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 2 — Syarat Pendaftaran</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Pengguna telah berusia minimal 18 tahun atau memiliki persetujuan tertulis orang tua/wali yang sah.</li>
                <li>Pengguna memberikan informasi pendaftaran yang benar, akurat, lengkap, dan terkini.</li>
                <li>Pengguna memiliki kapasitas hukum untuk membuat perjanjian yang mengikat.</li>
                <li>Pengguna tidak berada dalam daftar hitam atau larangan bertransaksi yang ditetapkan otoritas berwenang.</li>
              </ul>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 3 — Keamanan Akun</h3>
              <p>Pengguna bertanggung jawab penuh atas:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Kerahasiaan username dan password akun.</li>
                <li>Seluruh aktivitas yang terjadi di bawah akunnya.</li>
                <li>Segera melaporkan akses tidak sah kepada Perusahaan.</li>
              </ul>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 4 — Penangguhan dan Penutupan Akun</h3>
              <p>Perusahaan berhak menangguhkan/menutup akun, dengan atau tanpa pemberitahuan, dalam hal:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Pengguna melanggar Perjanjian ini.</li>
                <li>Pengguna memberikan informasi tidak benar atau menyesatkan.</li>
                <li>Pengguna melakukan tindakan yang merugikan Perusahaan, Pengguna lain, atau pihak ketiga.</li>
                <li>Perusahaan menerima perintah dari otoritas berwenang.</li>
                <li>Akun tidak aktif lebih dari 24 bulan berturut-turut.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-foreground">BAB III — Mekanisme Gacha dan Hadiah</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 5 — Sistem Pull Gacha</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Setiap pull menukarkan kredit/token yang diperoleh secara sah.</li>
                <li>Hasil pull ditentukan algoritma RNG yang acak dan tidak dapat dipengaruhi.</li>
                <li>Tingkat peluang (rate) tiap tier ditampilkan transparan pada halaman kampanye.</li>
                <li>Hasil pull bersifat independen, kecuali pada mekanisme pity yang dinyatakan berlaku.</li>
              </ul>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 6 — Tier Hadiah</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li><strong className="text-foreground">Tier S</strong> — nilai dan kelangkaan tertinggi, peluang paling rendah.</li>
                <li><strong className="text-foreground">Tier A</strong> — premium, jumlah terbatas per kampanye.</li>
                <li><strong className="text-foreground">Tier B</strong> — berkualitas baik, kemunculan menengah.</li>
                <li><strong className="text-foreground">Tier C</strong> — paling sering muncul, jaminan kepuasan minimal.</li>
              </ul>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 7 — Pengiriman dan Klaim Hadiah</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Hadiah fisik dikirim ke alamat terdaftar setelah verifikasi identitas.</li>
                <li>Hadiah digital didistribusikan via voucher/transfer saldo/tautan unduhan.</li>
                <li>Hadiah wajib diklaim dalam batas waktu kampanye, jika tidak akan hangus.</li>
                <li>Kebenaran data penerima menjadi tanggung jawab Pengguna.</li>
                <li>Pengguna wajib mematuhi ketentuan perpajakan atas hadiah yang diterima.</li>
              </ul>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 8 — Kebijakan Pengembalian dan Refund</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Kredit/token yang sudah digunakan dalam pull tidak dapat dikembalikan.</li>
                <li>Kredit/token yang belum digunakan dapat di-refund dalam 7 hari kerja sejak transaksi, tanpa indikasi penyalahgunaan.</li>
                <li>Permohonan refund melalui kanal resmi dukungan pelanggan.</li>
                <li>Refund yang disetujui diproses dalam 14 hari kerja ke instrumen pembayaran asal.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-foreground">BAB IV — Transaksi dan Pembayaran</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 9 — Metode Pembayaran</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Transfer bank melalui jaringan perbankan terintegrasi.</li>
                <li>Dompet digital: GoPay, OVO, Dana, dan e-wallet lainnya.</li>
                <li>Kartu kredit dan kartu debit dari bank penerbit terafiliasi.</li>
              </ul>
              <p>Seluruh transaksi dalam mata uang Rupiah (IDR). Biaya tambahan instrumen pembayaran menjadi tanggung jawab Pengguna.</p>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 10 — Keamanan Transaksi</h3>
              <p>
                Transaksi diproses melalui gateway pembayaran berstandar PCI DSS. Perusahaan tidak menyimpan data kartu
                kredit/debit secara langsung pada sistem internal.
              </p>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 11 — Pajak</h3>
              <p>
                Harga pada Platform belum termasuk PPN dan pajak lain yang berlaku. Pengguna bertanggung jawab atas seluruh
                kewajiban pajak yang timbul.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-foreground">BAB V — Hak Kekayaan Intelektual</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 12 — Kepemilikan</h3>
              <p>
                Seluruh konten, desain, logo, merek dagang, kode perangkat lunak, basis data, dan materi lain pada Platform
                adalah milik eksklusif PT Perorangan Bushido Gacha atau pemberi lisensi, dilindungi UU No. 28 Tahun 2014
                tentang Hak Cipta.
              </p>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 13 — Larangan Penggunaan</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Menyalin, mereproduksi, mendistribusikan konten Platform untuk tujuan komersial.</li>
                <li>Reverse engineering, decompiling, atau dekonstruksi sistem.</li>
                <li>Menggunakan merek/logo/identitas visual Platform secara tidak sah.</li>
                <li>Membuat karya turunan berdasarkan konten Platform.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-foreground">BAB VI — Larangan dan Pembatasan Penggunaan</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 14 — Tindakan yang Dilarang</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Menggunakan bot, script otomatis, crawler, atau perangkat lunak untuk akses tidak sah.</li>
                <li>Memanipulasi sistem RNG atau mekanisme pull.</li>
                <li>Pencucian uang atau transaksi yang berindikasi fraud.</li>
                <li>Membuat akun palsu/ganda atau atas nama orang lain tanpa persetujuan.</li>
                <li>Menyebarkan konten melanggar hukum, pornografi, ujaran kebencian, atau melanggar hak pihak ketiga.</li>
                <li>Serangan siber, injeksi kode berbahaya, atau mengganggu operasional Platform.</li>
                <li>Tindakan yang berpotensi merusak reputasi Perusahaan.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-foreground">BAB VII — Penyelesaian Sengketa</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 15 — Mekanisme Pengaduan</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>Sampaikan pengaduan resmi melalui kanal dukungan pelanggan di Platform.</li>
                <li>Berikan informasi lengkap dan akurat mengenai permasalahan.</li>
                <li>Tunggu respons Perusahaan maksimal 14 hari kerja.</li>
              </ul>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 16 — Penyelesaian Melalui Mediasi</h3>
              <p>
                Apabila pengaduan tidak terselesaikan secara internal, para pihak sepakat menyelesaikan sengketa melalui
                mediasi yang difasilitasi BPSK atau lembaga mediasi resmi lainnya.
              </p>

              <h3 className="font-display text-base font-semibold text-foreground">Pasal 17 — Yurisdiksi dan Hukum yang Berlaku</h3>
              <p>
                Perjanjian ini tunduk pada hukum Republik Indonesia. Apabila mediasi tidak berhasil, sengketa diselesaikan
                melalui Pengadilan Negeri yang berwenang.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-foreground">BAB VIII — Ketentuan Penutup</h2>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 18 — Perubahan Syarat dan Ketentuan</h3>
              <p>
                Perusahaan berhak mengubah Perjanjian ini sewaktu-waktu, diberitahukan via notifikasi pada Platform dan
                surel terdaftar. Penggunaan berkelanjutan setelah pemberitahuan dianggap menyetujui ketentuan baru.
              </p>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 19 — Keterpisahan Ketentuan</h3>
              <p>
                Apabila salah satu ketentuan dinyatakan tidak sah, ketentuan tersebut terpisah dari Perjanjian dan ketentuan
                lainnya tetap berlaku.
              </p>
              <h3 className="font-display text-base font-semibold text-foreground">Pasal 20 — Kontak Resmi</h3>
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

export default Terms;

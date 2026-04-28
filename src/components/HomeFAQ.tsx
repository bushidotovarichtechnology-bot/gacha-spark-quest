import { Link } from "react-router-dom";
import { HelpCircle, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const previewFaqs = [
  {
    q: "Apa itu BushidoGacha?",
    a: "BushidoGacha adalah platform gacha online berhadiah fisik yang beroperasi di Indonesia. Kamu bisa melakukan gacha untuk mendapatkan berbagai hadiah menarik seperti PlayStation 5, Nintendo Switch, action figure, dan masih banyak lagi — semua hadiah dikirim secara fisik ke alamatmu.",
  },
  {
    q: "Apakah BushidoGacha termasuk judi online?",
    a: 'Tidak. Setiap gacha yang kamu lakukan dijamin menghasilkan hadiah fisik nyata. Kami juga memiliki sistem pity yang menjamin kamu mendapatkan hadiah tertentu setelah jumlah gacha tertentu — artinya tidak ada istilah "zonk".',
  },
  {
    q: "Apa itu sistem pity?",
    a: "Sistem pity adalah mekanisme garansi hadiah. Setelah kamu melakukan gacha dalam jumlah tertentu, kamu dijamin mendapatkan hadiah utama — terlepas dari faktor keberuntungan.",
  },
  {
    q: "Bagaimana cara mendapatkan koin?",
    a: "Koin bisa dibeli langsung melalui halaman pembelian di website kami menggunakan berbagai metode pembayaran yang tersedia.",
  },
  {
    q: "Apa itu Bushido Ticket?",
    a: "Bushido Ticket adalah item khusus yang bisa kamu dapatkan dan gunakan untuk melakukan gacha tanpa mengurangi koin, atau ditukar dengan reward eksklusif lainnya.",
  },
  {
    q: "Bagaimana cara klaim hadiah yang saya menangkan?",
    a: "Setiap hadiah yang kamu menangkan akan otomatis masuk ke inventory. Dari sana kamu bisa mengisi alamat pengiriman dan mengajukan klaim untuk dikirimkan ke alamatmu.",
  },
];

const HomeFAQ = () => {
  return (
    <section className="border-t border-border/50 bg-secondary/20 py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
            <HelpCircle className="h-6 w-6 text-accent" aria-hidden="true" />
          </div>
          <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            FAQ
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Pertanyaan yang Sering Ditanyakan
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Temukan jawaban cepat seputar BushidoGacha, sistem pity, koin, hingga klaim hadiah.
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-2 sm:p-4">
          <Accordion type="single" collapsible className="w-full">
            {previewFaqs.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-border/50 last:border-b-0"
              >
                <AccordionTrigger className="px-3 text-left text-sm font-semibold text-foreground hover:no-underline sm:text-base">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="px-3 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-6 text-center">
          <Button asChild variant="outline" className="gap-2 border-accent/30 hover:bg-accent/10 hover:text-accent">
            <Link to="/faq">
              Lihat Semua FAQ
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HomeFAQ;

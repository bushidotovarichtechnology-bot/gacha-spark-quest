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
    q: "Apa itu Bushido Vault?",
    a: "Bushido Vault adalah platform mystery box kolektibel online berhadiah fisik yang beroperasi di Indonesia. Kamu bisa melakukan mystery box kolektibel untuk mendapatkan berbagai produk menarik seperti PlayStation 5, Nintendo Switch, action figure, dan masih banyak lagi — semua produk dikirim secara fisik ke alamatmu.",
  },
  {
    q: "Apakah Bushido Vault termasuk judi online?",
    a: "Tidak. Setiap pembelian kolektibel yang kamu lakukan dijamin menghasilkan produk fisik nyata. Kami juga memiliki sistem pity yang menjamin kamu mendapatkan produk tertentu setelah jumlah pembelian kolektibel tertentu — artinya setiap pembelian pasti menghasilkan produk fisik nyata.",
  },
  {
    q: "Apa itu sistem jaminan produk?",
    a: "Sistem pity adalah mekanisme garansi produk. Setelah kamu melakukan pembelian dalam jumlah tertentu, kamu dijamin mendapatkan produk utama — terlepas dari jumlah pembelian yang sudah ditentukan.",
  },
  {
    q: "Bagaimana cara mendapatkan koin?",
    a: "Koin bisa dibeli langsung melalui halaman pembelian di website kami menggunakan berbagai metode pembayaran yang tersedia.",
  },
  {
    q: "Apa itu Bushido Ticket?",
    a: "Bushido Ticket adalah item khusus yang bisa kamu dapatkan dan gunakan untuk melakukan pembelian kolektibel tanpa mengurangi koin, atau ditukar dengan reward eksklusif lainnya.",
  },
  {
    q: "Bagaimana cara klaim hadiah yang saya menangkan?",
    a: "Setiap hadiah yang kamu dapatkan akan otomatis masuk ke inventory. Dari sana kamu bisa mengisi alamat pengiriman dan mengajukan klaim untuk dikirimkan ke alamatmu.",
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
            Temukan jawaban cepat seputar Bushido Vault, jaminan produk, koin, hingga pengambilan koleksi.
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

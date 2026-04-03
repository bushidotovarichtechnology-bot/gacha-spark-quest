import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Coins, Package, Home, Globe, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGacha } from "@/context/GachaContext";
import { useI18n } from "@/context/I18nContext";

const Navbar = () => {
  const { totalCoins } = useGacha();
  const { t, locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { to: "/", label: t("home"), icon: Home },
    { to: "/inventory", label: t("myInventory"), icon: Package },
  ];

  const toggleLocale = () => setLocale(locale === "en" ? "id" : "en");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary box-glow-purple">
            <Coins className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-wider text-foreground">
            BUSHIDO<span className="text-accent"> GACHA</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5">
            <Coins className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-accent">{totalCoins.toLocaleString()}</span>
          </div>
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === "en" ? "ID" : "EN"}
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-foreground md:hidden"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/50 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="container mx-auto flex flex-col gap-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-accent">{totalCoins.toLocaleString()} {t("gachaCoins")}</span>
              </div>
              <button
                onClick={toggleLocale}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Globe className="h-4 w-4" />
                {locale === "en" ? "Bahasa Indonesia" : "English"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;

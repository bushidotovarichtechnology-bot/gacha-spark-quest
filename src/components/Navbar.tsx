import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Coins, Package, Home, Globe, History, ShoppingCart, LogIn, LogOut, User, ClipboardList, Receipt, Ticket, Gift, Camera, Percent, Gamepad2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useGacha } from "@/context/GachaContext";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import InboxBell from "@/components/InboxBell";
import defaultAvatar from "@/assets/default-avatar.webp";

const Navbar = () => {
  const { totalCoins, freeDraws, activeDiscountPercent } = useGacha();
  const { t, locale, setLocale } = useI18n();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [displayedTickets, setDisplayedTickets] = useState(0);
  const [ticketPulse, setTicketPulse] = useState(false);
  const prevTicketsRef = useRef(0);

  const { data: ticketBalance = 0 } = useQuery({
    queryKey: ["user-ticket-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase.rpc("get_user_ticket_balance", { _user_id: user.id });
      if (!data || (data as any[]).length === 0) return 0;
      return (data as any[]).reduce((sum: number, r: any) => sum + Number(r.total_remaining), 0);
    },
  });

  // Count-up animation + pulse when balance changes
  useEffect(() => {
    const from = prevTicketsRef.current;
    const to = ticketBalance;
    if (from === to) {
      setDisplayedTickets(to);
      return;
    }
    setTicketPulse(true);
    const duration = 600;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (to - from) * eased);
      setDisplayedTickets(value);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevTicketsRef.current = to;
        setTimeout(() => setTicketPulse(false), 400);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ticketBalance]);

  useEffect(() => {
    if (!user) { setAvatarUrl(""); return; }
    const fetchAvatar = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      setAvatarUrl(data?.avatar_url || "");
    };
    fetchAvatar();
  }, [user]);

  const navLinks = [
    { to: "/", label: t("home"), icon: Home },
    { to: "/inventory", label: t("myInventory"), icon: Package },
    { to: "/history", label: t("drawHistory"), icon: History },
    { to: "/claims", label: t("claimHistory"), icon: ClipboardList },
    { to: "/transactions", label: "Transaksi", icon: Receipt },
    { to: "/redeem", label: "Bushido Tiket", icon: Ticket },
    { to: "/gift", label: "Gift Koin", icon: Gift },
  ];

  const toggleLocale = () => setLocale(locale === "en" ? "id" : "en");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 mr-2">
          <img
            src="/favicon.webp"
            alt="Bushido Gacha"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-contain"
            style={{ imageRendering: "pixelated" }}
          />
          <span className="font-display text-base xl:text-lg font-bold tracking-wider text-foreground whitespace-nowrap leading-none">
            BUSHIDO<span className="text-accent"> GACHA</span>
          </span>
        </Link>

        {/* Desktop nav links — only on xl screens to prevent crowding */}
        <div className="hidden xl:flex items-center gap-5 flex-1 justify-center">
          {user && navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>

        {/* Coins & Tickets — visible from md up (outside hamburger) */}
        {user && (
          <div className="hidden md:flex lg:hidden items-center gap-2 shrink-0 ml-auto mr-2">
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5" title="Bushido Coins">
              <Coins className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-accent tabular-nums">{totalCoins.toLocaleString()}</span>
            </div>
            <Link
              to="/redeem"
              className={`flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 transition-all hover:bg-secondary/80 ${ticketPulse ? "scale-110 ring-2 ring-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.5)]" : "scale-100"}`}
              title="Bushido Tiket"
              style={{ transitionDuration: "300ms" }}
            >
              <Ticket className={`h-4 w-4 text-primary ${ticketPulse ? "animate-pulse" : ""}`} />
              <span className="text-sm font-semibold text-primary tabular-nums">{displayedTickets.toLocaleString()}</span>
            </Link>
          </div>
        )}

        {/* Right cluster — visible from lg up */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {user && (
            <>
              <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5" title="Bushido Coins">
                <Coins className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-accent tabular-nums">{totalCoins.toLocaleString()}</span>
              </div>
              <Link
                to="/redeem"
                className={`flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 transition-all hover:bg-secondary/80 ${ticketPulse ? "scale-110 ring-2 ring-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.5)]" : "scale-100"}`}
                title="Bushido Tiket"
                style={{ transitionDuration: "300ms" }}
              >
                <Ticket className={`h-4 w-4 text-primary ${ticketPulse ? "animate-pulse" : ""}`} />
                <span className="text-sm font-semibold text-primary tabular-nums">{displayedTickets.toLocaleString()}</span>
              </Link>
              {freeDraws > 0 && (
                <div className="hidden xl:flex items-center gap-1.5 rounded-full bg-green-500/15 border border-green-500/30 px-2.5 py-1 animate-pulse">
                  <Gamepad2 className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-xs font-bold text-green-400">{freeDraws}x</span>
                </div>
              )}
              {activeDiscountPercent > 0 && (
                <div className="hidden xl:flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-2.5 py-1 animate-pulse">
                  <Percent className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-xs font-bold text-orange-400">-{activeDiscountPercent}%</span>
                </div>
              )}
              <Link
                to="/topup"
                className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition-all hover:brightness-110 shadow-sm shadow-accent/30"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {t("topUp")}
              </Link>
            </>
          )}
          {user ? (
            <>
            <InboxBell variant="desktop" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80 focus:outline-none">
                  <Avatar className="h-8 w-8 border-2 border-primary/50">
                    <AvatarImage src={avatarUrl || defaultAvatar} alt="Avatar" />
                    <AvatarFallback>
                      <img src={defaultAvatar} alt="Avatar" className="h-full w-full object-cover" />
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" /> {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-all hover:brightness-110"
            >
              <LogIn className="h-3.5 w-3.5" />
              {t("login")}
            </Link>
          )}
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === "en" ? "ID" : "EN"}
          </button>
        </div>

        {/* Mobile toggle — visible below lg */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-foreground lg:hidden"
          aria-label="Menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="overflow-hidden border-b border-border/50 bg-background/95 backdrop-blur-xl lg:hidden animate-fade-in">
          <div className="container mx-auto flex flex-col gap-4 py-4">
              {user && (
                <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                  <Avatar className="h-10 w-10 border-2 border-primary/50">
                    <AvatarImage src={avatarUrl || defaultAvatar} alt="Avatar" />
                    <AvatarFallback>
                      <img src={defaultAvatar} alt="Avatar" className="h-full w-full object-cover" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{user.email}</p>
                    <Link to="/profile" onClick={() => setIsOpen(false)} className="text-xs text-primary hover:underline">Lihat Profil</Link>
                  </div>
                </div>
              )}
              {user && (
                <div className="pb-2 border-b border-border/50">
                  <InboxBell variant="mobile" />
                </div>
              )}
              {user && navLinks.map((link) => (
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
              {user && (
                <>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-accent" />
                    <span className="text-sm font-semibold text-accent">{totalCoins.toLocaleString()} {t("bushidoCoins")}</span>
                  </div>
                  <Link to="/redeem" onClick={() => setIsOpen(false)} className={`flex items-center gap-2 transition-transform ${ticketPulse ? "scale-110" : "scale-100"}`} style={{ transitionDuration: "300ms" }}>
                    <Ticket className={`h-4 w-4 text-primary ${ticketPulse ? "animate-pulse" : ""}`} />
                    <span className="text-sm font-semibold text-primary tabular-nums">{displayedTickets.toLocaleString()} Bushido Tiket</span>
                  </Link>
                  {freeDraws > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Gamepad2 className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-bold text-green-400">{freeDraws}x Gacha Gratis</span>
                    </div>
                  )}
                  {activeDiscountPercent > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Percent className="h-4 w-4 text-orange-400" />
                      <span className="text-sm font-bold text-orange-400">Diskon {activeDiscountPercent}% Aktif</span>
                    </div>
                  )}
                  <Link
                    to="/topup"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 text-sm font-bold text-accent transition-colors hover:text-accent/80"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {t("topUp")}
                  </Link>
                </>
              )}
              {user ? (
                <button
                  onClick={() => { signOut(); setIsOpen(false); }}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  {t("logout")}
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary/80"
                >
                  <LogIn className="h-4 w-4" />
                  {t("login")}
                </Link>
              )}
              <button
                onClick={toggleLocale}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Globe className="h-4 w-4" />
                {locale === "en" ? "Bahasa Indonesia" : "English"}
              </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

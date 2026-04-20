import { Coins, Zap, Sparkles, Crown } from "lucide-react";

export const ICON_OPTIONS = [
  { value: "Coins", label: "Coins", icon: Coins },
  { value: "Zap", label: "Zap", icon: Zap },
  { value: "Sparkles", label: "Sparkles", icon: Sparkles },
  { value: "Crown", label: "Crown", icon: Crown },
];

export type CoinPackage = {
  id: string;
  name: string;
  coins: number;
  price: number;
  icon: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  discount_percent: number;
  discount_start: string | null;
  discount_end: string | null;
  bonus_coins: number;
  bonus_label: string;
};

export type PackageFormState = {
  name: string;
  coins: number;
  price: number;
  icon: string;
  is_popular: boolean;
  is_active: boolean;
  discount_percent: number;
  discount_start: string | null;
  discount_end: string | null;
  bonus_coins: number;
  bonus_label: string;
};

export const emptyForm: PackageFormState = {
  name: "",
  coins: 100,
  price: 15000,
  icon: "Coins",
  is_popular: false,
  is_active: true,
  discount_percent: 0,
  discount_start: null,
  discount_end: null,
  bonus_coins: 0,
  bonus_label: "",
};

export const formatRupiah = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

export const getIcon = (name: string) => ICON_OPTIONS.find((i) => i.value === name)?.icon || Coins;

export const isPromoActive = (pkg: CoinPackage) => {
  if (!pkg.discount_percent) return false;
  const now = new Date();
  if (pkg.discount_start && new Date(pkg.discount_start) > now) return false;
  if (pkg.discount_end && new Date(pkg.discount_end) < now) return false;
  return true;
};

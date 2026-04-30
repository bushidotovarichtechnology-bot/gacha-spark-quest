import { isStripeTestMode } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  if (!isStripeTestMode()) return null;
  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-xs text-orange-800">
      Mode pembayaran Stripe sedang dalam <strong>test mode</strong>. Tidak ada uang asli yang diproses.
    </div>
  );
}

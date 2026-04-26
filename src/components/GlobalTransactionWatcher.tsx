import { useGlobalTransactionNotifications } from "@/hooks/use-global-transaction-notifications";
import { useTradeNotifications } from "@/hooks/use-trade-notifications";

/**
 * Headless component that activates global realtime toast + inbox notifications
 * for transaction, shipping, and P2P trade status changes. Renders nothing.
 * Mount once inside <AuthProvider> + <GachaProvider> + <NotificationsProvider>.
 */
const GlobalTransactionWatcher = () => {
  useGlobalTransactionNotifications();
  useTradeNotifications();
  return null;
};

export default GlobalTransactionWatcher;

import { useGlobalTransactionNotifications } from "@/hooks/use-global-transaction-notifications";

/**
 * Headless component that activates global realtime toast notifications
 * for transaction & shipping payment status changes. Renders nothing.
 * Mount once inside <AuthProvider> + <GachaProvider>.
 */
const GlobalTransactionWatcher = () => {
  useGlobalTransactionNotifications();
  return null;
};

export default GlobalTransactionWatcher;

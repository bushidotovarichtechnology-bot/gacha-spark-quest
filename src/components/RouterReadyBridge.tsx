import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerNavigator, unregisterNavigator } from "@/lib/safeNavigate";

/**
 * Bridges React Router's `useNavigate` into the module-level `safeNavigate`
 * helper so realtime event handlers (toasts, notifications) can deep-link
 * users even if they fire before/after route transitions.
 */
const RouterReadyBridge = () => {
  const navigate = useNavigate();
  useEffect(() => {
    registerNavigator((href) => navigate(href));
    return () => unregisterNavigator();
  }, [navigate]);
  return null;
};

export default RouterReadyBridge;

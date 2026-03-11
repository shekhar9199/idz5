import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AdminContextValue {
  isAdmin: boolean;
  isAdminLoading: boolean;
  adminLogin: (password: string) => boolean;
  adminLogout: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

const ADMIN_PASSWORD = "786420";
const ADMIN_SESSION_KEY = "@idigitalzone_admin_session";

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ADMIN_SESSION_KEY)
      .then((val) => {
        if (val === "active") setIsAdmin(true);
        setIsAdminLoading(false);
      })
      .catch(() => setIsAdminLoading(false));
  }, []);

  function adminLogin(password: string): boolean {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      AsyncStorage.setItem(ADMIN_SESSION_KEY, "active");
      return true;
    }
    return false;
  }

  function adminLogout() {
    setIsAdmin(false);
    AsyncStorage.removeItem(ADMIN_SESSION_KEY);
  }

  const value = useMemo(
    () => ({ isAdmin, isAdminLoading, adminLogin, adminLogout }),
    [isAdmin, isAdminLoading],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}

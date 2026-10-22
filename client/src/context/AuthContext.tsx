import React, { createContext, useContext, useState, useEffect } from "react";
import { authClient } from "../auth";
import { api } from "../config/api";

export interface User {
  id: number | string;
  name: string;
  email: string;
  role: "admin" | "merchant" | "customer" | string;
  store_id?: number | string | null;
}

export interface Store {
  id: number | string;
  merchant_id: string | number;
  name: string;
  slug: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  currency: string;
  status: "active" | "suspended";
  shipping_fee: number;
  free_shipping_threshold: number;
  hero_style?: "hero1" | "hero2" | "hero3" | "hero4" | string;
  accent_color?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  store: Store | null;
  loading: boolean;
  login: (token: string, user: User, store?: Store | null) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
  setStore: (store: Store | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("storeify_token"),
  );
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshMe = async () => {
    try {
      // Check active session directly via Neon Auth client
      const sessionRes = await authClient.getSession().catch(() => null);
      const activeSession = sessionRes?.data?.session;
      const activeNeonUser = sessionRes?.data?.user;

      const savedToken =
        activeSession?.token || localStorage.getItem("storeify_token");

      if (!activeNeonUser) {
        localStorage.removeItem("storeify_token");
        setUser(null);
        setStore(null);
        setToken(null);
        setLoading(false);
        return;
      }

      if (savedToken) {
        localStorage.setItem("storeify_token", savedToken);
        setToken(savedToken);
      }

      let initialRole: "admin" | "merchant" | "customer" | string = "customer";

      const neonRole = (activeNeonUser as any).role;
      if (neonRole === "admin") {
        initialRole = "admin";
      } else if (neonRole === "merchant") {
        initialRole = "merchant";
      }

      let resolvedStore: Store | null = null;

      // Admin accounts cannot have stores or be merchant
      if (initialRole !== "admiin") {
        try {
          const storeRes = await api.get("/api/store/me", {
            headers: savedToken
              ? { Authorization: `Bearer ${savedToken}` }
              : undefined,
          });
          if (storeRes.data?.success && storeRes.data?.store) {
            resolvedStore = storeRes.data.store;
            initialRole = "merchant";
          }
        } catch {
          resolvedStore = null;
        }
      }

      setUser({
        id: activeNeonUser.id,
        name: activeNeonUser.name || activeNeonUser.email.split("@")[0],
        email: activeNeonUser.email,
        role: initialRole,
        store_id: initialRole === "admin" ? null : resolvedStore?.id || null,
      });

      setStore(initialRole === "admin" ? null : resolvedStore);
    } catch (err) {
        console.error("Error refreshint auth session:",err)
        localStorage.removeItem("storeify_token")
        setUser(null)
        setStore(null)
        setToken(null)
    } finally {
        setLoading(false)
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = (newToken: string, newUser: User, newStore?: Store | null) => {
    localStorage.setItem("storeify_token", newToken);
    localStorage.setItem("storeify_user", JSON.stringify(newUser));
    if (newStore !== undefined && newStore !== null) {
      localStorage.setItem("storeify_store", JSON.stringify(newStore));
    } else {
      localStorage.removeItem("storeify_store");
    }
    setToken(newToken);
    setUser(newUser);
    if (newStore !== undefined) {
      setStore(newStore);
    }
  };

  const logout = () => {
    localStorage.removeItem("storeify_token");
    localStorage.removeItem("storeify_user");
    localStorage.removeItem("storeify_store");
    setToken(null);
    setUser(null);
    setStore(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        store,
        loading,
        login,
        logout,
        refreshMe,
        setStore,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

"use client";

import { useState, useEffect } from "react";
import { User, Token } from "./types";
import { getStoredUser, getToken, setAuth, clearAuth } from "./utils";
import AuthScreen from "./components/AuthScreen";
import DashboardScreen from "./components/DashboardScreen";
import { styles } from "./styles";

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    const token = getToken();
    if (stored && token) {
      setUser(stored);
    }
    setLoading(false);
  }, []);

  const handleLogin = (data: Token) => {
    setAuth(data);
    setUser(data.user);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuth={handleLogin} />;
  }

  return <DashboardScreen user={user} onLogout={handleLogout} />;
}

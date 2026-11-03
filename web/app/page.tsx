"use client";

import { useState, useEffect } from "react";
import { User, Token } from "./types";
import { getStoredUser, getToken, setAuth, clearAuth } from "./utils";
import AuthBar from "./components/AuthBar";
import DashboardScreen from "./components/DashboardScreen";
import { styles } from "./styles";

type DashView = "apiaries" | "colonies" | "fieldrecords" | "queens" | "admin" | "manual";
const VIEWS: DashView[] = ["apiaries", "colonies", "fieldrecords", "queens", "admin", "manual"];

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [initialDashboardView, setInitialDashboardView] = useState<DashView | undefined>(undefined);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Initialize theme and restore session from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    const stored = getStoredUser();
    const token = getToken();
    if (stored && token) {
      setUser(stored);
      if (localStorage.getItem("melitta_show_dashboard") === "true") setShowDashboard(true);
      // 예전 버전에서 저장한 화면(게놈 브라우저 등)은 버린다
      const storedView = localStorage.getItem("melitta_dashboard_view") as DashView | null;
      if (storedView && VIEWS.includes(storedView)) setInitialDashboardView(storedView);
    }
    setLoading(false);
  }, []);

  const handleLogin = (data: Token) => {
    setAuth(data);
    setUser(data.user);
    openDashboard();
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setShowDashboard(false);
    localStorage.removeItem("melitta_show_dashboard");
    localStorage.removeItem("melitta_dashboard_view");
  };

  const openDashboard = () => {
    setShowDashboard(true);
    localStorage.setItem("melitta_show_dashboard", "true");
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (user && showDashboard) {
    return (
      <DashboardScreen
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        initialView={initialDashboardView}
        onBackToLanding={() => {
          setShowDashboard(false);
          localStorage.removeItem("melitta_show_dashboard");
          localStorage.removeItem("melitta_dashboard_view");
        }}
      />
    );
  }

  return (
    <div style={styles.landingLayout} className="animate-fade">
      <header style={styles.landingHeader} className="mobile-header-padding">
        <div style={styles.landingLogo}>
          <span>🐝</span> K-BEE BANK
        </div>

        <div style={styles.landingHeaderRight} className="auth-bar-header-container">
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }} className="auth-profile-badge-wrapper">
              <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-main)" }}>
                👤 {user.farm_name || user.username}님
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: "5px 10px",
                  fontSize: "11px",
                  borderRadius: "6px",
                  border: "1px solid rgba(239,68,68,0.3)",
                  background: "rgba(239,68,68,0.05)",
                  color: "#f87171",
                  cursor: "pointer",
                }}
                className="btn-outline-hover"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }} className="auth-profile-badge-wrapper">
              <AuthBar onAuth={handleLogin} />
            </div>
          )}

          <button
            onClick={handleToggleTheme}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              borderRadius: "8px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
              marginLeft: "4px",
            }}
            title={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      <div style={styles.landingSection} className="mobile-section-padding">
        <div style={{ maxWidth: "720px", margin: "40px auto 0", display: "flex", flexDirection: "column", gap: "20px" }}>
          <h1 style={{ fontSize: "34px", fontWeight: 800, color: "var(--color-gold)", margin: 0, letterSpacing: "-0.5px" }}>
            꿀벌 육종 기록 플랫폼
          </h1>
          <p style={{ fontSize: "16px", lineHeight: 1.7, color: "var(--text-main)", margin: 0, wordBreak: "keep-all" }}>
            양봉꿀벌과 재래꿀벌의 여왕 계보, 봉군 검정 기록, 유전체 시료를 한곳에 쌓습니다.
            같은 날 같은 평가자가 기록한 농가 안 봉군을 비교하고, 어떤 여왕을 골랐는지 근거와 함께 남깁니다.
          </p>
          <ul style={{ fontSize: "14px", lineHeight: 1.9, color: "var(--text-muted)", margin: 0, paddingLeft: "20px" }}>
            <li>여왕 ID, 어미, 출생연도, 교미 방식, 수벌군, 교체 이력</li>
            <li>연 3회 방문 검정 기록과 채밀·분봉·폐사 같은 사건 기록</li>
            <li>수벌 번데기 시료와 채집 당시 여왕의 연결</li>
            <li>검정군 안의 형질별 비교표</li>
          </ul>
          <div>
            {user ? (
              <button onClick={openDashboard} style={styles.btnGold} className="btn-hover-effect">
                기록 화면 열기 ➔
              </button>
            ) : (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                계정은 연구실에서 발급합니다. 오른쪽 위에서 로그인하세요.
              </p>
            )}
          </div>
        </div>
      </div>

      <footer style={styles.landingFooter}>
        <div style={{ fontWeight: "bold", color: "var(--text-main)" }}>K-BEE BANK · 인천대학교</div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          본 플랫폼은 농림축산식품부/농촌진흥청 이상기온 대응 꿀벌 육종 유전자원 플랫폼 개발 과제(과제번호: RS-2025-02214782)의 지원을 받아 수행되었습니다.
        </div>
      </footer>
    </div>
  );
}

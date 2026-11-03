import React, { useState, useEffect, useCallback } from "react";
import { styles } from "../styles";
import { User, Apiary } from "../types";
import { authFetch } from "../utils";
import ApiaryPanel from "./ApiaryPanel";
import ColonyPanel from "./ColonyPanel";
import ManualPanel from "./ManualPanel";
import AdminPanel from "./AdminPanel";
import QueenPanel from "./QueenPanel";
import FieldRecordPanel from "./FieldRecordPanel";

type DashView =
  | "apiaries"
  | "colonies"
  | "fieldrecords"
  | "queens"
  | "admin"
  | "manual";

interface DashboardScreenProps {
  user: User;
  onLogout: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  initialView?: DashView;
  onBackToLanding?: () => void;
}

export default function DashboardScreen({ 
  user, 
  onLogout, 
  theme = "light", 
  onToggleTheme, 
  initialView, 
  onBackToLanding 
}: DashboardScreenProps) {
  const isPowerUser = user.role === "researcher" || user.role === "admin";
  const defaultView: DashView = isPowerUser ? "fieldrecords" : "colonies";
  const [view, setView] = useState<DashView>(initialView || defaultView);
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [selectedApiary, setSelectedApiary] = useState<Apiary | null>(null);

  // Sync internal view state if parent changes initialView (e.g. from launcher cards)
  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView]);


  // Modal states
  const [showApiaryModal, setShowApiaryModal] = useState(false);
  const [showColonyModal, setShowColonyModal] = useState(false);

  // Responsive Collapsible Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false); // Collapse by default on mobile
      } else {
        setSidebarOpen(true);  // Expand by default on desktop
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const apiRes = await authFetch("/api/v1/apiaries");
      if (apiRes.ok) setApiaries(await apiRes.json());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Persistence for current dashboard view tab (F5 Guard)
  useEffect(() => {
    if (view) {
      localStorage.setItem("melitta_dashboard_view", view);
    }
  }, [view, user.role]);

  // Refetch Sync on Page Mount or Tab/Window Focus (refetches if new data was submitted in subpages)
  useEffect(() => {
    const handleRefetch = () => {
      const shouldRefetch = localStorage.getItem("melitta_refetch_trigger") === "true";
      if (shouldRefetch) {
        localStorage.removeItem("melitta_refetch_trigger");
        fetchDashboard();
      }
    };
    handleRefetch();
    window.addEventListener("focus", handleRefetch);
    return () => window.removeEventListener("focus", handleRefetch);
  }, [fetchDashboard]);

  const navItems: { key: DashView; label: string; icon: string }[] = [
    { key: "apiaries", label: "양봉장", icon: "🏡" },
    { key: "colonies", label: "봉군", icon: "🐝" },
  ];
  if (isPowerUser) {
    navItems.unshift({ key: "fieldrecords", label: "현장 기록", icon: "📝" });
    navItems.push({ key: "queens", label: "여왕 계보", icon: "👑" });
  }
  if (user.role === "admin") {
    navItems.push({ key: "admin", label: "관리", icon: "⚙️" });
  }
  navItems.push({ key: "manual", label: "사용 안내", icon: "📖" });

  return (
    <div style={{ ...styles.dashLayout, position: "relative" }}>
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(6px)",
            zIndex: 99,
            transition: "opacity 0.3s ease",
          }}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className="dashboard-sidebar"
        style={{
          ...styles.sidebar,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: isMobile ? "fixed" : "sticky",
          zIndex: 100,
          width: sidebarOpen ? "260px" : isMobile ? "0px" : "72px",
          transform: isMobile && !sidebarOpen ? "translateX(-100%)" : "translateX(0)",
          opacity: isMobile && !sidebarOpen ? 0 : 1,
        }}
      >
        <div
          style={{
            ...styles.sidebarHeader,
            padding: sidebarOpen ? "24px 20px" : "24px 0",
            justifyContent: sidebarOpen ? "flex-start" : "center",
            transition: "all 0.3s",
          }}
        >
          <span
            style={{
              ...styles.sidebarLogo,
              fontSize: sidebarOpen ? "32px" : "24px",
              transition: "all 0.3s",
            }}
          >
            🐝
          </span>
          {sidebarOpen && (
            <div style={{ animation: "fade 0.2s ease" }}>
              <div style={styles.sidebarBrand}>K-BEE BANK</div>
              <div style={styles.sidebarVersion}>육종 기록</div>
            </div>
          )}
        </div>

        <nav
          style={{
            ...styles.sidebarNav,
            padding: sidebarOpen ? "16px 12px" : "16px 8px",
            alignItems: sidebarOpen ? "stretch" : "center",
          }}
        >
          {navItems.map((item) => {
            return (
              <button
                key={item.key}
                id={`nav-${item.key}`}
                style={{
                  ...styles.navItem,
                  ...(view === item.key ? styles.navItemActive : {}),
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  padding: sidebarOpen ? "12px 14px" : "12px 0",
                  width: "100%",
                  transition: "all 0.2s",
                }}
                onClick={() => {
                  setView(item.key);
                  if (isMobile) setSidebarOpen(false);
                }}
                title={!sidebarOpen ? item.label : undefined}
              >
                <span
                  style={{
                    ...styles.navIcon,
                    marginRight: sidebarOpen ? "10px" : "0px",
                  }}
                >
                  {item.icon}
                </span>
                {sidebarOpen && <span style={{ animation: "fade 0.2s ease" }}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            ...styles.sidebarFooter,
            padding: sidebarOpen ? "16px" : "16px 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: sidebarOpen ? "stretch" : "center",
            transition: "all 0.3s",
          }}
        >
          <div
            style={{
              ...styles.userBadge,
              justifyContent: sidebarOpen ? "flex-start" : "center",
              marginBottom: sidebarOpen ? "12px" : "0px",
            }}
          >
            <div style={styles.userAvatar}>{user.username[0]?.toUpperCase()}</div>
            {sidebarOpen && (
              <div style={{ animation: "fade 0.2s ease", overflow: "hidden", maxWidth: "150px" }}>
                <div style={{ ...styles.userName, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {user.farm_name || user.username}
                </div>
                <div style={styles.userRole}>
                  {user.role === "researcher" ? "🔬 전문 연구원" : user.role === "admin" ? "⚙️ 관리자" : "농가 관리자"}
                </div>
              </div>
            )}
          </div>
          {sidebarOpen ? (
            <button id="btn-logout" style={styles.logoutBtn} onClick={onLogout}>
              로그아웃
            </button>
          ) : (
            <button
              id="btn-logout"
              style={{
                ...styles.logoutBtn,
                padding: "8px 0",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "12px",
              }}
              onClick={onLogout}
              title="로그아웃"
            >
              🚪
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main
        style={{
          ...styles.mainContent,
          transition: "all 0.3s ease",
        }}
      >
        <header
          style={{
            ...styles.topBar,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            padding: isMobile ? "12px 20px" : "16px 32px",
            transition: "all 0.3s",
          }}
        >
          {/* Left Side: Sidebar Toggle & Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fbbf24",
                fontSize: "18px",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
              title={sidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
            >
              {sidebarOpen ? "◀" : "☰"}
            </button>

            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "0 12px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-main)",
                  fontSize: "13px",
                  fontWeight: "bold",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  gap: "6px"
                }}
                className="btn-outline-hover"
                title="메인 소개 페이지로 돌아가기"
              >
                🏠 홈으로
              </button>
            )}

            <div>
              <h1 style={{ ...styles.pageTitle, fontSize: isMobile ? "18px" : "22px", margin: 0 }}>
                {navItems.find((n) => n.key === view)?.icon}{" "}
                {navItems.find((n) => n.key === view)?.label}
              </h1>
              <p style={{ ...styles.pageSubtitle, margin: 0 }}>
                {user.farm_name ? `${user.farm_name} · ` : ""}
                {new Date().toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Right Side: User Profile Badges & Logout Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* User Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }} className="mobile-nav-hide">
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #fbbf24, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                color: "#0b1120",
                fontSize: "14px"
              }}>
                {user.username[0]?.toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "13px", fontWeight: "bold", color: "#f3f4f6" }}>
                  {user.farm_name || user.username}
                </span>
                <span style={{
                  ...styles.roleBadge,
                  alignSelf: "flex-start",
                  background: user.role === "admin" ? "rgba(251,191,36,0.15)" : user.role === "researcher" ? "rgba(96,165,250,0.15)" : "rgba(52,211,153,0.15)",
                  color: user.role === "admin" ? "#fbbf24" : user.role === "researcher" ? "#60a5fa" : "#34d399",
                  padding: "1px 6px",
                  fontSize: "10px",
                }}>
                  {user.role === "admin" ? "ADMIN" : user.role === "researcher" ? "RESEARCHER" : "FARMER"}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.08)",
                color: "#f87171",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s"
              }}
              className="btn-outline-hover"
            >
              로그아웃
            </button>

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
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
                  transition: "all 0.2s",
                }}
                title={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
              >
                {theme === "light" ? "🌙" : "☀️"}
              </button>
            )}
          </div>
        </header>

        <div
          style={{
            ...styles.contentArea,
            padding: isMobile ? "16px" : "28px 32px",
            transition: "all 0.3s",
          }}
        >
          {view === "apiaries" && (
            <ApiaryPanel
              apiaries={apiaries}
              onRefresh={fetchDashboard}
              onSelectApiary={(a) => {
                setSelectedApiary(a);
                setView("colonies");
              }}
              showModal={showApiaryModal}
              setShowModal={setShowApiaryModal}
              userRole={user.role}
            />
          )}
          {view === "colonies" && (
            <ColonyPanel
              apiaries={apiaries}
              selectedApiary={selectedApiary}
              onSelectApiary={setSelectedApiary}
              onRefresh={fetchDashboard}
              showModal={showColonyModal}
              setShowModal={setShowColonyModal}
            />
          )}
          {view === "fieldrecords" && (
            <FieldRecordPanel apiaries={apiaries} />
          )}
          {view === "queens" && (
            <QueenPanel />
          )}
          {view === "admin" && (
            <AdminPanel />
          )}
          {view === "manual" && (
            <ManualPanel />
          )}
        </div>
      </main>
    </div>
  );
}

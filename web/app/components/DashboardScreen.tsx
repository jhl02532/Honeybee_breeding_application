import React, { useState, useEffect, useCallback } from "react";
import { styles } from "../styles";
import { User, Apiary, Colony, DashStats } from "../types";
import { authFetch } from "../utils";
import OverviewPanel from "./OverviewPanel";
import ApiaryPanel from "./ApiaryPanel";
import ColonyPanel from "./ColonyPanel";
import RecordPanel from "./RecordPanel";
import ResearcherPanel from "./ResearcherPanel";
import ManualPanel from "./ManualPanel";
import AdminPanel from "./AdminPanel";
import GenomeBrowser from "./GenomeBrowser";
import ComparativeSynteny from "./ComparativeSynteny";
import ChemoreceptorExplorer from "./ChemoreceptorExplorer";
import MarkerAssayDesigner from "./MarkerAssayDesigner";
import FarmerTraitSimulator from "./FarmerTraitSimulator";
import BreedingMatchmaker from "./BreedingMatchmaker";
import SamplingStatusPanel from "./SamplingStatusPanel";
import PhylogenyPanel from "./PhylogenyPanel";

type DashView =
  | "overview"
  | "apiaries"
  | "colonies"
  | "records"
  | "researcher"
  | "manual"
  | "admin"
  | "browser"
  | "synteny"
  | "chemo"
  | "marker"
  | "farmer"
  | "matchmaker"
  | "sampling"
  | "phylogeny";

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
  initialView = "overview", 
  onBackToLanding 
}: DashboardScreenProps) {
  const [view, setView] = useState<DashView>(initialView);
  const [species, setSpecies] = useState<"mellifera" | "cerana">("mellifera");
  const [stats, setStats] = useState<DashStats | null>(null);
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [selectedApiary, setSelectedApiary] = useState<Apiary | null>(null);
  const [selectedColony, setSelectedColony] = useState<Colony | null>(null);

  // Sync internal view state if parent changes initialView (e.g. from launcher cards)
  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  // Researcher / Admin Farmer Selection State
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [farmers, setFarmers] = useState<any[]>([]);

  // Modal states
  const [showApiaryModal, setShowApiaryModal] = useState(false);
  const [showColonyModal, setShowColonyModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);

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

  const fetchDashboard = useCallback(async (farmerId?: string) => {
    try {
      const targetId = farmerId !== undefined ? farmerId : selectedFarmerId;
      const query = targetId ? `?owner_id=${targetId}` : "";
      const [statsRes, apiRes] = await Promise.all([
        authFetch(`/api/v1/stats/dashboard${query}`),
        authFetch(`/api/v1/apiaries${query}`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (apiRes.ok) setApiaries(await apiRes.json());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }, [selectedFarmerId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Load farmers registry if current user is researcher or admin
  useEffect(() => {
    if (user.role === "researcher" || user.role === "admin") {
      const fetchFarmers = async () => {
        try {
          const res = await authFetch("/api/v1/researcher/farmers");
          if (res.ok) {
            setFarmers(await res.json());
          }
        } catch (err) {
          console.error("Fetch farmers error:", err);
        }
      };
      fetchFarmers();
    }
  }, [user.role]);

  // Cascading reset handler when changing farmers
  const handleFarmerChange = (farmerId: string) => {
    setSelectedApiary(null);
    setSelectedColony(null);
    setSelectedFarmerId(farmerId);
    fetchDashboard(farmerId);
  };

  const navItems: { key: DashView; label: string; icon: string }[] = [
    { key: "overview", label: "대시보드", icon: "📊" },
    { key: "apiaries", label: "양봉장 관리", icon: "🏡" },
    { key: "colonies", label: "봉군 관리", icon: "🐝" },
    { key: "records", label: "형질 기록", icon: "📋" },
  ];

  if (user.role === "researcher" || user.role === "admin") {
    navItems.push(
      { key: "browser", label: "게놈 브라우저", icon: "🧬" },
      { key: "synteny", label: "비교 유전체 분석", icon: "🔀" },
      { key: "chemo", label: "화학수용체 탐색기", icon: "👃" },
      { key: "marker", label: "분자 마커 설계", icon: "🏷️" }
    );
  }

  navItems.push({ key: "farmer", label: "형질 예측기", icon: "📈" });

  if (user.role === "researcher" || user.role === "admin") {
    navItems.push(
      { key: "matchmaker", label: "가상 교배 시뮬레이터", icon: "👑" },
      { key: "researcher", label: "연구원 분석", icon: "🔬" }
    );
  }

  if (user.role === "admin") {
    navItems.push({ key: "admin", label: "시스템 관리", icon: "⚙️" });
  }

  // Always show guidebook manual to all users
  navItems.push({ key: "manual", label: "사용 매뉴얼", icon: "📖" });

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
              <div style={styles.sidebarBrand}>MelittaBreed</div>
              <div style={styles.sidebarVersion}>v2.0 SaaS</div>
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
          {navItems.map((item) => (
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
          ))}
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
          </div>
        </header>

        <div
          style={{
            ...styles.contentArea,
            padding: isMobile ? "16px" : "28px 32px",
            transition: "all 0.3s",
          }}
        >
          {view === "overview" && (
            <OverviewPanel
              stats={stats}
              apiaries={apiaries}
              onRefresh={fetchDashboard}
            />
          )}
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
              farmers={farmers}
              selectedFarmerId={selectedFarmerId}
              onFarmerChange={handleFarmerChange}
              userRole={user.role}
            />
          )}
          {view === "colonies" && (
            <ColonyPanel
              apiaries={apiaries}
              selectedApiary={selectedApiary}
              onSelectApiary={setSelectedApiary}
              onSelectColony={(c) => {
                setSelectedColony(c);
                setView("records");
              }}
              onRefresh={fetchDashboard}
              showModal={showColonyModal}
              setShowModal={setShowColonyModal}
            />
          )}
          {view === "records" && (
            <RecordPanel
              apiaries={apiaries}
              selectedColony={selectedColony}
              onSelectColony={setSelectedColony}
              onRefresh={fetchDashboard}
              showModal={showRecordModal}
              setShowModal={setShowRecordModal}
              farmers={farmers}
              selectedFarmerId={selectedFarmerId}
              onFarmerChange={handleFarmerChange}
              userRole={user.role}
            />
          )}
          {view === "browser" && (
            <GenomeBrowser species={species} onSpeciesChange={setSpecies} />
          )}
          {view === "synteny" && (
            <ComparativeSynteny />
          )}
          {view === "chemo" && (
            <ChemoreceptorExplorer />
          )}
          {view === "marker" && (
            <MarkerAssayDesigner />
          )}
          {view === "farmer" && (
            <FarmerTraitSimulator apiaries={apiaries} />
          )}
          {view === "matchmaker" && (
            <BreedingMatchmaker apiaries={apiaries} />
          )}
          {view === "researcher" && (
            <ResearcherPanel />
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

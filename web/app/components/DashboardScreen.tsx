import React, { useState, useEffect, useCallback } from "react";
import { styles } from "../styles";
import { User, Apiary, Colony, DashStats } from "../types";
import { authFetch } from "../utils";
import OverviewPanel from "./OverviewPanel";
import ApiaryPanel from "./ApiaryPanel";
import ColonyPanel from "./ColonyPanel";
import RecordPanel from "./RecordPanel";

type DashView = "overview" | "apiaries" | "colonies" | "records";

interface DashboardScreenProps {
  user: User;
  onLogout: () => void;
}

export default function DashboardScreen({ user, onLogout }: DashboardScreenProps) {
  const [view, setView] = useState<DashView>("overview");
  const [stats, setStats] = useState<DashStats | null>(null);
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [selectedApiary, setSelectedApiary] = useState<Apiary | null>(null);
  const [selectedColony, setSelectedColony] = useState<Colony | null>(null);

  // Modal states
  const [showApiaryModal, setShowApiaryModal] = useState(false);
  const [showColonyModal, setShowColonyModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const [statsRes, apiRes] = await Promise.all([
        authFetch("/api/v1/stats/dashboard"),
        authFetch("/api/v1/apiaries"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (apiRes.ok) setApiaries(await apiRes.json());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const navItems: { key: DashView; label: string; icon: string }[] = [
    { key: "overview", label: "대시보드", icon: "📊" },
    { key: "apiaries", label: "양봉장 관리", icon: "🏡" },
    { key: "colonies", label: "봉군 관리", icon: "🐝" },
    { key: "records", label: "형질 기록", icon: "📋" },
  ];

  return (
    <div style={styles.dashLayout}>
      {/* ── SIDEBAR ── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.sidebarLogo}>🐝</span>
          <div>
            <div style={styles.sidebarBrand}>MelittaBreed</div>
            <div style={styles.sidebarVersion}>v2.0 SaaS</div>
          </div>
        </div>

        <nav style={styles.sidebarNav}>
          {navItems.map((item) => (
            <button
              key={item.key}
              id={`nav-${item.key}`}
              style={{
                ...styles.navItem,
                ...(view === item.key ? styles.navItemActive : {}),
              }}
              onClick={() => setView(item.key)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userBadge}>
            <div style={styles.userAvatar}>
              {user.username[0]?.toUpperCase()}
            </div>
            <div>
              <div style={styles.userName}>{user.farm_name || user.username}</div>
              <div style={styles.userRole}>농가 관리자</div>
            </div>
          </div>
          <button id="btn-logout" style={styles.logoutBtn} onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={styles.mainContent}>
        <header style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>
              {navItems.find((n) => n.key === view)?.icon}{" "}
              {navItems.find((n) => n.key === view)?.label}
            </h1>
            <p style={styles.pageSubtitle}>
              {user.farm_name ? `${user.farm_name} · ` : ""}
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </header>

        <div style={styles.contentArea}>
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
            />
          )}
        </div>
      </main>
    </div>
  );
}

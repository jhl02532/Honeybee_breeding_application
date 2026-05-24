import React from "react";
import { styles } from "../styles";
import { DashStats, Apiary } from "../types";

interface OverviewPanelProps {
  stats: DashStats | null;
  apiaries: Apiary[];
  onRefresh: () => void;
}

export default function OverviewPanel({
  stats,
  apiaries,
}: OverviewPanelProps) {
  if (!stats) return <div style={styles.emptyState}>로딩 중...</div>;

  const statCards = [
    { label: "양봉장", value: stats.total_apiaries, icon: "🏡", color: "#fbbf24" },
    { label: "총 봉군", value: stats.total_colonies, icon: "🐝", color: "#60a5fa" },
    { label: "활성 봉군", value: stats.active_colonies, icon: "✅", color: "#4ade80" },
    { label: "약세 봉군", value: stats.weak_colonies, icon: "⚠️", color: "#fb923c" },
    { label: "폐사 봉군", value: stats.dead_colonies, icon: "💀", color: "#f87171" },
    { label: "여왕벌 종류", value: stats.queen_types, icon: "👑", color: "#c084fc" },
  ];

  const prodCards = [
    { label: "평균 꿀 생산", value: `${stats.avg_honey} kg`, icon: "🍯", color: "#fbbf24" },
    { label: "평균 프로폴리스", value: `${stats.avg_propolis} g`, icon: "🧪", color: "#22c55e" },
    { label: "평균 로얄젤리", value: `${stats.avg_royal_jelly} g`, icon: "💧", color: "#3b82f6" },
    { label: "평균 생존율", value: `${stats.avg_survival_rate}%`, icon: "💚", color: "#4ade80" },
    { label: "기록 건수", value: stats.total_records, icon: "📋", color: "#9ca3af" },
  ];

  return (
    <div className="animate-fade">
      {/* KPI cards row */}
      <div style={styles.kpiGrid}>
        {statCards.map((c, i) => (
          <div
            key={i}
            style={{
              ...styles.kpiCard,
              animationDelay: `${i * 0.08}s`,
            }}
            className="animate-slide"
          >
            <div style={{ ...styles.kpiIcon, background: `${c.color}22` }}>
              {c.icon}
            </div>
            <div style={{ ...styles.kpiValue, color: c.color }}>{c.value}</div>
            <div style={styles.kpiLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Production stats */}
      <h2 style={styles.sectionTitle}>🍯 생산량 통계</h2>
      <div style={styles.prodGrid}>
        {prodCards.map((c, i) => (
          <div key={i} style={styles.prodCard} className="animate-slide">
            <span style={{ fontSize: "28px" }}>{c.icon}</span>
            <div>
              <div style={{ ...styles.prodValue, color: c.color }}>{c.value}</div>
              <div style={styles.prodLabel}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick apiary list */}
      <h2 style={styles.sectionTitle}>🏡 내 양봉장 현황</h2>
      {apiaries.length === 0 ? (
        <div style={styles.emptyState}>
          등록된 양봉장이 없습니다. "양봉장 관리"에서 추가하세요.
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>양봉장명</th>
                <th style={styles.th}>위치</th>
                <th style={styles.th}>봉군 수</th>
              </tr>
            </thead>
            <tbody>
              {apiaries.map((a) => (
                <tr key={a.id} style={styles.tr}>
                  <td style={styles.td}>{a.name}</td>
                  <td style={styles.td}>{a.location || "-"}</td>
                  <td style={styles.td}>{a.colonies.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

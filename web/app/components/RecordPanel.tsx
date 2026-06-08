import React, { useState, useEffect } from "react";
import { styles } from "../styles";
import { Apiary, Colony, TraitRecord } from "../types";
import { authFetch, renderStars } from "../utils";
interface RecordPanelProps {
  apiaries: Apiary[];
  selectedColony: Colony | null;
  onSelectColony: (c: Colony | null) => void;
  onRefresh: () => void;
  farmers: any[];
  selectedFarmerId: string;
  onFarmerChange: (id: string) => void;
  userRole: string;
}

export default function RecordPanel({
  apiaries,
  selectedColony,
  onSelectColony,
  onRefresh,
  farmers,
  selectedFarmerId,
  onFarmerChange,
  userRole,
}: RecordPanelProps) {
  const allColonies = apiaries.flatMap((a) => a.colonies);
  const records = selectedColony
    ? selectedColony.records
    : allColonies.flatMap((c) => c.records || []);



  const deleteRecord = async (id: number) => {
    if (!confirm("이 형질 기록을 삭제하시겠습니까?")) return;
    try {
      await authFetch(`/api/v1/traits/${id}`, { method: "DELETE" });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "삭제 실패");
    }
  };

  const exportCSV = () => {
    if (records.length === 0) {
      alert("내보낼 형질 기록이 없습니다.");
      return;
    }
    const headers = [
      "날짜",
      "벌통코드",
      "꿀생산량(kg)",
      "프로폴리스(g)",
      "로얄젤리(g)",
      "온순함(1-5)",
      "바이러스저항성(1-5)",
      "응애저항성(1-5)",
      "분봉률(%)",
      "월동생존율(%)",
      "기후적응성(1-5)",
      "VSH저항성(%)",
      "청소청결율(%)",
      "온도(°C)",
      "습도(%)",
      "비고"
    ];
    const rows = records.map((r) => {
      const colony = allColonies.find((c) => c.id === r.colony_id);
      return [
        r.date,
        colony?.code || r.colony_id,
        r.honey_production,
        r.propolis_production,
        r.royal_jelly_production,
        r.temperament,
        r.virus_resistance,
        r.mite_resistance,
        r.swarming_rate,
        r.overwintering_survival,
        r.climate_adaptation,
        r.vsh_rate ?? 0,
        r.hygienic_rate ?? 0,
        r.temperature ?? "",
        r.humidity ?? "",
        (r.notes || "").replace(/"/g, '""')
      ];
    });
    const csvContent = 
      "\uFEFF" + 
      [headers.join(","), ...rows.map(row => row.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `KBEEBANK_BreedRecords_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade">
      <div style={styles.panelHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h2 style={styles.sectionTitle}>
            📋 형질 기록
            {selectedColony && (
              <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: "14px", marginLeft: "12px" }}>
                봉군 {selectedColony.code}
                <button
                  style={styles.clearFilter}
                  onClick={() => onSelectColony(null)}
                >
                  ✕ 필터해제
                </button>
              </span>
            )}
          </h2>
          {(userRole === "researcher" || userRole === "admin") && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "8px", padding: "4px 12px" }}>
              <label style={{ fontSize: "12px", fontWeight: "bold", color: "#60a5fa" }}>통합 관제:</label>
              <select
                value={selectedFarmerId}
                onChange={(e) => onFarmerChange(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "bold",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="" style={{ background: "#151d30" }}>전체 농가</option>
                {farmers.map((f) => (
                  <option key={f.id} value={String(f.id)} style={{ background: "#151d30" }}>
                    {f.farm_name} ({f.username})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={exportCSV}
            style={{
              ...styles.primaryBtn,
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#ffffff"
            }}
          >
            📋 CSV 내보내기
          </button>
          <button
            id="btn-add-record"
            style={styles.primaryBtn}
            onClick={() => {
              if (selectedColony) {
                window.location.href = `/dashboard/record?colony_id=${selectedColony.id}`;
              } else {
                window.location.href = "/dashboard/record";
              }
            }}
          >
            + 형질 기록 추가
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <p>기록이 없습니다. 새 형질 기록을 추가하세요.</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>날짜</th>
                <th style={styles.th}>봉군</th>
                <th style={styles.th}>꿀(kg)</th>
                <th style={styles.th}>프로폴리스(g)</th>
                <th style={styles.th}>로얄젤리(g)</th>
                <th style={styles.th}>온순함</th>
                <th style={styles.th}>바이러스</th>
                <th style={styles.th}>응애</th>
                <th style={styles.th}>생존율(%)</th>
                <th style={styles.th}>VSH(%)</th>
                <th style={styles.th}>청소(%)</th>
                <th style={styles.th}>비고</th>
                <th style={styles.th}>삭제</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const colony = allColonies.find((c) => c.id === r.colony_id);
                return (
                  <tr key={r.id} style={styles.tr}>
                    <td style={styles.td}>{r.date}</td>
                    <td style={styles.td}>{colony?.code || r.colony_id}</td>
                    <td style={styles.td}>{r.honey_production}</td>
                    <td style={styles.td}>{r.propolis_production}</td>
                    <td style={styles.td}>{r.royal_jelly_production}</td>
                    <td style={styles.td}>{renderStars(r.temperament)}</td>
                    <td style={styles.td}>{renderStars(r.virus_resistance)}</td>
                    <td style={styles.td}>{renderStars(r.mite_resistance)}</td>
                    <td style={styles.td}>{r.overwintering_survival}</td>
                    <td style={styles.td}>{r.vsh_rate ?? 0}%</td>
                    <td style={styles.td}>{r.hygienic_rate ?? 0}%</td>
                    <td style={{ ...styles.td, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.notes || "-"}
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.deleteBtnSmall}
                        onClick={() => deleteRecord(r.id)}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}


    </div>
  );
}

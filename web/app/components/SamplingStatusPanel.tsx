"use client";

import React, { useState, useEffect } from "react";
import { authFetch } from "../utils";

interface SamplingRow {
  [key: string]: any;
}

interface SamplingData {
  [sheetName: string]: SamplingRow[];
}

export default function SamplingStatusPanel() {
  const [data, setData] = useState<SamplingData | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [lineageFilter, setLineageFilter] = useState<string>("all");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const res = await authFetch("/api/v1/researcher/sampling-status");
        if (!res.ok) {
          throw new Error("유전자원 수집 데이터를 가져오는 데 실패했습니다.");
        }
        const json = await res.json();
        if (json.error) {
          setError(json.error);
        } else if (json.data) {
          setData(json.data);
          // Set first sheet active by default
          const keys = Object.keys(json.data);
          if (keys.length > 0) {
            setActiveSheet(keys[0]);
          }
        } else {
          setData(json);
          // Set first sheet active by default
          const keys = Object.keys(json);
          if (keys.length > 0) {
            setActiveSheet(keys[0]);
          }
        }
      } catch (err: any) {
        setError(err.message || "서버 통신 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(251, 191, 36, 0.2)",
          borderTop: "3px solid var(--color-gold)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: "rgba(239, 68, 68, 0.1)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        borderRadius: "12px",
        padding: "20px",
        color: "#ef4444",
        textAlign: "center"
      }}>
        <h4 style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>⚠️ 데이터 로딩 실패</h4>
        <p style={{ margin: 0, fontSize: "14px" }}>{error}</p>
      </div>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
        데이터가 비어 있습니다.
      </div>
    );
  }

  const activeRows = data[activeSheet] || [];
  
  // Calculate aggregated stats across all sheets
  const totalPoreC = data["Pore-C_sample"]?.length || 0;
  const totalAc = data["육종 샘플링_Ac"]?.length || 0;
  const totalAm = data["육종 샘플링 Am"]?.length || 0;
  const grandTotal = totalPoreC + totalAc + totalAm;

  // Extract unique filter choices based on active sheet columns
  const getUniqueValues = (columnKey: string) => {
    const vals = new Set<string>();
    activeRows.forEach((row) => {
      const val = row[columnKey];
      if (val !== undefined && val !== null && val !== "-") {
        vals.add(String(val).trim());
      }
    });
    return Array.from(vals);
  };

  const uniqueRegions = getUniqueValues("권역");
  const uniqueLineages = getUniqueValues("계통");
  const uniqueSpecies = getUniqueValues("종");

  // Filtering row items
  const filteredRows = activeRows.filter((row) => {
    // Search match
    const textStr = Object.values(row).join(" ").toLowerCase();
    const matchesSearch = textStr.includes(searchQuery.toLowerCase());

    // Category match
    const rowRegion = row["권역"] ? String(row["권역"]).trim() : "";
    const matchesRegion = regionFilter === "all" || rowRegion === regionFilter;

    const rowLineage = row["계통"] ? String(row["계통"]).trim() : "";
    const matchesLineage = lineageFilter === "all" || rowLineage === lineageFilter;

    const rowSpecies = row["종"] ? String(row["종"]).trim() : "";
    const matchesSpecies = speciesFilter === "all" || rowSpecies === speciesFilter;

    return matchesSearch && matchesRegion && matchesLineage && matchesSpecies;
  });

  // Table Headers
  const columns = activeRows.length > 0 ? Object.keys(activeRows[0]) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* 📊 KPI Summary Statistics Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px"
      }}>
        <div style={{
          padding: "20px",
          borderRadius: "14px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          borderLeft: "4px solid var(--color-gold)"
        }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)" }}>전체 수집 시료수</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-main)" }}>{grandTotal} 개</span>
        </div>
        <div style={{
          padding: "20px",
          borderRadius: "14px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          borderLeft: "4px solid #60a5fa"
        }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)" }}>Pore-C 해독 시료</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#60a5fa" }}>{totalPoreC} 개</span>
        </div>
        <div style={{
          padding: "20px",
          borderRadius: "14px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          borderLeft: "4px solid #34d399"
        }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)" }}>토종벌 (Apis cerana)</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#34d399" }}>{totalAc} 개</span>
        </div>
        <div style={{
          padding: "20px",
          borderRadius: "14px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          borderLeft: "4px solid #fb7185"
        }}>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)" }}>서양벌 (Apis mellifera)</span>
          <span style={{ fontSize: "28px", fontWeight: 800, color: "#fb7185" }}>{totalAm} 개</span>
        </div>
      </div>

      {/* 📁 Sheet Switcher Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
        {Object.keys(data).filter(k => k !== "error").map((sheetName) => (
          <button
            key={sheetName}
            onClick={() => {
              setActiveSheet(sheetName);
              // Reset filters on sheet switch
              setRegionFilter("all");
              setLineageFilter("all");
              setSpeciesFilter("all");
              setSearchQuery("");
            }}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: activeSheet === sheetName ? "var(--color-gold-glow)" : "var(--bg-surface)",
              color: activeSheet === sheetName ? "var(--color-gold)" : "var(--text-muted)",
              fontWeight: activeSheet === sheetName ? "bold" : "normal",
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s"
            }}
          >
            {sheetName === "Pore-C_sample" ? "🧬 Pore-C 시료 분석 현황" : 
             sheetName === "육종 샘플링_Ac" ? "🐝 동양벌(토종) 수집 현황" : 
             sheetName === "육종 샘플링 Am" ? "🍯 서양벌(양봉) 수집 현황" : sheetName} ({data[sheetName]?.length || 0})
          </button>
        ))}
      </div>

      {/* 🔍 Search & Filters Bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        padding: "16px",
        borderRadius: "12px",
        alignItems: "center"
      }}>
        {/* Text Search */}
        <div style={{ flex: 2, minWidth: "200px" }}>
          <input
            type="text"
            placeholder="시료명, 농가주, 주소 등 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-app)",
              color: "var(--text-main)",
              fontSize: "13px",
              outline: "none"
            }}
          />
        </div>

        {/* Region Filter */}
        {uniqueRegions.length > 0 && (
          <div style={{ minWidth: "120px" }}>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-app)",
                color: "var(--text-main)",
                fontSize: "13px",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="all">권역 (전체)</option>
              {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {/* Lineage Filter */}
        {uniqueLineages.length > 0 && (
          <div style={{ minWidth: "120px" }}>
            <select
              value={lineageFilter}
              onChange={(e) => setLineageFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-app)",
                color: "var(--text-main)",
                fontSize: "13px",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="all">계통 (전체)</option>
              {uniqueLineages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        )}

        {/* Species Filter */}
        {uniqueSpecies.length > 0 && (
          <div style={{ minWidth: "120px" }}>
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-app)",
                color: "var(--text-main)",
                fontSize: "13px",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="all">종류 (전체)</option>
              {uniqueSpecies.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {/* Reset button */}
        {(searchQuery || regionFilter !== "all" || lineageFilter !== "all" || speciesFilter !== "all") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setRegionFilter("all");
              setLineageFilter("all");
              setSpeciesFilter("all");
            }}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "none",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#f87171",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 📄 Interactive Data Table */}
      <div style={{
        overflowX: "auto",
        borderRadius: "12px",
        border: "1px solid var(--border-color)",
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-sm)"
      }}>
        {filteredRows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            검색 필터 조건에 부합하는 유전자원 시료가 존재하지 않습니다.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--bg-app)" }}>
                {columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      borderBottom: "1px solid var(--border-color)"
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)"
                  }}
                  className="tr-hover-effect"
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      style={{
                        padding: "10px 16px",
                        color: "var(--text-main)"
                      }}
                    >
                      {/* Highlight ID columns */}
                      {col.includes("시료 ID") || col.includes("시료ID") ? (
                        <span style={{
                          background: "var(--color-gold-glow)",
                          color: "var(--color-gold)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "bold",
                          fontSize: "12px"
                        }}>
                          {row[col]}
                        </span>
                      ) : (
                        String(row[col] ?? "-")
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
    </div>
  );
}

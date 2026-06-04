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

  // Search & Filter state (Korea map)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [lineageFilter, setLineageFilter] = useState<string>("all");
  const [hoveredSample, setHoveredSample] = useState<string | null>(null);

  // Map Mode and World WGS states
  const [mapMode, setMapMode] = useState<"korea" | "world">("korea");
  const [wgsData, setWgsData] = useState<any[] | null>(null);
  const [wgsLoading, setWgsLoading] = useState<boolean>(false);
  const [wgsError, setWgsError] = useState<string>("");
  const [wgsCountryFilter, setWgsCountryFilter] = useState<string>("all");
  const [wgsSpeciesFilter, setWgsSpeciesFilter] = useState<string>("all");
  const [wgsSearchQuery, setWgsSearchQuery] = useState<string>("");

  // Projection functions to map lat/lng to Y/X on a 300x420 SVG canvas (Korea)
  const getXY = (latVal: number, lngVal: number) => {
    const minLat = 33.0;
    const maxLat = 39.0;
    const minLng = 125.0;
    const maxLng = 130.5;

    const width = 300;
    const height = 400;

    const lat = Math.max(minLat, Math.min(maxLat, latVal));
    const lng = Math.max(minLng, Math.min(maxLng, lngVal));

    const x = ((lng - minLng) / (maxLng - minLng)) * width;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * height;

    return { x, y };
  };

  // Projection functions to map lat/lng to Y/X on a 500x300 SVG canvas (World)
  const getWorldXY = (latVal: number, lngVal: number) => {
    // Equirectangular projection
    const x = ((lngVal + 180) / 360) * 500;
    const y = ((90 - latVal) / 180) * 300;
    return { x, y };
  };

  // Fetch Korea sampling status data
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

  // Fetch World WGS data dynamically when mapMode is set to "world"
  useEffect(() => {
    if (mapMode === "world" && !wgsData) {
      const fetchWgs = async () => {
        try {
          setWgsLoading(true);
          const res = await authFetch("/api/v1/researcher/wgs-world-data");
          if (!res.ok) {
            throw new Error("WGS 세계지도 데이터를 가져오는 데 실패했습니다.");
          }
          const json = await res.json();
          if (json.error) {
            setWgsError(json.error);
          } else if (json.data) {
            setWgsData(json.data);
          }
        } catch (err: any) {
          setWgsError(err.message || "서버 통신 오류가 발생했습니다.");
        } finally {
          setWgsLoading(false);
        }
      };
      fetchWgs();
    }
  }, [mapMode, wgsData]);

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

  // Korea Data Setup
  const activeRows = data[activeSheet] || [];
  const totalPoreC = data["Pore-C_sample"]?.length || 0;
  const totalAc = data["육종 샘플링_Ac"]?.length || 0;
  const totalAm = data["육종 샘플링 Am"]?.length || 0;
  const grandTotal = totalPoreC + totalAc + totalAm;

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

  const filteredRows = activeRows.filter((row) => {
    const textStr = Object.values(row).join(" ").toLowerCase();
    const matchesSearch = textStr.includes(searchQuery.toLowerCase());

    const rowRegion = row["권역"] ? String(row["권역"]).trim() : "";
    const matchesRegion = regionFilter === "all" || rowRegion === regionFilter;

    const rowLineage = row["계통"] ? String(row["계통"]).trim() : "";
    const matchesLineage = lineageFilter === "all" || rowLineage === lineageFilter;

    const rowSpecies = row["종"] ? String(row["종"]).trim() : "";
    const matchesSpecies = speciesFilter === "all" || rowSpecies === speciesFilter;

    return matchesSearch && matchesRegion && matchesLineage && matchesSpecies;
  });

  const columns = activeRows.length > 0 ? Object.keys(activeRows[0]) : [];

  // World WGS Data Setup
  const wgsRows = wgsData || [];
  const uniqueWgsCountries = Array.from(new Set(wgsRows.map(r => r.Country).filter(Boolean))).sort() as string[];
  const uniqueWgsSpecies = Array.from(new Set(wgsRows.map(r => r.Species).filter(Boolean))).sort() as string[];

  const filteredWgsRows = wgsRows.filter((row) => {
    const textStr = `${row.Country} ${row.Region} ${row.Species}`.toLowerCase();
    const matchesSearch = textStr.includes(wgsSearchQuery.toLowerCase());
    const matchesCountry = wgsCountryFilter === "all" || row.Country === wgsCountryFilter;
    const matchesSpecies = wgsSpeciesFilter === "all" || row.Species === wgsSpeciesFilter;
    return matchesSearch && matchesCountry && matchesSpecies;
  });

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
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)" }}>국내 수집 시료수</span>
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

      {/* 🗺️ Main Panel Content (Map + Table Controls) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
        
        {/* Left Side: Map Visualizer */}
        <div style={{
          flex: "1 1 300px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          position: "relative"
        }}>
          <style>{`
            @keyframes pulse-dot {
              0% { transform: scale(0.9); opacity: 0.8; }
              50% { transform: scale(1.4); opacity: 0.3; }
              100% { transform: scale(0.9); opacity: 0.8; }
            }
            .pulse-ring {
              animation: pulse-dot 2s infinite ease-in-out;
              transform-origin: center;
            }
          `}</style>

          {/* Map Selection Toggle */}
          <div style={{ display: "flex", gap: "8px", background: "var(--bg-surface)", border: "1px solid var(--border-color)", padding: "6px", borderRadius: "10px", alignSelf: "flex-start" }}>
            <button
              onClick={() => setMapMode("korea")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                background: mapMode === "korea" ? "var(--color-gold-glow)" : "transparent",
                color: mapMode === "korea" ? "var(--color-gold)" : "var(--text-muted)",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              🇰🇷 국내 유전자원 지도
            </button>
            <button
              onClick={() => setMapMode("world")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                background: mapMode === "world" ? "var(--color-gold-glow)" : "transparent",
                color: mapMode === "world" ? "var(--color-gold)" : "var(--text-muted)",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              🌐 글로벌 공공 WGS 지도
            </button>
          </div>
          
          <div style={{ position: "relative" }}>
            {mapMode === "korea" ? (
              <svg 
                width="100%" 
                height="420px" 
                viewBox="0 0 300 420" 
                style={{ 
                  background: "rgba(0,0,0,0.15)", 
                  borderRadius: "14px", 
                  border: "1px solid var(--border-color)", 
                  overflow: "visible" 
                }}
              >
                {/* Province Boundaries Outline */}
                <g stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.5" fill="rgba(59, 130, 246, 0.04)">
                  <path d="M 80,60 L 140,55 L 150,90 L 130,120 L 75,100 Z" />
                  <path d="M 140,55 L 210,40 L 250,95 L 230,150 L 150,90 Z" />
                  <path d="M 130,120 L 150,90 L 230,150 L 200,200 L 160,190 L 130,160 Z" />
                  <path d="M 75,100 L 130,120 L 130,160 L 150,210 L 80,180 Z" />
                  <path d="M 80,180 L 150,210 L 160,190 L 180,240 L 120,270 L 85,250 Z" />
                  <path d="M 85,250 L 120,270 L 160,255 L 185,320 L 80,340 Z" />
                  <path d="M 230,150 L 270,140 L 285,230 L 210,265 L 180,240 L 200,200 Z" />
                  <path d="M 180,240 L 210,265 L 280,250 L 265,310 L 185,320 L 160,255 Z" />
                  <path d="M 70,370 A 25,15 0 1,0 120,370 A 25,15 0 1,0 70,370 Z" />
                </g>

                {/* Grid lines */}
                <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.02)" />
                <line x1="0" y1="200" x2="300" y2="200" stroke="rgba(255,255,255,0.02)" />
                <line x1="0" y1="300" x2="300" y2="300" stroke="rgba(255,255,255,0.02)" />
                <line x1="100" y1="0" x2="100" y2="420" stroke="rgba(255,255,255,0.02)" />
                <line x1="200" y1="0" x2="200" y2="420" stroke="rgba(255,255,255,0.02)" />

                <text x="15" y="30" fill="var(--color-gold)" fontSize="12px" fontWeight="bold" opacity="0.8">📡 유전자원 시료 지도 관제</text>

                {/* Markers */}
                {filteredRows.map((row, idx) => {
                  const latVal = parseFloat(row["lat"]);
                  const lngVal = parseFloat(row["lng"]);
                  if (isNaN(latVal) || isNaN(lngVal)) return null;

                  const { x, y } = getXY(latVal, lngVal);

                  const sampleId = row["시료 ID"] || row["시료ID"] || "-";
                  const farmerName = row["농가(대표자)"] || row["농가주"] || "-";
                  const address = row["주소 (상세)"] || row["주소"] || "-";

                  const tooltipText = `[${sampleId}] ${farmerName} - ${address}`;

                  return (
                    <g 
                      key={idx} 
                      transform={`translate(${x}, ${y})`}
                      onMouseEnter={() => setHoveredSample(tooltipText)}
                      onMouseLeave={() => setHoveredSample(null)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        r="6"
                        fill="var(--color-gold)"
                        opacity="0.4"
                        className="pulse-ring"
                      />
                      <circle
                        r="4.5"
                        fill="var(--color-gold)"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}
              </svg>
            ) : (
              <svg 
                width="100%" 
                height="420px" 
                viewBox="0 0 500 300" 
                style={{ 
                  background: "rgba(0,0,0,0.15)", 
                  borderRadius: "14px", 
                  border: "1px solid var(--border-color)", 
                  overflow: "visible" 
                }}
              >
                {/* World Grid Lines */}
                <g stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1">
                  <line x1="0" y1="50" x2="500" y2="50" />
                  <line x1="0" y1="100" x2="500" y2="100" />
                  <line x1="0" y1="150" x2="500" y2="150" />
                  <line x1="0" y1="200" x2="500" y2="200" />
                  <line x1="0" y1="250" x2="500" y2="250" />
                  <line x1="83" y1="0" x2="83" y2="300" />
                  <line x1="166" y1="0" x2="166" y2="300" />
                  <line x1="250" y1="0" x2="250" y2="300" />
                  <line x1="333" y1="0" x2="333" y2="300" />
                  <line x1="416" y1="0" x2="416" y2="300" />
                </g>

                {/* World Continents Simplified Outline */}
                <g stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.2" fill="rgba(59, 130, 246, 0.05)">
                  {/* Greenland */}
                  <path d="M 148,16 L 233,16 L 194,50 Z" />
                  {/* North America */}
                  <path d="M 16,41 L 166,41 L 145,91 L 138,108 L 118,125 L 83,91 Z" />
                  {/* South America */}
                  <path d="M 145,133 L 201,158 L 152,241 L 138,158 Z" />
                  {/* Africa */}
                  <path d="M 229,100 L 294,100 L 320,133 L 277,206 L 263,141 Z" />
                  {/* Eurasia */}
                  <path d="M 236,50 L 277,33 L 486,33 L 472,58 L 444,90 L 416,100 L 358,133 L 312,125 L 243,83 Z" />
                  {/* Australia */}
                  <path d="M 409,183 L 451,175 L 458,208 L 409,208 Z" />
                </g>

                <text x="15" y="30" fill="var(--color-gold)" fontSize="12px" fontWeight="bold" opacity="0.8">🌐 글로벌 공공 WGS 수집 지도</text>

                {/* World Markers */}
                {wgsLoading ? (
                  <text x="250" y="150" fill="var(--text-muted)" fontSize="13px" textAnchor="middle">글로벌 WGS 데이터 로드 중...</text>
                ) : wgsError ? (
                  <text x="250" y="150" fill="#ef4444" fontSize="12px" textAnchor="middle">WGS 데이터 로딩 실패</text>
                ) : (
                  filteredWgsRows.map((row, idx) => {
                    const latVal = parseFloat(row.lat);
                    const lngVal = parseFloat(row.lng);
                    const countVal = parseInt(row.Count) || 1;
                    if (isNaN(latVal) || isNaN(lngVal)) return null;

                    const { x, y } = getWorldXY(latVal, lngVal);
                    const bubbleRadius = Math.max(3, Math.min(15, 3 + Math.sqrt(countVal) * 0.4));

                    const tooltipText = `[${row.Country} / ${row.Region}] ${row.Species} - 총 ${countVal} 개체`;

                    return (
                      <g
                        key={`wgs-${idx}`}
                        transform={`translate(${x}, ${y})`}
                        onMouseEnter={() => setHoveredSample(tooltipText)}
                        onMouseLeave={() => setHoveredSample(null)}
                        style={{ cursor: "pointer" }}
                      >
                        <circle
                          r={bubbleRadius + 2.5}
                          fill="var(--color-gold)"
                          opacity="0.3.5"
                          className="pulse-ring"
                        />
                        <circle
                          r={bubbleRadius}
                          fill="var(--color-gold)"
                          stroke="#ffffff"
                          strokeWidth="0.8"
                        />
                      </g>
                    );
                  })
                )}
              </svg>
            )}

            {/* Hover Tooltip Overlay Box */}
            {hoveredSample && (
              <div style={{
                position: "absolute",
                bottom: "12px",
                left: "12px",
                right: "12px",
                background: "rgba(11, 17, 32, 0.92)",
                border: "1px solid var(--color-gold)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#ffffff",
                fontSize: "12px",
                zIndex: 10,
                pointerEvents: "none",
                boxShadow: "var(--shadow-lg)",
                wordBreak: "break-all"
              }}>
                📌 <strong>위치 정보:</strong> {hoveredSample}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Switcher, Filters, Search */}
        <div style={{
          flex: "2 1 450px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          {mapMode === "korea" ? (
            <>
              {/* 📁 Sheet Switcher Tabs */}
              <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px", flexWrap: "wrap" }}>
                {Object.keys(data).filter(k => k !== "error").map((sheetName) => (
                  <button
                    key={sheetName}
                    onClick={() => {
                      setActiveSheet(sheetName);
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
                flexDirection: "column",
                gap: "12px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                padding: "16px",
                borderRadius: "12px"
              }}>
                {/* Text Search */}
                <div>
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

                {/* Dropdown Filters Row */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {uniqueRegions.length > 0 && (
                    <div style={{ flex: 1, minWidth: "100px" }}>
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

                  {uniqueLineages.length > 0 && (
                    <div style={{ flex: 1, minWidth: "100px" }}>
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

                  {uniqueSpecies.length > 0 && (
                    <div style={{ flex: 1, minWidth: "100px" }}>
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
                </div>

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
                      width: "100%",
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
            </>
          ) : (
            <>
              {/* 📊 WGS Status Metrics */}
              <div style={{ display: "flex", gap: "10px", paddingBottom: "10px", borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: "13px" }}>
                <span>📁 WGS 그룹: <strong>{wgsRows.length}개</strong></span>
                <span>•</span>
                <span>총 시퀀싱 시료수: <strong>{wgsRows.reduce((a, b) => a + (parseInt(b.Count) || 0), 0)}개</strong></span>
              </div>

              {/* 🔍 Search & Filters Bar for WGS */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                padding: "16px",
                borderRadius: "12px"
              }}>
                {/* WGS Search */}
                <div>
                  <input
                    type="text"
                    placeholder="국가명, 도시, 학명 등 검색..."
                    value={wgsSearchQuery}
                    onChange={(e) => setWgsSearchQuery(e.target.value)}
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

                {/* WGS Dropdowns */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "120px" }}>
                    <select
                      value={wgsCountryFilter}
                      onChange={(e) => setWgsCountryFilter(e.target.value)}
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
                      <option value="all">국가 (전체)</option>
                      {uniqueWgsCountries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: "120px" }}>
                    <select
                      value={wgsSpeciesFilter}
                      onChange={(e) => setWgsSpeciesFilter(e.target.value)}
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
                      <option value="all">학명 (전체)</option>
                      {uniqueWgsSpecies.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Reset button */}
                {(wgsSearchQuery || wgsCountryFilter !== "all" || wgsSpeciesFilter !== "all") && (
                  <button
                    onClick={() => {
                      setWgsSearchQuery("");
                      setWgsCountryFilter("all");
                      setWgsSpeciesFilter("all");
                    }}
                    style={{
                      width: "100%",
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
            </>
          )}
        </div>
      </div>

      {/* 📄 Interactive Data Table */}
      <div style={{
        overflowX: "auto",
        borderRadius: "12px",
        border: "1px solid var(--border-color)",
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-sm)"
      }}>
        {mapMode === "korea" ? (
          filteredRows.length === 0 ? (
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
          )
        ) : (
          filteredWgsRows.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              검색 필터 조건에 부합하는 세계 WGS 시료가 존재하지 않습니다.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-app)" }}>
                  {["국가 (Country)", "도시/구역 (Region)", "수집 종 (Species)", "시퀀싱 수 (Count)", "위도 (Latitude)", "경도 (Longitude)"].map((col) => (
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
                {filteredWgsRows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid var(--border-color)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)"
                    }}
                    className="tr-hover-effect"
                  >
                    <td style={{ padding: "10px 16px", color: "var(--text-main)", fontWeight: "bold" }}>{row.Country}</td>
                    <td style={{ padding: "10px 16px", color: "var(--text-main)" }}>{row.Region}</td>
                    <td style={{ padding: "10px 16px", color: "var(--color-gold)", fontStyle: "italic" }}>{row.Species}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{
                        background: "rgba(59, 130, 246, 0.15)",
                        color: "#60a5fa",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        fontSize: "12px"
                      }}>
                        {row.Count}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", color: "var(--text-muted)" }}>{row.lat}</td>
                    <td style={{ padding: "10px 16px", color: "var(--text-muted)" }}>{row.lng}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
      
    </div>
  );
}

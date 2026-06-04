"use client";

import React, { useState, useEffect } from "react";
import { authFetch } from "../utils";

export default function SamplingStatusPanel() {
  const [data, setData] = useState<any>(null); // Domestic sheets data
  const [wgsData, setWgsData] = useState<any[] | null>(null); // Global WGS data
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [hoveredSample, setHoveredSample] = useState<string | null>(null);

  // Filter States
  const [mode, setMode] = useState<"domestic" | "global">("domestic");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string | null>("all");
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState<string>("");

  // Coordinates Mapping for South Korea SVG (300x420 canvas)
  const getXY = (latVal: number, lngVal: number) => {
    const centerLat = 36.0;
    const centerLng = 127.75;
    const latScale = 65.0;
    const lngScale = latScale * 0.81;
    const canvasCenterX = 150;
    const canvasCenterY = 200;
    const x = canvasCenterX + (lngVal - centerLng) * lngScale;
    const y = canvasCenterY - (latVal - centerLat) * latScale; // SVG coordinates go downwards
    return { x, y };
  };

  // Coordinates Mapping for World SVG (500x300 canvas)
  const getWorldXY = (latVal: number, lngVal: number) => {
    const x = ((lngVal + 180) / 360) * 500;
    const y = ((90 - latVal) / 180) * 300;
    return { x, y };
  };

  // State Cascading Manager
  const handleSetMode = (newMode: "domestic" | "global") => {
    setMode(newMode);
    if (newMode === "domestic") {
      setCountryFilter(null);
      setCountrySearch("");
      setRegionFilter("all");
    } else {
      setRegionFilter(null);
      setCountryFilter("all");
      setCountrySearch("");
    }
  };

  // Load All Datasets on Mount to enable fast, zero-latency client-side filtering
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch Domestic Sheets
        const domesticRes = await authFetch("/api/v1/researcher/sampling-status");
        if (!domesticRes.ok) {
          throw new Error("국내 유전자원 수집 데이터를 가져오는 데 실패했습니다.");
        }
        const domesticJson = await domesticRes.json();

        // Fetch Global WGS Data
        const globalRes = await authFetch("/api/v1/researcher/sampling-status?mode=global");
        if (!globalRes.ok) {
          throw new Error("글로벌 WGS 공공데이터를 가져오는 데 실패했습니다.");
        }
        const globalJson = await globalRes.json();

        setData(domesticJson.data || {});
        setWgsData(globalJson.data || []);
      } catch (err: any) {
        setError(err.message || "서버 통신 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  // ── Unified Data Filtering Pipeline ──

  // Extract and normalize Project-produced Domestic Rows
  const projectRows: any[] = [];
  if (data) {
    Object.keys(data).forEach((sheetName) => {
      (data[sheetName] || []).forEach((row: any) => {
        projectRows.push({
          ...row,
          source: "project",
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          Species: String(row.종 || row.Species || "").toLowerCase().includes("cerana") ? "Apis cerana" : "Apis mellifera",
          Region: row.권역 || row.Region || "",
          Country: "South Korea"
        });
      });
    });
  }

  // Extract and normalize Public collected WGS Rows
  const publicRows: any[] = [];
  if (wgsData) {
    wgsData.forEach((row: any) => {
      publicRows.push({
        ...row,
        source: "public",
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        Count: parseInt(row.Count) || 1,
        Species: String(row.Species || "").toLowerCase().includes("cerana") ? "Apis cerana" : "Apis mellifera",
        Region: row.Region || "",
        Country: row.Country || ""
      });
    });
  }

  // 1. Get base rows based on Active Mode and Source Type Filter
  let baseRows: any[] = [];
  if (mode === "domestic") {
    const pRows = projectRows;
    const pubRows = publicRows.filter((r) => r.Country === "South Korea" || r.Country === "Korea");

    if (sourceFilter === "project") {
      baseRows = pRows;
    } else if (sourceFilter === "public") {
      baseRows = pubRows;
    } else {
      baseRows = [...pRows, ...pubRows];
    }
  } else {
    // global mode
    const pRows = projectRows;
    const pubRows = publicRows;

    if (sourceFilter === "project") {
      baseRows = pRows;
    } else if (sourceFilter === "public") {
      baseRows = pubRows;
    } else {
      baseRows = [...pRows, ...pubRows];
    }
  }

  // 2. Filter by Species
  const filteredBySpecies = baseRows.filter((row) => {
    if (speciesFilter === "all") return true;
    return row.Species === speciesFilter;
  });

  // 3. Filter by Region (Domestic) or Country (Global)
  const finalFilteredRows = filteredBySpecies.filter((row) => {
    if (mode === "domestic") {
      if (!regionFilter || regionFilter === "all") return true;
      const reg = String(row.Region || "").toLowerCase();
      const filterReg = String(regionFilter).toLowerCase();
      return reg.includes(filterReg) || filterReg.includes(reg);
    } else {
      // global mode country filters
      const matchesSearch = !countrySearch || String(row.Country || "").toLowerCase().includes(countrySearch.toLowerCase());
      const matchesDropdown = !countryFilter || countryFilter === "all" || String(row.Country || "").toLowerCase() === countryFilter.toLowerCase();
      return matchesSearch && matchesDropdown;
    }
  });

  // ── Real-time Statistical Counts for Summary Cards ──
  let ceranaCount = 0;
  let melliferaCount = 0;

  finalFilteredRows.forEach((row) => {
    const count = parseInt(row.Count) || 1;
    if (row.Species === "Apis cerana") {
      ceranaCount += count;
    } else {
      melliferaCount += count;
    }
  });

  // Unique Options Extraction for dropdown elements
  const uniqueRegions = Array.from(
    new Set(
      [...projectRows, ...publicRows.filter((r) => r.Country === "South Korea")]
        .map((r) => String(r.Region || "").split(" ")[0].trim())
        .filter(Boolean)
    )
  ).sort();

  const uniqueCountries = Array.from(
    new Set(publicRows.map((r) => r.Country).filter(Boolean))
  ).sort() as string[];

  // Render Loader screen
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "350px" }}>
        <div style={{
          width: "44px",
          height: "44px",
          border: "3px solid rgba(251, 191, 36, 0.15)",
          borderTop: "3px solid var(--color-gold)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
      </div>
    );
  }

  // Render Error screen
  if (error) {
    return (
      <div style={{
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.15)",
        borderRadius: "14px",
        padding: "24px",
        color: "#f87171",
        textAlign: "center",
        maxWidth: "600px",
        margin: "40px auto"
      }}>
        <h4 style={{ margin: "0 0 8px 0", fontWeight: "bold", fontSize: "16px" }}>⚠️ 데이터 로드 오류</h4>
        <p style={{ margin: 0, fontSize: "14px" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Dynamic CSS styles for animations and hovers */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .map-marker {
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), fill 0.2s ease;
        }
        .map-marker:hover {
          transform: scale(1.6);
          filter: drop-shadow(0 0 4px var(--color-gold));
        }
        .continent-path {
          transition: fill 0.3s ease, stroke 0.3s ease;
        }
        .continent-path:hover {
          fill: rgba(251, 191, 36, 0.08) !important;
          stroke: rgba(251, 191, 36, 0.35) !important;
        }
        .summary-card {
          transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .summary-card:hover {
          transform: translateY(-4px);
          border-color: var(--color-gold) !important;
          box-shadow: 0 12px 24px -10px rgba(251, 191, 36, 0.15) !important;
        }
      `}</style>

      {/* 📊 영역 1: 최상단 종별 총 수집량 요약보드 (Summary Cards) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px",
        marginBottom: "4px"
      }}>
        {/* Card A: Apis cerana */}
        <div className="summary-card" style={{
          padding: "24px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(251, 191, 36, 0.05), rgba(251, 191, 36, 0.01))",
          border: "1px solid var(--border-color)",
          borderLeft: "5px solid var(--color-gold)",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Apis cerana</span>
          <span style={{ fontSize: "15px", fontWeight: "bold", color: "var(--text-main)" }}>🐝 토종벌 총 수집량</span>
          <span style={{ fontSize: "36px", fontWeight: 800, color: "var(--color-gold)", lineHeight: 1 }}>
            {ceranaCount.toLocaleString()} <span style={{ fontSize: "15px", fontWeight: "normal", color: "var(--text-muted)" }}>개체</span>
          </span>
        </div>

        {/* Card B: Apis mellifera */}
        <div className="summary-card" style={{
          padding: "24px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(96, 165, 250, 0.05), rgba(96, 165, 250, 0.01))",
          border: "1px solid var(--border-color)",
          borderLeft: "5px solid #60a5fa",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Apis mellifera</span>
          <span style={{ fontSize: "15px", fontWeight: "bold", color: "var(--text-main)" }}>🍯 서양벌 총 수집량</span>
          <span style={{ fontSize: "36px", fontWeight: 800, color: "#60a5fa", lineHeight: 1 }}>
            {melliferaCount.toLocaleString()} <span style={{ fontSize: "15px", fontWeight: "normal", color: "var(--text-muted)" }}>개체</span>
          </span>
        </div>
      </div>

      {/* 🗺️ 영역 2 & 3: 국내 / 해외 동적 지도 스위칭 및 필터 사이드바 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
        
        {/* Left Side: Map Visualizer (Korea vs World SVG Maps) */}
        <div style={{
          flex: "1 1 400px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          minWidth: "320px",
          position: "relative"
        }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxShadow: "var(--shadow-md)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)" }}>
                {mode === "domestic" ? "🇰🇷 대한민국 유전자원 분포도" : "🌐 글로벌 WGS 수집 분포도"}
              </span>
              <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "var(--text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-gold)" }} /> 자체생산
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#60a5fa" }} /> 공공수집
                </span>
              </div>
            </div>

            <div style={{
              position: "relative",
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "rgba(15, 23, 42, 0.25)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.05)",
              overflow: "hidden",
              padding: "20px 0"
            }}>
              {mode === "domestic" ? (
                // South Korea SVG Map
                <svg
                  width="100%"
                  height="450px"
                  viewBox="0 0 300 420"
                  style={{ overflow: "visible" }}
                >
                  <g stroke="rgba(255,255,255,0.02)" strokeWidth="0.5">
                    <line x1="0" y1="100" x2="300" y2="100" />
                    <line x1="0" y1="200" x2="300" y2="200" />
                    <line x1="0" y1="300" x2="300" y2="300" />
                    <line x1="100" y1="0" x2="100" y2="420" />
                    <line x1="200" y1="0" x2="200" y2="420" />
                  </g>

                  {/* Korea Province Boundaries Outline */}
                  <g stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.2" fill="rgba(251, 191, 36, 0.025)">
                    {/* 서울/경기/인천 */}
                    <path className="continent-path" d="M 80,60 L 140,55 L 150,90 L 130,120 L 75,100 Z" fill="rgba(251, 191, 36, 0.04)" />
                    {/* 강원 */}
                    <path className="continent-path" d="M 140,55 L 210,40 L 250,95 L 230,150 L 150,90 Z" />
                    {/* 충청 */}
                    <path className="continent-path" d="M 130,120 L 150,90 L 230,150 L 200,200 L 160,190 L 130,160 Z" />
                    {/* 전라 */}
                    <path className="continent-path" d="M 75,100 L 130,120 L 130,160 L 150,210 L 80,180 Z" />
                    {/* 경상 */}
                    <path className="continent-path" d="M 80,180 L 150,210 L 160,190 L 180,240 L 120,270 L 85,250 Z" />
                    {/* 제주 */}
                    <path className="continent-path" d="M 70,370 A 22,12 0 1,0 114,370 A 22,12 0 1,0 70,370 Z" />
                    {/* 울릉도/독도 */}
                    <circle cx="280" cy="110" r="3.5" />
                    <circle cx="295" cy="115" r="1.5" />
                  </g>

                  {/* Province Labels */}
                  <g fill="var(--text-muted)" fontSize="9px" fontWeight="bold" opacity="0.6">
                    <text x="100" y="80">수도권</text>
                    <text x="180" y="85">강원</text>
                    <text x="160" y="145">충청</text>
                    <text x="105" y="185">전라</text>
                    <text x="195" y="195">경상</text>
                    <text x="80" y="375">제주</text>
                  </g>

                  {/* Geocoded Markers */}
                  {finalFilteredRows.map((row, idx) => {
                    if (isNaN(row.lat) || isNaN(row.lng)) return null;
                    const { x, y } = getXY(row.lat, row.lng);
                    if (x < -20 || x > 320 || y < -20 || y > 440) return null;

                    const count = parseInt(row.Count) || 1;
                    const sourceText = row.source === "project" ? "자체생산" : "공공수집";
                    const tooltipText = `[${sourceText}] ${row.Region || "-"} (${row.Species}) - ${count}개체`;

                    return (
                      <g
                        key={`marker-dom-${idx}`}
                        transform={`translate(${x}, ${y})`}
                        onMouseEnter={() => setHoveredSample(tooltipText)}
                        onMouseLeave={() => setHoveredSample(null)}
                        style={{ cursor: "pointer" }}
                      >
                        <circle r="7.5" fill={row.source === "project" ? "var(--color-gold)" : "#60a5fa"} opacity="0.25" className="animate-pulse" />
                        <circle r="4.5" fill={row.source === "project" ? "var(--color-gold)" : "#60a5fa"} stroke="#ffffff" strokeWidth="1" className="map-marker" />
                      </g>
                    );
                  })}
                </svg>
              ) : (
                // World SVG Map (Cylindrical Equidistant Projection)
                <svg
                  width="100%"
                  height="450px"
                  viewBox="0 0 500 300"
                  style={{ overflow: "visible" }}
                >
                  <g stroke="rgba(255,255,255,0.015)" strokeWidth="0.5">
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

                  {/* Continents */}
                  <g stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.2" fill="rgba(59, 130, 246, 0.035)">
                    {/* Greenland */}
                    <path className="continent-path" d="M 148,16 L 233,16 L 194,50 Z" />
                    {/* North America */}
                    <path className="continent-path" d="M 16,41 L 166,41 L 145,91 L 138,108 L 118,125 L 83,91 Z" />
                    {/* South America */}
                    <path className="continent-path" d="M 145,133 L 201,158 L 152,241 L 138,158 Z" />
                    {/* Africa */}
                    <path className="continent-path" d="M 229,100 L 294,100 L 320,133 L 277,206 L 263,141 Z" />
                    {/* Eurasia */}
                    <path className="continent-path" d="M 236,50 L 277,33 L 486,33 L 472,58 L 444,90 L 416,100 L 358,133 L 312,125 L 243,83 Z" />
                    {/* Australia */}
                    <path className="continent-path" d="M 409,183 L 451,175 L 458,208 L 409,208 Z" />
                  </g>

                  {/* World Markers */}
                  {finalFilteredRows.map((row, idx) => {
                    if (isNaN(row.lat) || isNaN(row.lng)) return null;
                    const { x, y } = getWorldXY(row.lat, row.lng);

                    const count = parseInt(row.Count) || 1;
                    const bubbleRadius = Math.max(3.5, Math.min(15, 3.5 + Math.sqrt(count) * 0.4));
                    const sourceText = row.source === "project" ? "자체생산" : "공공수집";
                    const tooltipText = `[${sourceText}] ${row.Country} / ${row.Region || "-"} (${row.Species}) - ${count}개체`;

                    return (
                      <g
                        key={`marker-gl-${idx}`}
                        transform={`translate(${x}, ${y})`}
                        onMouseEnter={() => setHoveredSample(tooltipText)}
                        onMouseLeave={() => setHoveredSample(null)}
                        style={{ cursor: "pointer" }}
                      >
                        <circle r={bubbleRadius + 3} fill={row.source === "project" ? "var(--color-gold)" : "#60a5fa"} opacity="0.2" className="animate-pulse" />
                        <circle r={bubbleRadius} fill={row.source === "project" ? "var(--color-gold)" : "#60a5fa"} stroke="#ffffff" strokeWidth="0.8" className="map-marker" />
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Hover Tooltip overlay */}
              {hoveredSample && (
                <div style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "16px",
                  right: "16px",
                  background: "rgba(15, 23, 42, 0.92)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid var(--color-gold)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  color: "#ffffff",
                  fontSize: "12px",
                  zIndex: 100,
                  pointerEvents: "none",
                  boxShadow: "0 10px 25px -5px rgba(251, 191, 36, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  animation: "fadeIn 0.15s ease-out"
                }}>
                  <span>📍</span>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: "bold", color: "var(--color-gold)", textTransform: "uppercase", letterSpacing: "0.5px" }}>실시간 위치 정보</div>
                    <div style={{ fontWeight: 500 }}>{hoveredSample}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Advanced Filters Sidebar */}
        <div style={{
          flex: "2 1 350px",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            boxShadow: "var(--shadow-md)"
          }}>
            {/* Map Mode Selector Tab Switcher */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "8px" }}>관제 지도 스위칭</label>
              <div style={{ display: "flex", background: "var(--bg-app)", border: "1px solid var(--border-color)", padding: "4px", borderRadius: "10px" }}>
                <button
                  onClick={() => handleSetMode("domestic")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    background: mode === "domestic" ? "var(--color-gold)" : "transparent",
                    color: mode === "domestic" ? "#ffffff" : "var(--text-muted)",
                    fontSize: "13px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  🇰🇷 국내 자원 관제
                </button>
                <button
                  onClick={() => handleSetMode("global")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    background: mode === "global" ? "var(--color-gold)" : "transparent",
                    color: mode === "global" ? "#ffffff" : "var(--text-muted)",
                    fontSize: "13px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  🌐 글로벌 WGS 관제
                </button>
              </div>
            </div>

            {/* Filter 1: Species Selection */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "8px" }}>🐝 꿀벌 품종 (Species)</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { value: "all", label: "전체" },
                  { value: "Apis cerana", label: "Apis cerana (토종벌)" },
                  { value: "Apis mellifera", label: "Apis mellifera (서양벌)" }
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setSpeciesFilter(item.value)}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: speciesFilter === item.value ? "var(--color-gold)" : "var(--border-color)",
                      background: speciesFilter === item.value ? "var(--color-gold-glow)" : "var(--bg-app)",
                      color: speciesFilter === item.value ? "var(--color-gold)" : "var(--text-muted)",
                      fontSize: "12px",
                      fontWeight: speciesFilter === item.value ? "bold" : "normal",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 2: Data Source Division */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "8px" }}>📊 데이터 출처 (Source Type)</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { value: "all", label: "전체" },
                  { value: "project", label: "자체 생산" },
                  { value: "public", label: "공공 데이터" }
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setSourceFilter(item.value)}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: sourceFilter === item.value ? "var(--color-gold)" : "var(--border-color)",
                      background: sourceFilter === item.value ? "var(--color-gold-glow)" : "var(--bg-app)",
                      color: sourceFilter === item.value ? "var(--color-gold)" : "var(--text-muted)",
                      fontSize: "12px",
                      fontWeight: sourceFilter === item.value ? "bold" : "normal",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 3: Region/Country Filter */}
            {mode === "domestic" ? (
              // Domestic: Region Select Dropdown
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "8px" }}>📍 국내 권역 (Region)</label>
                <select
                  value={regionFilter || "all"}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-app)",
                    color: "var(--text-main)",
                    fontSize: "13px",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="all">권역 선택 (전체)</option>
                  {uniqueRegions.map((reg) => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>
            ) : (
              // Global: Country Search Bar & Country Dropdown
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "8px" }}>🔍 해외 국가 검색 (Country Search)</label>
                  <input
                    type="text"
                    placeholder="국가명 입력 검색..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-app)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                </div>
                <div>
                  <select
                    value={countryFilter || "all"}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-app)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    <option value="all">국가 목록 선택 (전체)</option>
                    {uniqueCountries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Reset Filters Button */}
            {(speciesFilter !== "all" || sourceFilter !== "all" || (mode === "domestic" && regionFilter !== "all") || (mode === "global" && (countryFilter !== "all" || countrySearch !== ""))) && (
              <button
                onClick={() => {
                  setSpeciesFilter("all");
                  setSourceFilter("all");
                  if (mode === "domestic") {
                    setRegionFilter("all");
                  } else {
                    setCountryFilter("all");
                    setCountrySearch("");
                  }
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "#f87171",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "all 0.2s"
                }}
              >
                🔄 필터 설정 초기화
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

"use client";

import React, { useState, useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "../utils";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

// standard GeoJSON / TopoJSON endpoints for high-resolution rendering
const KOREA_GEOJSON_URL = "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-provinces-2018-geo.json";
const WORLD_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// --- React.memo Map Background to prevent expensive D3 outline re-renders ---
const MapBackground: React.FC<{ geojsonUrl: string }> = ({ geojsonUrl }) => {
  return (
    <Geographies geography={geojsonUrl}>
      {({ geographies }) =>
        geographies.map((geo) => (
          <Geography
            key={geo.rsmKey}
            geography={geo}
            style={{
              default: { fill: "#F3F4F6", stroke: "#4B5563", strokeWidth: 1.5, outline: "none" },
              hover: { fill: "#E5E7EB", stroke: "#111827", strokeWidth: 2.0, outline: "none" },
              pressed: { fill: "#D1D5DB", stroke: "#111827", outline: "none" }
            }}
          />
        ))
      }
    </Geographies>
  );
};
const MemoizedMapBackground = React.memo(
  MapBackground,
  (prevProps, nextProps) => prevProps.geojsonUrl === nextProps.geojsonUrl
);

// --- Reducer state updates for thread/render safe unified filters ---
type FilterState = {
  mode: "domestic" | "global";
  speciesFilter: string;
  sourceFilter: string;
  regionFilter: string | null;
  countryFilter: string | null;
  countrySearch: string;
  data: any;
  wgsData: any[] | null;
  loading: boolean;
  error: string;
};

type FilterAction =
  | { type: "SET_MODE"; payload: "domestic" | "global" }
  | { type: "SET_SPECIES"; payload: string }
  | { type: "SET_SOURCE"; payload: string }
  | { type: "SET_REGION"; payload: string | null }
  | { type: "SET_COUNTRY_FILTER"; payload: string | null }
  | { type: "SET_COUNTRY_SEARCH"; payload: string }
  | { type: "RESET_FILTERS" }
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: { data: any; wgsData: any[] | null } }
  | { type: "FETCH_ERROR"; payload: string };

const initialFilterState: FilterState = {
  mode: "domestic",
  speciesFilter: "all",
  sourceFilter: "project",
  regionFilter: "all",
  countryFilter: null,
  countrySearch: "",
  data: null,
  wgsData: null,
  loading: true,
  error: ""
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":
      return {
        ...state,
        loading: false,
        data: action.payload.data,
        wgsData: action.payload.wgsData
      };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "SET_MODE":
      if (action.payload === "domestic") {
        return {
          ...state,
          mode: "domestic",
          regionFilter: "all",
          countryFilter: null,
          countrySearch: ""
        };
      } else {
        return {
          ...state,
          mode: "global",
          regionFilter: null,
          countryFilter: "all",
          countrySearch: ""
        };
      }
    case "SET_SPECIES":
      return { ...state, speciesFilter: action.payload };
    case "SET_SOURCE":
      return { ...state, sourceFilter: action.payload };
    case "SET_REGION":
      return { ...state, regionFilter: action.payload };
    case "SET_COUNTRY_FILTER":
      return { ...state, countryFilter: action.payload };
    case "SET_COUNTRY_SEARCH":
      return { ...state, countrySearch: action.payload };
    case "RESET_FILTERS":
      if (state.mode === "domestic") {
        return {
          ...state,
          speciesFilter: "all",
          sourceFilter: "project",
          regionFilter: "all"
        };
      } else {
        return {
          ...state,
          speciesFilter: "all",
          sourceFilter: "project",
          countryFilter: "all",
          countrySearch: ""
        };
      }
    default:
      return state;
  }
}

export default function SamplingStatusPanel() {
  const router = useRouter();
  const [hoveredSample, setHoveredSample] = useState<string | null>(null);

  // Filter States (Unified Reducer)
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);
  const { mode, speciesFilter, sourceFilter, regionFilter, countryFilter, countrySearch, data, wgsData, loading, error } = filterState;

  // Load All Datasets on Mount to enable fast, zero-latency client-side filtering
  useEffect(() => {
    const loadAllData = async () => {
      try {
        dispatch({ type: "FETCH_START" });

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

        dispatch({
          type: "FETCH_SUCCESS",
          payload: {
            data: domesticJson.data || [],
            wgsData: globalJson.data || []
          }
        });
      } catch (err: any) {
        dispatch({ type: "FETCH_ERROR", payload: err.message || "서버 통신 중 오류가 발생했습니다." });
      }
    };
    loadAllData();
  }, []);

  // ── Unified Data Filtering Pipeline (Memoized) ──
  const { finalFilteredRows, ceranaCount, melliferaCount, uniqueRegions, uniqueCountries } = React.useMemo(() => {
    // Extract and normalize Project-produced Domestic Rows
    const projectRows: any[] = [];
    if (Array.isArray(data)) {
      data.forEach((row: any) => {
        projectRows.push({
          ...row,
          source: "project",
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          Species: String(row.종 || row.Species || "").toLowerCase().includes("cerana") ? "Apis cerana" : "Apis mellifera",
          Region: row.권역 || row.Region || "",
          Country: "South Korea",
          is_pore_c: !!row.is_pore_c
        });
      });
    } else if (data && typeof data === "object") {
      // Robust fallback for old backend format
      Object.keys(data).forEach((sheetName) => {
        const rows = data[sheetName];
        if (Array.isArray(rows)) {
          rows.forEach((row: any) => {
            projectRows.push({
              ...row,
              source: "project",
              lat: parseFloat(row.lat),
              lng: parseFloat(row.lng),
              Species: String(row.종 || row.Species || "").toLowerCase().includes("cerana") ? "Apis cerana" : "Apis mellifera",
              Region: row.권역 || row.Region || "",
              Country: "South Korea",
              is_pore_c: sheetName.includes("pore_c") || !!row.is_pore_c
            });
          });
        }
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
      } else if (sourceFilter === "pore_c") {
        baseRows = pRows.filter((r) => r.is_pore_c === true);
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
      } else if (sourceFilter === "pore_c") {
        baseRows = pRows.filter((r) => r.is_pore_c === true);
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

    // 4. Real-time Statistical Counts for Summary Cards (excluding species filter)
    const rowsFilteredByRegionAndSource = baseRows.filter((row) => {
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

    let ceranaCount = 0;
    let melliferaCount = 0;

    rowsFilteredByRegionAndSource.forEach((row) => {
      const count = parseInt(row.Count) || 1;
      if (row.Species === "Apis cerana") {
        ceranaCount += count;
      } else {
        melliferaCount += count;
      }
    });

    // 5. Unique Options Extraction for dropdown elements
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

    return { finalFilteredRows, ceranaCount, melliferaCount, uniqueRegions, uniqueCountries };
  }, [data, wgsData, mode, speciesFilter, sourceFilter, regionFilter, countryFilter, countrySearch]);

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
          transition: r 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), fill 0.2s ease;
          cursor: pointer;
        }
        .map-marker:hover {
          r: 7.5 !important;
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
        
        {/* Left Side: Map Visualizer (GeoJSON standard drawing using react-simple-maps) */}
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
                {mode === "domestic" ? "🇰🇷 대한민국 행정구역도 (GeoJSON)" : "🌐 글로벌 WGS 국가도 (TopoJSON)"}
              </span>
              <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "var(--text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#D4AF37" }} /> 자체생산
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4A90E2" }} /> 공공수집
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
              padding: "10px 0"
            }}>
              {mode === "domestic" ? (
                // South Korea Precision GeoJSON Map
                <ComposableMap
                  width={500}
                  height={450}
                  projection="geoMercator"
                  projectionConfig={{
                    center: [127.5, 36.0],
                    scale: 5500
                  }}
                  style={{ width: "100%", height: "450px" }}
                >
                  <MemoizedMapBackground geojsonUrl={KOREA_GEOJSON_URL} />

                  {/* Korea Markers */}
                  {finalFilteredRows.map((row, idx) => {
                    if (isNaN(row.lat) || isNaN(row.lng)) return null;

                    const count = parseInt(row.Count) || 1;
                    const sourceText = row.source === "project" ? "자체생산" : "공공수집";
                    const tooltipText = `[${sourceText}] ${row.Region || "-"} (${row.Species}) - ${count}개체`;

                    return (
                      <Marker
                        key={`marker-dom-${idx}`}
                        coordinates={[row.lng, row.lat]}
                      >
                        <circle
                          r="4"
                          fill={row.is_pore_c ? "var(--color-gold)" : (row.source === "project" ? "#D4AF37" : "#4A90E2")}
                          stroke="#ffffff"
                          strokeWidth="1"
                          className="map-marker"
                          onMouseEnter={() => setHoveredSample(tooltipText)}
                          onMouseLeave={() => setHoveredSample(null)}
                        />
                      </Marker>
                    );
                  })}
                </ComposableMap>
              ) : (
                // World Standard TopoJSON Map
                <ComposableMap
                  width={500}
                  height={300}
                  projection="geoEquirectangular"
                  projectionConfig={{
                    scale: 80
                  }}
                  style={{ width: "100%", height: "450px" }}
                >
                  <MemoizedMapBackground geojsonUrl={WORLD_TOPOJSON_URL} />

                  {/* World Markers */}
                  {finalFilteredRows.map((row, idx) => {
                    if (isNaN(row.lat) || isNaN(row.lng)) return null;

                    const count = parseInt(row.Count) || 1;
                    const markerRadius = Math.max(3.5, Math.min(12, 3.5 + Math.sqrt(count) * 0.4));
                    const sourceText = row.source === "project" ? "자체생산" : "공공수집";
                    const tooltipText = `[${sourceText}] ${row.Country} / ${row.Region || "-"} (${row.Species}) - ${count}개체`;

                    return (
                      <Marker
                        key={`marker-gl-${idx}`}
                        coordinates={[row.lng, row.lat]}
                      >
                        <circle
                          r={markerRadius}
                          fill={row.is_pore_c ? "var(--color-gold)" : (row.source === "project" ? "#D4AF37" : "#4A90E2")}
                          stroke="#ffffff"
                          strokeWidth="0.8"
                          className="map-marker"
                          onMouseEnter={() => setHoveredSample(tooltipText)}
                          onMouseLeave={() => setHoveredSample(null)}
                        />
                      </Marker>
                    );
                  })}
                </ComposableMap>
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
                  onClick={() => dispatch({ type: "SET_MODE", payload: "domestic" })}
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
                  onClick={() => dispatch({ type: "SET_MODE", payload: "global" })}
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
                    onClick={() => dispatch({ type: "SET_SPECIES", payload: item.value })}
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
              <select
                value={sourceFilter}
                onChange={(e) => dispatch({ type: "SET_SOURCE", payload: e.target.value })}
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
                <option value="all">전체</option>
                <option value="project">프로젝트 자체 생산</option>
                <option value="public">공공 데이터 수집</option>
                <option value="pore_c">Pore-C 핵심 집단 (50개체)</option>
              </select>
            </div>

            {/* Filter 3: Region/Country Filter */}
            {mode === "domestic" ? (
              // Domestic: Region Select Dropdown
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "8px" }}>📍 국내 권역 (Region)</label>
                <select
                  value={regionFilter || "all"}
                  onChange={(e) => dispatch({ type: "SET_REGION", payload: e.target.value })}
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
                    onChange={(e) => dispatch({ type: "SET_COUNTRY_SEARCH", payload: e.target.value })}
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
                    onChange={(e) => dispatch({ type: "SET_COUNTRY_FILTER", payload: e.target.value })}
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
                onClick={() => dispatch({ type: "RESET_FILTERS" })}
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

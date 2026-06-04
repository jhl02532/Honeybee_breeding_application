"use client";

import React, { useState, useEffect, useRef } from "react";
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
  // Map Mode and World WGS states
  const [mapMode, setMapMode] = useState<"korea" | "world">("korea");
  const [wgsData, setWgsData] = useState<any[] | null>(null);
  const [wgsLoading, setWgsLoading] = useState<boolean>(false);
  const [wgsError, setWgsError] = useState<string>("");
  const [wgsCountryFilter, setWgsCountryFilter] = useState<string>("all");
  const [wgsSpeciesFilter, setWgsSpeciesFilter] = useState<string>("all");
  const [wgsSearchQuery, setWgsSearchQuery] = useState<string>("");

  // Leaflet map refs and states
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState<boolean>(false);
  const [leafletMarkers, setLeafletMarkers] = useState<any[]>([]);

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

  // 1. Dynamic CDN Loading of Leaflet
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check if Leaflet is already loaded on window
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(cssLink);

    const jsScript = document.createElement("script");
    jsScript.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    jsScript.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(jsScript);
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstance) return;

    const L = (window as any).L;
    if (!L) return;

    // Center map on Korea initially
    const map = L.map(mapRef.current, {
      center: [35.8, 127.75],
      zoom: 7,
      zoomControl: true,
      attributionControl: false
    });

    const isDark = document.documentElement.classList.contains("dark") || 
                  document.documentElement.getAttribute("data-theme") === "dark";
    
    const tileUrl = isDark 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19
    }).addTo(map);

    setMapInstance(map);

    const handleThemeChange = () => {
      const isDarkTheme = document.documentElement.classList.contains("dark") || 
                          document.documentElement.getAttribute("data-theme") === "dark";
      const newUrl = isDarkTheme
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      
      tiles.setUrl(newUrl);
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [leafletLoaded]);

  // 3. Pan and Zoom depending on mapMode
  useEffect(() => {
    if (!mapInstance) return;
    if (mapMode === "korea") {
      mapInstance.setView([35.8, 127.75], 7);
    } else {
      mapInstance.setView([25.0, 10.0], 2.2);
    }
  }, [mapMode, mapInstance]);

  // 4. Render Markers dynamically
  useEffect(() => {
    if (!mapInstance) return;
    const L = (window as any).L;
    if (!L) return;

    leafletMarkers.forEach(m => m.remove());
    const newMarkers: any[] = [];

    if (mapMode === "korea") {
      (filteredRows || []).forEach(row => {
        const latVal = parseFloat(row.lat);
        const lngVal = parseFloat(row.lng);
        if (isNaN(latVal) || isNaN(lngVal)) return;

        const sampleId = row["시료 ID"] || row["시료ID"] || "-";
        const region = row["권역"] || "-";
        const lineage = row["계통"] || "-";
        const tooltipText = `<b>[시료 ID: ${sampleId}]</b><br/>권역: ${region}<br/>계통: ${lineage}`;

        const marker = L.circleMarker([latVal, lngVal], {
          radius: 5.5,
          fillColor: "#fbbf24",
          color: "#ffffff",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.85
        })
        .bindTooltip(tooltipText, { direction: "top", offset: [0, -5] })
        .addTo(mapInstance);

        newMarkers.push(marker);
      });
    } else {
      (filteredWgsRows || []).forEach(row => {
        const latVal = parseFloat(row.lat);
        const lngVal = parseFloat(row.lng);
        const countVal = parseInt(row.Count) || 1;
        if (isNaN(latVal) || isNaN(lngVal)) return;

        const tooltipText = `<b>[${row.Country} / ${row.Region}]</b><br/>종: <i>${row.Species}</i><br/>수량: ${countVal} 개체`;
        const bubbleRadius = Math.max(4, Math.min(20, 4 + Math.sqrt(countVal) * 0.5));

        const marker = L.circleMarker([latVal, lngVal], {
          radius: bubbleRadius,
          fillColor: "#fbbf24",
          color: "#ffffff",
          weight: 0.8,
          opacity: 1,
          fillOpacity: 0.7
        })
        .bindTooltip(tooltipText, { direction: "top", offset: [0, -bubbleRadius] })
        .addTo(mapInstance);

        newMarkers.push(marker);
      });
    }

    setLeafletMarkers(newMarkers);
  }, [mapInstance, mapMode, filteredRows, filteredWgsRows]);

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
            .map-marker {
              transition: transform 0.2s ease-in-out;
              transform-origin: center;
              transform-box: fill-box;
            }
            .map-marker:hover {
              transform: scale(1.5);
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
            <div 
              ref={mapRef} 
              id="bee-map" 
              style={{ 
                width: "100%", 
                height: "420px", 
                borderRadius: "14px", 
                border: "1px solid var(--border-color)",
                overflow: "hidden",
                zIndex: 1
              }} 
            />
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


      
    </div>
  );
}

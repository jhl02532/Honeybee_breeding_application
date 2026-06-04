"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authFetch, getStoredUser } from "../../utils";
import { Apiary, Colony } from "../../types";

function RecordFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const querySampleId = searchParams.get("sample_id") || "";
  const queryColonyId = searchParams.get("colony_id") || "";

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form State
  const [form, setForm] = useState({
    sample_id: querySampleId,
    species: "Apis mellifera",
    source_type: "프로젝트 자체 생산",
    address: "",
    latitude: "",
    longitude: "",
    date: new Date().toISOString().split("T")[0],
    colony_id: queryColonyId,
    // Sliders
    honey_production: "50",
    vsh_rate: "50",
    temperament: "3",
    overwintering_survival: "80",
    // Env
    temperature: "",
    humidity: "",
    notes: ""
  });

  // Load User and Apiaries
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      // Not logged in -> redirect to landing page
      window.location.href = "/";
      return;
    }
    setUser(stored);

    const loadData = async () => {
      try {
        const res = await authFetch("/api/v1/apiaries");
        if (res.ok) {
          const apiaryData = await res.json();
          setApiaries(apiaryData);
          
          // Cascading select matching Colony if sample_id or colony_id matches
          const allColonies = apiaryData.flatMap((a: Apiary) => a.colonies);
          
          if (queryColonyId) {
            const found = allColonies.find((c: Colony) => String(c.id) === queryColonyId);
            if (found) {
              setForm(f => ({ ...f, colony_id: String(found.id) }));
            }
          } else if (querySampleId) {
            // Find a colony whose code contains or matches sample_id
            const found = allColonies.find((c: Colony) => 
              c.code.toLowerCase().includes(querySampleId.toLowerCase())
            );
            if (found) {
              setForm(f => ({ ...f, colony_id: String(found.id) }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load apiaries data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [queryColonyId, querySampleId]);

  // Load sample metadata if sample_id is provided from query params
  useEffect(() => {
    if (querySampleId) {
      const fetchSampleMeta = async () => {
        try {
          const res = await authFetch("/api/v1/researcher/sampling-status");
          if (res.ok) {
            const result = await res.json();
            const rows = result.data || [];
            const matchingRow = rows.find((r: any) => 
              String(r["시료 ID"] || r.sample_id || "").toUpperCase() === querySampleId.toUpperCase()
            );
            if (matchingRow) {
              setForm(f => ({
                ...f,
                species: matchingRow.Species || matchingRow["종"] || "Apis mellifera",
                source_type: matchingRow["수집구분"] || "프로젝트 자체 생산",
                address: matchingRow["주소 (상세)"] || matchingRow.address || "",
                latitude: String(matchingRow.lat || ""),
                longitude: String(matchingRow.lng || "")
              }));
            }
          }
        } catch (err) {
          console.error("Failed to load sample meta details", err);
        }
      };
      fetchSampleMeta();
    }
  }, [querySampleId]);

  const allColonies = apiaries.flatMap((a) => a.colonies);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.colony_id) {
      alert("형질을 귀속할 대상 DB 봉군(Colony)을 선택해주세요. (봉군 목록에서 봉군을 미리 등록해야 합니다)");
      return;
    }

    setBusy(true);
    try {
      const body = {
        colony_id: parseInt(form.colony_id),
        date: form.date,
        honey_production: parseFloat(form.honey_production),
        vsh_rate: parseFloat(form.vsh_rate),
        hygienic_rate: parseFloat(form.vsh_rate),
        temperament: parseInt(form.temperament),
        overwintering_survival: parseFloat(form.overwintering_survival),
        // Other fields set to default
        propolis_production: 0,
        royal_jelly_production: 0,
        swarming_rate: 0,
        virus_resistance: Math.max(1, Math.min(5, Math.round(parseFloat(form.vsh_rate) / 20))),
        mite_resistance: Math.max(1, Math.min(5, Math.round(parseFloat(form.vsh_rate) / 20))),
        climate_adaptation: 3,
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        humidity: form.humidity ? parseFloat(form.humidity) : null,
        notes: form.notes || null,
      };

      const res = await authFetch("/api/v1/traits", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errJson = await res.json();
        alert(errJson.detail || "기록 저장 실패");
        return;
      }

      setSaved(true);
      alert("💾 형질 기록이 백엔드 DB에 정상 동기화되었습니다! 진단서를 발행합니다.");
      
      // Open print prompt
      setTimeout(() => {
        window.print();
      }, 500);
      
    } catch (err: any) {
      alert(err.message || "기록 저장 실패");
    } finally {
      setBusy(false);
    }
  };

  const getPoints = () => {
    const cx = 160;
    const cy = 120;
    const scale = 0.9;
    
    // Scores
    const honey = parseFloat(form.honey_production);
    const disease = parseFloat(form.vsh_rate);
    const gentle = parseInt(form.temperament) * 20;
    const fecundity = parseFloat(form.overwintering_survival);

    const x0 = cx;
    const y0 = cy - honey * scale;
    const x1 = cx + disease * scale;
    const y1 = cy;
    const x2 = cx;
    const y2 = cy + gentle * scale;
    const x3 = cx - fecundity * scale;
    const y3 = cy;
    return `${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const selectedColonyObject = allColonies.find(c => String(c.id) === form.colony_id);

  return (
    <div className="relative w-full min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-card {
            border: 2px solid black !important;
            padding: 40px !important;
            box-shadow: none !important;
            min-height: 100vh !important;
          }
        }
      `}</style>

      {/* Header (hidden on print) */}
      <header className="no-print w-full bg-white border-b border-slate-200 sticky top-0 z-40 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-xl font-bold text-slate-900 cursor-pointer" onClick={() => router.push("/")}>
          <span className="text-2xl">🐝</span> MelittaBreed
        </div>
        <h1 className="text-lg font-bold text-slate-800">📋 독립형 형질 기록 및 진단 센터</h1>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-sm font-semibold flex items-center gap-1.5"
        >
          🏠 대시보드로 돌아가기
        </button>
      </header>

      {/* Main content grid */}
      <div className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Form: Inputs (hidden on print) */}
        <form onSubmit={handleSave} className="no-print lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              📝 표현형 형질 기입 폼
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              수집된 원체 시료 마스터 정보와 4대 경제 형질 실측 데이터를 정밀 기입하세요.
            </p>
          </div>

          {/* 좌측 Card Area: 마스터 정보 */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              1. 시료 및 수집처 정보 (Master Metadata)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">시료 ID *</label>
                <input
                  type="text"
                  required
                  value={form.sample_id}
                  onChange={(e) => setForm({ ...form, sample_id: e.target.value })}
                  placeholder="예: AC-GG-MEL-26-01"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">채집 날짜 *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">종 선택 (Species) *</label>
                <select
                  value={form.species}
                  onChange={(e) => setForm({ ...form, species: e.target.value })}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer focus:border-amber-500 focus:bg-white transition"
                >
                  <option value="Apis mellifera">서양벌 (Apis mellifera)</option>
                  <option value="Apis cerana">토종벌 / 동양벌 (Apis cerana)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">수집 구분 (Collection Type) *</label>
                <select
                  value={form.source_type}
                  onChange={(e) => setForm({ ...form, source_type: e.target.value })}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer focus:border-amber-500 focus:bg-white transition"
                >
                  <option value="프로젝트 자체 생산">프로젝트 자체 생산</option>
                  <option value="공공 데이터 수집">공공 데이터 수집</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">채집 상세 주소</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="예: 경상남도 산청군 시천면"
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">위도 (GPS Latitude)</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="예: 35.3369"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">경도 (GPS Longitude)</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="예: 127.7306"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4">
              <label className="text-xs font-bold text-slate-600">귀속 대상 DB 봉군 (Colony Selection) *</label>
              <select
                required
                value={form.colony_id}
                onChange={(e) => setForm({ ...form, colony_id: e.target.value })}
                className="px-4 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-sm outline-none cursor-pointer focus:border-amber-500 focus:bg-white transition font-semibold text-slate-800"
              >
                <option value="">-- 귀속 대상 봉군 선택 --</option>
                {allColonies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} (여왕벌 태그: {c.queen_tag})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-amber-600 font-medium">
                💡 백엔드 DB와 연동하기 위해 등록된 벌통 코드와 반드시 결합해야 합니다.
              </span>
            </div>
          </div>

          {/* 우측 Card Area: 4대 핵심 경제 형질 슬라이더 */}
          <div className="space-y-6 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              2. 4대 주요 경제 형질 기입 (Economic Traits)
            </h3>

            {/* Slider 1: Honey Production */}
            <div className="flex flex-col gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">🍯 수밀력 (꿀 생산량, kg)</label>
                <span className="text-sm font-bold text-amber-600">{form.honey_production} kg</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={form.honey_production}
                onChange={(e) => setForm({ ...form, honey_production: e.target.value })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            {/* Slider 2: Disease Resistance */}
            <div className="flex flex-col gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">🧬 질병저항성 (VSH 청소율, %)</label>
                <span className="text-sm font-bold text-amber-600">{form.vsh_rate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={form.vsh_rate}
                onChange={(e) => setForm({ ...form, vsh_rate: e.target.value })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            {/* Slider 3: Temperament */}
            <div className="flex flex-col gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">🛡️ 온순성 (Temperament Index)</label>
                <span className="text-sm font-bold text-amber-600">{form.temperament} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={form.temperament}
                onChange={(e) => setForm({ ...form, temperament: e.target.value })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            {/* Slider 4: Fecundity / Wintering Survival */}
            <div className="flex flex-col gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">👑 번식력 (월동 생존율, %)</label>
                <span className="text-sm font-bold text-amber-600">{form.overwintering_survival}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={form.overwintering_survival}
                onChange={(e) => setForm({ ...form, overwintering_survival: e.target.value })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
              />
            </div>
          </div>

          {/* Environmental parameters & Notes */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. 기상 환경 관찰 데이터 (선택사항)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">온도 (°C)</label>
                <input
                  type="number"
                  step="any"
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                  placeholder="예: 24.5"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">습도 (%)</label>
                <input
                  type="number"
                  step="any"
                  value={form.humidity}
                  onChange={(e) => setForm({ ...form, humidity: e.target.value })}
                  placeholder="예: 60"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">특이사항 관찰 비고</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="벌통 유충 발육 상태, 화분떡 소모량 등 자유 기입..."
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none h-24 resize-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Action buttons (hidden on print) */}
          <div className="flex gap-4 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex-1 py-3 px-6 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
            >
              ⬅️ 관제 대시보드로 돌아가기
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-2 py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
            >
              {busy ? "기록 저장 중..." : "💾 최종 형질 기록 저장 및 진단서 발행"}
            </button>
          </div>
        </form>

        {/* Right Preview Card: Radar Chart Diagnostic Certificate (Visible always on screen & print) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col gap-6 print-card print-only">
          <div className="border-b border-slate-100 pb-4 print:border-black">
            <h2 className="text-lg font-bold text-slate-900 print:text-2xl print:text-center print:w-full">
              📜 종봉 형질 진단 분석 검증서
            </h2>
            <p className="text-xs text-slate-500 mt-1 print:text-center">
              MelittaBreed Digital Breeding Ecosystem
            </p>
          </div>

          <div className="space-y-6">
            {/* Visual Vector SVG Chart */}
            <div className="flex justify-center bg-slate-50 p-4 border border-slate-100 rounded-2xl print:bg-white print:border-none">
              <svg
                width={320}
                height={240}
                viewBox="0 0 320 240"
                className="block overflow-visible"
              >
                {/* 1. Grid level diamonds */}
                {[20, 40, 60, 80, 100].map((lvl) => {
                  const size = lvl * 0.9;
                  const x0 = 160;
                  const y0 = 120 - size;
                  const x1 = 160 + size;
                  const y1 = 120;
                  const x2 = 160;
                  const y2 = 120 + size;
                  const x3 = 160 - size;
                  const y3 = 120;

                  return (
                    <polygon
                      key={lvl}
                      points={`${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}`}
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="1"
                      className="print:stroke-slate-200"
                    />
                  );
                })}

                {/* 2. Grid axial lines */}
                <line x1={160} y1={20} x2={160} y2={220} stroke="#E2E8F0" className="print:stroke-slate-200" />
                <line x1={60} y1={120} x2={260} y2={120} stroke="#E2E8F0" className="print:stroke-slate-200" />

                {/* 3. Radial labels */}
                <text x={160} y={15} fill="#64748B" className="print:fill-slate-800" fontSize="9" fontWeight="bold" textAnchor="middle">
                  수밀력 ({form.honey_production})
                </text>
                <text x={265} y={123} fill="#64748B" className="print:fill-slate-800" fontSize="9" fontWeight="bold" textAnchor="start">
                  질병저항성 ({form.vsh_rate})
                </text>
                <text x={160} y={230} fill="#64748B" className="print:fill-slate-800" fontSize="9" fontWeight="bold" textAnchor="middle">
                  온순성 ({parseInt(form.temperament) * 20})
                </text>
                <text x={55} y={123} fill="#64748B" className="print:fill-slate-800" fontSize="9" fontWeight="bold" textAnchor="end">
                  번식력 ({form.overwintering_survival})
                </text>

                {/* 4. Score polygon data */}
                <polygon
                  points={getPoints()}
                  fill="rgba(212, 175, 55, 0.15)"
                  stroke="#D4AF37"
                  strokeWidth="2.5"
                  className="print:fill-amber-500/10 print:stroke-amber-600"
                />

                {/* Vertices dot highlights */}
                <circle cx={160} cy={120 - parseFloat(form.honey_production) * 0.9} r="3.5" fill="#D4AF37" />
                <circle cx={160 + parseFloat(form.vsh_rate) * 0.9} cy={120} r="3.5" fill="#D4AF37" />
                <circle cx={160} cy={120 + (parseInt(form.temperament) * 20) * 0.9} r="3.5" fill="#D4AF37" />
                <circle cx={160 - parseFloat(form.overwintering_survival) * 0.9} cy={120} r="3.5" fill="#D4AF37" />
              </svg>
            </div>

            {/* Target information */}
            <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-2 text-xs print:bg-white print:border-black print:text-sm">
              <div className="grid grid-cols-2 gap-1">
                <div><span className="font-semibold text-slate-500 print:text-black">검증 시료 ID:</span> <span className="font-bold">{form.sample_id || "-"}</span></div>
                <div><span className="font-semibold text-slate-500 print:text-black">진단 일자:</span> <span className="font-bold">{form.date}</span></div>
                <div><span className="font-semibold text-slate-500 print:text-black">품종 대분류:</span> <span className="font-bold">{form.species}</span></div>
                <div><span className="font-semibold text-slate-500 print:text-black">수집 구분:</span> <span className="font-bold">{form.source_type}</span></div>
                {selectedColonyObject && (
                  <div className="col-span-2"><span className="font-semibold text-slate-500 print:text-black">연동 벌통코드:</span> <span className="font-bold text-amber-600 print:text-black">{selectedColonyObject.code} ({selectedColonyObject.queen_tag})</span></div>
                )}
                {form.address && (
                  <div className="col-span-2"><span className="font-semibold text-slate-500 print:text-black">수집 주소:</span> <span className="font-bold">{form.address}</span></div>
                )}
              </div>
            </div>

            {/* Prescriptions */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider print:text-black print:text-sm">
                🩺 종합 소견 및 행동학적 처방전
              </h4>
              <div className="text-xs text-slate-600 bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-3 leading-relaxed print:bg-white print:border-none print:p-0 print:text-slate-800 print:text-sm">
                <div>
                  {parseFloat(form.vsh_rate) >= 80 ? (
                    <span className="text-emerald-600 font-bold">✓ VSH 응애 방어인자 완벽 고정군:</span>
                  ) : parseFloat(form.vsh_rate) < 40 ? (
                    <span className="text-red-500 font-bold">⚠ 응애 감수 붕괴 위험군:</span>
                  ) : (
                    <span className="text-slate-700 font-bold">• 행동 위생 활성 보통군:</span>
                  )}
                  {" "}
                  {parseFloat(form.vsh_rate) >= 80 
                    ? "바로아응애 청소행동율이 매우 높습니다. 친환경 방제가 가능하며 저항성 수벌 양성용 모본으로 추천합니다."
                    : parseFloat(form.vsh_rate) < 40
                      ? "응애 자극 감지율이 매우 낮으므로 기생충 감염 예방을 위해 유기산/티몰 집중 긴급 방제가 요구됩니다."
                      : "보편적인 응애 방어력을 유지하고 있습니다. 봄벌 양성 시기 기온 변화 관찰 및 추가 위생 모니터링이 필요합니다."
                  }
                </div>
                <div>
                  {parseFloat(form.honey_production) >= 70 ? (
                    <span className="text-emerald-600 font-bold">✓ 다량 수밀 특화종:</span>
                  ) : (
                    <span className="text-slate-700 font-bold">• 채집 생산력 양호군:</span>
                  )}
                  {" "}
                  {parseFloat(form.honey_production) >= 70
                    ? "아카시아 유밀기 수밀력이 매우 뛰어납니다. 다량의 채밀 성과를 기대할 수 있는 우수 품종입니다."
                    : "일반적인 꿀 채집 활동량을 유지하고 있습니다. 안정적인 식량 축적 및 내부 사양 관리를 병행하십시오."
                  }
                </div>
                <div>
                  {parseInt(form.temperament) >= 4 ? (
                    <span className="text-emerald-600 font-bold">✓ 극온순 관리 용이성 확증:</span>
                  ) : parseInt(form.temperament) <= 2 ? (
                    <span className="text-red-500 font-bold">⚠ 관리 경계 및 방어공격 강세:</span>
                  ) : (
                    <span className="text-slate-700 font-bold">• 봉군 성향 보통군:</span>
                  )}
                  {" "}
                  {parseInt(form.temperament) >= 4
                    ? "벌의 방어 자극 공격성이 적어 방충복 없이도 내검 조작이 매우 쾌적한 최상위 온순 봉군입니다."
                    : parseInt(form.temperament) <= 2
                      ? "외부 침입에 대한 공격 성향이 높으므로 내검 시 보호장구를 철저히 착용하고 충격을 피하십시오."
                      : "보통의 사나움을 보이며 기상 악화 혹은 기온 급강하 시 일시적으로 공격 행동이 늘어날 수 있습니다."
                  }
                </div>
              </div>
            </div>

            {/* Footer Sign-off */}
            <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400 leading-normal print:border-black print:text-black print:text-xs">
              본 진단서는 MelittaBreed 디지털 정밀 육종 인프라에 근거하여 생성되었습니다. 
              국가 농업 유전자원 보존 관리 기준 및 꿀벌 종봉 검증 표준을 준수합니다.
              <div className="mt-4 text-right font-bold text-slate-600 print:text-black text-xs font-semibold">
                디지털 꿀벌 육종센터 분석관
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    }>
      <RecordFormContent />
    </Suspense>
  );
}

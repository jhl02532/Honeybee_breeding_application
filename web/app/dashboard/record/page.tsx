"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authFetch, getStoredUser } from "../../utils";
import { Apiary, Colony } from "../../types";

function RecordFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [querySampleId, setQuerySampleId] = useState("");
  const [queryColonyId, setQueryColonyId] = useState("");

  useEffect(() => {
    setMounted(true);
    setQuerySampleId(searchParams.get("sample_id") || "");
    setQueryColonyId(searchParams.get("colony_id") || "");
  }, [searchParams]);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form State
  const [form, setForm] = useState({
    sample_id: "",
    species: "Apis mellifera",
    source_type: "프로젝트 자체 생산",
    address: "",
    latitude: "",
    longitude: "",
    date: new Date().toISOString().split("T")[0],
    colony_id: "",
    // Sliders
    honey_production: "10",
    vsh_rate: "50",
    temperament: "3",
    overwintering_survival: "80",
    // Env
    temperature: "",
    humidity: "",
    notes: ""
  });

  // Hydrate form.sample_id and form.colony_id when query params are resolved
  useEffect(() => {
    if (querySampleId) {
      setForm(f => ({ ...f, sample_id: querySampleId }));
    }
    if (queryColonyId) {
      setForm(f => ({ ...f, colony_id: queryColonyId }));
    }
    // Fallback: If no sample_id but colony_id is specified, use colony code as sample_id
    if (!querySampleId && queryColonyId && apiaries.length > 0) {
      const allCols = apiaries.flatMap((a) => a.colonies);
      const found = allCols.find((c) => String(c.id) === queryColonyId);
      if (found) {
        setForm(f => ({ ...f, sample_id: found.code }));
      }
    }
  }, [querySampleId, queryColonyId, apiaries]);

  // Load User and Apiaries
  useEffect(() => {
    if (!mounted) return;
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
  }, [mounted, queryColonyId, querySampleId]);

  // Load sample metadata if sample_id is provided from query params
  useEffect(() => {
    if (!mounted || !querySampleId) return;
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
  }, [mounted, querySampleId]);

  // Null Guard for sample_id / colony_id parameter to prevent rendering or crash on missing/empty query
  if (mounted && !querySampleId && !queryColonyId) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-md text-center">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-xl font-bold text-slate-900 mt-4">잘못된 접근입니다</h2>
          <p className="text-sm text-slate-500 mt-2">
            지정된 시료 ID(Sample ID) 또는 봉군 ID가 없거나 비어 있습니다. 대시보드나 관제 지도에서 진입해 주세요.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full mt-6 py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold transition shadow-md shadow-amber-500/10 cursor-pointer"
          >
            🏠 홈 화면으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

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
      alert("💾 형질 기록이 백엔드 DB에 정상 동기화되었습니다!");
      
    } catch (err: any) {
      alert(err.message || "기록 저장 실패");
    } finally {
      setBusy(false);
    }
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
          <span className="text-2xl">🐝</span> K-BEE BANK
        </div>
        <h1 className="text-lg font-bold text-slate-800">📋 독립형 형질 기록 센터</h1>
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
        <form onSubmit={handleSave} className="no-print lg:col-span-12 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col gap-6">
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
              <div className="flex justify-between items-center gap-4">
                <label className="text-xs font-bold text-slate-700">🍯 수밀력 (꿀 생산량, kg)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={form.honey_production}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, honey_production: val });
                    }}
                    className="w-20 px-2 py-1 text-right border border-slate-200 rounded-lg text-xs font-semibold focus:border-amber-500 outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500">kg</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.1"
                value={parseFloat(form.honey_production) > 20 ? "20" : form.honey_production || "0"}
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
              {busy ? "기록 저장 중..." : "💾 형질 기록 저장"}
            </button>
          </div>
        </form>



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

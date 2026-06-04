import React, { useState, useEffect } from "react";
import { styles } from "../styles";
import { Apiary, Colony, TraitRecord } from "../types";
import { authFetch, renderStars } from "../utils";
import Modal from "./Modal";
import FormNum from "./FormNum";

interface RecordPanelProps {
  apiaries: Apiary[];
  selectedColony: Colony | null;
  onSelectColony: (c: Colony | null) => void;
  onRefresh: () => void;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
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
  showModal,
  setShowModal,
  farmers,
  selectedFarmerId,
  onFarmerChange,
  userRole,
}: RecordPanelProps) {
  const allColonies = apiaries.flatMap((a) => a.colonies);
  const records = selectedColony
    ? selectedColony.records
    : allColonies.flatMap((c) => c.records || []);

  const [form, setForm] = useState({
    colony_id: selectedColony ? String(selectedColony.id) : "",
    date: new Date().toISOString().split("T")[0],
    honey_production: "0",
    propolis_production: "0",
    royal_jelly_production: "0",
    temperament: "3",
    virus_resistance: "3",
    mite_resistance: "3",
    swarming_rate: "0",
    overwintering_survival: "100",
    climate_adaptation: "3",
    vsh_rate: "0",
    hygienic_rate: "0",
    temperature: "",
    humidity: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (selectedColony) {
      setForm((f) => ({ ...f, colony_id: String(selectedColony.id) }));
    }
  }, [selectedColony]);

  const createRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        colony_id: parseInt(form.colony_id),
        date: form.date,
        honey_production: parseFloat(form.honey_production),
        propolis_production: parseFloat(form.propolis_production),
        royal_jelly_production: parseFloat(form.royal_jelly_production),
        temperament: parseInt(form.temperament),
        virus_resistance: parseInt(form.virus_resistance),
        mite_resistance: parseInt(form.mite_resistance),
        swarming_rate: parseFloat(form.swarming_rate),
        overwintering_survival: parseFloat(form.overwintering_survival),
        climate_adaptation: parseInt(form.climate_adaptation),
        vsh_rate: parseFloat(form.vsh_rate),
        hygienic_rate: parseFloat(form.hygienic_rate),
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        humidity: form.humidity ? parseFloat(form.humidity) : null,
        notes: form.notes || null,
      };
      const res = await authFetch("/api/v1/traits", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.detail || "기록 실패");
        return;
      }
      setShowModal(false);
      setForm({
        colony_id: selectedColony ? String(selectedColony.id) : "",
        date: new Date().toISOString().split("T")[0],
        honey_production: "0",
        propolis_production: "0",
        royal_jelly_production: "0",
        temperament: "3",
        virus_resistance: "3",
        mite_resistance: "3",
        swarming_rate: "0",
        overwintering_survival: "100",
        climate_adaptation: "3",
        vsh_rate: "0",
        hygienic_rate: "0",
        temperature: "",
        humidity: "",
        notes: "",
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "기록 실패");
    } finally {
      setBusy(false);
    }
  };

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
    link.setAttribute("download", `MelittaBreed_BreedRecords_${new Date().toISOString().split("T")[0]}.csv`);
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
              if (selectedColony) setForm((f) => ({ ...f, colony_id: String(selectedColony.id) }));
              setShowModal(true);
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div
            className="w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)"
            }}
          >
            {/* Modal Header */}
            <div style={styles.modalHeader} className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 style={styles.modalTitle} className="text-xl font-bold">📋 형질 기록 추가</h3>
              <button
                style={styles.modalClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 transition"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={createRecord} className="flex-1 flex flex-col overflow-hidden">
              {/* Scrollable grid content */}
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Metadata & Environmental */}
                <div className="space-y-6">
                  <h4 style={styles.formSection} className="text-lg font-bold border-b pb-2 border-gray-200 dark:border-gray-800">📋 기본 정보 및 생산물</h4>
                  
                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.inputLabel}>봉군 *</label>
                      <select
                        style={styles.input}
                        value={form.colony_id}
                        onChange={(e) => setForm({ ...form, colony_id: e.target.value })}
                        required
                      >
                        <option value="">봉군 선택...</option>
                        {allColonies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ ...styles.inputGroup, flex: 1 }}>
                      <label style={styles.inputLabel}>날짜 *</label>
                      <input
                        style={styles.input}
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <FormNum label="프로폴리스 생산량 (g)" value={form.propolis_production} onChange={(v) => setForm({ ...form, propolis_production: v })} />
                    <FormNum label="로얄젤리 생산량 (g)" value={form.royal_jelly_production} onChange={(v) => setForm({ ...form, royal_jelly_production: v })} />
                  </div>

                  <h4 style={styles.formSection} className="text-lg font-bold border-b pb-2 border-gray-200 dark:border-gray-800">환경 데이터</h4>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <FormNum label="온도 (°C)" value={form.temperature} onChange={(v) => setForm({ ...form, temperature: v })} />
                    <FormNum label="습도 (%)" value={form.humidity} onChange={(v) => setForm({ ...form, humidity: v })} />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>비고</label>
                    <textarea
                      style={{ ...styles.input, minHeight: "100px", resize: "none" }}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="특이사항 및 관찰 메모"
                    />
                  </div>
                </div>

                {/* Right Column: Core Trait Range Sliders */}
                <div className="space-y-6">
                  <h4 style={styles.formSection} className="text-lg font-bold border-b pb-2 border-gray-200 dark:border-gray-800">🧬 핵심 형질 평가 (슬라이더 조작)</h4>

                  {/* 1. Honey Production Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={styles.inputLabel}>수밀력 (꿀 생산량, kg)</label>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)" }}>{form.honey_production} kg</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.honey_production}
                      onChange={(e) => setForm({ ...form, honey_production: e.target.value })}
                      style={{ width: "100%", accentColor: "var(--color-gold)", cursor: "pointer" }}
                    />
                  </div>

                  {/* 2. Temperament Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={styles.inputLabel}>온순성 (Temperament)</label>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)" }}>{form.temperament} / 5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={form.temperament}
                      onChange={(e) => setForm({ ...form, temperament: e.target.value })}
                      style={{ width: "100%", accentColor: "var(--color-gold)", cursor: "pointer" }}
                    />
                  </div>

                  {/* 3. Virus Resistance Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={styles.inputLabel}>바이러스 저항성</label>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)" }}>{form.virus_resistance} / 5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={form.virus_resistance}
                      onChange={(e) => setForm({ ...form, virus_resistance: e.target.value })}
                      style={{ width: "100%", accentColor: "var(--color-gold)", cursor: "pointer" }}
                    />
                  </div>

                  {/* 4. Mite Resistance Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={styles.inputLabel}>응애 저항성</label>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)" }}>{form.mite_resistance} / 5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={form.mite_resistance}
                      onChange={(e) => setForm({ ...form, mite_resistance: e.target.value })}
                      style={{ width: "100%", accentColor: "var(--color-gold)", cursor: "pointer" }}
                    />
                  </div>

                  {/* 5. Climate Adaptation Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={styles.inputLabel}>기후 적응성</label>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)" }}>{form.climate_adaptation} / 5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={form.climate_adaptation}
                      onChange={(e) => setForm({ ...form, climate_adaptation: e.target.value })}
                      style={{ width: "100%", accentColor: "var(--color-gold)", cursor: "pointer" }}
                    />
                  </div>

                  {/* 6. VSH Rate Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={styles.inputLabel}>VSH 행동 발현율 (%)</label>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)" }}>{form.vsh_rate}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={form.vsh_rate}
                      onChange={(e) => setForm({ ...form, vsh_rate: e.target.value })}
                      style={{ width: "100%", accentColor: "var(--color-gold)", cursor: "pointer" }}
                    />
                  </div>

                  {/* 7. Hygienic Rate Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={styles.inputLabel}>청소 청결율 (%)</label>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)" }}>{form.hygienic_rate}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={form.hygienic_rate}
                      onChange={(e) => setForm({ ...form, hygienic_rate: e.target.value })}
                      style={{ width: "100%", accentColor: "var(--color-gold)", cursor: "pointer" }}
                    />
                  </div>

                  {/* 8. Swarming Rate Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={styles.inputLabel}>분봉률 (%)</label>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)" }}>{form.swarming_rate}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={form.swarming_rate}
                      onChange={(e) => setForm({ ...form, swarming_rate: e.target.value })}
                      style={{ width: "100%", accentColor: "var(--color-gold)", cursor: "pointer" }}
                    />
                  </div>

                  {/* 9. Overwintering Survival Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={styles.inputLabel}>월동 생존율 (%)</label>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)" }}>{form.overwintering_survival}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={form.overwintering_survival}
                      onChange={(e) => setForm({ ...form, overwintering_survival: e.target.value })}
                      style={{ width: "100%", accentColor: "var(--color-gold)", cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-4 no-print">
                <button
                  type="button"
                  style={styles.cardBtnDanger}
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 transition font-bold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{ ...styles.primaryBtn, minWidth: "150px" }}
                  disabled={busy}
                  className="px-6 py-2.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-bold transition flex items-center justify-center"
                >
                  {busy ? "기록 중..." : "💾 형질 기록 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

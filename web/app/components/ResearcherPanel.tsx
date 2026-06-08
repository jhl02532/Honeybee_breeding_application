import React, { useState, useEffect, useCallback } from "react";
import { styles } from "../styles";
import { authFetch } from "../utils";
import Modal from "./Modal";

interface ResearcherStats {
  total_farmers: number;
  total_apiaries: number;
  total_colonies: number;
  total_records: number;
  avg_honey: number;
  avg_propolis: number;
  avg_royal_jelly: number;
  avg_survival_rate: number;
  active_colonies: number;
  weak_colonies: number;
  dead_colonies: number;
  queen_types: number;
}

interface FarmerRegistry {
  id: number;
  username: string;
  farm_name: string;
  apiaries_count: number;
  colonies_count: number;
}

interface MorphologicalRecord {
  id: number;
  queen_tag: string;
  colony_id: number | null;
  date: string;
  cubital_index: number | null;
  proboscis_length: number | null;
  tergite_color: string | null;
  basitarsus_length: number | null;
  basitarsus_width: number | null;
  researcher_notes: string | null;
}

export default function ResearcherPanel() {
  const [stats, setStats] = useState<ResearcherStats | null>(null);
  const [farmers, setFarmers] = useState<FarmerRegistry[]>([]);
  const [morphs, setMorphs] = useState<MorphologicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);

  // Form states
  const [form, setForm] = useState({
    queen_tag: "",
    date: new Date().toISOString().split("T")[0],
    cubital_index: "",
    proboscis_length: "",
    tergite_color: "",
    basitarsus_length: "",
    basitarsus_width: "",
    researcher_notes: ""
  });

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, farmersRes, morphsRes] = await Promise.all([
        authFetch("/api/v1/researcher/stats"),
        authFetch("/api/v1/researcher/farmers"),
        authFetch("/api/v1/researcher/morphological")
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (farmersRes.ok) setFarmers(await farmersRes.json());
      if (morphsRes.ok) setMorphs(await morphsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createMorphRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        queen_tag: form.queen_tag,
        date: form.date,
        cubital_index: form.cubital_index ? parseFloat(form.cubital_index) : null,
        proboscis_length: form.proboscis_length ? parseFloat(form.proboscis_length) : null,
        tergite_color: form.tergite_color || null,
        basitarsus_length: form.basitarsus_length ? parseFloat(form.basitarsus_length) : null,
        basitarsus_width: form.basitarsus_width ? parseFloat(form.basitarsus_width) : null,
        researcher_notes: form.researcher_notes || null
      };

      const res = await authFetch("/api/v1/researcher/morphological", {
        method: "POST",
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const d = await res.json();
        alert(d.detail || "형태 기록 저장 실패");
        return;
      }

      setShowModal(false);
      setForm({
        queen_tag: "",
        date: new Date().toISOString().split("T")[0],
        cubital_index: "",
        proboscis_length: "",
        tergite_color: "",
        basitarsus_length: "",
        basitarsus_width: "",
        researcher_notes: ""
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "형태 기록 저장 실패");
    } finally {
      setBusy(false);
    }
  };

  const deleteMorphRecord = async (id: number) => {
    if (!confirm("이 형태 측정 데이터를 영구 삭제하시겠습니까?")) return;
    try {
      await authFetch(`/api/v1/researcher/morphological/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err: any) {
      alert(err.message || "삭제 실패");
    }
  };

  const downloadMasterCSV = async () => {
    try {
      const res = await authFetch("/api/v1/researcher/export/csv");
      if (!res.ok) throw new Error("전국 빅데이터 다운로드 실패");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `KBEEBANK_National_BreedingData_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div style={styles.emptyState}>로딩 중...</div>;

  return (
    <div className="animate-fade">
      {/* Researcher stats cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard} className="animate-slide">
          <div style={{ ...styles.kpiIcon, background: "rgba(99,102,241,0.12)" }}>👤</div>
          <div style={{ ...styles.kpiValue, color: "#818cf8" }}>{stats?.total_farmers}</div>
          <div style={styles.kpiLabel}>전국 육종 농가</div>
        </div>
        <div style={styles.kpiCard} className="animate-slide">
          <div style={{ ...styles.kpiIcon, background: "rgba(245,158,11,0.12)" }}>🏡</div>
          <div style={{ ...styles.kpiValue, color: "#fbbf24" }}>{stats?.total_apiaries}</div>
          <div style={styles.kpiLabel}>총 양봉장 수</div>
        </div>
        <div style={styles.kpiCard} className="animate-slide">
          <div style={{ ...styles.kpiIcon, background: "rgba(16,185,129,0.12)" }}>🐝</div>
          <div style={{ ...styles.kpiValue, color: "#34d399" }}>{stats?.total_colonies}</div>
          <div style={styles.kpiLabel}>총 여왕벌/봉군 수</div>
        </div>
        <div style={styles.kpiCard} className="animate-slide">
          <div style={{ ...styles.kpiIcon, background: "rgba(59,130,246,0.12)" }}>📋</div>
          <div style={{ ...styles.kpiValue, color: "#60a5fa" }}>{stats?.total_records}</div>
          <div style={styles.kpiLabel}>누적 형질 빅데이터</div>
        </div>
      </div>

      {/* Action Header */}
      <div style={styles.panelHeader}>
        <h2 style={styles.sectionTitle}>📋 연구실 미세 형태 측정 기록</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={downloadMasterCSV}
            style={{
              ...styles.primaryBtn,
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "#ffffff"
            }}
          >
            📥 전국 빅데이터 마스터 CSV 내보내기 (BOM)
          </button>
          <button
            style={styles.primaryBtn}
            onClick={() => setShowModal(true)}
          >
            + 실험실 분석 샘플 등록
          </button>
        </div>
      </div>

      {/* Morphological records table */}
      {morphs.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔬</div>
          <p>등록된 정밀 형태 측정 데이터 샘플이 없습니다. 새 현미경 시료를 등록하세요.</p>
        </div>
      ) : (
        <div style={{ ...styles.tableWrapper, marginBottom: "32px" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>날짜</th>
                <th style={styles.th}>여왕벌태그</th>
                <th style={styles.th}>큐비탈지수 (CI)</th>
                <th style={styles.th}>혀 길이 (mm)</th>
                <th style={styles.th}>복판 색상</th>
                <th style={styles.th}>후경부길이 (mm)</th>
                <th style={styles.th}>후경부너비 (mm)</th>
                <th style={styles.th}>비고</th>
                <th style={styles.th}>삭제</th>
              </tr>
            </thead>
            <tbody>
              {morphs.map((m) => (
                <tr key={m.id} style={styles.tr}>
                  <td style={styles.td}>{m.date}</td>
                  <td style={{ ...styles.td, color: "#fbbf24", fontWeight: "bold" }}>{m.queen_tag}</td>
                  <td style={styles.td}>{m.cubital_index ?? "-"}</td>
                  <td style={styles.td}>{m.proboscis_length ?? "-"} mm</td>
                  <td style={styles.td}>{m.tergite_color ?? "-"}</td>
                  <td style={styles.td}>{m.basitarsus_length ?? "-"} mm</td>
                  <td style={styles.td}>{m.basitarsus_width ?? "-"} mm</td>
                  <td style={{ ...styles.td, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.researcher_notes || "-"}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.deleteBtnSmall}
                      onClick={() => deleteMorphRecord(m.id)}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Farmers registry */}
      <h2 style={styles.sectionTitle}>🏡 가입 농가 규모 및 동태 모니터링</h2>
      {farmers.length === 0 ? (
        <div style={styles.emptyState}>활동 중인 농가 계정이 존재하지 않습니다.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>유저아이디</th>
                <th style={styles.th}>농가명 (농장명)</th>
                <th style={styles.th}>보유 봉장 수</th>
                <th style={styles.th}>총 벌통/봉군 수</th>
              </tr>
            </thead>
            <tbody>
              {farmers.map((f) => (
                <tr key={f.id} style={styles.tr}>
                  <td style={styles.td}>{f.username}</td>
                  <td style={{ ...styles.td, color: "#60a5fa" }}>{f.farm_name}</td>
                  <td style={styles.td}>{f.apiaries_count} 개소</td>
                  <td style={styles.td}>{f.colonies_count} 군</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lab Sample Dialog Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} title="정밀 형태학적 측정 샘플링 기입">
          <form onSubmit={createMorphRecord} style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>여왕벌 식별 태그 * (Pedigree Key)</label>
              <input
                style={styles.input}
                value={form.queen_tag}
                onChange={(e) => setForm({ ...form, queen_tag: e.target.value })}
                placeholder="예: Q-2025-N01 (가계 바인딩 키)"
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>분석 일자 *</label>
              <input
                style={styles.input}
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            <h4 style={styles.formSection}>🔬 형태 미세 측정 정보</h4>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.inputLabel}>큐비탈 지수 (CI, a/b)</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  value={form.cubital_index}
                  onChange={(e) => setForm({ ...form, cubital_index: e.target.value })}
                  placeholder="예: 1.85"
                />
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.inputLabel}>혀 길이 (mm)</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  value={form.proboscis_length}
                  onChange={(e) => setForm({ ...form, proboscis_length: e.target.value })}
                  placeholder="예: 6.45"
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>복판 색상 (Tergite Color)</label>
              <input
                style={styles.input}
                value={form.tergite_color}
                onChange={(e) => setForm({ ...form, tergite_color: e.target.value })}
                placeholder="예: Yellow, Dark, Stripes"
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.inputLabel}>뒷다리 마디 길이 (mm)</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  value={form.basitarsus_length}
                  onChange={(e) => setForm({ ...form, basitarsus_length: e.target.value })}
                  placeholder="예: 3.25"
                />
              </div>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.inputLabel}>뒷다리 마디 너비 (mm)</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  value={form.basitarsus_width}
                  onChange={(e) => setForm({ ...form, basitarsus_width: e.target.value })}
                  placeholder="예: 1.15"
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>연구원 메모 (분석 비고)</label>
              <textarea
                style={{ ...styles.input, minHeight: "60px", resize: "vertical" }}
                value={form.researcher_notes}
                onChange={(e) => setForm({ ...form, researcher_notes: e.target.value })}
                placeholder="현미경 시료 마커 세부 판정 특이사항 기재"
              />
            </div>

            <button
              type="submit"
              style={{ ...styles.primaryBtn, width: "100%", marginTop: "8px" }}
              disabled={busy}
            >
              {busy ? "기록 중..." : "실험 분석 결과 저장"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

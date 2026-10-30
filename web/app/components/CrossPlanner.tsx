import React, { useState, useEffect } from "react";
import { styles } from "../styles";
import { authFetch } from "../utils";

// v2 교배 예측: 어미 여왕 × 수벌 생산 여왕들 → 딸의 마커 유전형 분포·기대 마커 점수
// 수벌은 반수체라 수벌을 낳은 여왕의 생식세포와 같다. 계산은 백엔드 /api/v2/cross/predict.

const box: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-color)",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "16px",
};
const subTitle: React.CSSProperties = { fontSize: "14px", fontWeight: 700, color: "var(--color-gold)", margin: "0 0 10px" };
const muted: React.CSSProperties = { fontSize: "12px", color: "var(--text-muted)" };
const fmt = (v: number | null | undefined, d = 3) => (v == null ? "-" : Number(v.toFixed(d)).toString());
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

interface QueenOpt { id: number; tag: string; line: string | null }

function QueenPicker({ dataset, label, onPick }: { dataset: string; label: string; onPick: (q: QueenOpt) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<QueenOpt[]>([]);
  useEffect(() => {
    if (!dataset) return;
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ dataset, limit: "15" });
      if (q) qs.set("q", q);
      authFetch(`/api/v2/queens?${qs}`).then((r) => r.json()).then((d) => setItems(d.items || [])).catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [dataset, q]);
  return (
    <div>
      <input style={{ ...styles.input, padding: "8px 10px", width: "100%" }} placeholder={label} value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ maxHeight: "160px", overflowY: "auto", marginTop: "6px" }}>
        {items.map((it) => (
          <div key={it.id} onClick={() => onPick(it)}
               style={{ fontSize: "12px", padding: "5px 8px", cursor: "pointer", borderBottom: "1px solid var(--border-color)", color: "var(--text-main)" }}>
            {it.tag} <span style={{ color: "var(--text-muted)" }}>{it.line || ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CrossPlanner() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [dataset, setDataset] = useState("");
  const [dam, setDam] = useState<QueenOpt | null>(null);
  const [mode, setMode] = useState<"recorded" | "manual">("recorded");
  const [sires, setSires] = useState<{ q: QueenOpt; share: number }[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [validation, setValidation] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch("/api/v2/datasets").then((r) => r.json()).then((d: any[]) => {
      const withQueens = d.filter((x) => x.n_queens > 0);
      setDatasets(withQueens);
      const sim = withQueens.find((x) => x.kind === "simulated") || withQueens[0];
      if (sim) setDataset(sim.code);
    }).catch(() => setError("데이터 세트를 불러오지 못했습니다."));
  }, []);

  const run = async () => {
    if (!dam) return;
    setBusy(true); setError(""); setResult(null);
    const body: any = { dam_queen_id: dam.id };
    if (mode === "manual") body.sires = sires.map((s) => ({ queen_id: s.q.id, share: s.share }));
    const r = await authFetch("/api/v2/cross/predict", { method: "POST", body: JSON.stringify(body) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) setError(j.detail || "예측에 실패했습니다.");
    else setResult(j);
  };

  const validate = async () => {
    setBusy(true); setValidation(null);
    const r = await authFetch(`/api/v2/cross/validate?dataset=${dataset}`);
    setBusy(false);
    if (r.ok) setValidation(await r.json());
  };

  const ds = datasets.find((d) => d.code === dataset);

  return (
    <div>
      <div style={box}>
        <h3 style={subTitle}>교배 조합 예측 (등록된 유전형 기반)</h3>
        <div style={{ ...muted, marginBottom: "12px", lineHeight: 1.6 }}>
          어미 여왕과 수벌을 낼 여왕(들)의 마커 유전형으로 딸 여왕·일벌의 마커별 유전형 확률과 기대 마커 점수를 계산합니다.
          수벌 쪽 유전형이 없으면 마커의 집단 빈도로 대신합니다. 마커 점수는 등록된 마커 효과의 합이며 육종가가 아닙니다.
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          <select style={{ ...styles.input, width: "auto", padding: "8px 10px" }} value={dataset}
                  onChange={(e) => { setDataset(e.target.value); setDam(null); setSires([]); setResult(null); setValidation(null); }}>
            {datasets.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
          </select>
          {ds?.kind === "simulated" && (
            <button style={styles.clearFilter} onClick={validate} disabled={busy}>이 데이터 세트로 예측 검증</button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
              ① 어미 여왕 {dam && <span style={{ color: "var(--color-gold)" }}>{dam.tag}</span>}
            </div>
            <QueenPicker dataset={dataset} label="어미 여왕 검색" onPick={(q) => { setDam(q); setResult(null); }} />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>② 수벌 쪽</div>
            <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--text-main)", marginBottom: "8px" }}>
              <label><input type="radio" checked={mode === "recorded"} onChange={() => setMode("recorded")} /> 어미의 실제 교미 기록</label>
              <label><input type="radio" checked={mode === "manual"} onChange={() => setMode("manual")} /> 수벌 생산 여왕 직접 선택</label>
            </div>
            {mode === "manual" && (
              <>
                <QueenPicker dataset={dataset} label="수벌 생산 여왕 검색·추가"
                             onPick={(q) => !sires.find((s) => s.q.id === q.id) && setSires([...sires, { q, share: 1 }])} />
                <div style={{ marginTop: "8px" }}>
                  {sires.map((s, i) => (
                    <div key={s.q.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", marginBottom: "4px", color: "var(--text-main)" }}>
                      <span style={{ flex: 1 }}>{s.q.tag}</span>
                      비율
                      <input type="number" min={0.1} step={0.1} value={s.share} style={{ ...styles.input, width: "70px", padding: "4px 6px" }}
                             onChange={(e) => setSires(sires.map((x, j) => (j === i ? { ...x, share: parseFloat(e.target.value) || 0.1 } : x)))} />
                      <button style={styles.clearFilter} onClick={() => setSires(sires.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                  {sires.length === 0 && <div style={muted}>여왕을 하나 이상 추가하세요. 비율은 자동으로 합이 1이 되게 나눕니다.</div>}
                </div>
              </>
            )}
          </div>
        </div>
        <button style={{ ...styles.primaryBtn, marginTop: "12px" }} onClick={run}
                disabled={!dam || busy || (mode === "manual" && sires.length === 0)}>
          {busy ? "계산 중…" : "딸 예측 계산"}
        </button>
        {error && <div style={{ ...styles.errorBanner, marginTop: "10px" }}>{error}</div>}
      </div>

      {result && <CrossResult r={result} />}
      {validation && <ValidationResult v={validation} />}
    </div>
  );
}

function CrossResult({ r }: { r: any }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? r.markers : r.markers.slice(0, 15);
  const warn = [...r.inbreeding_warnings].sort((a: any, b: any) => a.dam_gen + a.sire_gen - (b.dam_gen + b.sire_gen));
  const close = warn.filter((w: any) => w.dam_gen + w.sire_gen <= 2);
  const sireTag: Record<number, string> = {};
  r.sires.forEach((s: any) => { sireTag[s.queen_id] = s.tag; });
  return (
    <div style={box}>
      <h3 style={subTitle}>예측 결과: {r.dam_tag} × {r.sire_source === "recorded" ? "실제 교미 기록" : "직접 선택"} ({r.sires.length}개 수벌 생산 여왕)</h3>
      {!r.dam_has_genotype && <div style={styles.errorBanner}>어미 여왕의 유전형이 없어 계산할 수 없습니다.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "12px" }}>
        {r.traits.map((t: any) => {
          const act = r.actual_daughters?.mean_marker_score?.[t.trait_code];
          const tru = r.actual_daughters?.mean_true_queen_effect?.[t.trait_code];
          return (
            <div key={t.trait_code} style={{ border: "1px solid var(--border-color)", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>{t.trait_code}</div>
              <div style={{ fontSize: "12px", color: "var(--text-main)", lineHeight: 1.8 }}>
                <div>어미 마커 점수 <b>{fmt(t.dam_score)}</b></div>
                <div>딸 기대 마커 점수 <b style={{ color: "var(--color-gold)" }}>{fmt(t.expected_daughter_score)}</b></div>
                {act != null && <div>실제 딸 평균 마커 점수 <b>{fmt(act)}</b> <span style={{ color: "var(--text-muted)" }}>({r.actual_daughters.n_genotyped}마리)</span></div>}
                {tru != null && <div>실제 딸 참 여왕 효과 평균 <b>{fmt(tru)}</b> <span style={{ color: "var(--text-muted)" }}>(시뮬레이션 참값)</span></div>}
                <div style={{ color: "var(--text-muted)" }}>
                  마커 {t.n_markers}개{t.n_markers_sire_fallback > 0 ? ` · 수벌 쪽 집단 빈도 대체 ${t.n_markers_sire_fallback}개` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", margin: "8px 0" }}>
        근친 점검 <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>(계통 기반 근교계수)</span>
      </div>
      <InbreedingCard ib={r.inbreeding} sireTag={sireTag} />
      {warn.length === 0 ? (
        <div style={muted}>3대 안에 어미와 수벌 쪽 공통 조상이 없습니다.</div>
      ) : (
        <div style={{ fontSize: "12px", color: "var(--text-main)", lineHeight: 1.7 }}>
          {close.length > 0 && r.inbreeding.level === "low" && (
            <div style={{ ...muted, marginBottom: "6px" }}>
              공통 조상이 어미·수벌 쪽 합쳐 2대 안에 있지만, 그 수벌 생산 여왕의 비율이 작거나 관계가 멀어 딸의 근교계수는 낮습니다.
            </div>
          )}
          {warn.slice(0, 6).map((w: any) => (
            <div key={w.sire_queen_id}>
              수벌 생산 여왕 {sireTag[w.sire_queen_id] || `#${w.sire_queen_id}`} ({pct(w.share)}): 가장 가까운 공통 조상 {w.closest_common}
              — 어미에서 {w.dam_gen}대, 수벌 쪽에서 {w.sire_gen}대 위 · 공통 조상 {w.n_common}마리
            </div>
          ))}
          {warn.length > 6 && <div style={muted}>외 {warn.length - 6}건</div>}
        </div>
      )}

      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", margin: "14px 0 8px" }}>마커별 딸 유전형 확률 (효과 큰 순)</div>
      <div style={{ ...styles.tableWrapper, maxHeight: "360px", overflowY: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>{["마커", "형질", "효과", "어미", "수벌 쪽 1 빈도", "0/0", "0/1", "1/1", "기여"].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((m: any) => (
              <tr key={`${m.panel}|${m.marker_code}|${m.trait_code}`} style={styles.tr}>
                <td style={styles.td}>{m.marker_code}</td>
                <td style={styles.td}>{m.trait_code}</td>
                <td style={styles.td}>{fmt(m.effect, 3)}</td>
                <td style={styles.td}>{["0/0", "0/1", "1/1"][Math.round(m.dam_dosage)] ?? fmt(m.dam_dosage, 2)}</td>
                <td style={styles.td}>{fmt(m.p_drone, 2)}{m.sire_fallback_share > 0 ? " *" : ""}</td>
                <td style={styles.td}>{pct(m.p_00)}</td>
                <td style={styles.td}>{pct(m.p_01)}</td>
                <td style={styles.td}>{pct(m.p_11)}</td>
                <td style={styles.td}>{fmt(m.expected_contribution, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {r.markers.length > 15 && (
        <button style={{ ...styles.clearFilter, marginTop: "6px" }} onClick={() => setShowAll(!showAll)}>
          {showAll ? "15개만 보기" : `전체 ${r.markers.length}개 보기`}
        </button>
      )}
      <div style={{ ...muted, marginTop: "6px" }}>* 수벌 쪽 유전형이 없어 집단 빈도로 대신한 마커</div>
    </div>
  );
}

const IB_LABEL: Record<string, string> = { high: "높음", moderate: "주의", low: "낮음" };

function InbreedingCard({ ib, sireTag }: { ib: any; sireTag: Record<number, string> }) {
  const top = [...ib.per_sire].sort((a: any, b: any) => b.kinship * b.share - a.kinship * a.share).slice(0, 5);
  const color = ib.level === "high" ? "#ef4444" : ib.level === "moderate" ? "var(--color-gold)" : "var(--text-main)";
  return (
    <div style={{ border: "1px solid var(--border-color)", borderRadius: "10px", padding: "12px", marginBottom: "8px" }}>
      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "12px", color: "var(--text-main)" }}>
        <div>딸(여왕·일벌)의 기대 근교계수 <b style={{ fontSize: "16px", color }}>{fmt(ib.expected_daughter_f, 3)}</b> <span style={{ color }}>({IB_LABEL[ib.level]})</span></div>
        <div>어미 자신의 근교계수 <b>{fmt(ib.dam_f, 3)}</b></div>
      </div>
      {ib.level !== "low" && (
        <div style={{ ...styles.errorBanner, margin: "8px 0 0" }}>
          {ib.level === "high" ? "반형제 교배 수준(F ≥ 0.125) 이상입니다." : "사촌 교배 수준(F ≥ 0.0625)입니다."} csd 동형(이배체 수벌) 봉아가 늘어 봉판이 빌 수 있습니다.
        </div>
      )}
      <div style={{ fontSize: "12px", color: "var(--text-main)", marginTop: "8px", lineHeight: 1.7 }}>
        {top.filter((s: any) => s.kinship > 0).map((s: any) => (
          <div key={s.sire_queen_id}>
            수벌 생산 여왕 {sireTag[s.sire_queen_id] || `#${s.sire_queen_id}`} ({pct(s.share)}): 어미와의 근연계수 {fmt(s.kinship, 3)}
          </div>
        ))}
      </div>
      <div style={{ ...muted, marginTop: "6px", lineHeight: 1.6 }}>
        근교계수 = 어미와 수벌 생산 여왕들의 근연계수를 수벌 비율로 평균한 값. 수벌은 수벌 생산 여왕의 생식세포 그대로라는 반수이배체 계통으로 계산합니다.
        계통 기록이 없는 조상은 서로 무관하다고 보므로, 기록이 짧으면 실제보다 낮게 나옵니다.
      </div>
    </div>
  );
}

function ValidationResult({ v }: { v: any }) {
  return (
    <div style={box}>
      <h3 style={subTitle}>예측 검증: {v.dataset} ({v.n_families}가계)</h3>
      <div style={{ ...muted, marginBottom: "8px", lineHeight: 1.6 }}>
        딸이 2마리 이상이고 교미 기록·유전형이 있는 어미마다, 실제 교미 기록으로 예측한 딸 기대값을 실제 딸들과 비교했습니다.
      </div>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead><tr>{["형질", "가계", "예측↔실제 딸 마커 점수 r", "평균 절대 오차", "예측↔딸 참 여왕 효과 r"].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
          <tbody>
            {v.marker_score.map((m: any) => {
              const t = v.true_queen_effect.find((x: any) => x.trait_code === m.trait_code);
              return (
                <tr key={m.trait_code} style={styles.tr}>
                  <td style={styles.td}>{m.trait_code}</td>
                  <td style={styles.td}>{m.n}</td>
                  <td style={styles.td}>{fmt(m.r_pred_vs_daughter_mean, 2)}</td>
                  <td style={styles.td}>{fmt(m.mean_abs_error, 3)}</td>
                  <td style={styles.td}>{t ? fmt(t.r_pred_vs_daughter_true_effect, 2) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: "12px", color: "var(--text-main)", marginTop: "8px" }}>
        마커별 대립유전자 빈도: 예측↔실제 딸 r = {fmt(v.allele_freq.r_pred_vs_observed, 2)}, 평균 절대 오차 {fmt(v.allele_freq.mean_abs_error, 3)} ({v.allele_freq.n}쌍)
      </div>
      {v.inbreeding?.n > 0 && (
        <div style={{ fontSize: "12px", color: "var(--text-main)", marginTop: "8px", lineHeight: 1.7 }}>
          근교계수: 여왕 {v.inbreeding.n}마리의 딸 기대 근교계수 ↔ 그 봉군의 동형 봉아 비율 r = {fmt(v.inbreeding.r_offspring_f_vs_hom_brood, 2)}
          <div style={muted}>
            출생 연도별 여왕 근교계수 평균: {v.inbreeding.mean_f_by_birth_year.map((y: any) => `${y.year} ${fmt(y.mean_f, 3)}`).join(" · ")}
          </div>
        </div>
      )}
      <div style={{ ...muted, marginTop: "6px", lineHeight: 1.6 }}>
        마커 점수 예측이 잘 맞아도 참 여왕 효과와의 상관이 낮으면, 등록된 마커가 그 형질의 유전 효과를 적게 설명한다는 뜻입니다.
      </div>
    </div>
  );
}

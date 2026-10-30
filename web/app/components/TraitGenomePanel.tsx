import React, { useState, useEffect, useCallback } from "react";
import { styles } from "../styles";
import { authFetch } from "../utils";

// v2 형질·유전체 연결: 데이터 세트별 여왕벌(봉군)·형질·시료·마커를 한 화면에서 본다
interface Dataset {
  id: number;
  code: string;
  name: string;
  kind: string;
  citation: string | null;
  doi: string | null;
  license: string | null;
  notes: string | null;
  n_queens: number;
  n_samples: number;
  n_observations: number;
  n_breeding_values: number;
}

interface TraitStat {
  trait_code: string;
  name_ko: string;
  unit: string | null;
  n: number;
  mean: number;
  sd: number;
  min: number;
  max: number;
}

interface QueenRow {
  id: number;
  tag: string;
  line: string | null;
  external_id: string | null;
  n_observations: number;
  n_samples: number;
}

const KIND_LABEL: Record<string, string> = {
  farm: "농가 입력",
  own_research: "자체 연구",
  public: "공개 데이터",
  simulated: "시뮬레이션",
};

const fmtNum = (v: number | null | undefined, digits = 3) =>
  v == null ? "-" : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : Number(v.toFixed(digits)).toString();

const box: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-color)",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "16px",
};

const subTitle: React.CSSProperties = { fontSize: "14px", fontWeight: 700, color: "var(--color-gold)", margin: "0 0 10px" };

export default function TraitGenomePanel() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dsCode, setDsCode] = useState<string>("");
  const [stats, setStats] = useState<TraitStat[]>([]);
  const [queens, setQueens] = useState<{ total: number; lines: string[]; items: QueenRow[] }>({ total: 0, lines: [], items: [] });
  const [search, setSearch] = useState("");
  const [line, setLine] = useState("");
  const [page, setPage] = useState(0);
  const [profile, setProfile] = useState<any | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [markerTrait, setMarkerTrait] = useState("");
  const [error, setError] = useState("");
  const PAGE = 20;

  useEffect(() => {
    authFetch("/api/v2/datasets")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d: Dataset[]) => {
        setDatasets(d);
        const first = d.find((x) => x.n_observations > 0 && x.kind !== "farm") || d[0];
        if (first) setDsCode(first.code);
      })
      .catch(() => setError("데이터 세트를 불러오지 못했습니다."));
  }, []);

  useEffect(() => {
    if (!dsCode) return;
    setProfile(null);
    authFetch(`/api/v2/traits/summary?dataset=${dsCode}`).then((r) => r.json()).then(setStats).catch(() => setStats([]));
  }, [dsCode]);

  const loadQueens = useCallback(() => {
    if (!dsCode) return;
    const qs = new URLSearchParams({ dataset: dsCode, skip: String(page * PAGE), limit: String(PAGE) });
    if (search) qs.set("q", search);
    if (line) qs.set("line", line);
    authFetch(`/api/v2/queens?${qs}`).then((r) => r.json()).then(setQueens).catch(() => setQueens({ total: 0, lines: [], items: [] }));
  }, [dsCode, search, line, page]);

  useEffect(() => { loadQueens(); }, [loadQueens]);

  useEffect(() => {
    const qs = new URLSearchParams({ limit: "30" });
    if (markerTrait) qs.set("trait", markerTrait);
    authFetch(`/api/v2/markers?${qs}`).then((r) => r.json()).then((d) => setMarkers(d.items || [])).catch(() => setMarkers([]));
  }, [markerTrait]);

  const openQueen = async (id: number) => {
    const r = await authFetch(`/api/v2/queens/${id}`);
    if (r.ok) setProfile(await r.json());
  };

  const downloadCSV = async () => {
    const r = await authFetch(`/api/v2/traits/observations?dataset=${dsCode}&format=csv&limit=200000`);
    if (!r.ok) {
      alert("내보내기에 실패했습니다.");
      return;
    }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `KBEEBANK_${dsCode}_traits.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ds = datasets.find((d) => d.code === dsCode);
  const markerTraits = Array.from(new Set(markers.map((m) => m.trait_code).filter(Boolean)));

  return (
    <div className="animate-fade">
      <div style={styles.panelHeader}>
        <h2 style={styles.sectionTitle}>🧷 형질·유전체 연결 <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400 }}>(v2 시험판)</span></h2>
        <button style={{ ...styles.primaryBtn, background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff" }} onClick={downloadCSV} disabled={!dsCode}>
          📋 형질 CSV 내보내기
        </button>
      </div>
      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* 데이터 세트 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        {datasets.map((d) => (
          <button
            key={d.code}
            onClick={() => { setDsCode(d.code); setPage(0); setSearch(""); setLine(""); }}
            style={{
              ...box, marginBottom: 0, textAlign: "left", cursor: "pointer", color: "var(--text-main)",
              borderColor: d.code === dsCode ? "var(--color-gold)" : "var(--border-color)",
              boxShadow: d.code === dsCode ? "var(--shadow-glow)" : undefined,
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{KIND_LABEL[d.kind] || d.kind}</div>
            <div style={{ fontWeight: 700, margin: "4px 0 8px" }}>{d.name}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              여왕·봉군 {d.n_queens.toLocaleString()} · 시료 {d.n_samples.toLocaleString()} · 형질 값 {d.n_observations.toLocaleString()}
            </div>
          </button>
        ))}
      </div>

      {ds && (ds.citation || ds.notes) && (
        <div style={{ ...box, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>
          {ds.citation && <div>출처: {ds.citation}{ds.doi ? ` (doi:${ds.doi})` : ""}</div>}
          {ds.license && <div>라이선스: {ds.license}</div>}
          {ds.notes && <div>참고: {ds.notes}</div>}
        </div>
      )}

      {/* 형질 요약 */}
      <div style={box}>
        <h3 style={subTitle}>형질 요약</h3>
        {stats.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>이 데이터 세트에는 형질 값이 없습니다.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["형질", "단위", "건수", "평균", "표준편차", "최소", "최대"].map((h) => <th key={h} style={styles.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.trait_code} style={styles.tr}>
                    <td style={styles.td}>{s.name_ko} <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{s.trait_code}</span></td>
                    <td style={styles.td}>{s.unit || "-"}</td>
                    <td style={styles.td}>{s.n.toLocaleString()}</td>
                    <td style={styles.td}>{fmtNum(s.mean)}</td>
                    <td style={styles.td}>{fmtNum(s.sd)}</td>
                    <td style={styles.td}>{fmtNum(s.min)}</td>
                    <td style={styles.td}>{fmtNum(s.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: profile ? "repeat(auto-fit, minmax(300px, 1fr))" : "1fr", gap: "16px" }}>
        {/* 여왕벌 목록 */}
        <div style={box}>
          <h3 style={subTitle}>여왕벌(봉군) {queens.total.toLocaleString()}</h3>
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
            <input
              style={{ ...styles.input, flex: 1, minWidth: "140px", padding: "8px 10px" }}
              placeholder="번호 검색"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
            {queens.lines.length > 0 && (
              <select style={{ ...styles.input, width: "auto", padding: "8px 10px" }} value={line} onChange={(e) => { setLine(e.target.value); setPage(0); }}>
                <option value="">전체 계통</option>
                {queens.lines.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            )}
          </div>
          {queens.items.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>여왕벌 기록이 없습니다. 시료만 있는 데이터 세트일 수 있습니다.</div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>{["번호", "계통", "형질", "시료"].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {queens.items.map((q) => (
                    <tr
                      key={q.id}
                      style={{ ...styles.tr, cursor: "pointer", background: profile?.queen?.id === q.id ? "var(--color-gold-glow)" : undefined }}
                      onClick={() => openQueen(q.id)}
                    >
                      <td style={styles.td}>{q.tag}</td>
                      <td style={styles.td}>{q.line || "-"}</td>
                      <td style={styles.td}>{q.n_observations}</td>
                      <td style={styles.td}>{q.n_samples}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {queens.total > PAGE && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
              <button style={styles.clearFilter} disabled={page === 0} onClick={() => setPage(page - 1)}>← 이전</button>
              <span>{page + 1} / {Math.ceil(queens.total / PAGE)}</span>
              <button style={styles.clearFilter} disabled={(page + 1) * PAGE >= queens.total} onClick={() => setPage(page + 1)}>다음 →</button>
            </div>
          )}
        </div>

        {/* 여왕벌 프로필 */}
        {profile && <QueenProfile profile={profile} onOpen={openQueen} onClose={() => setProfile(null)} />}
      </div>

      {/* 마커 */}
      <div style={box}>
        <h3 style={subTitle}>형질 관련 마커 (GWAS 상위, p 오름차순)</h3>
        <div style={{ marginBottom: "10px" }}>
          <select style={{ ...styles.input, width: "auto", padding: "8px 10px" }} value={markerTrait} onChange={(e) => setMarkerTrait(e.target.value)}>
            <option value="">전체 형질</option>
            {Array.from(new Set([...markerTraits, markerTrait].filter(Boolean))).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {markers.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>등록된 마커가 없습니다.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>{["마커(염색체:위치)", "형질", "집단", "효과 대립유전자", "효과", "빈도", "p"].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {markers.map((m) => (
                  <tr key={m.id} style={styles.tr}>
                    <td style={styles.td}>{m.marker_code}</td>
                    <td style={styles.td}>{m.trait_code || "-"}</td>
                    <td style={styles.td}>{m.population || "-"}</td>
                    <td style={styles.td}>{m.effect_allele || "-"} <span style={{ color: "var(--text-muted)" }}>({m.ref}→{m.alt})</span></td>
                    <td style={styles.td}>{fmtNum(m.effect, 4)}</td>
                    <td style={styles.td}>{fmtNum(m.allele_freq, 3)}</td>
                    <td style={styles.td}>{m.p_value != null ? m.p_value.toExponential(2) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
          시료별 유전형(대립유전자 빈도)은 아직 적재하지 않았습니다. 마커는 프랑스 집단 GWAS 결과라 국내 집단에 그대로 적용할 수 없습니다.
        </div>
      </div>
    </div>
  );
}

function QueenProfile({ profile, onOpen, onClose }: { profile: any; onOpen: (id: number) => void; onClose: () => void }) {
  const q = profile.queen;
  const ancestry: Record<string, number> | null = q.ancestry;
  const sireLinks = profile.matings.flatMap((m: any) => m.sires.map((s: any) => ({ ...s, method: m.method })));
  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h3 style={subTitle}>👑 {q.tag} {q.line && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· {q.line}</span>}</h3>
        <button style={styles.clearFilter} onClick={onClose}>✕ 닫기</button>
      </div>

      {ancestry && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>아종 조상 비율</div>
          <div style={{ display: "flex", height: "14px", borderRadius: "7px", overflow: "hidden" }}>
            {Object.entries(ancestry).map(([k, v], i) => (
              <div key={k} title={`${k} ${(v * 100).toFixed(1)}%`} style={{ width: `${v * 100}%`, background: ["var(--color-gold)", "var(--color-gene)", "var(--color-qtl)", "#10b981"][i % 4] }} />
            ))}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
            {Object.entries(ancestry).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(" · ")}
          </div>
        </div>
      )}

      <div style={{ fontSize: "12px", color: "var(--text-main)", marginBottom: "12px", lineHeight: 1.7 }}>
        <div>모계: {profile.mother ? <a style={{ color: "var(--color-gold)", cursor: "pointer" }} onClick={() => onOpen(profile.mother.id)}>{profile.mother.tag}</a> : "미상"}</div>
        <div>
          교미 상대(수벌을 낸 여왕, 이 여왕 딸들의 부계):{" "}
          {sireLinks.length === 0
            ? profile.matings.length ? "교미 기록 있음, 수벌 출처 미상" : "기록 없음"
            : sireLinks.map((s: any, i: number) => (
                <span key={i}>
                  {i > 0 && ", "}
                  {s.sire_queen ? <a style={{ color: "var(--color-gold)", cursor: "pointer" }} onClick={() => onOpen(s.sire_queen.id)}>{s.sire_queen.tag}</a> : "미상"}
                  {s.share != null && ` (${(s.share * 100).toFixed(0)}%)`}
                </span>
              ))}
        </div>
        {profile.inbreeding && (
          <div>
            근교계수 F = {fmtNum(profile.inbreeding.f, 3)}
            <span style={{ color: "var(--text-muted)" }}> (계통 {profile.inbreeding.pedigree_generations}대)</span>
            {profile.inbreeding.offspring_f != null && <> · 이 교미로 낳는 딸의 기대 F = {fmtNum(profile.inbreeding.offspring_f, 3)}</>}
          </div>
        )}
        {profile.daughters.length > 0 && <div>딸 여왕: {profile.daughters.map((d: any) => d.tag).join(", ")}</div>}
        {profile.colonies.length > 0 && <div>소속 봉군: {profile.colonies.map((c: any) => c.code).join(", ")}</div>}
      </div>

      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", margin: "8px 0" }}>형질 값 {profile.observations.length}</div>
      <div style={{ ...styles.tableWrapper, maxHeight: "220px", overflowY: "auto" }}>
        <table style={styles.table}>
          <thead><tr>{["날짜", "형질", "값"].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
          <tbody>
            {profile.observations.map((o: any, i: number) => (
              <tr key={i} style={styles.tr}>
                <td style={styles.td}>{o.date || "-"}</td>
                <td style={styles.td}>{o.name_ko}</td>
                <td style={styles.td}>{fmtNum(o.value, 3)} {o.unit && <span style={{ color: "var(--text-muted)" }}>{o.unit}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", margin: "12px 0 8px" }}>유전체 시료 {profile.samples.length}</div>
      {profile.samples.map((s: any) => (
        <div key={s.id} style={{ fontSize: "12px", color: "var(--text-main)", marginBottom: "4px" }}>
          {s.code} · {s.sample_type}{s.n_individuals ? ` (${s.n_individuals}마리)` : ""} · {s.platform || "-"}
          {s.run_accessions && <span style={{ color: "var(--text-muted)" }}> · {s.run_accessions}</span>}
        </div>
      ))}

      <PedigreeView queenId={q.id} onOpen={onOpen} />

      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", margin: "12px 0 8px" }}>
        유전형 {profile.genotypes.length}
      </div>
      {profile.genotypes.length === 0 ? (
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>시료 유전형이 적재되면 여기에 마커별 값이 나옵니다.</div>
      ) : (
        <GenotypeTable genotypes={profile.genotypes} />
      )}

      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", margin: "12px 0 8px" }}>육종가 {profile.breeding_values.length}</div>
      {profile.breeding_values.length === 0 ? (
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>육종가 계산 결과가 없습니다.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead><tr>{["형질", "값", "정확도", "모델"].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {profile.breeding_values.map((b: any, i: number) => (
                <tr key={i} style={styles.tr}>
                  <td style={styles.td}>{b.trait_code}</td>
                  <td style={styles.td}>{fmtNum(b.value, 3)}</td>
                  <td style={styles.td}>{fmtNum(b.accuracy, 2)}</td>
                  <td style={styles.td}>{BV_MODEL_LABEL[`${b.model}/${b.model_version}`] || `${b.model}${b.model_version ? ` ${b.model_version}` : ""}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const BV_MODEL_LABEL: Record<string, string> = {
  "true_value/colony_gv": "참값 · 봉군 유전가치(시뮬레이션)",
  "true_value/queen_effect": "참값 · 여왕 효과(시뮬레이션)",
};

// 대립유전자 1 의 개수(0/0=0, 0/1=1, 1/1=2, 수벌 1=1)
const dosage = (gt: string | null) => (gt ? gt.split("/").filter((a) => a === "1").length : null);

function GenotypeTable({ genotypes }: { genotypes: any[] }) {
  const [showAll, setShowAll] = useState(false);
  // 형질별 마커 점수 = Σ 효과 × (효과 대립유전자 수). 혼합 시료(af)는 2 × af 로 센다.
  const scores: Record<string, { sum: number; n: number }> = {};
  genotypes.forEach((g) => {
    if (!g.trait_code || g.effect == null) return;
    const d = g.gt != null ? dosage(g.gt) : g.af != null ? 2 * g.af : null;
    if (d == null) return;
    scores[g.trait_code] = scores[g.trait_code] || { sum: 0, n: 0 };
    scores[g.trait_code].sum += g.effect * d;
    scores[g.trait_code].n += 1;
  });
  const sorted = [...genotypes].sort((a, b) => Math.abs(b.effect ?? 0) - Math.abs(a.effect ?? 0));
  const rows = showAll ? sorted : sorted.slice(0, 10);
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
        {Object.entries(scores).map(([t, v]) => (
          <span key={t} style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "999px", border: "1px solid var(--border-color)", color: "var(--text-main)" }}>
            {t} 마커 점수 <b>{fmtNum(v.sum, 3)}</b> <span style={{ color: "var(--text-muted)" }}>({v.n}개)</span>
          </span>
        ))}
      </div>
      <div style={{ ...styles.tableWrapper, maxHeight: "260px", overflowY: "auto" }}>
        <table style={styles.table}>
          <thead><tr>{["마커", "형질", "유전형", "효과"].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((g, i) => (
              <tr key={i} style={styles.tr}>
                <td style={styles.td}>{g.marker_code}</td>
                <td style={styles.td}>{g.trait_code || "-"}</td>
                <td style={styles.td}>{g.gt ?? (g.af != null ? `빈도 ${fmtNum(g.af, 3)}` : "-")}</td>
                <td style={styles.td}>{fmtNum(g.effect, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {genotypes.length > 10 && (
        <button style={{ ...styles.clearFilter, marginTop: "6px" }} onClick={() => setShowAll(!showAll)}>
          {showAll ? "효과 큰 10개만" : `전체 ${genotypes.length}개 보기`}
        </button>
      )}
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
        마커 점수는 등록된 마커 효과의 단순 합으로, 육종가 추정치가 아닙니다.
      </div>
    </div>
  );
}

function PedigreeView({ queenId, onOpen }: { queenId: number; onOpen: (id: number) => void }) {
  const [ped, setPed] = useState<{ root: number; nodes: any[]; edges: any[] } | null>(null);
  useEffect(() => {
    setPed(null);
    authFetch(`/api/v2/queens/${queenId}/pedigree?depth=3`).then((r) => (r.ok ? r.json() : null)).then(setPed).catch(() => setPed(null));
  }, [queenId]);
  if (!ped || ped.edges.length === 0) return null;
  const byId: Record<number, any> = {};
  ped.nodes.forEach((n) => { byId[n.id] = n; });
  const gens = Array.from(new Set(ped.nodes.map((n) => n.generation))).sort((a, b) => a - b);
  // 노드마다 자기(자식) 쪽에서 본 관계(모계/부계)를 붙인다
  const role: Record<number, string> = {};
  ped.edges.forEach((e) => { if (!role[e.parent]) role[e.parent] = e.kind === "dam" ? "모계" : "부계"; });
  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
        계통도 <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>(3대, 부계 = 어미와 교미한 수벌을 낸 여왕 — 실제 아비 수벌은 그중 하나)</span>
      </div>
      <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
        {gens.map((g) => (
          <div key={g} style={{ minWidth: "130px", flex: "0 0 auto" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{g === 0 ? "본인" : `${g}대 위`}</div>
            {ped.nodes.filter((n) => n.generation === g).slice(0, 12).map((n) => (
              <div
                key={n.id}
                onClick={() => n.id !== ped.root && onOpen(n.id)}
                style={{
                  fontSize: "11px", padding: "4px 6px", marginBottom: "4px", borderRadius: "6px",
                  border: `1px solid ${role[n.id] === "모계" ? "var(--color-gold)" : role[n.id] === "부계" ? "var(--color-gene)" : "var(--border-color)"}`,
                  color: "var(--text-main)", cursor: n.id !== ped.root ? "pointer" : "default", whiteSpace: "nowrap",
                }}
              >
                {n.tag}{role[n.id] && <span style={{ color: "var(--text-muted)" }}> · {role[n.id]}</span>}
              </div>
            ))}
            {ped.nodes.filter((n) => n.generation === g).length > 12 && (
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>외 {ped.nodes.filter((n) => n.generation === g).length - 12}마리</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { styles } from "../styles";
import { authFetch } from "../utils";

// 여왕 계보: 농가 기록 여왕의 어미·딸·교미·재임 봉군·형질·시료를 본다
interface QueenRow {
  id: number;
  tag: string;
  line: string | null;
  mother_queen_id: number | null;
  n_observations: number;
  n_samples: number;
}

const REASON_LABEL: Record<string, string> = {
  introduced: "도입",
  requeen: "교체",
  supersedure: "자연 교체",
  swarm: "분봉",
  migrated: "기존 기록 이전",
};

const fmtNum = (v: number | null | undefined, digits = 2) =>
  v == null ? "-" : Number(v.toFixed(digits)).toString();

const box: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-color)",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "16px",
};

const subTitle: React.CSSProperties = { fontSize: "14px", fontWeight: 700, color: "var(--color-gold)", margin: "0 0 10px" };
const link: React.CSSProperties = { color: "var(--color-gold)", cursor: "pointer" };

export default function QueenPanel() {
  const [queens, setQueens] = useState<{ total: number; items: QueenRow[] }>({ total: 0, items: [] });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [profile, setProfile] = useState<any | null>(null);
  const [matingLabels, setMatingLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const PAGE = 30;

  useEffect(() => {
    authFetch("/api/v2/field/dictionary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMatingLabels(d.mating_methods || {}))
      .catch(() => undefined);
  }, []);

  const loadQueens = useCallback(() => {
    const qs = new URLSearchParams({ dataset: "farm", skip: String(page * PAGE), limit: String(PAGE) });
    if (search) qs.set("q", search);
    authFetch(`/api/v2/queens?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setQueens)
      .catch(() => setError("여왕 목록을 불러오지 못했습니다."));
  }, [search, page]);

  useEffect(() => { loadQueens(); }, [loadQueens]);

  const openQueen = async (id: number) => {
    const r = await authFetch(`/api/v2/queens/${id}`);
    if (r.ok) setProfile(await r.json());
  };

  return (
    <div className="animate-fade">
      <div style={styles.panelHeader}>
        <h2 style={styles.sectionTitle}>👑 여왕 계보</h2>
      </div>
      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: profile ? "repeat(auto-fit, minmax(300px, 1fr))" : "1fr", gap: "16px" }}>
        <div style={box}>
          <h3 style={subTitle}>여왕 {queens.total.toLocaleString()}</h3>
          <input
            style={{ ...styles.input, width: "100%", padding: "8px 10px", marginBottom: "10px" }}
            placeholder="여왕 ID 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
          {queens.items.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>등록된 여왕이 없습니다. 현장 기록에서 여왕을 등록하세요.</div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>{["여왕 ID", "어미", "형질 값", "시료"].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {queens.items.map((q) => (
                    <tr
                      key={q.id}
                      style={{ ...styles.tr, cursor: "pointer", background: profile?.queen?.id === q.id ? "var(--color-gold-glow)" : undefined }}
                      onClick={() => openQueen(q.id)}
                    >
                      <td style={styles.td}>{q.tag}</td>
                      <td style={styles.td}>{q.mother_queen_id ? "기록" : "모름"}</td>
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

        {profile && <QueenProfile profile={profile} matingLabels={matingLabels} onOpen={openQueen} onClose={() => setProfile(null)} />}
      </div>
    </div>
  );
}

function QueenProfile({ profile, matingLabels, onOpen, onClose }: {
  profile: any;
  matingLabels: Record<string, string>;
  onOpen: (id: number) => void;
  onClose: () => void;
}) {
  const q = profile.queen;
  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h3 style={subTitle}>👑 {q.tag}</h3>
        <button style={styles.clearFilter} onClick={onClose}>✕ 닫기</button>
      </div>

      <div style={{ fontSize: "13px", color: "var(--text-main)", marginBottom: "12px", lineHeight: 1.8 }}>
        <div>출생연도: {q.birth_date || "모름"} · 출처: {q.origin || "모름"}</div>
        <div>어미: {profile.mother ? <a style={link} onClick={() => onOpen(profile.mother.id)}>{profile.mother.tag}</a> : "모름"}</div>
        <div>
          교미:{" "}
          {profile.matings.length === 0
            ? "기록 없음"
            : profile.matings.map((m: any, i: number) => (
                <span key={m.id}>
                  {i > 0 && " / "}
                  {matingLabels[m.method] || m.method}
                  {" · 수벌군 "}
                  {m.sires.length === 0
                    ? "모름"
                    : m.sires.map((s: any, j: number) => (
                        <span key={j}>
                          {j > 0 && ", "}
                          {s.sire_queen ? <a style={link} onClick={() => onOpen(s.sire_queen.id)}>{s.sire_queen.tag}</a> : "모름"}
                        </span>
                      ))}
                </span>
              ))}
        </div>
        {profile.daughters.length > 0 && (
          <div>
            딸:{" "}
            {profile.daughters.map((d: any, i: number) => (
              <span key={d.id}>{i > 0 && ", "}<a style={link} onClick={() => onOpen(d.id)}>{d.tag}</a></span>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", margin: "8px 0" }}>재임 봉군</div>
      {profile.colonies.length === 0 ? (
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>연결된 봉군이 없습니다.</div>
      ) : (
        profile.colonies.map((c: any, i: number) => (
          <div key={i} style={{ fontSize: "12px", color: "var(--text-main)", marginBottom: "4px" }}>
            {c.code} · {c.start_date || "시작일 모름"} ~ {c.end_date || "현재"}
            {c.change_reason && <span style={{ color: "var(--text-muted)" }}> · {REASON_LABEL[c.change_reason] || c.change_reason}</span>}
          </div>
        ))
      )}

      <PedigreeView queenId={q.id} onOpen={onOpen} />

      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", margin: "12px 0 8px" }}>형질 값 {profile.observations.length}</div>
      {profile.observations.length > 0 && (
        <div style={{ ...styles.tableWrapper, maxHeight: "240px", overflowY: "auto" }}>
          <table style={styles.table}>
            <thead><tr>{["날짜", "형질", "값"].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {profile.observations.map((o: any, i: number) => (
                <tr key={i} style={styles.tr}>
                  <td style={styles.td}>{o.date || "-"}</td>
                  <td style={styles.td}>{o.name_ko}</td>
                  <td style={styles.td}>{fmtNum(o.value)} {o.unit && <span style={{ color: "var(--text-muted)" }}>{o.unit}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", margin: "12px 0 8px" }}>시료 {profile.samples.length}</div>
      {profile.samples.map((s: any) => (
        <div key={s.id} style={{ fontSize: "12px", color: "var(--text-main)", marginBottom: "4px" }}>
          {s.code} · {s.collected_date || "날짜 모름"}{s.n_individuals ? ` · ${s.n_individuals}마리` : ""}
          {s.status && <span style={{ color: "var(--text-muted)" }}> · {s.status}</span>}
        </div>
      ))}
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
  const gens = Array.from(new Set(ped.nodes.map((n) => n.generation))).sort((a, b) => a - b);
  // 노드마다 자기(자식) 쪽에서 본 관계(모계/부계)를 붙인다
  const role: Record<number, string> = {};
  ped.edges.forEach((e) => { if (!role[e.parent]) role[e.parent] = e.kind === "dam" ? "모계" : "부계"; });
  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
        계통도 <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>(3대, 부계 = 어미와 교미한 수벌을 낸 여왕)</span>
      </div>
      <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
        {gens.map((g) => (
          <div key={g} style={{ minWidth: "120px", flex: "0 0 auto" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{g === 0 ? "본인" : `${g}대 위`}</div>
            {ped.nodes.filter((n) => n.generation === g).map((n) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}

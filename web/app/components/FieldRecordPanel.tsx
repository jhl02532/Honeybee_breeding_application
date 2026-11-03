import React, { useState, useEffect, useCallback } from "react";
import { styles } from "../styles";
import { authFetch } from "../utils";
import { Apiary } from "../types";

// 연구자 현장 기록: 검정군을 고르고 방문 회차별로 봉군을 차례로 입력한다
interface VisitBrief {
  id: number;
  round_no: number;
  date: string;
  status: string;
}

interface GroupRow {
  id: number;
  code: string;
  species: string;
  year: number;
  apiary: string | null;
  n_colonies: number;
  visits: VisitBrief[];
}

interface FieldDef {
  code: string;
  name_ko: string;
  unit: string | null;
  scale: string;
  min: number;
  max: number;
  step: number;
  required: boolean;
  protocol: string | null;
  anchors?: Record<string, string>;
}

interface QueenInfo {
  id: number;
  tag: string;
  origin: string | null;
  birth_year: number | null;
  mother_queen_id: number | null;
  mother_tag: string | null;
  introduced_date: string | null;
  mating_method: string | null;
  sire_queen_id: number | null;
  sire_tag: string | null;
}

interface ColonyRow {
  colony_id: number;
  hive_code: string;
  colony_code: string | null;
  queen_tag: string | null;
  queen: QueenInfo | null;
  missing: string[];
  record: RecordData;
  samples: { code: string; sample_type: string; n_individuals: number | null; storage: string | null }[];
}

interface RecordData {
  saved: boolean;
  queen_status: string | null;
  boxes: number | null;
  supers: number | null;
  drone_brood: boolean | null;
  notes: string | null;
  unknown: string[];
  values: Record<string, number>;
}

interface VisitData {
  id: number;
  round_no: number;
  round_label: string;
  date: string;
  status: string;
  group: { id: number; code: string; species: string; year: number };
  fields: FieldDef[];
  queen_status: Record<string, string>;
  mating_methods: Record<string, string>;
  queen_origins: string[];
  queen_options: { id: number; tag: string }[];
  colonies: ColonyRow[];
}

interface CompareCell {
  value: number;
  z: number | null;
  rank: number | null;
}

interface CompareData {
  visit: { id: number; round_no: number; round_label: string; date: string; status: string };
  group: { id: number; code: string; species: string; year: number };
  metrics: { code: string; name_ko: string; unit: string | null; better: string; n: number }[];
  rows: {
    colony_id: number;
    hive_code: string;
    queen_tag: string | null;
    eligible: boolean;
    reasons: string[];
    unknown: string[];
    cells: Record<string, CompareCell>;
  }[];
  n_eligible: number;
  warnings: string[];
}

const SPECIES_LABEL: Record<string, string> = { mellifera: "양봉꿀벌", cerana: "재래꿀벌" };
const SAMPLE_LABEL: Record<string, string> = { drone_pool: "수벌 번데기", worker_pool: "일벌", queen: "교체된 여왕" };
const EVENT_LABEL: Record<string, string> = {
  honey_harvest: "채밀",
  queen_replaced: "여왕 교체",
  swarmed: "분봉",
  split: "분할",
  merged: "합봉",
  absconded: "도망",
  died: "폐사",
  treatment: "약제 처리",
};

const box: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-color)",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "16px",
};
const subTitle: React.CSSProperties = { fontSize: "14px", fontWeight: 700, color: "var(--text-main)", margin: "0 0 10px" };
const fieldLabel: React.CSSProperties = { display: "block", fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" };
const hint: React.CSSProperties = { fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" };
const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "44px",
  padding: "8px 10px",
  fontSize: "16px",
  border: "1px solid var(--border-color)",
  borderRadius: "8px",
  background: "var(--bg-app)",
  color: "var(--text-main)",
  boxSizing: "border-box",
};
const chip = (active: boolean): React.CSSProperties => ({
  minHeight: "44px",
  minWidth: "44px",
  padding: "8px 12px",
  fontSize: "15px",
  fontWeight: 600,
  borderRadius: "8px",
  border: active ? "2px solid var(--color-gold)" : "1px solid var(--border-color)",
  background: active ? "rgba(217,119,6,0.14)" : "var(--bg-app)",
  color: "var(--text-main)",
  cursor: "pointer",
});
const button = (primary = false): React.CSSProperties => ({
  ...chip(primary),
  background: primary ? "var(--color-gold)" : "var(--bg-app)",
  color: primary ? "#1f1300" : "var(--text-main)",
});

const errorText = async (res: Response) => {
  const body = await res.json().catch(() => null);
  const detail = body?.detail;
  if (Array.isArray(detail)) return detail.map((d: any) => (typeof d === "string" ? d : d.msg)).join(", ");
  return detail || "처리하지 못했습니다";
};

export default function FieldRecordPanel({ apiaries }: { apiaries: Apiary[] }) {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [visit, setVisit] = useState<VisitData | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [comparing, setComparing] = useState<GroupRow | null>(null);

  const loadGroups = useCallback(async () => {
    const res = await authFetch("/api/v2/field/groups");
    if (res.ok) setGroups(await res.json());
    else setError(await errorText(res));
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const openVisit = async (id: number) => {
    setError("");
    const res = await authFetch(`/api/v2/field/visits/${id}`);
    if (res.ok) setVisit(await res.json());
    else setError(await errorText(res));
  };

  const startVisit = async (group: GroupRow, roundNo: number) => {
    setError("");
    const now = new Date();
    const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const res = await authFetch("/api/v2/field/visits", {
      method: "POST",
      body: JSON.stringify({ group_id: group.id, round_no: roundNo, date }),
    });
    if (res.ok) openVisit((await res.json()).id);
    else setError(await errorText(res));
  };

  if (comparing) {
    return <CompareScreen group={comparing} onExit={() => setComparing(null)} />;
  }

  if (visit) {
    return (
      <VisitScreen
        visit={visit}
        reload={() => openVisit(visit.id)}
        onExit={() => {
          setVisit(null);
          loadGroups();
        }}
      />
    );
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ ...styles.sectionTitle, marginBottom: 6 }}>현장 기록</div>
      <p style={{ ...hint, marginBottom: 16 }}>2027 시범 검정군을 고르고 회차별로 봉군을 기록합니다.</p>
      {error && <p style={{ color: "var(--color-danger, #dc2626)", fontSize: 14 }}>{error}</p>}

      {groups.map((group) => (
        <div key={group.id} style={box}>
          <p style={subTitle}>
            {group.code} · {SPECIES_LABEL[group.species]} · {group.n_colonies}군
          </p>
          <p style={{ ...hint, marginBottom: 12 }}>{group.apiary}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[1, 2, 3].map((roundNo) => {
              const found = group.visits.find((v) => v.round_no === roundNo);
              return (
                <button
                  key={roundNo}
                  style={chip(found?.status === "open")}
                  onClick={() => (found ? openVisit(found.id) : startVisit(group, roundNo))}
                >
                  {roundNo}회차 {found ? (found.status === "closed" ? "마감됨" : "이어서 기록") : "시작"}
                </button>
              );
            })}
            {group.visits.length > 0 && (
              <button style={chip(false)} onClick={() => setComparing(group)}>
                비교표
              </button>
            )}
          </div>
        </div>
      ))}
      {groups.length === 0 && !creating && <p style={hint}>등록된 검정군이 없습니다.</p>}

      {creating ? (
        <GroupForm
          apiaries={apiaries}
          onDone={() => {
            setCreating(false);
            loadGroups();
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button style={button(true)} onClick={() => setCreating(true)}>
          검정군 등록
        </button>
      )}
    </div>
  );
}

function CompareScreen({ group, onExit }: { group: GroupRow; onExit: () => void }) {
  const latest = group.visits[group.visits.length - 1];
  const [visitId, setVisitId] = useState(latest.id);
  const [data, setData] = useState<CompareData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setError("");
      const res = await authFetch(`/api/v2/field/visits/${visitId}/comparison`);
      if (!active) return;
      if (res.ok) setData(await res.json());
      else setError(await errorText(res));
    })();
    return () => {
      active = false;
    };
  }, [visitId]);

  const headCell: React.CSSProperties = {
    padding: "8px",
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-main)",
    textAlign: "left",
    borderBottom: "1px solid var(--border-color)",
    minWidth: 84,
    verticalAlign: "bottom",
  };
  const bodyCell: React.CSSProperties = {
    padding: "8px",
    fontSize: 13,
    color: "var(--text-main)",
    borderBottom: "1px solid var(--border-color)",
    whiteSpace: "nowrap",
  };
  const sticky: React.CSSProperties = { position: "sticky", left: 0, background: "var(--bg-surface)", minWidth: 72 };
  const scored = data?.rows.filter((row) => row.eligible) ?? [];
  const excluded = data?.rows.filter((row) => !row.eligible) ?? [];

  const renderRow = (row: CompareData["rows"][number]) => (
    <tr key={row.colony_id}>
      <td style={{ ...bodyCell, ...sticky, fontWeight: 700 }}>
        {row.hive_code}
        <div style={{ ...hint, marginTop: 0, fontWeight: 400 }}>{row.queen_tag || "여왕 없음"}</div>
      </td>
      {data!.metrics.map((metric) => {
        const cell = row.cells[metric.code];
        if (!cell) {
          return (
            <td key={metric.code} style={{ ...bodyCell, color: "var(--text-muted)" }}>
              {row.unknown.includes(metric.code) ? "모름" : "-"}
            </td>
          );
        }
        return (
          <td key={metric.code} style={bodyCell}>
            {cell.value}
            {cell.rank != null && (
              <div style={{ ...hint, marginTop: 0 }}>
                {cell.rank}위 · z {cell.z! > 0 ? "+" : ""}
                {cell.z!.toFixed(2)}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div style={{ maxWidth: 960 }}>
      <button style={{ ...button(), marginBottom: 12 }} onClick={onExit}>
        목록으로
      </button>
      <div style={{ ...styles.sectionTitle, marginBottom: 4 }}>{group.code} 비교표</div>
      <p style={{ ...hint, marginBottom: 12 }}>이번 시즌 이 농가 안의 표현형 비교입니다. 육종가가 아니며 다른 농가와 비교할 수 없습니다.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {group.visits.map((v) => (
          <button key={v.id} style={chip(v.id === visitId)} onClick={() => setVisitId(v.id)}>
            {v.round_no}회차
          </button>
        ))}
      </div>

      {error && <p style={{ color: "var(--color-danger, #dc2626)", fontSize: 14 }}>{error}</p>}
      {data && data.visit.id === visitId && (
        <>
          <p style={{ ...hint, marginBottom: 8 }}>
            {data.visit.date} · {data.visit.round_label} · 비교 가능 {data.n_eligible}/{data.rows.length}군
          </p>
          {data.warnings.map((warning) => (
            <p key={warning} style={{ color: "var(--color-warning, #b45309)", fontSize: 14, margin: "4px 0" }}>
              {warning}
            </p>
          ))}
          <div style={{ ...box, padding: 0, overflowX: "auto", marginTop: 12 }}>
            <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ ...headCell, ...sticky }}>벌통</th>
                  {data.metrics.map((metric) => (
                    <th key={metric.code} style={headCell}>
                      {metric.name_ko}
                      <div style={{ ...hint, marginTop: 2, fontWeight: 400 }}>
                        {metric.unit ? `${metric.unit} · ` : ""}
                        {metric.better === "high" ? "높을수록 좋음" : "낮을수록 좋음"}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{scored.map(renderRow)}</tbody>
            </table>
          </div>
          <p style={hint}>z는 비교 가능 봉군 평균과의 거리입니다. 양수가 좋은 방향이고, 3군 미만이거나 값이 모두 같으면 표시하지 않습니다.</p>

          {excluded.length > 0 && (
            <div style={{ ...box, padding: 0, overflowX: "auto", marginTop: 12 }}>
              <p style={{ ...subTitle, padding: "14px 16px 0" }}>비교 제외 {excluded.length}군</p>
              <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%" }}>
                <tbody>
                  {excluded.map((row) => (
                    <tr key={row.colony_id}>
                      <td style={{ ...bodyCell, fontWeight: 700 }}>
                        {row.hive_code}
                        <div style={{ ...hint, marginTop: 0, fontWeight: 400 }}>{row.queen_tag || "여왕 없음"}</div>
                      </td>
                      <td style={{ ...bodyCell, whiteSpace: "normal", width: "100%" }}>{row.reasons.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GroupForm({ apiaries, onDone, onCancel }: { apiaries: Apiary[]; onDone: () => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [apiaryId, setApiaryId] = useState<number | "">("");
  const [species, setSpecies] = useState("mellifera");
  const [year, setYear] = useState(2027);
  const [hives, setHives] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  const apiary = apiaries.find((a) => a.id === apiaryId);

  const submit = async () => {
    const selected = Object.entries(hives).filter(([, value]) => value.trim());
    if (!code.trim() || !apiary || selected.length === 0) {
      setError("코드, 양봉장, 벌통 ID를 입력하세요");
      return;
    }
    const res = await authFetch("/api/v2/field/groups", {
      method: "POST",
      body: JSON.stringify({
        code: code.trim(),
        apiary_id: apiary.id,
        species,
        year,
        hives: selected.map(([colonyId, hive]) => ({ colony_id: Number(colonyId), hive_code: hive.trim() })),
      }),
    });
    if (res.ok) onDone();
    else setError(await errorText(res));
  };

  return (
    <div style={box}>
      <p style={subTitle}>검정군 등록</p>
      <div style={{ display: "grid", gap: 12 }}>
        <label>
          <span style={fieldLabel}>검정군 코드</span>
          <input style={inputStyle} value={code} onChange={(e) => setCode(e.target.value)} placeholder="AM-01-2027" />
        </label>
        <label>
          <span style={fieldLabel}>양봉장</span>
          <select
            style={inputStyle}
            value={apiaryId}
            onChange={(e) => {
              setApiaryId(e.target.value ? Number(e.target.value) : "");
              setHives({});
            }}
          >
            <option value="">선택</option>
            {apiaries.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span style={fieldLabel}>종</span>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.entries(SPECIES_LABEL).map(([key, label]) => (
              <button key={key} style={chip(species === key)} onClick={() => setSpecies(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <label>
          <span style={fieldLabel}>연도</span>
          <input style={inputStyle} type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
        {apiary && (
          <div>
            <span style={fieldLabel}>벌통 ID</span>
            <p style={hint}>기록할 봉군에만 벌통에 붙인 ID를 입력합니다. 약세군도 포함하세요.</p>
            {apiary.colonies.map((colony) => (
              <div key={colony.id} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <span style={{ flex: 1, fontSize: 14, color: "var(--text-main)" }}>{colony.code}</span>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  aria-label={`${colony.code} 벌통 ID`}
                  value={hives[colony.id] || ""}
                  onChange={(e) => setHives({ ...hives, [colony.id]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
        {error && <p style={{ color: "var(--color-danger, #dc2626)", fontSize: 14 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button style={button(true)} onClick={submit}>
            저장
          </button>
          <button style={button()} onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

function VisitScreen({ visit, reload, onExit }: { visit: VisitData; reload: () => void; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<RecordData>(visit.colonies[0]?.record);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [incomplete, setIncomplete] = useState<{ hive_code: string; missing: string[] }[]>([]);

  const colony = visit.colonies[index];
  const closed = visit.status !== "open";

  useEffect(() => {
    setDraft(visit.colonies[index]?.record);
  }, [index, visit]);

  if (!colony) {
    return (
      <div style={box}>
        <p style={hint}>이 검정군에 봉군이 없습니다.</p>
        <button style={button()} onClick={onExit}>
          목록으로
        </button>
      </div>
    );
  }

  const setValue = (code: string, value: number | null) => {
    const values = { ...draft.values };
    if (value == null) delete values[code];
    else values[code] = value;
    setDraft({ ...draft, values, unknown: draft.unknown.filter((c) => c !== code) });
  };

  const toggleUnknown = (code: string) => {
    const values = { ...draft.values };
    delete values[code];
    const unknown = draft.unknown.includes(code) ? draft.unknown.filter((c) => c !== code) : [...draft.unknown, code];
    setDraft({ ...draft, values, unknown });
  };

  const save = async (next?: number) => {
    setError("");
    setMessages([]);
    const res = await authFetch(`/api/v2/field/visits/${visit.id}/records/${colony.colony_id}`, {
      method: "PUT",
      body: JSON.stringify({
        queen_status: draft.queen_status,
        boxes: draft.boxes,
        supers: draft.supers,
        drone_brood: draft.drone_brood,
        notes: draft.notes,
        values: draft.values,
        unknown: draft.unknown,
      }),
    });
    if (!res.ok) {
      setError(await errorText(res));
      return;
    }
    const body = await res.json();
    setMessages(body.warnings);
    await reload();
    if (next != null) setIndex(next);
  };

  const close = async (force: boolean) => {
    setError("");
    const res = await authFetch(`/api/v2/field/visits/${visit.id}/close${force ? "?force=true" : ""}`, { method: "POST" });
    if (!res.ok) {
      setError(await errorText(res));
      return;
    }
    const body = await res.json();
    setIncomplete(body.incomplete);
    if (body.closed) onExit();
  };

  const done = visit.colonies.filter((c) => c.missing.length === 0).length;

  return (
    <div style={{ maxWidth: 760 }}>
      <button style={{ ...button(), marginBottom: 12 }} onClick={onExit}>
        목록으로
      </button>
      <div style={{ ...styles.sectionTitle, marginBottom: 4 }}>
        {visit.group.code} · {visit.round_no}회차
      </div>
      <p style={{ ...hint, marginBottom: 12 }}>
        {visit.date} · {visit.round_label} · 완료 {done}/{visit.colonies.length}
        {closed ? " · 마감됨" : ""}
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {visit.colonies.map((c, i) => (
          <button
            key={c.colony_id}
            style={{ ...chip(i === index), color: c.missing.length ? "var(--text-main)" : "var(--color-success, #16a34a)" }}
            aria-label={`${c.hive_code} ${c.missing.length ? "미완료" : "완료"}`}
            onClick={() => setIndex(i)}
          >
            {c.hive_code}
            {c.missing.length ? "" : " ✓"}
          </button>
        ))}
      </div>

      <QueenPanel key={colony.colony_id} visit={visit} colony={colony} closed={closed} onSaved={reload} />

      <div style={box}>
        <p style={subTitle}>
          벌통 {colony.hive_code} · 여왕 {colony.queen_tag || "미연결"}
        </p>
        {colony.missing.length > 0 && colony.record.saved && (
          <p style={hint}>남은 항목: {colony.missing.join(", ")}</p>
        )}

        <fieldset disabled={closed} style={{ border: 0, padding: 0, margin: 0 }}>
          <div style={{ marginTop: 14 }}>
            <span style={fieldLabel}>여왕 상태 *</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(visit.queen_status).map(([code, label]) => (
                <button key={code} style={chip(draft.queen_status === code)} onClick={() => setDraft({ ...draft, queen_status: code })}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
            <label style={{ flex: 1 }}>
              <span style={fieldLabel}>상자 수 *</span>
              <input
                style={inputStyle}
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.boxes ?? ""}
                onChange={(e) => setDraft({ ...draft, boxes: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </label>
            <label style={{ flex: 1 }}>
              <span style={fieldLabel}>계상 수</span>
              <input
                style={inputStyle}
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.supers ?? ""}
                onChange={(e) => setDraft({ ...draft, supers: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </label>
          </div>

          {visit.fields.map((field) => (
            <TraitInput
              key={field.code}
              field={field}
              value={draft.values[field.code] ?? null}
              unknown={draft.unknown.includes(field.code)}
              onChange={(value) => setValue(field.code, value)}
              onUnknown={() => toggleUnknown(field.code)}
            />
          ))}

          <div style={{ marginTop: 14 }}>
            <span style={fieldLabel}>수벌 봉아</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={chip(draft.drone_brood === true)} onClick={() => setDraft({ ...draft, drone_brood: true })}>
                있음
              </button>
              <button style={chip(draft.drone_brood === false)} onClick={() => setDraft({ ...draft, drone_brood: false })}>
                없음
              </button>
            </div>
          </div>

          <label style={{ display: "block", marginTop: 14 }}>
            <span style={fieldLabel}>메모</span>
            <input
              style={inputStyle}
              value={draft.notes || ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
        </fieldset>

        {error && <p style={{ color: "var(--color-danger, #dc2626)", fontSize: 14, marginTop: 12 }}>{error}</p>}
        {messages.map((message) => (
          <p key={message} style={{ color: "var(--color-warning, #b45309)", fontSize: 14, marginTop: 8 }}>
            {message}
          </p>
        ))}

        {!closed && (
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button style={button(true)} onClick={() => save(Math.min(index + 1, visit.colonies.length - 1))}>
              저장하고 다음 봉군
            </button>
            <button style={button()} onClick={() => save()}>
              저장
            </button>
          </div>
        )}
      </div>

      {!closed && <SampleForm visitId={visit.id} colony={colony} onSaved={reload} />}
      {!closed && <EventForm colony={colony} visitDate={visit.date} />}

      {!closed && (
        <div style={box}>
          <p style={subTitle}>방문 마감</p>
          {incomplete.length > 0 && (
            <>
              <p style={{ fontSize: 14, color: "var(--text-main)" }}>미완료 봉군이 {incomplete.length}개 있습니다.</p>
              <ul style={{ fontSize: 13, color: "var(--text-muted)", paddingLeft: 18 }}>
                {incomplete.map((row) => (
                  <li key={row.hive_code}>
                    {row.hive_code}: {row.missing.join(", ")}
                  </li>
                ))}
              </ul>
            </>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={button()} onClick={() => close(false)}>
              누락 확인 후 마감
            </button>
            {incomplete.length > 0 && (
              <button style={button()} onClick={() => close(true)}>
                누락을 두고 마감
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QueenPanel({ visit, colony, closed, onSaved }: { visit: VisitData; colony: ColonyRow; closed: boolean; onSaved: () => void }) {
  const queen = colony.queen;
  const [mode, setMode] = useState<"view" | "edit" | "replace">(queen ? "view" : "edit");
  const editing = mode === "edit" && queen;
  const [tag, setTag] = useState(editing ? queen.tag : "");
  const [birthYear, setBirthYear] = useState(editing && queen.birth_year ? String(queen.birth_year) : "");
  const [motherId, setMotherId] = useState(editing && queen.mother_queen_id ? String(queen.mother_queen_id) : "");
  const [introduced, setIntroduced] = useState(editing ? queen.introduced_date || "" : "");
  const [origin, setOrigin] = useState(editing ? queen.origin || "" : "");
  const [method, setMethod] = useState(editing ? queen.mating_method || "" : "");
  const [sireId, setSireId] = useState(editing && queen.sire_queen_id ? String(queen.sire_queen_id) : "");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  const startMode = (next: "edit" | "replace") => {
    const keep = next === "edit" && queen;
    setTag(keep ? queen.tag : "");
    setBirthYear(keep && queen.birth_year ? String(queen.birth_year) : "");
    setMotherId(keep && queen.mother_queen_id ? String(queen.mother_queen_id) : "");
    setIntroduced(keep ? queen.introduced_date || "" : "");
    setOrigin(keep ? queen.origin || "" : "");
    setMethod(keep ? queen.mating_method || "" : "");
    setSireId(keep && queen.sire_queen_id ? String(queen.sire_queen_id) : "");
    setError("");
    setMode(next);
  };

  const submit = async () => {
    setError("");
    setMessages([]);
    if (!tag.trim()) {
      setError("여왕 ID를 입력하세요");
      return;
    }
    const payload = {
      tag: tag.trim(),
      birth_year: birthYear ? Number(birthYear) : null,
      mother_queen_id: motherId ? Number(motherId) : null,
      introduced_date: introduced || null,
      origin: origin || null,
      mating_method: method || null,
      sire_queen_id: sireId ? Number(sireId) : null,
    };
    const res =
      mode === "edit" && queen
        ? await authFetch(`/api/v2/field/queens/${queen.id}?colony_id=${colony.colony_id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await authFetch(`/api/v2/field/colonies/${colony.colony_id}/queen`, {
            method: "POST",
            body: JSON.stringify({ ...payload, replace: mode === "replace" }),
          });
    if (!res.ok) {
      setError(await errorText(res));
      return;
    }
    const body = await res.json();
    setMessages(body.warnings);
    setMode("view");
    onSaved();
  };

  const notices = messages.map((message) => (
    <p key={message} style={{ color: "var(--color-warning, #b45309)", fontSize: 14, marginTop: 8 }}>
      {message}
    </p>
  ));

  if (mode === "view" && queen) {
    return (
      <div style={box}>
        <p style={subTitle}>여왕 {queen.tag}</p>
        <p style={hint}>
          출생 {queen.birth_year ?? "모름"} · 어미 {queen.mother_tag || "모름"} · 도입 {queen.introduced_date || "모름"} · {queen.origin || "출처 모름"}
        </p>
        <p style={hint}>
          교미 {queen.mating_method ? visit.mating_methods[queen.mating_method] : "기록 없음"} · 수벌군 {queen.sire_tag || "모름"}
        </p>
        {notices}
        {!closed && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button style={button()} onClick={() => startMode("edit")}>
              정보 수정
            </button>
            <button style={button()} onClick={() => startMode("replace")}>
              여왕 교체
            </button>
          </div>
        )}
      </div>
    );
  }
  if (closed) {
    return (
      <div style={box}>
        <p style={hint}>등록된 여왕이 없습니다.</p>
      </div>
    );
  }

  const options = visit.queen_options.filter((q) => q.id !== queen?.id || mode === "replace");

  return (
    <div style={box}>
      <p style={subTitle}>{mode === "replace" ? "여왕 교체" : queen ? "여왕 정보 수정" : "여왕 등록"}</p>
      <div style={{ display: "grid", gap: 12 }}>
        <label>
          <span style={fieldLabel}>여왕 ID *</span>
          <input style={inputStyle} value={tag} onChange={(e) => setTag(e.target.value)} placeholder="AM-01-Q03" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label>
            <span style={fieldLabel}>출생연도</span>
            <input style={inputStyle} type="number" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
          </label>
          <label>
            <span style={fieldLabel}>도입일{mode === "replace" ? " *" : ""}</span>
            <input style={inputStyle} type="date" value={introduced} onChange={(e) => setIntroduced(e.target.value)} />
          </label>
        </div>
        <label>
          <span style={fieldLabel}>어미 여왕</span>
          <select style={inputStyle} value={motherId} onChange={(e) => setMotherId(e.target.value)}>
            <option value="">모름</option>
            {options.map((q) => (
              <option key={q.id} value={q.id}>
                {q.tag}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span style={fieldLabel}>출처</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {visit.queen_origins.map((value) => (
              <button key={value} style={chip(origin === value)} onClick={() => setOrigin(origin === value ? "" : value)}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span style={fieldLabel}>교미 방식</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(visit.mating_methods).map(([key, label]) => (
              <button key={key} style={chip(method === key)} onClick={() => setMethod(method === key ? "" : key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {method && (
          <label>
            <span style={fieldLabel}>수벌군 여왕</span>
            <select style={inputStyle} value={sireId} onChange={(e) => setSireId(e.target.value)}>
              <option value="">모름</option>
              {options.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.tag}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && <p style={{ color: "var(--color-danger, #dc2626)", fontSize: 14 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button style={button(true)} onClick={submit}>
            저장
          </button>
          {queen && (
            <button style={button()} onClick={() => setMode("view")}>
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TraitInput({
  field,
  value,
  unknown,
  onChange,
  onUnknown,
}: {
  field: FieldDef;
  value: number | null;
  unknown: boolean;
  onChange: (value: number | null) => void;
  onUnknown: () => void;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <span style={fieldLabel}>
        {field.name_ko}
        {field.required ? " *" : ""}
        {field.unit && field.scale !== "ordinal" ? ` (${field.unit})` : ""}
      </span>
      {field.scale === "ordinal" ? (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5].map((score) => (
              <button key={score} style={chip(value === score)} onClick={() => onChange(value === score ? null : score)}>
                {score}
              </button>
            ))}
            <button style={chip(unknown)} onClick={onUnknown}>
              모름
            </button>
          </div>
          {value != null && field.anchors && <p style={hint}>{field.anchors[String(value)]}</p>}
        </>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            type="number"
            inputMode="decimal"
            min={field.min}
            max={field.max}
            step={field.step}
            aria-label={field.name_ko}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          />
          <button style={chip(unknown)} onClick={onUnknown}>
            모름
          </button>
        </div>
      )}
      {field.protocol && <p style={hint}>{field.protocol}</p>}
    </div>
  );
}

function SampleForm({ visitId, colony, onSaved }: { visitId: number; colony: ColonyRow; onSaved: () => void }) {
  const [code, setCode] = useState("");
  const [sampleType, setSampleType] = useState("drone_pool");
  const [count, setCount] = useState("10");
  const [storage, setStorage] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!code.trim()) {
      setMessage("튜브 번호를 입력하세요");
      return;
    }
    const res = await authFetch(`/api/v2/field/visits/${visitId}/samples`, {
      method: "POST",
      body: JSON.stringify({
        colony_id: colony.colony_id,
        code: code.trim(),
        sample_type: sampleType,
        n_individuals: count ? Number(count) : null,
        storage: storage || null,
      }),
    });
    if (!res.ok) {
      setMessage(await errorText(res));
      return;
    }
    const body = await res.json();
    setCode("");
    setMessage(body.warnings.join(" ") || "시료를 등록했습니다");
    onSaved();
  };

  return (
    <div style={box}>
      <p style={subTitle}>시료</p>
      {colony.samples.map((sample) => (
        <p key={sample.code} style={hint}>
          {sample.code} · {SAMPLE_LABEL[sample.sample_type] || sample.sample_type} · {sample.n_individuals ?? "-"}마리 · {sample.storage || "보관 위치 없음"}
        </p>
      ))}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
        {Object.entries(SAMPLE_LABEL).map(([key, label]) => (
          <button key={key} style={chip(sampleType === key)} onClick={() => setSampleType(key)}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input style={inputStyle} placeholder="튜브 번호" value={code} onChange={(e) => setCode(e.target.value)} />
        <input style={inputStyle} type="number" inputMode="numeric" aria-label="마리 수" value={count} onChange={(e) => setCount(e.target.value)} />
        <input style={{ ...inputStyle, gridColumn: "1 / -1" }} placeholder="보관 위치" value={storage} onChange={(e) => setStorage(e.target.value)} />
      </div>
      {message && <p style={{ fontSize: 14, color: "var(--text-main)", marginTop: 8 }}>{message}</p>}
      {!colony.queen && <p style={hint}>여왕을 먼저 등록해야 시료를 저장할 수 있습니다.</p>}
      <button style={{ ...button(), marginTop: 10 }} disabled={!colony.queen} onClick={submit}>
        시료 등록
      </button>
    </div>
  );
}

function EventForm({ colony, visitDate }: { colony: ColonyRow; visitDate: string }) {
  const [eventType, setEventType] = useState("honey_harvest");
  const [date, setDate] = useState(visitDate);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    const res = await authFetch("/api/v2/field/events", {
      method: "POST",
      body: JSON.stringify({
        colony_id: colony.colony_id,
        event_type: eventType,
        date,
        value: value === "" ? null : Number(value),
        notes: notes || null,
      }),
    });
    if (!res.ok) {
      setMessage(await errorText(res));
      return;
    }
    const body = await res.json();
    setValue("");
    setNotes("");
    setMessage(body.warnings.join(" ") || "사건을 기록했습니다");
  };

  return (
    <div style={box}>
      <p style={subTitle}>사건 기록</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {Object.entries(EVENT_LABEL).map(([key, label]) => (
          <button key={key} style={chip(eventType === key)} onClick={() => setEventType(key)}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input style={inputStyle} type="date" aria-label="사건 날짜" value={date} onChange={(e) => setDate(e.target.value)} />
        {eventType === "honey_harvest" && (
          <input style={inputStyle} type="number" inputMode="decimal" placeholder="채밀량 kg, 수확 없으면 0" value={value} onChange={(e) => setValue(e.target.value)} />
        )}
        <input style={{ ...inputStyle, gridColumn: "1 / -1" }} placeholder="메모" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {message && <p style={{ fontSize: 14, color: "var(--text-main)", marginTop: 8 }}>{message}</p>}
      <button style={{ ...button(), marginTop: 10 }} onClick={submit}>
        사건 기록
      </button>
    </div>
  );
}

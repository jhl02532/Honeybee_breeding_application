import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { styles } from "../styles";
import { Apiary, Colony } from "../types";
import { authFetch } from "../utils";

interface ColonyPanelProps {
  apiaries: Apiary[];
  selectedApiary: Apiary | null;
  onSelectApiary: (a: Apiary | null) => void;
  onSelectColony: (c: Colony) => void;
  onRefresh: () => void;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
}

export default function ColonyPanel({
  apiaries,
  selectedApiary,
  onSelectApiary,
  onSelectColony,
  onRefresh,
  showModal,
  setShowModal,
}: ColonyPanelProps) {
  const router = useRouter();
  const [form, setForm] = useState({ code: "", apiary_id: "", status: "Active", queen_tag: "", mother_colony_id: "" });
  const [busy, setBusy] = useState(false);

  const colonies = selectedApiary
    ? selectedApiary.colonies
    : apiaries.flatMap((a) => a.colonies);

  const allColoniesForLineage = apiaries.flatMap((a) => a.colonies);

  const createColony = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authFetch("/api/v1/colonies", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          apiary_id: parseInt(form.apiary_id),
          status: form.status,
          queen_tag: form.queen_tag || "Unknown",
          mother_colony_id: form.mother_colony_id ? parseInt(form.mother_colony_id) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        let errorMsg = "생성 실패";
        if (d && d.detail) {
          if (typeof d.detail === "string") {
            errorMsg = d.detail;
          } else if (Array.isArray(d.detail)) {
            errorMsg = d.detail.map((err: any) => `${err.loc?.join(".") || "error"}: ${err.msg}`).join("\n");
          } else if (typeof d.detail === "object") {
            errorMsg = JSON.stringify(d.detail);
          }
        }
        alert(errorMsg);
        return;
      }
      setShowModal(false);
      setForm({ code: "", apiary_id: "", status: "Active", queen_tag: "", mother_colony_id: "" });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "생성 실패");
    } finally {
      setBusy(false);
    }
  };

  const deleteColony = async (id: number) => {
    if (!confirm("이 봉군과 하위 기록을 모두 삭제하시겠습니까?")) return;
    try {
      await authFetch(`/api/v1/colonies/${id}`, { method: "DELETE" });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "삭제 실패");
    }
  };

  const statusColor = (s: string) => {
    if (s === "Active") return "#4ade80";
    if (s === "Weak") return "#fb923c";
    return "#f87171";
  };

  return (
    <div className="animate-fade">
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.sectionTitle}>
            🐝 봉군 목록
            {selectedApiary && (
              <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: "14px", marginLeft: "12px" }}>
                {selectedApiary.name}
                <button
                  style={styles.clearFilter}
                  onClick={() => onSelectApiary(null)}
                >
                  ✕ 필터해제
                </button>
              </span>
            )}
          </h2>
        </div>
        <button
          id="btn-add-colony"
          style={styles.primaryBtn}
          onClick={() => {
            if (selectedApiary) {
              localStorage.setItem("melitta_last_apiary_id", String(selectedApiary.id));
            }
            router.push("/dashboard/colony/new");
          }}
        >
          + 봉군 추가
        </button>
      </div>

      {colonies.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🐝</div>
          <p>봉군을 추가하여 형질 기록을 시작하세요</p>
        </div>
      ) : (
        <div style={styles.cardGrid}>
          {colonies.map((c) => (
            <div key={c.id} style={styles.colonyCard} className="animate-slide">
              <div style={styles.colonyHeader}>
                <div style={{ ...styles.statusDot, background: statusColor(c.status) }} />
                <h3 style={styles.colonyCode}>{c.code}</h3>
                <span style={{ ...styles.statusBadge, background: `${statusColor(c.status)}22`, color: statusColor(c.status) }}>
                  {c.status}
                </span>
              </div>
              <div style={styles.colonyMeta}>
                <div>👑 여왕벌: {c.queen_tag}</div>
                {c.mother_colony_id && (
                  <div>🧬 모계 벌통: {allColoniesForLineage.find((parent) => parent.id === c.mother_colony_id)?.code || "연결됨"}</div>
                )}
                <div>📋 기록: {c.records?.length || 0}건</div>
              </div>
              <div style={styles.apiaryActions}>
                <button
                  style={styles.cardBtnPrimary}
                  onClick={() => onSelectColony(c)}
                >
                  기록 보기 →
                </button>
                <button
                  style={styles.cardBtnDanger}
                  onClick={() => deleteColony(c.id)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

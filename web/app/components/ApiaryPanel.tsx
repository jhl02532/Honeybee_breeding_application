import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { styles } from "../styles";
import { Apiary } from "../types";
import { authFetch } from "../utils";

interface ApiaryPanelProps {
  apiaries: Apiary[];
  onRefresh: () => void;
  onSelectApiary: (a: Apiary) => void;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  farmers: any[];
  selectedFarmerId: string;
  onFarmerChange: (id: string) => void;
  userRole: string;
}

export default function ApiaryPanel({
  apiaries,
  onRefresh,
  onSelectApiary,
  showModal,
  setShowModal,
  farmers,
  selectedFarmerId,
  onFarmerChange,
  userRole,
}: ApiaryPanelProps) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", owner: "", location: "", latitude: "", longitude: "", owner_id: "" });
  const [busy, setBusy] = useState(false);

  const createApiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authFetch("/api/v1/apiaries", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          owner: form.owner || null,
          location: form.location || null,
          latitude: form.latitude ? parseFloat(form.latitude) : null,
          longitude: form.longitude ? parseFloat(form.longitude) : null,
          owner_id: (userRole === "researcher" || userRole === "admin") && form.owner_id ? parseInt(form.owner_id) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.detail || "생성 실패");
        return;
      }
      setShowModal(false);
      setForm({ name: "", owner: "", location: "", latitude: "", longitude: "", owner_id: "" });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "생성 실패");
    } finally {
      setBusy(false);
    }
  };

  const deleteApiary = async (id: number) => {
    if (!confirm("이 양봉장과 하위 봉군/기록을 모두 삭제하시겠습니까?")) return;
    try {
      await authFetch(`/api/v1/apiaries/${id}`, { method: "DELETE" });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "삭제 실패");
    }
  };

  return (
    <div className="animate-fade">
      <div style={styles.panelHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h2 style={styles.sectionTitle}>🏡 양봉장 목록</h2>
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
        <button
          id="btn-add-apiary"
          style={styles.primaryBtn}
          onClick={() => router.push("/dashboard/apiary/new")}
        >
          + 양봉장 추가
        </button>
      </div>

      {apiaries.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏡</div>
          <p>양봉장을 추가하여 봉군 관리를 시작하세요</p>
          <button style={styles.primaryBtn} onClick={() => router.push("/dashboard/apiary/new")}>
            첫 양봉장 추가하기
          </button>
        </div>
      ) : (
        <div style={styles.cardGrid}>
          {apiaries.map((a) => (
            <div key={a.id} style={styles.apiaryCard} className="animate-slide">
              <div style={styles.apiaryCardHeader}>
                <span style={{ fontSize: "24px" }}>🏡</span>
                <h3 style={styles.apiaryName}>{a.name}</h3>
              </div>
              <div style={styles.apiaryMeta}>
                <div>📍 {a.location || "위치 미등록"}</div>
                <div>🐝 봉군 {a.colonies.length}개</div>
                {a.owner && <div>👤 {a.owner}</div>}
              </div>
              <div style={styles.apiaryActions}>
                <button
                  style={styles.cardBtnPrimary}
                  onClick={() => onSelectApiary(a)}
                >
                  봉군 관리 →
                </button>
                <button
                  style={styles.cardBtnDanger}
                  onClick={() => deleteApiary(a.id)}
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

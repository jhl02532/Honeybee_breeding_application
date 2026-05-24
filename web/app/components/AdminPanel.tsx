import React, { useState, useEffect, useCallback } from "react";
import { styles } from "../styles";
import { authFetch } from "../utils";

interface AdminStats {
  total_users: number;
  farmers_count: number;
  researchers_count: number;
  admins_count: number;
  total_apiaries: number;
  total_colonies: number;
  total_trait_records: number;
  total_morph_records: number;
  active_colonies: number;
  weak_colonies: number;
  dead_colonies: number;
  avg_honey: number;
  avg_propolis: number;
  avg_royal_jelly: number;
  avg_survival_rate: number;
}

interface AdminUser {
  id: number;
  username: string;
  farm_name: string;
  role: string;
  apiaries_count: number;
  colonies_count: number;
}

interface AdminApiary {
  id: number;
  name: string;
  owner: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  owner_id: number;
}

interface AdminColony {
  id: number;
  code: string;
  apiary_name: string;
  owner: string;
  status: string;
  queen_tag: string;
  mother_colony_id: number | null;
}

interface AdminTrait {
  id: number;
  colony_code: string;
  owner: string;
  date: string;
  honey_production: number;
  propolis_production: number;
  royal_jelly_production: number;
  temperament: number;
  virus_resistance: number;
  mite_resistance: number;
  swarming_rate: number;
  overwintering_survival: number;
  vsh_rate: number;
  hygienic_rate: number;
  notes: string | null;
}

interface AdminMorphological {
  id: number;
  queen_tag: string;
  colony_code: string;
  date: string;
  cubital_index: number | null;
  proboscis_length: number | null;
  tergite_color: string | null;
  basitarsus_length: number | null;
  basitarsus_width: number | null;
  researcher_notes: string | null;
}

type AdminTab = "stats" | "users" | "data";
type DataSubTab = "apiaries" | "colonies" | "traits" | "morphological";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("stats");
  const [dataSubTab, setDataSubTab] = useState<DataSubTab>("apiaries");
  
  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [apiaries, setApiaries] = useState<AdminApiary[]>([]);
  const [colonies, setColonies] = useState<AdminColony[]>([]);
  const [traits, setTraits] = useState<AdminTrait[]>([]);
  const [morphs, setMorphs] = useState<AdminMorphological[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/admin/users");
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      const [apiRes, colRes, traitRes, morphRes] = await Promise.all([
        authFetch("/api/v1/admin/apiaries"),
        authFetch("/api/v1/admin/colonies"),
        authFetch("/api/v1/admin/traits"),
        authFetch("/api/v1/admin/morphological")
      ]);
      if (apiRes.ok) setApiaries(await apiRes.json());
      if (colRes.ok) setColonies(await colRes.json());
      if (traitRes.ok) setTraits(await traitRes.json());
      if (morphRes.ok) setMorphs(await morphRes.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchAllData()]);
    setRefreshing(false);
    setLoading(false);
  }, [fetchStats, fetchUsers, fetchAllData]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Actions
  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await authFetch(`/api/v1/admin/users/${userId}/role?role=${newRole}`, {
        method: "PUT"
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "권한 변경 실패");
        return;
      }
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      alert(err.message || "오류 발생");
    }
  };

  const handleUserDelete = async (userId: number, username: string) => {
    if (!confirm(`⚠️ 경고: [${username}] 회원을 강제 탈퇴시키겠습니까?\n이 회원이 등록한 모든 봉장, 벌통, 내검 기록 등의 다중 테넌트 데이터가 완벽히 파쇄 연쇄 삭제됩니다.`)) return;
    try {
      const res = await authFetch(`/api/v1/admin/users/${userId}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "계정 삭제 실패");
        return;
      }
      refreshAll();
    } catch (err: any) {
      alert(err.message || "오류 발생");
    }
  };

  const handleDataDelete = async (type: DataSubTab, id: number) => {
    let confirmMsg = "";
    if (type === "apiaries") confirmMsg = "이 양봉장과 그 아래의 모든 벌통 및 기록을 강제 삭제하시겠습니까?";
    if (type === "colonies") confirmMsg = "이 벌통과 그 하위 형질기록을 강제 삭제하시겠습니까?";
    if (type === "traits") confirmMsg = "선택한 내검 행동 형질 기록을 강제 삭제하시겠습니까?";
    if (type === "morphological") confirmMsg = "선택한 연구실 현미경 형태 측정 기록을 강제 삭제하시겠습니까?";
    
    if (!confirm(confirmMsg)) return;

    try {
      const endpoint = `/api/v1/admin/${type}/${id}`;
      const res = await authFetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "데이터 삭제 실패");
        return;
      }
      refreshAll();
    } catch (err: any) {
      alert(err.message || "오류 발생");
    }
  };

  if (loading) return <div style={styles.emptyState}>로딩 중...</div>;

  return (
    <div className="animate-fade">
      {/* Admin Action Header */}
      <div style={{ ...styles.panelHeader, marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>⚙️</span>
          <div>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>SaaS 시스템 관리자 마스터 콘솔</h2>
            <p style={{ ...styles.pageSubtitle, margin: 0, fontSize: "12px", color: "#fbbf24" }}>
              전체 다중 테넌트의 통합 통계 모니터링, 회원 권한 제어 및 데이터 영구 정화용 제어반
            </p>
          </div>
        </div>
        <button
          onClick={refreshAll}
          style={{
            ...styles.primaryBtn,
            background: refreshing ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #d97706, #b45309)",
            color: "#ffffff"
          }}
          disabled={refreshing}
        >
          {refreshing ? "🔄 데이터 갱신 중..." : "🔄 데이터 전수 새로고침"}
        </button>
      </div>

      {/* Primary tab bar */}
      <div style={{ ...styles.tabContainer, marginBottom: "24px", maxWidth: "480px" }}>
        <button
          style={{ ...styles.tab, ...(activeTab === "stats" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("stats")}
        >
          📊 개요 및 실시간 지표
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === "users" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("users")}
        >
          👥 가입 회원 관리 ({users.length}명)
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === "data" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("data")}
        >
          🧹 데이터 통합 마스터 관리
        </button>
      </div>

      {/* ───────────────── TAB 1: OVERVIEW & STATS ───────────────── */}
      {activeTab === "stats" && (
        <div className="animate-fade">
          <div style={styles.kpiGrid}>
            <div style={{ ...styles.kpiCard, borderLeft: "4px solid #fbbf24" }}>
              <div style={{ ...styles.kpiIcon, background: "rgba(251,191,36,0.12)" }}>👥</div>
              <div style={{ ...styles.kpiValue, color: "#fbbf24" }}>{stats?.total_users}</div>
              <div style={styles.kpiLabel}>가입 총 계정 수</div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                농가: {stats?.farmers_count} | 연구원: {stats?.researchers_count} | 관리자: {stats?.admins_count}
              </div>
            </div>
            <div style={{ ...styles.kpiCard, borderLeft: "4px solid #60a5fa" }}>
              <div style={{ ...styles.kpiIcon, background: "rgba(96,165,250,0.12)" }}>🏡</div>
              <div style={{ ...styles.kpiValue, color: "#60a5fa" }}>{stats?.total_apiaries}</div>
              <div style={styles.kpiLabel}>플랫폼 전체 양봉장</div>
            </div>
            <div style={{ ...styles.kpiCard, borderLeft: "4px solid #34d399" }}>
              <div style={{ ...styles.kpiIcon, background: "rgba(52,211,153,0.12)" }}>🐝</div>
              <div style={{ ...styles.kpiValue, color: "#34d399" }}>{stats?.total_colonies}</div>
              <div style={styles.kpiLabel}>총 봉군 (여왕벌 태그)</div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                활성: {stats?.active_colonies} | 약군: {stats?.weak_colonies} | 폐사: {stats?.dead_colonies}
              </div>
            </div>
            <div style={{ ...styles.kpiCard, borderLeft: "4px solid #a78bfa" }}>
              <div style={{ ...styles.kpiIcon, background: "rgba(167,139,250,0.12)" }}>📋</div>
              <div style={{ ...styles.kpiValue, color: "#a78bfa" }}>
                {(stats?.total_trait_records || 0) + (stats?.total_morph_records || 0)}
              </div>
              <div style={styles.kpiLabel}>수집된 전체 메트릭 수</div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                행동형질: {stats?.total_trait_records} | 형태학: {stats?.total_morph_records}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginTop: "24px" }}>
            {/* National average performance */}
            <div style={{
              background: "rgba(31,41,55,0.4)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "20px"
            }}>
              <h3 style={{ fontSize: "15px", fontWeight: "bold", color: "#fbbf24", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                🍯 전국 육종 봉군 평균 성능 지표
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#9ca3af" }}>평균 꿀 생산량</span>
                  <span style={{ fontWeight: "bold", color: "#fff" }}>{stats?.avg_honey} Kg</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#9ca3af" }}>평균 프로폴리스 생산량</span>
                  <span style={{ fontWeight: "bold", color: "#fff" }}>{stats?.avg_propolis} g</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#9ca3af" }}>평균 로얄젤리 생산량</span>
                  <span style={{ fontWeight: "bold", color: "#fff" }}>{stats?.avg_royal_jelly} g</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#9ca3af" }}>평균 월동 생존율</span>
                  <span style={{ fontWeight: "bold", color: "#34d399" }}>{stats?.avg_survival_rate} %</span>
                </div>
              </div>
            </div>

            {/* Platform Health status card */}
            <div style={{
              background: "rgba(31,41,55,0.4)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "20px"
            }}>
              <h3 style={{ fontSize: "15px", fontWeight: "bold", color: "#34d399", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                🌡️ 봉군 건강도 및 세력 현황
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#34d399" }}>정상 봉군 (Active)</span>
                    <span>{stats?.active_colonies}군 ({stats?.total_colonies ? Math.round((stats.active_colonies / stats.total_colonies) * 100) : 0}%)</span>
                  </div>
                  <div style={{ height: "6px", width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                    <div style={{ height: "100%", borderRadius: "3px", background: "#34d399", width: `${stats?.total_colonies ? (stats.active_colonies / stats.total_colonies) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#fbbf24" }}>약군 상태 (Weak)</span>
                    <span>{stats?.weak_colonies}군 ({stats?.total_colonies ? Math.round((stats.weak_colonies / stats.total_colonies) * 100) : 0}%)</span>
                  </div>
                  <div style={{ height: "6px", width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                    <div style={{ height: "100%", borderRadius: "3px", background: "#fbbf24", width: `${stats?.total_colonies ? (stats.weak_colonies / stats.total_colonies) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#ef4444" }}>폐사 봉군 (Dead)</span>
                    <span>{stats?.dead_colonies}군 ({stats?.total_colonies ? Math.round((stats.dead_colonies / stats.total_colonies) * 100) : 0}%)</span>
                  </div>
                  <div style={{ height: "6px", width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                    <div style={{ height: "100%", borderRadius: "3px", background: "#ef4444", width: `${stats?.total_colonies ? (stats.dead_colonies / stats.total_colonies) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────── TAB 2: MEMBER MANAGEMENT ───────────────── */}
      {activeTab === "users" && (
        <div className="animate-fade">
          <h3 style={styles.sectionTitle}>👥 가입 유저 목록 및 권한 설정</h3>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>아이디 (Username)</th>
                  <th style={styles.th}>농장/소속기관</th>
                  <th style={styles.th}>현재 역할 (Role)</th>
                  <th style={styles.th}>보유 봉장</th>
                  <th style={styles.th}>보유 벌통</th>
                  <th style={styles.th}>역할 변경</th>
                  <th style={styles.th}>강제 탈퇴</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>{u.id}</td>
                    <td style={{ ...styles.td, fontWeight: "bold", color: "#ffffff" }}>{u.username}</td>
                    <td style={styles.td}>{u.farm_name}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        background: u.role === "admin" ? "rgba(251,191,36,0.12)" : u.role === "researcher" ? "rgba(96,165,250,0.12)" : "rgba(52,211,153,0.12)",
                        color: u.role === "admin" ? "#fbbf24" : u.role === "researcher" ? "#60a5fa" : "#34d399"
                      }}>
                        {u.role === "admin" ? "⚙️ 최고관리자" : u.role === "researcher" ? "🔬 연구원" : "🐝 양봉농가"}
                      </span>
                    </td>
                    <td style={styles.td}>{u.apiaries_count} 개소</td>
                    <td style={styles.td}>{u.colonies_count} 군</td>
                    <td style={styles.td}>
                      <select
                        style={{
                          background: "rgba(17,24,39,0.8)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "4px",
                          color: "#fff",
                          fontSize: "11px",
                          padding: "4px 8px",
                          cursor: "pointer"
                        }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="farmer">농가로 지정</option>
                        <option value="researcher">연구원으로 격상</option>
                        <option value="admin">관리자로 격상</option>
                      </select>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{
                          ...styles.deleteBtnSmall,
                          padding: "6px 10px",
                          background: "rgba(239,68,68,0.1)",
                          color: "#f87171",
                          border: "1px solid rgba(239,68,68,0.2)"
                        }}
                        onClick={() => handleUserDelete(u.id, u.username)}
                      >
                        강제탈퇴 🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────── TAB 3: MASTER DATABASE LEDGER ───────────────── */}
      {activeTab === "data" && (
        <div className="animate-fade">
          <h3 style={styles.sectionTitle}>🧹 시스템 수집 데이터 일괄 정리</h3>
          
          {/* Sub tabs for database tables */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            <button
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
                background: dataSubTab === "apiaries" ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.02)",
                color: dataSubTab === "apiaries" ? "#60a5fa" : "#9ca3af"
              }}
              onClick={() => setDataSubTab("apiaries")}
            >
              🏡 양봉장 ({apiaries.length}개)
            </button>
            <button
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
                background: dataSubTab === "colonies" ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.02)",
                color: dataSubTab === "colonies" ? "#34d399" : "#9ca3af"
              }}
              onClick={() => setDataSubTab("colonies")}
            >
              🐝 벌통/봉군 ({colonies.length}개)
            </button>
            <button
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
                background: dataSubTab === "traits" ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.02)",
                color: dataSubTab === "traits" ? "#a78bfa" : "#9ca3af"
              }}
              onClick={() => setDataSubTab("traits")}
            >
              📋 내검 형질 기록 ({traits.length}개)
            </button>
            <button
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
                background: dataSubTab === "morphological" ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.02)",
                color: dataSubTab === "morphological" ? "#fbbf24" : "#9ca3af"
              }}
              onClick={() => setDataSubTab("morphological")}
            >
              🔬 형태학 측정 기록 ({morphs.length}개)
            </button>
          </div>

          {/* Render corresponding sub tab tables */}
          
          {/* Sub Tab: APIARIES */}
          {dataSubTab === "apiaries" && (
            <div style={styles.tableWrapper} className="animate-fade">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>양봉장 이름</th>
                    <th style={styles.th}>위치</th>
                    <th style={styles.th}>위도/경도</th>
                    <th style={styles.th}>소유자</th>
                    <th style={styles.th}>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {apiaries.map((a) => (
                    <tr key={a.id} style={styles.tr}>
                      <td style={styles.td}>{a.id}</td>
                      <td style={{ ...styles.td, color: "#60a5fa", fontWeight: "bold" }}>{a.name}</td>
                      <td style={styles.td}>{a.location}</td>
                      <td style={styles.td}>{a.latitude ? `${a.latitude.toFixed(4)}, ${a.longitude?.toFixed(4)}` : "미지정"}</td>
                      <td style={styles.td}>{a.owner} (ID: {a.owner_id})</td>
                      <td style={styles.td}>
                        <button style={styles.deleteBtnSmall} onClick={() => handleDataDelete("apiaries", a.id)}>🗑 삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub Tab: COLONIES */}
          {dataSubTab === "colonies" && (
            <div style={styles.tableWrapper} className="animate-fade">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>벌통 코드</th>
                    <th style={styles.th}>소속 양봉장</th>
                    <th style={styles.th}>여왕벌 품종/태그</th>
                    <th style={styles.th}>상태</th>
                    <th style={styles.th}>소유 농가</th>
                    <th style={styles.th}>모본 ID</th>
                    <th style={styles.th}>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {colonies.map((c) => (
                    <tr key={c.id} style={styles.tr}>
                      <td style={styles.td}>{c.id}</td>
                      <td style={{ ...styles.td, color: "#34d399", fontWeight: "bold" }}>{c.code}</td>
                      <td style={styles.td}>{c.apiary_name}</td>
                      <td style={{ ...styles.td, color: "#fbbf24" }}>{c.queen_tag}</td>
                      <td style={styles.td}>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          background: c.status === "Active" ? "rgba(52,211,153,0.15)" : c.status === "Weak" ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.15)",
                          color: c.status === "Active" ? "#34d399" : c.status === "Weak" ? "#fbbf24" : "#f87171"
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={styles.td}>{c.owner}</td>
                      <td style={styles.td}>{c.mother_colony_id || "-"}</td>
                      <td style={styles.td}>
                        <button style={styles.deleteBtnSmall} onClick={() => handleDataDelete("colonies", c.id)}>🗑 삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub Tab: TRAITS */}
          {dataSubTab === "traits" && (
            <div style={styles.tableWrapper} className="animate-fade">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>벌통코드</th>
                    <th style={styles.th}>일자</th>
                    <th style={styles.th}>소유자</th>
                    <th style={styles.th}>꿀/프로/젤리</th>
                    <th style={styles.th}>온순/바이/응애</th>
                    <th style={styles.th}>VSH / Hygienic</th>
                    <th style={styles.th}>비고</th>
                    <th style={styles.th}>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {traits.map((t) => (
                    <tr key={t.id} style={styles.tr}>
                      <td style={styles.td}>{t.id}</td>
                      <td style={{ ...styles.td, color: "#a78bfa" }}>{t.colony_code}</td>
                      <td style={styles.td}>{t.date}</td>
                      <td style={styles.td}>{t.owner}</td>
                      <td style={styles.td}>{t.honey_production}kg / {t.propolis_production}g / {t.royal_jelly_production}g</td>
                      <td style={styles.td}>⭐{t.temperament} / ⭐{t.virus_resistance} / ⭐{t.mite_resistance}</td>
                      <td style={styles.td}>{t.vsh_rate}% / {t.hygienic_rate}%</td>
                      <td style={{ ...styles.td, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>{t.notes || "-"}</td>
                      <td style={styles.td}>
                        <button style={styles.deleteBtnSmall} onClick={() => handleDataDelete("traits", t.id)}>🗑 삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub Tab: MORPHOLOGICAL */}
          {dataSubTab === "morphological" && (
            <div style={styles.tableWrapper} className="animate-fade">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>여왕벌태그</th>
                    <th style={styles.th}>날짜</th>
                    <th style={styles.th}>벌통코드</th>
                    <th style={styles.th}>큐비탈지수</th>
                    <th style={styles.th}>혀 길이</th>
                    <th style={styles.th}>복판색상</th>
                    <th style={styles.th}>후경부길이/너비</th>
                    <th style={styles.th}>비고</th>
                    <th style={styles.th}>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {morphs.map((m) => (
                    <tr key={m.id} style={styles.tr}>
                      <td style={styles.td}>{m.id}</td>
                      <td style={{ ...styles.td, color: "#fbbf24", fontWeight: "bold" }}>{m.queen_tag}</td>
                      <td style={styles.td}>{m.date}</td>
                      <td style={styles.td}>{m.colony_code}</td>
                      <td style={styles.td}>{m.cubital_index ?? "-"}</td>
                      <td style={styles.td}>{m.proboscis_length ? `${m.proboscis_length}mm` : "-"}</td>
                      <td style={styles.td}>{m.tergite_color || "-"}</td>
                      <td style={styles.td}>{m.basitarsus_length ? `${m.basitarsus_length} / ${m.basitarsus_width} mm` : "-"}</td>
                      <td style={{ ...styles.td, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>{m.researcher_notes || "-"}</td>
                      <td style={styles.td}>
                        <button style={styles.deleteBtnSmall} onClick={() => handleDataDelete("morphological", m.id)}>🗑 삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

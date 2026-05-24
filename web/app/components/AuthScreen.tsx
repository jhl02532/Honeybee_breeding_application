import React, { useState } from "react";
import { styles } from "../styles";
import { Token } from "../types";
import { BASE } from "../utils";

interface AuthScreenProps {
  onAuth: (t: Token) => void;
}

export default function AuthScreen({ onAuth }: AuthScreenProps) {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [farmName, setFarmName] = useState("");
  const [role, setRole] = useState("farmer"); // farmer, researcher
  const [initialColonyCount, setInitialColonyCount] = useState("5");
  const [queenTypes, setQueenTypes] = useState<string[]>(["이탈리안", "이탈리안", "이탈리안", "이탈리안", "이탈리안"]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleColonyCountChange = (countStr: string) => {
    setInitialColonyCount(countStr);
    const count = parseInt(countStr) || 0;
    setQueenTypes((prev) => {
      const next = [...prev];
      if (next.length < count) {
        while (next.length < count) next.push("이탈리안");
      } else if (next.length > count) {
        next.splice(count);
      }
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const path = (isAdminMode || mode === "login") ? "/api/v1/auth/login/json" : "/api/v1/auth/register";
      const body: any = { username, password };
      
      if (!isAdminMode && mode === "register") {
        body.farm_name = farmName || null;
        body.role = role;
        if (role === "farmer") {
          body.initial_colony_count = parseInt(initialColonyCount) || 0;
          body.queen_types = queenTypes;
        } else {
          body.initial_colony_count = 0;
          body.queen_types = [];
        }
      }
      
      const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "인증 실패");
      
      // Strict role verification if Logging in as Admin
      if (isAdminMode && data.user.role !== "admin") {
        throw new Error("관리자 권한이 없는 계정입니다.");
      }
      
      onAuth(data as Token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.authPage}>
      {/* Decorative background elements */}
      <div style={styles.authBgOrb1} />
      <div style={styles.authBgOrb2} />

      <div 
        style={{
          ...styles.authCard,
          border: isAdminMode ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,0.08)",
          boxShadow: isAdminMode ? "0 0 30px rgba(251,191,36,0.15), 0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.4)"
        }} 
        className="animate-fade"
      >
        {/* Logo area */}
        <div style={styles.authLogoArea}>
          <div style={{
            ...styles.authLogo,
            background: isAdminMode ? "linear-gradient(135deg, #fbbf24, #d97706)" : "linear-gradient(135deg, #fbbf24, #f59e0b)",
            transform: isAdminMode ? "scale(1.1)" : "none",
            transition: "all 0.3s ease"
          }}>
            {isAdminMode ? "⚙️" : "🐝"}
          </div>
          <h1 style={{
            ...styles.authTitle,
            color: isAdminMode ? "#fbbf24" : "#f3f4f6"
          }}>
            {isAdminMode ? "MelittaBreed Admin" : "MelittaBreed"}
          </h1>
          <p style={styles.authSubtitle}>
            {isAdminMode ? "SaaS 시스템 통합 관리자 콘솔" : "양봉 육종 기록 관리 시스템"}
          </p>
        </div>

        {/* Tab switcher (Hidden in Admin Mode since registration is blocked) */}
        {!isAdminMode ? (
          <div style={styles.tabContainer}>
            <button
              style={{
                ...styles.tab,
                ...(mode === "login" ? styles.tabActive : {}),
              }}
              onClick={() => { setMode("login"); setError(""); }}
            >
              로그인
            </button>
            <button
              style={{
                ...styles.tab,
                ...(mode === "register" ? styles.tabActive : {}),
              }}
              onClick={() => { setMode("register"); setError(""); }}
            >
              회원가입
            </button>
          </div>
        ) : (
          <div style={{
            padding: "8px 12px",
            background: "rgba(251,191,36,0.1)",
            border: "1px dashed rgba(251,191,36,0.3)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#fbbf24",
            textAlign: "center",
            marginBottom: "20px"
          }}>
            🔒 본 계정은 시스템 관리용 고유 보안 계정입니다.
          </div>
        )}

        <form onSubmit={submit} style={styles.authForm}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>아이디</label>
            <input
              id="auth-username"
              style={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isAdminMode ? "관리자 아이디 입력" : "사용자 아이디 입력"}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>비밀번호</label>
            <input
              id="auth-password"
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              required
            />
          </div>

          {!isAdminMode && mode === "register" && (
            <>
              <div style={styles.inputGroup} className="animate-fade">
                <label style={styles.inputLabel}>가입 유형 (역할 선택) *</label>
                <select
                  id="auth-role"
                  style={styles.input}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                >
                  <option value="farmer">🐝 양봉 농가 사용자</option>
                  <option value="researcher">🔬 전문 육종 연구원</option>
                </select>
              </div>

              {role === "farmer" && (
                <>
                  <div style={styles.inputGroup} className="animate-fade">
                    <label style={styles.inputLabel}>농장명 (선택)</label>
                    <input
                      id="auth-farmname"
                      style={styles.input}
                      type="text"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      placeholder="예: 남한산성 양봉원"
                    />
                  </div>

                  <div style={styles.inputGroup} className="animate-fade">
                    <label style={styles.inputLabel}>초기 봉군 수 (Colonies)</label>
                    <input
                      id="auth-initial-colonies"
                      style={styles.input}
                      type="number"
                      min="0"
                      max="100"
                      value={initialColonyCount}
                      onChange={(e) => handleColonyCountChange(e.target.value)}
                      placeholder="예: 5"
                    />
                  </div>

                  {parseInt(initialColonyCount) > 0 && (
                    <div style={{ ...styles.inputGroup, marginTop: "8px" }} className="animate-fade">
                      <label style={styles.inputLabel}>벌통별 여왕벌 품종 지정</label>
                      <div
                        style={{
                          maxHeight: "130px",
                          overflowY: "auto",
                          padding: "10px",
                          background: "rgba(17,24,39,0.5)",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.06)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {Array.from({ length: parseInt(initialColonyCount) || 0 }).map((_, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "10px",
                            }}
                          >
                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>Colony {idx + 1}</span>
                            <select
                              style={{
                                ...styles.input,
                                padding: "6px 10px",
                                fontSize: "12px",
                                width: "160px",
                                background: "rgba(17,24,39,0.8)",
                              }}
                              value={queenTypes[idx] || "이탈리안"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQueenTypes((prev) => {
                                  const next = [...prev];
                                  next[idx] = val;
                                  return next;
                                });
                              }}
                            >
                              <option value="이탈리안">이탈리안 (Italian)</option>
                              <option value="카니올란">카니올란 (Carniolan)</option>
                              <option value="코카시안">코카시안 (Caucasian)</option>
                              <option value="한봉">한봉 (Korean Native)</option>
                              <option value="기타">기타 혼합 (Hybrid)</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {error && (
            <div style={styles.errorBanner}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            id="auth-submit"
            type="submit"
            style={{
              ...styles.primaryBtn,
              background: isAdminMode ? "linear-gradient(135deg, #fbbf24, #d97706)" : styles.primaryBtn.background,
              color: isAdminMode ? "#000000" : "#ffffff",
              fontWeight: "bold",
              opacity: busy ? 0.7 : 1,
            }}
            disabled={busy}
          >
            {busy ? "처리 중..." : isAdminMode ? "관리자 콘솔 접속" : mode === "login" ? "로그인" : "가입하기"}
          </button>

          {/* Toggle admin login mode */}
          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => {
                setIsAdminMode(!isAdminMode);
                setError("");
                setUsername("");
                setPassword("");
              }}
              style={{
                background: "none",
                border: "none",
                color: isAdminMode ? "#9ca3af" : "#fbbf24",
                fontSize: "12px",
                cursor: "pointer",
                textDecoration: "underline",
                transition: "color 0.2s"
              }}
            >
              {isAdminMode ? "◀ 일반 사용자 로그인으로 돌아가기" : "⚙️ 시스템 총괄 관리자 로그인"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

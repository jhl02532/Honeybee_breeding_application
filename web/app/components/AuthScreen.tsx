import React, { useState } from "react";
import { styles } from "../styles";
import { Token } from "../types";
import { BASE } from "../utils";

interface AuthScreenProps {
  onAuth: (t: Token) => void;
}

export default function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [farmName, setFarmName] = useState("");
  const [initialColonyCount, setInitialColonyCount] = useState("5");
  const [queenType, setQueenType] = useState("이탈리안");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const path = mode === "login" ? "/api/v1/auth/login/json" : "/api/v1/auth/register";
      const body: any = { username, password };
      if (mode === "register") {
        body.farm_name = farmName || null;
        body.initial_colony_count = parseInt(initialColonyCount) || 0;
        body.queen_type = queenType || "Unknown";
      }
      const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "인증 실패");
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

      <div style={styles.authCard} className="animate-fade">
        {/* Logo area */}
        <div style={styles.authLogoArea}>
          <div style={styles.authLogo}>🐝</div>
          <h1 style={styles.authTitle}>MelittaBreed</h1>
          <p style={styles.authSubtitle}>양봉 육종 기록 관리 시스템</p>
        </div>

        {/* Tab switcher */}
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

        <form onSubmit={submit} style={styles.authForm}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>아이디</label>
            <input
              id="auth-username"
              style={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="사용자 아이디 입력"
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

          {mode === "register" && (
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
                  onChange={(e) => setInitialColonyCount(e.target.value)}
                  placeholder="예: 5"
                />
              </div>

              <div style={styles.inputGroup} className="animate-fade">
                <label style={styles.inputLabel}>기본 여왕벌 종류 (Pedigree Breed)</label>
                <select
                  id="auth-queen-type"
                  style={styles.input}
                  value={queenType}
                  onChange={(e) => setQueenType(e.target.value)}
                >
                  <option value="이탈리안">이탈리안 (Italian - 다수 황색 우종)</option>
                  <option value="카니올란">카니올란 (Carniolan - 온순/월동 우종)</option>
                  <option value="코카시안">코카시안 (Caucasian - 프로폴리스 채취종)</option>
                  <option value="한봉">한봉 (Korean Native - 동양종 토종벌)</option>
                  <option value="기타">기타 육종 혼합 (Hybrid/Other)</option>
                </select>
              </div>
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
              opacity: busy ? 0.7 : 1,
            }}
            disabled={busy}
          >
            {busy ? "처리 중..." : mode === "login" ? "로그인" : "가입하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

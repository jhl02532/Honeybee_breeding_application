import React, { useState } from "react";
import { Token } from "../types";
import { BASE } from "../utils";

interface AuthBarProps {
  onAuth: (t: Token) => void;
}

export default function AuthBar({ onAuth }: AuthBarProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setBusy(true);
    try {
      const path = "/api/v1/auth/login/json";
      const body = { username, password };

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
    <div style={{ position: "relative" }}>
      <form 
        onSubmit={handleSubmit} 
        style={{ 
          display: "flex", 
          flexDirection: "row", 
          alignItems: "center", 
          gap: "8px",
          flexWrap: "nowrap"
        }}
        className="auth-bar-form"
      >
        {/* Username Input */}
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="아이디"
          required
          style={{
            padding: "6px 10px",
            fontSize: "12px",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-surface)",
            color: "var(--text-main)",
            outline: "none",
            width: "100px",
          }}
          className="auth-bar-input"
        />

        {/* Password Input */}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          required
          style={{
            padding: "6px 10px",
            fontSize: "12px",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-surface)",
            color: "var(--text-main)",
            outline: "none",
            width: "100px",
          }}
          className="auth-bar-input"
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: "6px 14px",
            fontSize: "12px",
            fontWeight: "bold",
            borderRadius: "6px",
            border: "none",
            background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-hover))",
            color: "#ffffff",
            cursor: "pointer",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="auth-bar-btn"
        >
          {busy ? "..." : "로그인"}
        </button>

        {/* Mode Toggle Link */}
        <button
          type="button"
          onClick={() => {
            window.location.href = "/register";
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-gold)",
            fontSize: "11px",
            fontWeight: "bold",
            cursor: "pointer",
            textDecoration: "underline",
            padding: "0 4px",
            whiteSpace: "nowrap"
          }}
          className="auth-bar-toggle-link"
        >
          회원가입
        </button>
      </form>

      {/* Floating Error Message */}
      {error && (
        <div
          style={{
            position: "absolute",
            top: "34px",
            right: "0",
            background: "rgba(239, 68, 68, 0.95)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "6px",
            padding: "6px 12px",
            color: "#ffffff",
            fontSize: "11px",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
            whiteSpace: "nowrap",
            zIndex: 999,
          }}
          className="animate-fade"
        >
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

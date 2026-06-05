"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    alert("현재 시범운영 기간으로 신규 가입이 제한됩니다. 계정 발급은 실험실 관리자에게 문의하세요.");
    router.push("/");
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        color: "var(--text-main)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "36px",
          boxShadow: "var(--shadow-lg)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "36px", marginBottom: "8px" }}>🔒</div>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--color-gold)", marginBottom: "12px" }}>
          신규 회원가입 제한
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: "1.6" }}>
          현재 시범운영 기간으로 신규 가입이 제한됩니다.<br />
          계정 발급은 실험실 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}

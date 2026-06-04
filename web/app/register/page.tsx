"use client";

import React, { useState, useEffect } from "react";
import { BASE, setAuth } from "../utils";
import { Token } from "../types";

export default function RegisterPage() {
  const [role, setRole] = useState<"farmer" | "researcher">("farmer");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Account Information
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Farmer specific Master Data
  const [apiaryName, setApiaryName] = useState("");
  const [apiaryAddress, setApiaryAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [totalColonyCount, setTotalColonyCount] = useState("5");
  const [experienceYears, setExperienceYears] = useState("");

  // Selected Species & Lineage
  const [queenSpecies, setQueenSpecies] = useState<"Apis mellifera" | "Apis cerana">("Apis mellifera");
  const [queenLineage, setQueenLineage] = useState<string>("모름 / 선택 안 함");

  // Cascade reset detailed breed dropdown when main species category changes
  useEffect(() => {
    setQueenLineage("모름 / 선택 안 함");
  }, [queenSpecies]);

  // Researcher specific Master Data
  const [affiliation, setAffiliation] = useState("");

  // Error and Notification states
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  // Sync theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  // Removed QUEEN_LINE_OPTIONS and checkbox toggler for dropdown selection

  // Phone number format validation
  useEffect(() => {
    if (!phone) {
      setPhoneError("");
      return;
    }
    const phoneRegex = /^01[016789]-?\d{3,4}-?\d{4}$/;
    if (!phoneRegex.test(phone)) {
      setPhoneError("올바른 휴대전화 번호 형식을 입력해주세요. (예: 010-1234-5678)");
    } else {
      setPhoneError("");
    }
  }, [phone]);

  // Password match validation
  useEffect(() => {
    if (!confirmPassword) {
      setPasswordError("");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
    } else {
      setPasswordError("");
    }
  }, [password, confirmPassword]);

  // Form validator to check if button should be enabled
  const isFormValid = () => {
    if (role === "farmer") {
      return (
        username.trim().length >= 3 &&
        password.trim().length >= 4 &&
        confirmPassword.trim() === password.trim() &&
        fullName.trim().length > 0 &&
        phone.trim().length > 0 &&
        !phoneError &&
        apiaryName.trim().length > 0 &&
        apiaryAddress.trim().length > 0 &&
        latitude.trim().length > 0 &&
        longitude.trim().length > 0 &&
        totalColonyCount.trim().length > 0 &&
        experienceYears.trim().length > 0 &&
        (queenSpecies === "Apis mellifera" || queenSpecies === "Apis cerana")
      );
    } else {
      return (
        username.trim().length >= 3 &&
        password.trim().length >= 4 &&
        confirmPassword.trim() === password.trim() &&
        fullName.trim().length > 0 &&
        affiliation.trim().length > 0
      );
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    // Farmer Validation Popup Trigger
    if (role === "farmer") {
      const latVal = parseFloat(latitude);
      const lngVal = parseFloat(longitude);
      const colonyCountVal = parseInt(totalColonyCount);
      const expVal = parseInt(experienceYears);

      const hasMissingField =
        !username ||
        !password ||
        !confirmPassword ||
        !fullName ||
        !phone ||
        phoneError ||
        passwordError ||
        !apiaryName ||
        !apiaryAddress ||
        isNaN(latVal) ||
        isNaN(lngVal) ||
        isNaN(colonyCountVal) ||
        isNaN(expVal) ||
        !queenSpecies;

      if (hasMissingField) {
        setShowWarningPopup(true);
        return;
      }
    }

    setBusy(true);

    try {
      let url = "";
      let body: any = {};

      if (role === "farmer") {
        url = `${BASE}/api/v1/auth/register/farmer`;
        body = {
          username,
          password,
          full_name: fullName,
          phone,
          apiary_name: apiaryName,
          apiary_address: apiaryAddress,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          total_colony_count: parseInt(totalColonyCount),
          experience_years: parseInt(experienceYears),
          queen_lines: queenLineage && queenLineage !== "모름 / 선택 안 함" ? [queenLineage] : [],
          queen_lineage: queenLineage === "모름 / 선택 안 함" ? null : queenLineage,
          queen_species: queenSpecies,
        };
      } else {
        url = `${BASE}/api/v1/auth/register`;
        body = {
          username,
          password,
          farm_name: affiliation,
          role: "researcher",
          initial_colony_count: 0,
          queen_types: [],
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "회원 가입에 실패했습니다.");
      }

      // Save credentials and redirect
      setAuth(data as Token);
      window.location.href = "/";
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  };

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
      {/* Standalone card wrapper */}
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "36px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header Section */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "36px",
              marginBottom: "8px",
              display: "inline-block",
            }}
          >
            🐝
          </div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "var(--color-gold)",
              letterSpacing: "-0.5px",
            }}
          >
            MelittaBreed 회원가입
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
            이상기온 대응 꿀벌 육종 유전자원 플랫폼 회원가입
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-app)",
            border: "1px solid var(--border-color)",
            padding: "4px",
            borderRadius: "12px",
            marginBottom: "28px",
          }}
        >
          <button
            type="button"
            onClick={() => setRole("farmer")}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "8px",
              background: role === "farmer" ? "var(--bg-surface)" : "transparent",
              color: role === "farmer" ? "var(--color-gold)" : "var(--text-muted)",
              fontWeight: role === "farmer" ? "bold" : "normal",
              cursor: "pointer",
              fontSize: "14px",
              boxShadow: role === "farmer" ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            🏡 농가(FARMER)
          </button>
          <button
            type="button"
            onClick={() => setRole("researcher")}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "8px",
              background: role === "researcher" ? "var(--bg-surface)" : "transparent",
              color: role === "researcher" ? "var(--color-gold)" : "var(--text-muted)",
              fontWeight: role === "researcher" ? "bold" : "normal",
              cursor: "pointer",
              fontSize: "14px",
              boxShadow: role === "researcher" ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            🔬 연구원(RESEARCHER)
          </button>
        </div>

        {/* Server Error Message */}
        {serverError && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "8px",
              padding: "12px",
              color: "#ef4444",
              fontSize: "13px",
              marginBottom: "20px",
            }}
          >
            ⚠️ {serverError}
          </div>
        )}

        {/* Main form */}
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Section 1: Basic credentials */}
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "10px", color: "var(--color-gold)" }}>
              🔑 기본 계정 정보
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    아이디 *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="3자 이상"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-surface)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    성명 *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="실명 입력"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-surface)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    비밀번호 *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="4자 이상"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-surface)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    비밀번호 확인 *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="동일하게 입력"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-surface)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
              {passwordError && (
                <div style={{ color: "#ef4444", fontSize: "11px" }}>⚠️ {passwordError}</div>
              )}

              {role === "farmer" && (
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    연락처 *
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-XXXX-XXXX"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-surface)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                  {phoneError && (
                    <div style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px" }}>⚠️ {phoneError}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Farmer-specific inputs */}
          {role === "farmer" && (
            <>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "10px", color: "var(--color-gold)" }}>
                  🏡 양봉장 마스터 데이터
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      양봉장 명칭 *
                    </label>
                    <input
                      type="text"
                      value={apiaryName}
                      onChange={(e) => setApiaryName(e.target.value)}
                      placeholder="예: 지리산포 제1봉장"
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-surface)",
                        color: "var(--text-main)",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      상세 주소 *
                    </label>
                    <input
                      type="text"
                      value={apiaryAddress}
                      onChange={(e) => setApiaryAddress(e.target.value)}
                      placeholder="예: 경상남도 산청군 시천면"
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-surface)",
                        color: "var(--text-main)",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                        위도 (Latitude) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="예: 35.3369"
                        required
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-surface)",
                          color: "var(--text-main)",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                        경도 (Longitude) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="예: 127.7306"
                        required
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-surface)",
                          color: "var(--text-main)",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "10px", color: "var(--color-gold)" }}>
                  📊 봉군 및 기반 인프라 정보
                </h3>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      현재 사육 중인 총 봉군 수 *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={totalColonyCount}
                      onChange={(e) => setTotalColonyCount(e.target.value)}
                      placeholder="예: 5"
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-surface)",
                        color: "var(--text-main)",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      양봉 경력 (년차) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      placeholder="예: 10"
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-surface)",
                        color: "var(--text-main)",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 🐝 품종 선택 UI 구조 개편 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "6px", color: "var(--color-gold)" }}>
                    🐝 꿀벌 대분류 (종 선택) *
                  </h3>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>
                    양봉 농가가 사육 중인 꿀벌의 대분류 종을 선택해 주세요 (가입 필수 항목).
                  </p>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <label style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: `1px solid ${queenSpecies === "Apis mellifera" ? "var(--color-gold)" : "var(--border-color)"}`,
                      background: queenSpecies === "Apis mellifera" ? "var(--bg-app)" : "var(--bg-surface)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: queenSpecies === "Apis mellifera" ? "bold" : "normal",
                      color: queenSpecies === "Apis mellifera" ? "var(--color-gold)" : "var(--text-main)",
                      transition: "all 0.2s"
                    }}>
                      <input
                        type="radio"
                        name="queenSpecies"
                        value="Apis mellifera"
                        checked={queenSpecies === "Apis mellifera"}
                        onChange={() => setQueenSpecies("Apis mellifera")}
                        style={{ accentColor: "var(--color-gold)", cursor: "pointer" }}
                      />
                      서양벌 (Apis mellifera)
                    </label>
                    <label style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: `1px solid ${queenSpecies === "Apis cerana" ? "var(--color-gold)" : "var(--border-color)"}`,
                      background: queenSpecies === "Apis cerana" ? "var(--bg-app)" : "var(--bg-surface)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: queenSpecies === "Apis cerana" ? "bold" : "normal",
                      color: queenSpecies === "Apis cerana" ? "var(--color-gold)" : "var(--text-main)",
                      transition: "all 0.2s"
                    }}>
                      <input
                        type="radio"
                        name="queenSpecies"
                        value="Apis cerana"
                        checked={queenSpecies === "Apis cerana"}
                        onChange={() => setQueenSpecies("Apis cerana")}
                        style={{ accentColor: "var(--color-gold)", cursor: "pointer" }}
                      />
                      동양벌 / 토종벌 (Apis cerana)
                    </label>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "6px", color: "var(--color-gold)" }}>
                    👑 세부 육종 계통 (선택 사항)
                  </h3>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>
                    구체적인 세부 육종 계통을 모를 경우 '모름 / 선택 안 함'으로 가입이 가능합니다.
                  </p>
                  <select
                    value={queenLineage}
                    onChange={(e) => setQueenLineage(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-surface)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    <option value="모름 / 선택 안 함">모름 / 선택 안 함</option>
                    {queenSpecies === "Apis mellifera" ? (
                      <>
                        <option value="장원벌">장원벌</option>
                        <option value="로열1호">로열1호</option>
                        <option value="젤리킹">젤리킹</option>
                        <option value="봉교1호">봉교1호</option>
                      </>
                    ) : (
                      <>
                        <option value="한라벌">한라벌</option>
                        <option value="백두벌">백두벌</option>
                        <option value="일반 재래종">일반 재래종</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Section 3: Researcher-specific inputs */}
          {role === "researcher" && (
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "10px", color: "var(--color-gold)" }}>
                🏢 연구 기관 정보
              </h3>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  소속 연구소/기관명 *
                </label>
                <input
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="예: 한국 꿀벌 유전학 연구소"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-surface)",
                    color: "var(--text-main)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          )}

          {/* Form Submit & Back button */}
          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "transparent",
                color: "var(--text-main)",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                flex: 2,
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: isFormValid()
                  ? "linear-gradient(135deg, var(--color-gold), var(--color-gold-hover))"
                  : "var(--border-color)",
                color: isFormValid() ? "#ffffff" : "var(--text-muted)",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: isFormValid() ? "pointer" : "not-allowed",
                boxShadow: isFormValid() ? "var(--shadow-md)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {busy ? "처리 중..." : "가입하기"}
            </button>
          </div>
        </form>
      </div>

      {/* CUSTOM WARNING POPUP MODAL */}
      {showWarningPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowWarningPopup(false)}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              border: "2px solid #ef4444",
              borderRadius: "12px",
              padding: "28px",
              maxWidth: "420px",
              width: "90%",
              boxShadow: "var(--shadow-lg)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "36px", marginBottom: "14px" }}>⚠️</div>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#ef4444", marginBottom: "12px" }}>
              입력 정보 부족
            </h2>
            <p
              style={{
                fontSize: "14px",
                lineHeight: "1.6",
                color: "var(--text-main)",
                marginBottom: "20px",
                wordBreak: "keep-all",
              }}
            >
              육종 플랫폼 연계를 위해 양봉장 위치 및 대분류 종 정보는 필수 입력 사항입니다.
            </p>
            <button
              type="button"
              onClick={() => setShowWarningPopup(false)}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background: "#ef4444",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(239, 68, 68, 0.3)",
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

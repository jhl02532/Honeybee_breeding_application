"use client";

import { useState, useEffect, useRef } from "react";
import { User, Token } from "./types";
import { getStoredUser, getToken, setAuth, clearAuth } from "./utils";
import AuthBar from "./components/AuthBar";
import DashboardScreen from "./components/DashboardScreen";
import { styles } from "./styles";

type DashView = "apiaries" | "colonies" | "fieldrecords" | "queens" | "admin" | "manual";
const VIEWS: DashView[] = ["apiaries", "colonies", "fieldrecords", "queens", "admin", "manual"];

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [initialDashboardView, setInitialDashboardView] = useState<DashView | undefined>(undefined);
  const [activeSection, setActiveSection] = useState("home");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const homeRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const roadmapRef = useRef<HTMLDivElement>(null);
  const manualRef = useRef<HTMLDivElement>(null);

  // Initialize theme and restore session from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const stored = getStoredUser();
    const token = getToken();
    if (stored && token) {
      setUser(stored);
      const storedShow = localStorage.getItem("melitta_show_dashboard") === "true";
      // 예전 버전에서 저장한 화면(게놈 브라우저 등)은 버린다
      const storedView = localStorage.getItem("melitta_dashboard_view") as DashView | null;
      if (storedShow) {
        setShowDashboard(true);
      }
      if (storedView && VIEWS.includes(storedView)) {
        setInitialDashboardView(storedView);
      }
    }
    setLoading(false);
  }, []);

  // Monitor scroll to update active navigation item
  useEffect(() => {
    if (user && showDashboard) return; // Only track scroll when viewing public landing page
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      if (manualRef.current && scrollPos >= manualRef.current.offsetTop) {
        setActiveSection("manual");
      } else if (roadmapRef.current && scrollPos >= roadmapRef.current.offsetTop) {
        setActiveSection("roadmap");

      } else if (aboutRef.current && scrollPos >= aboutRef.current.offsetTop) {
        setActiveSection("about");
      } else if (backgroundRef.current && scrollPos >= backgroundRef.current.offsetTop) {
        setActiveSection("background");
      } else {
        setActiveSection("home");
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [user, showDashboard]);

  const handleLogin = (data: Token) => {
    setAuth(data);
    setUser(data.user);
    setShowDashboard(false); // keep on landing page, activate launcher!
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setShowDashboard(false);
    localStorage.removeItem("melitta_show_dashboard");
    localStorage.removeItem("melitta_dashboard_view");
  };

  const handleLaunch = (view: DashView) => {
    setInitialDashboardView(view);
    setShowDashboard(true);
    localStorage.setItem("melitta_show_dashboard", "true");
    localStorage.setItem("melitta_dashboard_view", view);
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>, sectionName: string) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
      setActiveSection(sectionName);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (user && showDashboard) {
    return (
      <DashboardScreen 
        user={user} 
        onLogout={handleLogout} 
        theme={theme} 
        onToggleTheme={handleToggleTheme} 
        initialView={initialDashboardView}
        onBackToLanding={() => {
          setShowDashboard(false);
          localStorage.removeItem("melitta_show_dashboard");
          localStorage.removeItem("melitta_dashboard_view");
        }}
      />
    );
  }

  // Public/Landing Mode (Authenticated users see landing + launcher; Unauthenticated see landing + login form)
  return (
    <div style={styles.landingLayout} className="animate-fade">
      {/* Sticky Header Navigation */}
      <header style={styles.landingHeader} className="mobile-header-padding">
        <div style={styles.landingLogo} onClick={() => scrollToSection(homeRef, "home")}>
          <span>🐝</span> K-BEE BANK
        </div>
        
        <nav style={styles.landingNav} className="mobile-nav-hide">
          <button
            style={{
              ...styles.landingNavLink,
              ...(activeSection === "home" ? styles.landingNavLinkActive : {}),
            }}
            onClick={() => scrollToSection(homeRef, "home")}
            className="landing-nav-link-hover"
          >
            홈
          </button>
          <button
            style={{
              ...styles.landingNavLink,
              ...(activeSection === "background" ? styles.landingNavLinkActive : {}),
            }}
            onClick={() => scrollToSection(backgroundRef, "background")}
            className="landing-nav-link-hover"
          >
            개발 배경
          </button>
          <button
            style={{
              ...styles.landingNavLink,
              ...(activeSection === "about" ? styles.landingNavLinkActive : {}),
            }}
            onClick={() => scrollToSection(aboutRef, "about")}
            className="landing-nav-link-hover"
          >
            서비스 소개
          </button>
          <button
            style={{
              ...styles.landingNavLink,
              ...(activeSection === "roadmap" ? styles.landingNavLinkActive : {}),
            }}
            onClick={() => scrollToSection(roadmapRef, "roadmap")}
            className="landing-nav-link-hover"
          >
            추진 로드맵
          </button>
          <button
            style={{
              ...styles.landingNavLink,
              ...(activeSection === "manual" ? styles.landingNavLinkActive : {}),
            }}
            onClick={() => scrollToSection(manualRef, "manual")}
            className="landing-nav-link-hover"
          >
            이용 안내
          </button>
        </nav>

        <div style={styles.landingHeaderRight} className="auth-bar-header-container">
          {user ? (
            /* Logged in state in header */
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }} className="auth-profile-badge-wrapper">
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-end" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-main)" }}>
                  👤 {user.farm_name || user.username}님
                </span>
                <span style={{
                  padding: "1px 6px",
                  fontSize: "9px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  background: user.role === "admin" ? "rgba(251,191,36,0.15)" : user.role === "researcher" ? "rgba(96,165,250,0.15)" : "rgba(52,211,153,0.15)",
                  color: user.role === "admin" ? "#fbbf24" : user.role === "researcher" ? "#60a5fa" : "#34d399",
                }}>
                  {user.role === "admin" ? "ADMIN" : user.role === "researcher" ? "RESEARCHER" : "FARMER"}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowDashboard(true);
                  localStorage.setItem("melitta_show_dashboard", "true");
                  if (initialDashboardView) localStorage.setItem("melitta_dashboard_view", initialDashboardView);
                }}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  borderRadius: "6px",
                  border: "none",
                  background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-hover))",
                  color: "#ffffff",
                  cursor: "pointer",
                  marginLeft: "4px"
                }}
                className="btn-hover-effect"
              >
                대시보드 열기
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: "5px 10px",
                  fontSize: "11px",
                  borderRadius: "6px",
                  border: "1px solid rgba(239,68,68,0.3)",
                  background: "rgba(239,68,68,0.05)",
                  color: "#f87171",
                  cursor: "pointer",
                }}
                className="btn-outline-hover"
              >
                로그아웃
              </button>
            </div>
          ) : (
            /* Unauthenticated inline form bar in header */
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }} className="auth-profile-badge-wrapper">
              <AuthBar onAuth={handleLogin} />
            </div>
          )}

          <button
            onClick={handleToggleTheme}
            style={{
              background: "rgba(0,0,0,0.05)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              borderRadius: "8px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
              transition: "all 0.2s",
              marginLeft: "4px"
            }}
            title={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      {/* Section 1: Hero Area */}
      <div 
        ref={homeRef} 
        style={{ 
          position: "relative",
          width: "100%",
          minHeight: "75vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "#0d1527",
          padding: "100px 20px 80px 20px"
        }}
      >
        {/* Background Video */}
        <video
          src="/hero-video.mp4"
          muted
          playsInline
          autoPlay
          loop
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1
          }}
        />

        {/* Transparent Black Overlay */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.65)",
          zIndex: 2
        }} />

        {/* Content Card (Transparent Black Board) */}
        <div style={{
          position: "relative",
          zIndex: 3,
          width: "100%",
          maxWidth: "840px",
          background: "rgba(11, 17, 32, 0.75)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "20px",
          padding: "50px 40px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px"
        }} className="animate-fade">
          
          <h1 style={{
            fontSize: "44px",
            fontWeight: 800,
            color: "var(--color-gold)",
            letterSpacing: "-1px",
            margin: 0,
            textShadow: "0 2px 10px rgba(0,0,0,0.5)"
          }}>
            꿀벌 디지털 육종 플랫폼
          </h1>

          <p style={{
            fontSize: "16px",
            lineHeight: "1.7",
            color: "#e2e8f0",
            margin: 0,
            maxWidth: "680px",
            wordBreak: "keep-all"
          }}>
            양봉꿀벌(Apis mellifera)과 재래꿀벌(Apis cerana)의 여왕 계보, 봉군 검정 기록, 유전체 시료를 한곳에 쌓아 우수 여왕 선발을 근거 있게 남기는 육종 기록 플랫폼
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%", marginTop: "10px" }}>
            {!user ? (
              <div 
                style={{ 
                  padding: "14px 24px", 
                  borderRadius: "10px", 
                  background: "rgba(255, 255, 255, 0.05)", 
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                }}
                className="pulse-glow-tip"
              >
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)" }}>
                  💡 계정은 연구실에서 발급합니다. 우측 상단에서 로그인하세요. ↗
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowDashboard(true)}
                style={styles.btnGold}
                className="btn-hover-effect"
              >
                기록 화면 바로가기 ➔
              </button>
            )}
          </div>
        </div>

        {/* Big Launcher Grid (appears below the columns if user is logged in) */}
        {user && (
          <div style={{ position: "relative", zIndex: 3, marginTop: "40px", width: "100%", maxWidth: "1000px", textAlign: "left" }} className="animate-fade">
            <h3 className="gold-overlay" style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "var(--color-gold)", letterSpacing: "1px", marginBottom: "16px" }}>
              🚀 바로가기
            </h3>
            
            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
                gap: "16px" 
              }}
            >
              <div
                onClick={() => handleLaunch("fieldrecords")}
                style={{ ...styles.infoCard, cursor: "pointer", borderLeft: "4px solid var(--color-gold)", padding: "20px" }}
                className="feature-card-hover launcher-card"
              >
                <span style={{ fontSize: "28px" }}>📝</span>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}>현장 기록</h4>
                <p style={{ fontSize: "11px", margin: 0 }}>검정군을 고르고 회차별로 봉군 형질·사건·시료를 기록</p>
              </div>
              <div
                onClick={() => handleLaunch("queens")}
                style={{ ...styles.infoCard, cursor: "pointer", borderLeft: "4px solid #c084fc", padding: "20px" }}
                className="feature-card-hover launcher-card"
              >
                <span style={{ fontSize: "28px" }}>👑</span>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}>여왕 계보</h4>
                <p style={{ fontSize: "11px", margin: 0 }}>여왕의 어미·딸·교미·재임 봉군과 3대 계통도 확인</p>
              </div>
              <div
                onClick={() => handleLaunch("apiaries")}
                style={{ ...styles.infoCard, cursor: "pointer", borderLeft: "4px solid #f97316", padding: "20px" }}
                className="feature-card-hover launcher-card"
              >
                <span style={{ fontSize: "28px" }}>🏡</span>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}>양봉장·봉군</h4>
                <p style={{ fontSize: "11px", margin: 0 }}>시범 농가 양봉장과 벌통 등록·관리</p>
              </div>
              <div
                onClick={() => handleLaunch("manual")}
                style={{ ...styles.infoCard, cursor: "pointer", borderLeft: "4px solid #3b82f6", padding: "20px" }}
                className="feature-card-hover launcher-card"
              >
                <span style={{ fontSize: "28px" }}>📖</span>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}>사용 안내</h4>
                <p style={{ fontSize: "11px", margin: 0 }}>현장 기록 절차와 비교표 읽는 법</p>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Section 2: Background & Necessity Infographic */}
      <div ref={backgroundRef} style={styles.landingSection} className="mobile-section-padding">
        <div style={styles.sectionHeaderLanding}>
          <div style={styles.sectionTitlePre}>National Crisis & Necessity</div>
          <h2 style={styles.sectionMainTitle} className="mobile-section-title">
            개발 배경 및 필요성
          </h2>
        </div>

        <div style={styles.infographicGrid}>
          <div style={styles.infoCard} className="feature-card-hover">
            <div style={styles.infoNumber}>약 5.8조 원</div>
            <h3 style={styles.infoTitle}>"꿀벌이 없으면 우리 농사도 없습니다."</h3>
            <p style={styles.infoDesc}>
              대한민국 과일과 채소 5개 중 1개는 꿀벌이 꽃가루를 옮겨주어야만 열매를 맺습니다. 꿀벌이 우리 농업에 기여하는 경제적 가치는 매년 무려 5조 8천억 원에 달합니다.
            </p>
          </div>

          <div style={styles.infoCard} className="feature-card-hover">
            <div style={styles.infoNumber}>약 140억 마리</div>
            <h3 style={styles.infoTitle}>"사라지는 꿀벌, 봄철 벌통 텅 빔 피해"</h3>
            <p style={styles.infoDesc}>
              최근 겨울을 나고 나면 벌통이 통째로 비어버리는 기이한 폐사 피해로 인해 전국에서 140억 마리의 꿀벌이 실종되었습니다. 더 이상 옛날 방식의 경험만으로는 기후 변화와 변종 응애/바이러스를 막아내기 어렵습니다.
            </p>
          </div>

          <div style={styles.infoCard} className="feature-card-hover">
            <div style={styles.infoNumber}>이상고온 35℃</div>
            <h3 style={styles.infoTitle}>"이상고온 벌통 속, '길치 벌'을 만듭니다."</h3>
            <p style={styles.infoDesc}>
              연구실 실험 결과, 여름철 무더위로 벌통 내부가 35℃ 이상 올라가면 그 안에서 자란 애벌레들은 성충이 되었을 때 기억력과 학습 능력이 뚝 떨어집니다. 꿀을 따러 나갔다가 집을 못 찾아오는 실종 유전자를 분석해내야 하는 이유입니다.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: 4 Core Services Guide */}
      <div ref={aboutRef} style={styles.landingSection} className="mobile-section-padding">
        <div style={styles.sectionHeaderLanding}>
          <div style={styles.sectionTitlePre}>Core Technologies</div>
          <h2 style={styles.sectionMainTitle} className="mobile-section-title">
            플랫폼 핵심 기능 안내
          </h2>
        </div>

        <div style={styles.landingGrid}>
          <div style={styles.featureCard} className="feature-card-hover">
            <div style={styles.featureIcon}>📝</div>
            <h3 style={styles.featureTitle}>1. 현장 검정 기록</h3>
            <p style={styles.featureDesc}>
              연구자가 연 3회 농가를 방문해 같은 날 같은 기준으로 봉군 세력, 행동, 질병, 응애를 기록합니다. 형질 사전의 범위를 벗어난 값은 막고, 마감한 기록을 고치면 이력이 남습니다.
            </p>
          </div>

          <div style={styles.featureCard} className="feature-card-hover">
            <div style={styles.featureIcon}>👑</div>
            <h3 style={styles.featureTitle}>2. 여왕 계보 관리</h3>
            <p style={styles.featureDesc}>
              여왕마다 영구 ID, 어미, 출생연도, 교미 방식과 수벌군, 재임 봉군을 남깁니다. 여왕이 바뀌면 이전 재임을 닫고 그 뒤 기록을 새 여왕에 잇습니다.
            </p>
          </div>

          <div style={styles.featureCard} className="feature-card-hover">
            <div style={styles.featureIcon}>📊</div>
            <h3 style={styles.featureTitle}>3. 검정군 비교표</h3>
            <p style={styles.featureDesc}>
              같은 농가, 같은 방문 안에서 형질별 순위와 z 값을 보여 줍니다. 여왕 미확정이나 도입 직후 봉군은 비교에서 빼고 사유를 표시합니다. 육종가가 아닌 이번 시즌 표현형 비교입니다.
            </p>
          </div>

          <div style={styles.featureCard} className="feature-card-hover">
            <div style={styles.featureIcon}>🧬</div>
            <h3 style={styles.featureTitle}>4. 시료·유전체 연결</h3>
            <p style={styles.featureDesc}>
              수벌 번데기 시료를 채집 당시 여왕에 묶어 두어, 나중에 유전체 분석 결과를 정확한 여왕과 형질 기록에 잇습니다. 모든 기록은 CSV 묶음으로 내보낼 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Section 6: Annual Roadmap */}
      <div ref={roadmapRef} style={styles.landingSection} className="mobile-section-padding">
        <div style={styles.sectionHeaderLanding}>
          <div style={styles.sectionTitlePre}>Project Roadmap</div>
          <h2 style={styles.sectionMainTitle} className="mobile-section-title">
            연도별 개발 로드맵 (3개년 마일스톤)
          </h2>
        </div>

        <div style={styles.roadmapTimeline}>
          <div style={styles.roadmapItem} className="animate-slide">
            <div style={styles.roadmapYearBadge}>1년차 (2025)</div>
            <div style={styles.roadmapCard}>
              <h4 style={{ fontSize: "16px", fontWeight: "bold", color: "var(--color-gold)", marginBottom: "8px" }}>
                🎯 꿀벌 유전자원 선발 및 기본 DB 설계
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                대한민국 꿀벌 핵심집단 50개체 유전자원 정밀 선발 및 PacBio HiFi 롱리드 시퀀싱 해독을 진행하며, 디지털 표현형-유전체 통합 데이터베이스 아키텍처를 설계합니다.
              </p>
            </div>
          </div>

          <div style={styles.roadmapItem} className="animate-slide">
            <div style={styles.roadmapYearBadge}>2년차 (2026)</div>
            <div style={styles.roadmapCard}>
              <h4 style={{ fontSize: "16px", fontWeight: "bold", color: "var(--color-gold)", marginBottom: "8px" }}>
                🧬 유전체 조립과 육종 기록 플랫폼 구축
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                씨앗은행 계통의 염색체 수준 유전체를 조립하고 국내 꿀벌 시료를 수집해 변이를 분석합니다. 여왕 계보, 현장 검정 기록, 시료 연결을 담는 육종 기록 플랫폼을 구축합니다.
              </p>
            </div>
          </div>

          <div style={styles.roadmapItem} className="animate-slide">
            <div style={styles.roadmapYearBadge}>3년차 (2027)</div>
            <div style={styles.roadmapCard}>
              <h4 style={{ fontSize: "16px", fontWeight: "bold", color: "var(--color-gold)", marginBottom: "8px" }}>
                🌍 농가 시범 검정과 선발 운영
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                재래꿀벌·양봉꿀벌 각 3농가 120군을 연 3회 검정하고 수벌 번데기 시료를 모읍니다. 비교표로 선발 후보를 고르고 다음 세대 여왕 생산까지의 운영 절차를 시험합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Manual & Guidelines */}
      <div ref={manualRef} style={styles.landingSection} className="mobile-section-padding">
        <div style={styles.sectionHeaderLanding}>
          <div style={styles.sectionTitlePre}>User Guidebook</div>
          <h2 style={styles.sectionMainTitle} className="mobile-section-title">
            이용 안내 및 매뉴얼
          </h2>
        </div>

        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "24px"
          }}>
            <h4 style={{ color: "var(--color-gold)", fontWeight: "bold", marginBottom: "8px" }}>💡 2027 시범 운영</h4>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.6" }}>
              연구자가 시범 농가를 방문해 모든 기록을 입력합니다. 농가는 따로 로그인하지 않고, 봉군별 결과를 정리한 농가 리포트를 출력본으로 받습니다.
            </p>
          </div>

          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "24px"
          }}>
            <h4 style={{ color: "#60a5fa", fontWeight: "bold", marginBottom: "8px" }}>🔬 연구자·관리자 계정</h4>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.6" }}>
              계정은 연구실 관리자가 발급합니다. 로그인하면 현장 기록, 여왕 계보, 양봉장·봉군 화면을 쓸 수 있고, 모든 기록을 CSV 묶음으로 내보낼 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.landingFooter}>
        <div style={{ fontWeight: "bold", color: "var(--text-main)" }}>K-BEE BANK Beekeeping Ecosystem</div>
        <div>© 2026 K-BEE BANK Digital Breeding Center. All Rights Reserved.</div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          본 플랫폼은 농림축산식품부/농촌진흥청 이상기온 대응 꿀벌 육종 유전자원 플랫폼 개발 과제(과제번호: RS-2025-02214782)의 지원을 받아 수행되었으며, 한국농업기술진흥원 및 국가 유전자원 보존 관리 가이드라인을 준수하여 가동됩니다.
        </div>
      </footer>
    </div>
  );
}

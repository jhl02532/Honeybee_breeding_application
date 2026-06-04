"use client";

import { useState, useEffect, useRef } from "react";
import { User, Token } from "./types";
import { getStoredUser, getToken, setAuth, clearAuth } from "./utils";
import AuthBar from "./components/AuthBar";
import DashboardScreen from "./components/DashboardScreen";
import SamplingStatusPanel from "./components/SamplingStatusPanel";
import PhylogenyPanel from "./components/PhylogenyPanel";
import { styles } from "./styles";

type DashView =
  | "overview"
  | "apiaries"
  | "colonies"
  | "records"
  | "researcher"
  | "manual"
  | "admin"
  | "browser"
  | "synteny"
  | "chemo"
  | "marker"
  | "farmer"
  | "matchmaker";

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [initialDashboardView, setInitialDashboardView] = useState<DashView>("overview");
  const [activeSection, setActiveSection] = useState("home");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const homeRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const roadmapRef = useRef<HTMLDivElement>(null);
  const manualRef = useRef<HTMLDivElement>(null);
  const samplingRef = useRef<HTMLDivElement>(null);
  const phylogenyRef = useRef<HTMLDivElement>(null);

  // Initialize theme from localStorage on mount
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
    }
    setLoading(false);
  }, []);

  // Client-side Route Guard for non-logged-in users (allow browser guest view)
  useEffect(() => {
    if (loading) return;
    if (!user && showDashboard && initialDashboardView !== "browser") {
      setShowDashboard(false);
      const params = new URLSearchParams(window.location.search);
      if (params.toString() !== "") {
        console.warn("Unauthorized access attempt blocked by Route Guard.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user, loading, showDashboard, initialDashboardView]);

  // Monitor scroll to update active navigation item
  useEffect(() => {
    if (user && showDashboard) return; // Only track scroll when viewing public landing page
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      if (manualRef.current && scrollPos >= manualRef.current.offsetTop) {
        setActiveSection("manual");
      } else if (roadmapRef.current && scrollPos >= roadmapRef.current.offsetTop) {
        setActiveSection("roadmap");
      } else if (phylogenyRef.current && scrollPos >= phylogenyRef.current.offsetTop) {
        setActiveSection("phylogeny");
      } else if (samplingRef.current && scrollPos >= samplingRef.current.offsetTop) {
        setActiveSection("sampling");
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
  };

  const handleLaunch = (view: DashView) => {
    setInitialDashboardView(view);
    setShowDashboard(true);
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

  // Private Mode / Guest Mode -> Render Dashboard Screen
  if (showDashboard) {
    const guestUser = {
      id: 0,
      username: "Guest",
      farm_name: "게스트 방문자",
      role: "guest",
      full_name: "게스트",
      phone: "",
      experience_years: 0
    };
    return (
      <DashboardScreen 
        user={user || guestUser} 
        onLogout={handleLogout} 
        theme={theme} 
        onToggleTheme={handleToggleTheme} 
        initialView={initialDashboardView}
        onBackToLanding={() => setShowDashboard(false)}
      />
    );
  }

  // Public/Landing Mode (Authenticated users see landing + launcher; Unauthenticated see landing + login form)
  return (
    <div style={styles.landingLayout} className="animate-fade">
      {/* Sticky Header Navigation */}
      <header style={styles.landingHeader} className="mobile-header-padding">
        <div style={styles.landingLogo} onClick={() => scrollToSection(homeRef, "home")}>
          <span>🐝</span> MelittaBreed
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
              ...(activeSection === "sampling" ? styles.landingNavLinkActive : {}),
            }}
            onClick={() => scrollToSection(samplingRef, "sampling")}
            className="landing-nav-link-hover"
          >
            유전자원 현황
          </button>
          <button
            style={{
              ...styles.landingNavLink,
              ...(activeSection === "phylogeny" ? styles.landingNavLinkActive : {}),
            }}
            onClick={() => scrollToSection(phylogenyRef, "phylogeny")}
            className="landing-nav-link-hover"
          >
            국내 계통수
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
              marginRight: "4px"
            }}
            title={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          
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
                onClick={() => setShowDashboard(true)}
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
            /* Unauthenticated inline form bar in header with guest genome browser button */
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }} className="auth-profile-badge-wrapper">
              <button
                onClick={() => handleLaunch("browser")}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  borderRadius: "6px",
                  border: "1px solid var(--color-gold)",
                  background: "rgba(212,175,55,0.15)",
                  color: "var(--color-gold)",
                  cursor: "pointer",
                }}
                className="btn-outline-hover"
              >
                🧬 게놈 브라우저 바로가기
              </button>
              <AuthBar onAuth={handleLogin} />
            </div>
          )}
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
            꿀벌 디지털 육종플랫폼
          </h1>

          <p style={{
            fontSize: "16px",
            lineHeight: "1.7",
            color: "#e2e8f0",
            margin: 0,
            maxWidth: "680px",
            wordBreak: "keep-all"
          }}>
            기후변화와 월동 폐사 위기를 극복하기 위해 서양벌(Apis mellifera) 및 토종벌(Apis cerana)의 유전체-표현형 데이터를 통합한 AI 기반 디지털 정밀 육종 솔루션
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%", marginTop: "10px" }}>
            {!user ? (
              <>
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
                    💡 우측 상단에서 로그인 후 플랫폼 대시보드 서비스를 이용하실 수 있습니다. ↗
                  </span>
                </div>
                <button
                  onClick={() => handleLaunch("browser")}
                  style={{
                    padding: "12px 24px",
                    fontSize: "15px",
                    fontWeight: "bold",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    color: "#ffffff",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)"
                  }}
                  className="btn-hover-effect"
                >
                  🧬 범유전체 게놈 브라우저 바로가기 (비회원 공개) ➔
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowDashboard(true)}
                style={styles.btnGold}
                className="btn-hover-effect"
              >
                플랫폼 대시보드 바로가기 ➔
              </button>
            )}
          </div>
        </div>

        {/* Big Launcher Grid (appears below the columns if user is logged in) */}
        {user && (
          <div style={{ position: "relative", zIndex: 3, marginTop: "40px", width: "100%", maxWidth: "1000px", textAlign: "left" }} className="animate-fade">
            <h3 className="gold-overlay" style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "var(--color-gold)", letterSpacing: "1px", marginBottom: "16px" }}>
              🚀 플랫폼 서비스 바로가기 런처
            </h3>
            
            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
                gap: "16px" 
              }}
            >
              {/* FARMER Role Launcher Options */}
              {(user.role === "farmer" || user.role === "admin") && (
                <>
                  <div 
                    onClick={() => handleLaunch("apiaries")}
                    style={{ ...styles.infoCard, cursor: "pointer", borderLeft: "4px solid var(--color-gold)", padding: "20px" }}
                    className="feature-card-hover launcher-card"
                  >
                    <span style={{ fontSize: "28px" }}>🏡</span>
                    <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}>스마트 양봉장·봉군 관리</h4>
                    <p style={{ fontSize: "11px", margin: 0 }}>양봉장 위치 등록 및 각 벌통 내부 상태 관제 모듈로 진입</p>
                  </div>

                  <div 
                    onClick={() => handleLaunch("records")}
                    style={{ ...styles.infoCard, cursor: "pointer", borderLeft: "4px solid #f97316", padding: "20px" }}
                    className="feature-card-hover launcher-card"
                  >
                    <span style={{ fontSize: "28px" }}>📋</span>
                    <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}>스마트폰 1분 내검 기록기</h4>
                    <p style={{ fontSize: "11px", margin: 0 }}>야외 작업 시 장갑 터치가 용이한 모바일 표현형 내검 기록 모듈</p>
                  </div>
                </>
              )}

              {/* RESEARCHER / ADMIN Role Launcher Options */}
              {(user.role === "researcher" || user.role === "admin") && (
                <>
                  <div 
                    onClick={() => handleLaunch("browser")}
                    style={{ ...styles.infoCard, cursor: "pointer", borderLeft: "4px solid #3b82f6", padding: "20px" }}
                    className="feature-card-hover launcher-card"
                  >
                    <span style={{ fontSize: "28px" }}>🧬</span>
                    <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}>K-BEE-ID 디지털 육종 분석</h4>
                    <p style={{ fontSize: "11px", margin: 0 }}>범유전체 브라우저, 유전체 변이 트랙 탐색 분석 센터로 진입</p>
                  </div>

                  <div 
                    onClick={() => handleLaunch("researcher")}
                    style={{ ...styles.infoCard, cursor: "pointer", borderLeft: "4px solid #c084fc", padding: "20px" }}
                    className="feature-card-hover launcher-card"
                  >
                    <span style={{ fontSize: "28px" }}>🔬</span>
                    <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}>연구원 통합 분석 센터</h4>
                    <p style={{ fontSize: "11px", margin: 0 }}>전국 시딩 농가 스탯 관제 및 현미경 형태 측정 기록 관리</p>
                  </div>
                </>
              )}
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
          <div style={styles.featureCard} className="feature-card-hover" onClick={() => { if (!user) setInitialDashboardView("overview"); setShowDashboard(true); }}>
            <div style={styles.featureIcon}>🏡</div>
            <h3 style={styles.featureTitle}>1. 스마트폰 1분 내검 기록기</h3>
            <p style={styles.featureDesc}>
              장갑을 낀 상태에서도 손쉽게 조작할 수 있는 스마트폰 친화형 UI를 통해 벌통의 VSH(바로아응애 청소율) 및 상태를 실시간 기록하고 즉각 동기화합니다.
            </p>
          </div>

          <div style={{ ...styles.featureCard }} className="feature-card-hover" onClick={() => { handleLaunch("browser"); }}>
            <div style={styles.featureIcon}>🧬</div>
            <h3 style={styles.featureTitle}>2. 우수 유전자 원스톱 진단 서비스</h3>
            <p style={styles.featureDesc}>
              HiFi 롱리드 시퀀싱 분석 결과를 기반으로 동양종(토종벌) 및 서양종(양봉) 꿀벌의 참조 유전체 및 변이 트랙을 직관적으로 검제할 수 있는 범유전체 브라우저를 제공합니다.
            </p>
          </div>

          <div style={{ ...styles.featureCard, opacity: 0.4, cursor: "not-allowed" }} className="feature-card-hover" title="본 기능은 3년차(2027) 고도화 개발 예정 기능입니다">
            <div style={styles.featureIcon}>🏷️</div>
            <h3 style={styles.featureTitle}>3. 분자 마커 디자이너</h3>
            <p style={styles.featureDesc}>
              낭충봉아부패병(CSBV) 및 기후 적응 유전형 분석 마커 검증을 위한 프라이머 설계 기능과 PCR 전기영동 밴드 예측 가상 시뮬레이터를 독점 지원합니다.
            </p>
          </div>

          <div style={styles.featureCard} className="feature-card-hover" onClick={() => { if (!user) setInitialDashboardView("overview"); setShowDashboard(true); }}>
            <div style={styles.featureIcon}>👑</div>
            <h3 style={styles.featureTitle}>4. 가상 교배 매치메이커</h3>
            <p style={styles.featureDesc}>
              꿀벌 고유의 반수-배수체 집단 유전 알고리즘을 통해 여왕벌의 다중교배(Polyandry) 시나리오를 모사하여 복합 우수 형질을 발현시킬 수 있는 최적의 교배 조합을 진단합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: 유전자원 수집 현황 */}
      <div ref={samplingRef} style={styles.landingSection} className="mobile-section-padding">
        <div style={styles.sectionHeaderLanding}>
          <div style={styles.sectionTitlePre}>Genetic Resources Database</div>
          <h2 style={styles.sectionMainTitle} className="mobile-section-title">
            국내 꿀벌 유전자원 수집 현황
          </h2>
        </div>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <SamplingStatusPanel />
        </div>
      </div>

      {/* Section 5: 국내 꿀벌 계통수 */}
      <div ref={phylogenyRef} style={styles.landingSection} className="mobile-section-padding">
        <div style={styles.sectionHeaderLanding}>
          <div style={styles.sectionTitlePre}>Phylogenetic Tree Cladogram</div>
          <h2 style={styles.sectionMainTitle} className="mobile-section-title">
            국내 꿀벌 계통수 및 유전 거리 판별
          </h2>
        </div>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <PhylogenyPanel />
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
                🧬 대량 변이 발굴 및 분석 알고리즘 고도화
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                Oxford Nanopore Pore-C 스캐폴딩 조립을 완성하고, 200개체 규모의 대량 변이(SNP/Indel) 발굴(GWAS 분석)과 함께 다중교배 시뮬레이션 알고리즘 및 딥러닝 기반 형질 예측 모델(DNNGP)을 플랫폼에 연동합니다.
              </p>
            </div>
          </div>

          <div style={styles.roadmapItem} className="animate-slide">
            <div style={styles.roadmapYearBadge}>3년차 (2027)</div>
            <div style={styles.roadmapCard}>
              <h4 style={{ fontSize: "16px", fontWeight: "bold", color: "var(--color-gold)", marginBottom: "8px" }}>
                🌍 현장 검증 및 전국 육종 생태계 확산
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                실제 표현형-유전체 현장 실증 데이터를 완전 연동하여 신뢰도를 입증하고, 우수 여왕벌 디지털 품질 검증서 발급 및 K-BEE-ID 보급 체계를 갖추어 전국 양봉 농가와 연구소를 위한 통합 생태계로 확산합니다.
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
            <h4 style={{ color: "var(--color-gold)", fontWeight: "bold", marginBottom: "8px" }}>💡 양봉 농가(Farmer) 사용 안내</h4>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.6" }}>
              회원가입 시 "양봉 농가"를 선택하시면 즉시 온라인 봉군 모바일 내검 기록을 관리할 수 있습니다. 
              수집된 행동 데이터는 연구실의 형태측정 데이터와 실시간 결합하여 형질 개선율을 가상 예측하는 진단서를 발행할 수 있도록 지원합니다.
            </p>
          </div>

          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "24px"
          }}>
            <h4 style={{ color: "#60a5fa", fontWeight: "bold", marginBottom: "8px" }}>🔬 전문 육종 연구원(Researcher) 및 관리자(Admin) 안내</h4>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.6" }}>
              연구원 및 관리자 계정은 전국 가입 농가의 데이터를 연계/조회할 수 있는 통합 컨트롤 드롭다운이 활성화됩니다.
              게놈 브라우저를 통한 시각 분석 및 프라이머 설계, 모본-부본 계통 추적을 통한 가상 교배 시뮬레이터 기능을 독점 제공합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.landingFooter}>
        <div style={{ fontWeight: "bold", color: "var(--text-main)" }}>MelittaBreed Beekeeping Ecosystem</div>
        <div>© 2026 MelittaBreed Digital Breeding Center. All Rights Reserved.</div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          본 플랫폼은 농림축산식품부/농촌진흥청 이상기온 대응 꿀벌 육종 유전자원 플랫폼 개발 과제(과제번호: RS-2025-0221478)의 지원을 받아 수행되었으며, 한국농업기술진흥원 및 국가 유전자원 보존 관리 가이드라인을 준수하여 가동됩니다.
        </div>
      </footer>
    </div>
  );
}

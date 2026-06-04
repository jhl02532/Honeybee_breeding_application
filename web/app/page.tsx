"use client";

import { useState, useEffect, useRef } from "react";
import { User, Token } from "./types";
import { getStoredUser, getToken, setAuth, clearAuth } from "./utils";
import AuthScreen from "./components/AuthScreen";
import DashboardScreen from "./components/DashboardScreen";
import { styles } from "./styles";

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  const homeRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const manualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = getStoredUser();
    const token = getToken();
    if (stored && token) {
      setUser(stored);
    }
    setLoading(false);
  }, []);

  // Monitor scroll to update active navigation item
  useEffect(() => {
    if (user) return; // Only run on landing page
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      if (manualRef.current && scrollPos >= manualRef.current.offsetTop) {
        setActiveSection("manual");
      } else if (aboutRef.current && scrollPos >= aboutRef.current.offsetTop) {
        setActiveSection("about");
      } else {
        setActiveSection("home");
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [user]);

  const handleLogin = (data: Token) => {
    setAuth(data);
    setUser(data.user);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>, sectionName: string) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
      setActiveSection(sectionName);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
      </div>
    );
  }

  // Private Mode (Logged In) -> Show Dashboard View
  if (user) {
    return <DashboardScreen user={user} onLogout={handleLogout} />;
  }

  // Public Mode (Not Logged In) -> Show Premium Landing View
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
              ...(activeSection === "manual" ? styles.landingNavLinkActive : {}),
            }}
            onClick={() => scrollToSection(manualRef, "manual")}
            className="landing-nav-link-hover"
          >
            이용 안내
          </button>
        </nav>

        <div style={styles.landingHeaderRight}>
          <button
            onClick={() => setShowLoginModal(true)}
            className="btn-outline-hover"
            style={{
              ...styles.btnOutline,
              padding: "8px 18px",
              fontSize: "13px",
              borderRadius: "8px",
            }}
          >
            로그인
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div ref={homeRef} style={styles.landingHero} className="mobile-hero-padding">
        <h1 style={styles.heroTitle} className="mobile-hero-title">
          MelittaBreed: 꿀벌 디지털 육종 통합 플랫폼
        </h1>
        <p style={styles.heroSubtitle} className="mobile-hero-subtitle">
          디지털 형질 기록부터 AI 기반 다중교배 시뮬레이션, GBLUP 유전체 선발까지 하나로 연결되는 스마트 양봉 데이터 혁신을 경험해 보세요.
        </p>
        <div style={styles.heroActions} className="mobile-actions-stack">
          <button 
            style={styles.btnGold} 
            onClick={() => setShowLoginModal(true)} 
            className="btn-hover-effect"
          >
            플랫폼 시작하기 / 로그인
          </button>
          <button 
            style={styles.btnOutline} 
            onClick={() => scrollToSection(aboutRef, "about")}
            className="btn-outline-hover"
          >
            기능 둘러보기 ➔
          </button>
        </div>
      </div>

      {/* Features Grid Section */}
      <div ref={aboutRef} style={styles.landingSection} className="mobile-section-padding">
        <div style={styles.sectionHeaderLanding}>
          <div style={styles.sectionTitlePre}>Core Technologies</div>
          <h2 style={styles.sectionMainTitle} className="mobile-section-title">
            플랫폼 핵심 기능 안내
          </h2>
        </div>

        <div style={styles.landingGrid}>
          <div style={styles.featureCard} className="feature-card-hover" onClick={() => setShowLoginModal(true)}>
            <div style={styles.featureIcon}>🏡</div>
            <h3 style={styles.featureTitle}>1. 야외 현장 내검 기록기</h3>
            <p style={styles.featureDesc}>
              모바일 현장 내검을 통해 언제 어디서나 실시간으로 벌통의 데이터를 수집하고 클라우드로 즉시 동기화합니다.
            </p>
          </div>

          <div style={styles.featureCard} className="feature-card-hover" onClick={() => setShowLoginModal(true)}>
            <div style={styles.featureIcon}>🧬</div>
            <h3 style={styles.featureTitle}>2. 비교 유전체 브라우저</h3>
            <p style={styles.featureDesc}>
              동양종(토종벌) 및 서양종(양봉) 꿀벌의 유전체 지도를 시각화하고 주요 QTL(양적형질유전자좌) 영역을 정밀 비교 분석합니다.
            </p>
          </div>

          <div style={styles.featureCard} className="feature-card-hover" onClick={() => setShowLoginModal(true)}>
            <div style={styles.featureIcon}>🏷️</div>
            <h3 style={styles.featureTitle}>3. 분자 마커 설계 및 PCR</h3>
            <p style={styles.featureDesc}>
              꿀벌 육종의 표적 형질 타겟 마커 검출용 프라이머 세트를 설계하고 가상 PCR 시뮬레이션을 통해 밴드 크기를 예측합니다.
            </p>
          </div>

          <div style={styles.featureCard} className="feature-card-hover" onClick={() => setShowLoginModal(true)}>
            <div style={styles.featureIcon}>👑</div>
            <h3 style={styles.featureTitle}>4. 다중교배 육종 매치메이커</h3>
            <p style={styles.featureDesc}>
              월동 생존율, 채밀성, 온순성 등 다중 복합 형질의 유전력 시뮬레이션을 돌려 최적의 우수 교배 조합 후보군을 자동으로 매칭합니다.
            </p>
          </div>
        </div>

        {/* Informative Middle Layout */}
        <div style={{ ...styles.aboutContainer, marginTop: "60px" }} className="mobile-about-container">
          <div style={styles.aboutText}>
            <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#fbbf24" }}>
              한국형 디지털 스마트 육종 생태계의 완성
            </h3>
            <p>
              MelittaBreed는 국가적 보존 가치가 높은 토종벌 유전자원 보존과 경제성이 우수한 보급 여왕벌 품종 개량을 위해 구축된 스마트 육종 플랫폼입니다. 
            </p>
            <p>
              현장 농가의 친근한 내검 모바일 인터페이스와 분자 유전학 연구원의 고성능 빅데이터 분석 파이프라인을 실시간 연계하여 다중 테넌트 환경에서 보안 및 권한 격리를 유지하며 안정적인 데이터 연동을 지원합니다.
            </p>
          </div>
          <div style={styles.aboutGraphic} className="mobile-about-graphic">
            <span>🧬</span>
            <div style={{
              position: "absolute",
              fontSize: "12px",
              bottom: "20px",
              color: "#fbbf24",
              fontWeight: "600",
              letterSpacing: "2px"
            }}>
              DATA DRIVEN BREEDING
            </div>
          </div>
        </div>
      </div>

      {/* Manual Section */}
      <div ref={manualRef} style={styles.landingSection} className="mobile-section-padding">
        <div style={styles.sectionHeaderLanding}>
          <div style={styles.sectionTitlePre}>User Guidebook</div>
          <h2 style={styles.sectionMainTitle} className="mobile-section-title">
            이용 안내 및 매뉴얼
          </h2>
        </div>

        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{
            background: "rgba(31, 41, 55, 0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "12px",
            padding: "24px"
          }}>
            <h4 style={{ color: "#fbbf24", fontWeight: "bold", marginBottom: "8px" }}>💡 양봉 농가(Farmer) 사용 안내</h4>
            <p style={{ fontSize: "14px", color: "#d1d5db", lineHeight: "1.6" }}>
              회원가입 시 "양봉 농가"를 선택하시면 즉시 온라인 봉군 모바일 내검 기록을 관리할 수 있습니다. 
              수집된 행동 데이터는 연구실의 형태측정 데이터와 실시간 결합하여 형질 개선율을 가상 예측하는 진단서를 발행할 수 있도록 지원합니다.
            </p>
          </div>

          <div style={{
            background: "rgba(31, 41, 55, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            padding: "24px"
          }}>
            <h4 style={{ color: "#60a5fa", fontWeight: "bold", marginBottom: "8px" }}>🔬 전문 육종 연구원(Researcher) 및 관리자(Admin) 안내</h4>
            <p style={{ fontSize: "14px", color: "#d1d5db", lineHeight: "1.6" }}>
              연구원 및 관리자 계정은 전국 가입 농가의 데이터를 연계/조회할 수 있는 통합 컨트롤 드롭다운이 활성화됩니다.
              게놈 브라우저를 통한 시각 분석 및 프라이머 설계, 모본-부본 계통 추적을 통한 가상 교배 시뮬레이터 기능을 독점 제공합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.landingFooter}>
        <div style={{ fontWeight: "bold", color: "#f3f4f6" }}>MelittaBreed Beekeeping Ecosystem</div>
        <div>© 2026 MelittaBreed Digital Breeding Center. All Rights Reserved.</div>
        <div style={{ fontSize: "11px", color: "#4b5563" }}>
          본 플랫폼은 한국농업기술진흥원 및 국가 유전자원 보존 관리 가이드라인을 준수하여 가동됩니다.
        </div>
      </footer>

      {/* Glassmorphic Login Modal */}
      {showLoginModal && (
        <div 
          style={styles.modalBackdrop} 
          onClick={(e) => {
            // Close if clicking the backdrop itself
            if (e.target === e.currentTarget) setShowLoginModal(false);
          }}
        >
          <div style={styles.modalBox} className="animate-slide">
            {/* Close Button */}
            <button 
              style={styles.modalCloseBtn}
              onClick={() => setShowLoginModal(false)}
              title="닫기"
            >
              ✕
            </button>
            <AuthScreen onAuth={handleLogin} />
          </div>
        </div>
      )}
    </div>
  );
}

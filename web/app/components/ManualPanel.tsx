import React, { useState } from "react";
import { styles } from "../styles";

interface SectionProps {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function ManualSection({ title, icon, isOpen, onToggle, children }: SectionProps) {
  return (
    <div
      style={{
        background: "rgba(31, 41, 55, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "14px",
        marginBottom: "16px",
        overflow: "hidden",
        transition: "all 0.3s ease",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "18px 24px",
          background: isOpen ? "rgba(245, 158, 11, 0.08)" : "transparent",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: isOpen ? "#fbbf24" : "#f3f4f6",
          fontWeight: 700,
          fontSize: "16px",
          fontFamily: "inherit",
          transition: "all 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "20px" }}>{icon}</span>
          {title}
        </div>
        <span style={{ fontSize: "14px", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            padding: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.04)",
            color: "#d1d5db",
            fontSize: "14px",
            lineHeight: "1.7",
            animation: "fade 0.3s ease",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function ManualPanel() {
  const [openSection, setOpenSection] = useState<string | null>("intro");

  const toggle = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="animate-fade" style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Visual Welcome Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          borderRadius: "16px",
          padding: "28px",
          marginBottom: "28px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div style={{ fontSize: "44px" }}>📖</div>
        <div>
          <h2 style={{ ...styles.modalTitle, color: "#fbbf24", marginBottom: "6px" }}>멜리타브리드(MelittaBreed) 사용 안내서</h2>
          <p style={{ color: "#9ca3af", fontSize: "13px", lineHeight: "1.5" }}>
            본 시스템은 양봉 농가의 일상적인 내검 기록 관리부터, 대학 및 연구소 수준의 계통 추적과 형태학적 족보 관리를 원스톱으로 지원하는 육종 데이터 허브입니다.
          </p>
        </div>
      </div>

      {/* Manual Accordions */}
      <ManualSection
        title="소개: 농가와 연구원의 역할 분담 구조"
        icon="🤝"
        isOpen={openSection === "intro"}
        onToggle={() => toggle("intro")}
      >
        <p style={{ marginBottom: "12px" }}>
          멜리타브리드는 데이터의 객관성과 신뢰성을 위해 현장 농민과 분석 연구원의 전문 영역을 명확히 구분하여 처리합니다.
        </p>
        <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li>
            <strong>🏡 양봉 농가 (Farmer)</strong>: 매일 매일 봉장을 내검하며 꿀/프로폴리스 수확량, 벌의 성격(온순함), 응애 상태 및 분봉률 등을 기록합니다. 특히 <strong>VSH(응애 억제 발현율 %)</strong> 및 <strong>청소 청결율 (%)</strong> 등의 저항성 현장 수치는 농가가 직접 기입합니다.
          </li>
          <li>
            <strong>🔬 육종 연구원 (Researcher)</strong>: 농가에서 벌 시료 샘플을 받아 현미경으로 날개 날맥(큐비탈 지수) 및 혀 길이, 다리 크기 등 미세 계량 측정 항목을 입력하며, 이 정보는 <strong>여왕벌 ID (`queen_tag`)</strong>에 영구 결합됩니다.
          </li>
        </ul>
      </ManualSection>

      <ManualSection
        title="단계 1: 봉장(🏡) 및 봉군(🐝) 기초 관리"
        icon="🏡"
        isOpen={openSection === "step1"}
        onToggle={() => toggle("step1")}
      >
        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <li>
            <strong>양봉장 생성</strong>: <span style={{ color: "#fbbf24" }}>[양봉장 관리]</span> 메뉴로 이동하여 우측 상단의 <span style={{ color: "#fbbf24" }}>[+ 양봉장 추가]</span> 버튼을 누릅니다. 봉장 이름과 주소를 기입합니다.
          </li>
          <li>
            <strong>봉군(벌통) 등록</strong>: 생성된 봉장의 카드를 선택하거나 <span style={{ color: "#fbbf24" }}>[봉군 관리]</span> 메뉴로 이동하여 벌통을 추가합니다.
            <ul>
              <li><strong>벌통 코드</strong>: 식별 가능한 고유 코드(예: A-01)를 작성합니다.</li>
              <li><strong>여왕벌 태그</strong>: 해당 벌통에 들어있는 여왕벌의 고유 식별 명칭(예: Q-2026-Italian)을 부여합니다.</li>
              <li><strong>모계 봉군 지정 (가계 족보)</strong>: 이 여왕벌이 이식되거나 탄생한 모태 벌통(어미 여왕)을 드롭다운에서 선택하여 계통 족보 사슬(Pedigree Chain)을 구축합니다.</li>
            </ul>
          </li>
        </ol>
      </ManualSection>

      <ManualSection
        title="단계 2: 농가 일상 내검 및 형질 평가 기입 (📋)"
        icon="📋"
        isOpen={openSection === "step2"}
        onToggle={() => toggle("step2")}
      >
        <p style={{ marginBottom: "12px" }}>
          현장에서 내검을 마치면 <span style={{ color: "#fbbf24" }}>[형질 기록]</span> 메뉴에서 벌통별 날짜와 기상 정보를 바탕으로 기록을 저장합니다.
        </p>
        <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <li><strong>꿀 / 프로폴리스 / 로얄젤리 생산량</strong>: 수확한 무게를 kg 및 g 단위로 기입합니다.</li>
          <li><strong>형질 평가 (1-5 스타 평점)</strong>: 벌의 사나움 정도(온순함), 질병에 버티는 응애 저항성 점수를 부여합니다.</li>
          <li>
            <strong>행동학적 저항성 형질 기입 (VSH & 청소율)</strong>:
            <ul>
              <li><strong>VSH 행동 발현율 (%)</strong>: 소비의 응애 기생 벌집 제거율을 산출하여 0%~100% 사이로 기입합니다.</li>
              <li><strong>청소 청결율 (%)</strong>: 핀테스트(바늘로 유충을 찌름) 수행 후 24시간 내 청소 제거 비율을 기입합니다.</li>
            </ul>
            <span style={{ fontSize: "12px", color: "#fbbf24" }}>* 모바일에서는 + / - 버튼으로 5% 단위로 미세 조절하거나, 칸을 직접 눌러 원하는 수치를 키보드로 즉시 입력할 수 있습니다.</span>
          </li>
        </ul>
      </ManualSection>

      <ManualSection
        title="단계 3: 실험실 정밀 시료 검사 및 족보 모니터링 (🔬)"
        icon="🔬"
        isOpen={openSection === "step3"}
        onToggle={() => toggle("step3")}
      >
        <p style={{ marginBottom: "10px" }}>
          대학 또는 연구소 연구원 계정(`researcher`)으로 로그인 시에만 작동하는 연동 관리 기능입니다.
        </p>
        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li><strong>샘플 수령 및 분석</strong>: 농가로부터 제공받은 여왕벌 시료 분석 의뢰가 완료되면 여왕벌 식별 태그(`queen_tag`) 기준의 현미경 데이터를 기입합니다.</li>
          <li><strong>형태 미세 데이터 입력</strong>: 큐비탈 지수(Cubital Index), 설수장(혀 길이, mm), 테르지트 복판 색상, 다리 마디 마커 등을 저장합니다.</li>
          <li><strong>빅데이터 일괄 추출</strong>: <span style={{ color: "#60a5fa" }}>[전국 빅데이터 마스터 CSV 내보내기]</span> 버튼을 클릭하여 전국 농민들의 생산/내검 수치와 본 연구실의 형태 기록이 족보 단위로 완전히 조인된 CSV 통합 대장을 다운로드하여 R 또는 Excel로 분석합니다.</li>
        </ol>
      </ManualSection>

      <ManualSection
        title="네트워크 불량 및 오지에서의 오프라인 동기화 (🌲)"
        icon="🌲"
        isOpen={openSection === "step4"}
        onToggle={() => toggle("step4")}
      >
        <p style={{ marginBottom: "8px" }}>
          인터넷 신호가 도달하지 않는 깊은 산간 지역에서도 안전하게 데이터를 기입하고 추후 동기화할 수 있는 강력한 **Bulk Sync 프로토콜**을 완비했습니다.
        </p>
        <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li>
            <strong>오프라인 상태 기록</strong>: 기기에 임시 수동 저장(앱 개발 시 로컬 저장)하여 보관해 둡니다.
          </li>
          <li>
            <strong>2-Pass 지능형 벌크 업로드</strong>: 이동 전화 신호망이 확보되는 시점(집 또는 면사무소 등)에 모아둔 기록을 서버에 일괄 송신하면, 서버는 존재하지 않던 오프라인 봉장 명칭과 모계 관계를 순차적으로 해석하여 단 한 차례의 원격 트랜잭션으로 통합 정렬 등록을 안전하게 완료합니다.
          </li>
        </ul>
      </ManualSection>
    </div>
  );
}

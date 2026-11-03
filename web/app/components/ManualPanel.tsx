import React, { useState } from "react";

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

const SECTIONS: { key: string; title: string; icon: string; items: string[] }[] = [
  {
    key: "roles",
    title: "역할",
    icon: "🤝",
    items: [
      "연구자가 농가를 방문해 기록하고, 시료를 채집하고, 계보를 정정합니다.",
      "농가는 형질 합의, 사건 보고, 최종 선발 논의, 여왕 교체를 맡습니다.",
      "계정은 연구실 관리자가 발급합니다.",
    ],
  },
  {
    key: "setup",
    title: "시작 전: 양봉장·봉군·검정군",
    icon: "🏡",
    items: [
      "양봉장과 봉군을 등록합니다. 벌통 코드는 농가 안에서 겹치지 않게 정합니다.",
      "현장 기록에서 검정군을 만듭니다. 같은 종, 같은 해, 한 농가의 봉군을 묶습니다.",
      "1회차에 봉군마다 여왕을 등록합니다. 어미, 출생연도, 도입일, 교미 방식, 수벌군을 모르면 모름으로 둡니다.",
    ],
  },
  {
    key: "visit",
    title: "방문 기록",
    icon: "📝",
    items: [
      "회차를 시작하고 봉군마다 형질을 입력합니다. 값이 없으면 비워 두고(측정 안 함), 알 수 없으면 모름을 고릅니다.",
      "범위를 벗어난 값은 저장되지 않습니다. 직전 회차와 크게 다르거나 여왕 교체 6주 이내면 경고가 뜹니다.",
      "기록을 마치면 방문을 마감합니다. 마감 뒤 수정은 관리자가 다시 열어야 하고, 고친 값은 이력으로 남습니다.",
    ],
  },
  {
    key: "queen",
    title: "여왕 교체와 시료",
    icon: "👑",
    items: [
      "여왕이 바뀌면 봉군의 여왕을 교체로 등록합니다. 이전 여왕의 재임이 끝나고 교체 사건이 함께 남습니다.",
      "시료는 여왕이 등록된 봉군에서만 저장됩니다. 채집 뒤 여왕이 바뀌면 다시 채집합니다.",
      "여왕 계보 화면에서 어미, 딸, 교미, 재임 봉군을 확인합니다.",
    ],
  },
  {
    key: "compare",
    title: "비교표 읽기",
    icon: "📊",
    items: [
      "비교표는 같은 검정군, 같은 방문 안의 순위입니다. 다른 농가나 다른 종과 비교하지 않습니다.",
      "z는 비교 가능 봉군 평균과의 거리이고 양수가 좋은 방향입니다. 육종가가 아닙니다.",
      "여왕 미확정, 도입 42일 미만, 무왕, 일벌 산란, 시료-여왕 불일치 봉군은 순위에서 빠집니다.",
    ],
  },
];

export default function ManualPanel() {
  const [openSection, setOpenSection] = useState<string | null>("roles");

  return (
    <div className="animate-fade" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: 1.6, marginBottom: "20px" }}>
        K-BEE BANK는 여왕 계보, 봉군 검정 기록, 시료를 여러 해 이어서 쌓는 육종 기록 도구입니다. 측정 기준은 2027 시범 형질 사전을 따릅니다.
      </p>
      {SECTIONS.map((sec) => (
        <ManualSection
          key={sec.key}
          title={sec.title}
          icon={sec.icon}
          isOpen={openSection === sec.key}
          onToggle={() => setOpenSection(openSection === sec.key ? null : sec.key)}
        >
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {sec.items.map((t) => <li key={t} style={{ marginBottom: "6px" }}>{t}</li>)}
          </ul>
        </ManualSection>
      ))}
    </div>
  );
}

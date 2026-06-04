import React, { useState, useEffect } from "react";
import { Apiary, Colony } from "../types";

interface FarmerTraitSimulatorProps {
  apiaries: Apiary[];
}

export default function FarmerTraitSimulator({ apiaries }: FarmerTraitSimulatorProps) {
  // Simulator input states
  const [csbv, setCsbv] = useState<string>("Aa");
  const [vsh, setVsh] = useState<string>("Aa");
  const [sugar, setSugar] = useState<string>("Medium");
  const [temper, setTemper] = useState<string>("Moderate");

  // Selected colony from DB to populate values
  const [selectedColonyId, setSelectedColonyId] = useState<string>("");

  // Gather all colonies from apiaries
  const allColonies: { apiaryName: string; colony: Colony }[] = [];
  apiaries.forEach((apiary) => {
    apiary.colonies.forEach((colony) => {
      allColonies.push({ apiaryName: apiary.name, colony });
    });
  });

  // Handle Colony Data Loading from Database
  const handleLoadColonyData = (colonyIdStr: string) => {
    setSelectedColonyId(colonyIdStr);
    if (!colonyIdStr) return;

    const id = parseInt(colonyIdStr);
    const target = allColonies.find((c) => c.colony.id === id);
    if (!target) return;

    const records = target.colony.records || [];
    if (records.length === 0) return;

    // Calculate averages
    let sumVsh = 0, countVsh = 0;
    let sumHygienic = 0, countHygienic = 0;
    let sumTemperament = 0, countTemperament = 0;
    let sumVirus = 0, countVirus = 0;
    let sumHoney = 0, countHoney = 0;

    records.forEach((r) => {
      if (r.vsh_rate !== undefined) {
        sumVsh += r.vsh_rate;
        countVsh++;
      }
      if (r.hygienic_rate !== undefined) {
        sumHygienic += r.hygienic_rate;
        countHygienic++;
      }
      if (r.temperament !== undefined) {
        sumTemperament += r.temperament;
        countTemperament++;
      }
      if (r.virus_resistance !== undefined) {
        sumVirus += r.virus_resistance;
        countVirus++;
      }
      if (r.honey_production !== undefined) {
        sumHoney += r.honey_production;
        countHoney++;
      }
    });

    const avgVsh = countVsh > 0 ? sumVsh / countVsh : 50;
    const avgHygienic = countHygienic > 0 ? sumHygienic / countHygienic : 50;
    const avgTemperament = countTemperament > 0 ? sumTemperament / countTemperament : 3;
    const avgVirus = countVirus > 0 ? sumVirus / countVirus : 3;
    const avgHoney = countHoney > 0 ? sumHoney / countHoney : 15;

    // Estimate VSH Genotype (based on VSH / Clean Rate)
    const effectiveVsh = Math.max(avgVsh, avgHygienic);
    if (effectiveVsh >= 80) setVsh("AA");
    else if (effectiveVsh >= 40) setVsh("Aa");
    else setVsh("aa");

    // Estimate CSBV Genotype (based on Virus resistance score 1-5)
    if (avgVirus >= 4.0) setCsbv("AA");
    else if (avgVirus >= 2.5) setCsbv("Aa");
    else setCsbv("aa");

    // Estimate Temperament
    if (avgTemperament >= 4.0) setTemper("Gentle");
    else if (avgTemperament <= 2.2) setTemper("Aggressive");
    else setTemper("Moderate");

    // Estimate Sugar sensitivity based on honey production averages
    if (avgHoney >= 35) setSugar("High");
    else if (avgHoney >= 15) setSugar("Medium");
    else setSugar("Low");
  };

  // Trait score calculations
  const calculateScores = () => {
    // 1. Honey Yield Score (45 to 100)
    const honeyBase = 5;
    const honeySugar = sugar === "High" ? 50 : sugar === "Medium" ? 35 : 15;
    const honeyTemper = temper === "Aggressive" ? 45 : temper === "Moderate" ? 35 : 25;
    const honeyScore = honeyBase + honeySugar + honeyTemper;

    // 2. Disease Resistance (0 to 100)
    const diseaseCsbv = csbv === "AA" ? 50 : csbv === "Aa" ? 25 : 0;
    const diseaseVsh = vsh === "AA" ? 50 : vsh === "Aa" ? 25 : 0;
    const diseaseScore = diseaseCsbv + diseaseVsh;

    // 3. Gentleness (15 to 100)
    const gentleBase = 0;
    const gentleTemper = temper === "Gentle" ? 80 : temper === "Moderate" ? 50 : 10;
    const gentleVsh = vsh === "aa" ? 20 : vsh === "Aa" ? 15 : 5;
    const gentleScore = gentleBase + gentleTemper + gentleVsh;

    // 4. Fecundity (40 to 100)
    const fecundVsh = vsh === "aa" ? 50 : vsh === "Aa" ? 40 : 20;
    const fecundSugar = sugar === "Medium" ? 50 : sugar === "Low" ? 35 : 20;
    const fecundityScore = fecundVsh + fecundSugar;

    return { honeyScore, diseaseScore, gentleScore, fecundityScore };
  };

  const { honeyScore, diseaseScore, gentleScore, fecundityScore } = calculateScores();

  // Generate Report Narration
  const generateNarrative = () => {
    const reports: string[] = [];
    if (diseaseScore >= 80) {
      reports.push(
        "✓ 본 봉군은 낭충봉아부패병(CSBV) 및 바로아 응애 저항성 유전인자가 안정적으로 고정되어 위생 및 면역 활성이 최상위급입니다."
      );
    } else if (diseaseScore < 40) {
      reports.push(
        "⚠ 질병 저항성 유전자 고정도가 매우 낮습니다. 낭충봉아부패병 및 진드기 감염 취약군이므로 격리 방제 및 저항성 종봉 교배 개량이 긴급 요구됩니다."
      );
    } else {
      reports.push("• 질병 저항성이 보통 수준입니다. 정기적 약제 방제와 위생 상태 모니터링이 필요합니다.");
    }

    if (honeyScore >= 80) {
      reports.push(
        "✓ 설탕 민감성이 극대화되어 아카시아 등 유밀기의 유밀 수밀력이 매우 탁월할 것으로 예측됩니다."
      );
    } else if (honeyScore < 60) {
      reports.push(
        "• 수밀력 성향이 다소 정체되어 있습니다. 외역 채집량 증대를 위해 외부 사양 보강이 권장됩니다."
      );
    }

    if (gentleScore >= 80) {
      reports.push(
        "✓ 온순성이 매우 훌륭하여 관리 및 내검이 대단히 용이하며 벌침 쏘임 사고 우려가 대폭 감소합니다."
      );
    } else if (gentleScore < 40) {
      reports.push(
        "⚠ 봉군 방어 성향이 지나치게 강해 내검 시 주의(보호 장구 필수)가 필요하며 민가 인근 배치 시 방벽 설치가 필요합니다."
      );
    }

    if (fecundityScore < 60) {
      reports.push(
        "⚠ 과도한 VSH 작용 또는 채집 쏠림으로 유밀기 육아율(Fecundity) 저하 현상이 보일 수 있으니 단백질 화분떡 공급을 적극 늘려주세요."
      );
    } else {
      reports.push("✓ 벌통 내 육아 및 여왕벌 산란력이 훌륭하게 유지되어 안정적인 일벌 개체수 회전율을 보장합니다.");
    }

    return reports;
  };

  // Custom SVG Radar Chart properties
  const radarWidth = 320;
  const radarHeight = 240;
  const cx = radarWidth / 2; // 160
  const cy = radarHeight / 2; // 120
  const scale = 0.9; // 100 points scale to 90px

  // Compute vertices
  // Top: Honey, Right: Disease, Bottom: Gentle, Left: Fecundity
  const getPoints = () => {
    const x0 = cx;
    const y0 = cy - honeyScore * scale;
    const x1 = cx + diseaseScore * scale;
    const y1 = cy;
    const x2 = cx;
    const y2 = cy + gentleScore * scale;
    const x3 = cx - fecundityScore * scale;
    const y3 = cy;
    return `${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}`;
  };

  // Grid background diamonds (20, 40, 60, 80, 100)
  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div className="animate-fade flex flex-col gap-6" id="tab-content-farmer">
      {/* Title */}
      <div className="flex justify-between items-center bg-slate-900/60 p-4 border border-slate-800 rounded-2xl backdrop-blur-md no-print gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📈</span>
          <div>
            <h2 className="text-xl font-bold text-amber-400">형질 예측 시뮬레이터 (Farmer Trait Simulator)</h2>
            <p className="text-xs text-slate-400 font-medium">
              CSBV, VSH 유전자형과 화학적 감각 성향 값을 기반으로 종합 유밀 채집력, 질병 방어 지표를 모사 진단합니다.
            </p>
          </div>
        </div>

        {/* Print Button */}
        <button
          id="farmer-print-btn"
          onClick={() => window.print()}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-all cursor-pointer"
        >
          🖨️ 진단 보고서 인쇄 (Cmd+P)
        </button>
      </div>

      {/* Database Colony Loader selector (no-print) */}
      <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md no-print flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          농가 봉군 데이터 연동 (DB Integration)
        </h3>
        <div className="flex flex-wrap gap-4 items-center">
          <label className="text-xs text-slate-300 font-semibold">데이터 불러올 봉군 선택:</label>
          <select
            value={selectedColonyId}
            onChange={(e) => handleLoadColonyData(e.target.value)}
            className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-2.5 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all font-semibold max-w-sm flex-1"
          >
            <option value="">-- 내 봉군 목록 선택 (초기화) --</option>
            {allColonies.map((item) => (
              <option key={item.colony.id} value={item.colony.id}>
                {item.apiaryName} - 벌통: {item.colony.code} (여왕벌: {item.colony.queen_tag})
              </option>
            ))}
          </select>
          {selectedColonyId && (
            <span className="text-[11px] text-emerald-400 font-semibold animate-fade">
              ✓ 선택 봉군의 최근 형질 평가 데이터가 로드되었습니다.
            </span>
          )}
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start farmer-grid">
        {/* Left Form controls (no-print) */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-md no-print flex flex-col gap-5">
          <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800/80 pb-2">
            🧬 가상 봉군 유전자형 설정 (Phenotype Inputs)
          </h3>

          {/* CSBV dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-semibold">
              낭충봉아부패병 저항성 인자 (CSBV Genotype):
            </label>
            <select
              value={csbv}
              onChange={(e) => setCsbv(e.target.value)}
              className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-3 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all font-semibold"
            >
              <option value="AA">AA (동형저항성 - 바이러스 전면 방어)</option>
              <option value="Aa">Aa (이형보인자 - 바이러스 보균 생존)</option>
              <option value="aa">aa (감수성 - 바이러스 감염 시 사멸 취약)</option>
            </select>
          </div>

          {/* VSH dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-semibold">
              바로아 응애 저항성 청소 인자 (VSH Genotype):
            </label>
            <select
              value={vsh}
              onChange={(e) => setVsh(e.target.value)}
              className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-3 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all font-semibold"
            >
              <option value="AA">AA (저항성 청결 - 응애 유충 발견 즉시 제거)</option>
              <option value="Aa">Aa (보인 청결 - 부분 청소 및 방어)</option>
              <option value="aa">aa (감수 청결 - 응애 감지 능력 상실)</option>
            </select>
          </div>

          {/* Sugar Sensitivity dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-semibold">
              화학적 당도 민감성 성향 (Sugar Sensitivity Phenotype):
            </label>
            <select
              value={sugar}
              onChange={(e) => setSugar(e.target.value)}
              className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-3 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all font-semibold"
            >
              <option value="High">High (민감성 최상 - 아카시아 꿀 채집 최우선)</option>
              <option value="Medium">Medium (민감성 보통 - 보편적 채집 성향)</option>
              <option value="Low">Low (민감성 낮음 - 채집 보류 및 사양 급여 의존)</option>
            </select>
          </div>

          {/* Temperament dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-semibold">
              온순성 및 공격성 행동 지표 (Colony Temperament Index):
            </label>
            <select
              value={temper}
              onChange={(e) => setTemper(e.target.value)}
              className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-3 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all font-semibold"
            >
              <option value="Gentle">Gentle (극도로 온순 - 내검 및 벌통 관리 용이)</option>
              <option value="Moderate">Moderate (보통 - 기상 악화 시 일시 방어성 발현)</option>
              <option value="Aggressive">Aggressive (사나움 - 벌집 접근 시 경계 공격 증가)</option>
            </select>
          </div>
        </div>

        {/* Right Printable Certificate details */}
        <div
          id="farmer-certificate-panel"
          className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-md flex flex-col print:border-2 print:border-black print:text-black print:bg-white print:p-12 print:min-h-[250mm] relative"
        >
          {/* Certificate header */}
          <div className="panel-header border-b border-slate-800/80 pb-4 mb-4 flex justify-between items-center print:border-black print:mb-8">
            <h2 className="panel-title text-base font-bold text-slate-200 print:text-black print:text-2xl print:text-center print:w-full">
              📜 꿀벌 유전 형질 분석 결과 진단서
            </h2>
          </div>

          <div className="panel-body flex flex-col gap-6">
            {/* Visual vector SVG chart */}
            <div className="flex justify-center bg-slate-950/40 p-4 border border-slate-900 rounded-xl print:bg-white print:border-none print:shadow-none">
              <svg
                width={radarWidth}
                height={radarHeight}
                viewBox={`0 0 ${radarWidth} ${radarHeight}`}
                className="block overflow-visible"
              >
                 {/* 1. Grid level diamonds */}
                {gridLevels.map((lvl) => {
                  const size = lvl * scale;
                  const x0 = cx;
                  const y0 = cy - size;
                  const x1 = cx + size;
                  const y1 = cy;
                  const x2 = cx;
                  const y2 = cy + size;
                  const x3 = cx - size;
                  const y3 = cy;

                  return (
                    <polygon
                      key={lvl}
                      points={`${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}`}
                      fill="none"
                      stroke="var(--border-color)"
                      strokeWidth="1"
                      className="print:stroke-slate-200"
                    />
                  );
                })}

                {/* 2. Grid axial lines */}
                <line x1={cx} y1={cy - 100} x2={cx} y2={cy + 100} stroke="var(--border-color)" className="print:stroke-slate-200" />
                <line x1={cx - 100} y1={cy} x2={cx + 100} y2={cy} stroke="var(--border-color)" className="print:stroke-slate-200" />

                {/* 3. Radial labels */}
                <text x={cx} y={cy - 102} fill="var(--text-muted)" className="print:fill-slate-800" fontSize="8" fontWeight="bold" textAnchor="middle">
                  수밀력 ({honeyScore})
                </text>
                <text x={cx + 105} y={cy + 3} fill="var(--text-muted)" className="print:fill-slate-800" fontSize="8" fontWeight="bold" textAnchor="start">
                  질병저항성 ({diseaseScore})
                </text>
                <text x={cx} y={cy + 110} fill="var(--text-muted)" className="print:fill-slate-800" fontSize="8" fontWeight="bold" textAnchor="middle">
                  온순성 ({gentleScore})
                </text>
                <text x={cx - 105} y={cy + 3} fill="var(--text-muted)" className="print:fill-slate-800" fontSize="8" fontWeight="bold" textAnchor="end">
                  번식력 ({fecundityScore})
                </text>

                {/* 4. Score polygon data */}
                <polygon
                  points={getPoints()}
                  fill="var(--color-gold-glow)"
                  stroke="var(--color-gold)"
                  strokeWidth="2"
                  className="print:fill-amber-500/10 print:stroke-amber-600"
                />

                {/* Vertices dot highlights */}
                <circle cx={cx} cy={cy - honeyScore * scale} r="3" fill="var(--color-gold)" />
                <circle cx={cx + diseaseScore * scale} cy={cy} r="3" fill="var(--color-gold)" />
                <circle cx={cx} cy={cy + gentleScore * scale} r="3" fill="var(--color-gold)" />
                <circle cx={cx - fecundityScore * scale} cy={cy} r="3" fill="var(--color-gold)" />
              </svg>
            </div>

            {/* Diagnostic Narrative Text */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 print:text-black">
                종합 소견 및 처방 보고서 (Veterinary Report)
              </h4>
              <div
                id="farmer-report-text"
                className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-4 border border-slate-900 rounded-xl flex flex-col gap-3.5 print:bg-white print:border-none print:p-0 print:text-[14px]"
              >
                {generateNarrative().map((text, idx) => (
                  <div key={idx} dangerouslySetInnerHTML={{ __html: text }}></div>
                ))}
              </div>
            </div>

            {/* Print Disclaimer (Bottom aligned in PDF) */}
            <div className="disclaimer-container text-[10px] text-slate-500 leading-normal border-t border-slate-800 pt-3 mt-6 print:absolute print:bottom-12 print:left-12 print:right-12 print:border-black print:text-black print:text-xs">
              본 진단서는 농가 입력 데이터 및 가상 유전 모델 분석 결과로서, 기후 요인과 방제 상태에 따라 실제 농가 발현치와 오차가 존재할 수 있습니다. 
              국립농업과학원 유전 데이터 검증 지침에 근거합니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

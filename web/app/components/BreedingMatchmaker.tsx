import React, { useState, useEffect } from "react";
import { Apiary, Colony } from "../types";

interface BreedingMatchmakerProps {
  apiaries: Apiary[];
}

export default function BreedingMatchmaker({ apiaries }: BreedingMatchmakerProps) {
  // Queen Genotypes (Maternal)
  const [queenCsbv, setQueenCsbv] = useState<string>("Aa");
  const [queenVsh, setQueenVsh] = useState<string>("Aa");

  // Selected maternal colony loader from DB
  const [selectedMaternalColonyId, setSelectedMaternalColonyId] = useState<string>("");

  // Drone Pool state (15 drones for each trait)
  // Each index represents a drone: true = allele A, false = allele a
  const [csbvDrones, setCsbvDrones] = useState<boolean[]>(Array.from({ length: 15 }, (_, i) => i < 10)); // 10 WT / 5 mut
  const [vshDrones, setVshDrones] = useState<boolean[]>(Array.from({ length: 15 }, (_, i) => i < 8));   // 8 WT / 7 mut

  const csbvACount = csbvDrones.filter(Boolean).length;
  const vshACount = vshDrones.filter(Boolean).length;

  // Gather all colonies from apiaries for Queen load dropdown
  const allColonies: { apiaryName: string; colony: Colony }[] = [];
  apiaries.forEach((apiary) => {
    apiary.colonies.forEach((colony) => {
      allColonies.push({ apiaryName: apiary.name, colony });
    });
  });

  // Handle Mother Colony select
  const handleLoadMotherColony = (colonyIdStr: string) => {
    setSelectedMaternalColonyId(colonyIdStr);
    if (!colonyIdStr) return;

    const id = parseInt(colonyIdStr);
    const target = allColonies.find((c) => c.colony.id === id);
    if (!target) return;

    const records = target.colony.records || [];
    if (records.length === 0) return;

    let sumVsh = 0, countVsh = 0;
    let sumHygienic = 0, countHygienic = 0;
    let sumVirus = 0, countVirus = 0;

    records.forEach((r) => {
      if (r.vsh_rate !== undefined) {
        sumVsh += r.vsh_rate;
        countVsh++;
      }
      if (r.hygienic_rate !== undefined) {
        sumHygienic += r.hygienic_rate;
        countHygienic++;
      }
      if (r.virus_resistance !== undefined) {
        sumVirus += r.virus_resistance;
        countVirus++;
      }
    });

    const avgVsh = countVsh > 0 ? sumVsh / countVsh : 50;
    const avgHygienic = countHygienic > 0 ? sumHygienic / countHygienic : 50;
    const avgVirus = countVirus > 0 ? sumVirus / countVirus : 3;

    // Set Queen genotypes based on DB record averages
    const effectiveVsh = Math.max(avgVsh, avgHygienic);
    if (effectiveVsh >= 80) setQueenVsh("AA");
    else if (effectiveVsh >= 40) setQueenVsh("Aa");
    else setQueenVsh("aa");

    if (avgVirus >= 4.0) setQueenCsbv("AA");
    else if (avgVirus >= 2.5) setQueenCsbv("Aa");
    else setQueenCsbv("aa");
  };

  // Slider change handler (sets first X elements to true, remainder false)
  const handleSliderChange = (val: number, type: "csbv" | "vsh") => {
    const updated = Array.from({ length: 15 }, (_, i) => i < val);
    if (type === "csbv") {
      setCsbvDrones(updated);
    } else {
      setVshDrones(updated);
    }
  };

  // Checkbox toggle handler
  const handleCheckboxToggle = (idx: number, type: "csbv" | "vsh") => {
    if (type === "csbv") {
      const copy = [...csbvDrones];
      copy[idx] = !copy[idx];
      setCsbvDrones(copy);
    } else {
      const copy = [...vshDrones];
      copy[idx] = !copy[idx];
      setVshDrones(copy);
    }
  };

  // 1:N Polyandry calculation engine
  const computePolyandryInheritance = (queen: string, countA: number) => {
    const total = 15;
    const count_a = total - countA;
    const p = countA / total;
    const q = count_a / total;

    const split = { AA: 0, Aa: 0, aa: 0 };

    if (queen === "AA") {
      split["AA"] = p * 100;
      split["Aa"] = q * 100;
    } else if (queen === "Aa") {
      split["AA"] = 0.5 * p * 100;
      split["Aa"] = 0.5 * 100; // 0.5 * p * 100 + 0.5 * q * 100 = 50%
      split["aa"] = 0.5 * q * 100;
    } else if (queen === "aa") {
      split["Aa"] = p * 100;
      split["aa"] = q * 100;
    }

    return split;
  };

  const csbvSplit = computePolyandryInheritance(queenCsbv, csbvACount);
  const vshSplit = computePolyandryInheritance(queenVsh, vshACount);

  // Advisory narration builder
  const generateAdvisory = () => {
    const advice: string[] = [];

    // CSBV check
    const aaCsbvPct = csbvSplit.aa;
    const AACsbvPct = csbvSplit.AA;
    if (aaCsbvPct > 0) {
      advice.push(
        `⚠ <strong>낭충봉아부패병(CSBV) 취약 위험 개체 발생:</strong> F1 일벌 집단의 <strong>${aaCsbvPct.toFixed(
          1
        )}%</strong>가 감수성 유전자형(aa)으로 발현되어 바이러스 감염 시 봉군 전체의 소멸 위험이 높습니다. CSBV 저항성형 수벌(A)의 수(현재 ${csbvACount}마리)를 더 늘려 교배 조합을 수정하십시오.`
      );
    } else if (AACsbvPct === 100) {
      advice.push(
        `✓ <strong>CSBV 저항성 완전 고정:</strong> F1 일벌 집단의 100%가 저항성형(AA)으로 태어납니다. 바이러스에 매우 우수한 저항력을 가지며 유전학적으로 완벽히 고정된 안전한 조합입니다.`
      );
    } else {
      advice.push(
        `• <strong>CSBV 보인자 보유 조합:</strong> F1 일벌의 ${AACsbvPct.toFixed(1)}%가 AA 저항성, ${csbvSplit.Aa.toFixed(
          1
        )}%가 Aa 보인자형으로 발현합니다. 질병 증상은 발현하지 않으나 차세대 여왕벌 육성 시 유전 형질이 분리되므로 추가 저항성 고정 작업이 필요합니다.`
      );
    }

    // VSH check
    const aaVshPct = vshSplit.aa;
    const AAVshPct = vshSplit.AA;
    if (aaVshPct > 0) {
      advice.push(
        `⚠ <strong>응애 자연 정화(VSH) 기능 결핍 위험:</strong> F1 일벌 집단의 <strong>${aaVshPct.toFixed(
          1
        )}%</strong>가 VSH 청소 본능이 결핍(aa)됩니다. 이 교배 조합 시 가을철 응애 밀도가 급증할 수 있으므로 VSH 위생 행동을 갖춘 수벌(A)의 비중(현재 ${vshACount}마리)을 크게 높여 보완 조치하십시오.`
      );
    } else if (AAVshPct === 100) {
      advice.push(
        `✓ <strong>친환경 VSH 청소력 고정:</strong> F1 일벌 집단의 100%가 강력한 VSH 청소 본능(AA)을 나타내어 외부 약제 사용량 감축과 진드기 예방이 가능한 이상적인 조합입니다.`
      );
    } else {
      advice.push(
        `• <strong>VSH 행동력 혼합군:</strong> VSH 청소 능력이 부분적으로 발현(AA 및 Aa 혼재)하여 일반 봉군보다는 청소 행동이 양호하지만, 청소 본능이 완벽히 고정되지 않은 조합입니다. 개량 고정도를 높이기 위해 VSH 수벌(A)의 수치를 늘리는 것을 권장합니다.`
      );
    }

    return advice;
  };

  // Render Punnett Square helper
  const renderPunnettTable = (queen: string, countA: number) => {
    const qEggs = queen === "Aa" ? ["A", "a"] : queen === "AA" ? ["A", "A"] : ["a", "a"];
    const total = 15;
    const count_a = total - countA;
    const fA = countA / total;
    const fa = count_a / total;

    const getGenoClass = (geno: string) => {
      if (geno === "AA") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      if (geno === "Aa" || geno === "aA") return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    };

    const formatGeno = (geno: string) => {
      if (geno === "aA") return "Aa";
      return geno;
    };

    return (
      <table className="w-full text-center border-collapse text-xs mt-3">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="p-2 text-slate-500 font-semibold font-mono">♀ \ ♂</th>
            <th className="p-2 text-emerald-400 font-bold">A ({(fA * 100).toFixed(1)}%)</th>
            <th className="p-2 text-rose-400 font-bold">a ({(fa * 100).toFixed(1)}%)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-900/60">
            <th className="p-3 text-slate-400 border-r border-slate-800 font-bold">{qEggs[0]} (50%)</th>
            <td className={`p-3 font-bold ${getGenoClass(qEggs[0] + "A")}`}>
              {formatGeno(qEggs[0] + "A")}
              <span className="text-[9px] text-slate-500 font-normal block mt-1">
                ({(50 * fA).toFixed(1)}%)
              </span>
            </td>
            <td className={`p-3 font-bold ${getGenoClass(qEggs[0] + "a")}`}>
              {formatGeno(qEggs[0] + "a")}
              <span className="text-[9px] text-slate-500 font-normal block mt-1">
                ({(50 * fa).toFixed(1)}%)
              </span>
            </td>
          </tr>
          <tr>
            <th className="p-3 text-slate-400 border-r border-slate-800 font-bold">{qEggs[1]} (50%)</th>
            <td className={`p-3 font-bold ${getGenoClass(qEggs[1] + "A")}`}>
              {formatGeno(qEggs[1] + "A")}
              <span className="text-[9px] text-slate-500 font-normal block mt-1">
                ({(50 * fA).toFixed(1)}%)
              </span>
            </td>
            <td className={`p-3 font-bold ${getGenoClass(qEggs[1] + "a")}`}>
              {formatGeno(qEggs[1] + "a")}
              <span className="text-[9px] text-slate-500 font-normal block mt-1">
                ({(50 * fa).toFixed(1)}%)
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    );
  };

  // Stacked percentage bar helper
  const renderPercentBar = (split: { AA: number; Aa: number; aa: number }) => {
    return (
      <div className="w-full mt-3">
        <div className="flex h-5 bg-slate-950 border border-slate-900 rounded-lg overflow-hidden p-0.5 mb-3">
          {split.AA > 0 && (
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${split.AA}%` }}
              title={`저항성형 AA: ${split.AA.toFixed(1)}%`}
            />
          )}
          {split.Aa > 0 && (
            <div
              className="bg-amber-500 transition-all duration-300"
              style={{ width: `${split.Aa}%` }}
              title={`보인자형 Aa: ${split.Aa.toFixed(1)}%`}
            />
          )}
          {split.aa > 0 && (
            <div
              className="bg-rose-500 transition-all duration-300"
              style={{ width: `${split.aa}%` }}
              title={`감수성형 aa: ${split.aa.toFixed(1)}%`}
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 저항성형 (AA)
            </span>
            <span className="font-mono text-slate-200 font-bold">{split.AA.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> 보인자형 (Aa)
            </span>
            <span className="font-mono text-slate-200 font-bold">{split.Aa.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> 감수성형 (aa)
            </span>
            <span className="font-mono text-slate-200 font-bold">{split.aa.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center bg-slate-900/60 p-4 border border-slate-800 rounded-2xl backdrop-blur-md gap-3">
        <span className="text-3xl">🐝</span>
        <div>
          <h2 className="text-xl font-bold text-amber-400">가상 교배 시뮬레이터 (Breeding Matchmaker)</h2>
          <p className="text-xs text-slate-400 font-medium">
            여왕벌과 다수의 수벌(다중 교배, Polyandry)의 교배 시나리오를 설정하고 F1 자손의 질병 저항성 유전 빈도를 예측합니다.
          </p>
        </div>
      </div>

      {/* Mother Colony selection from Database (no-print) */}
      <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          여왕벌 모계 데이터 연동 (Maternal Queen DB Loader)
        </h3>
        <div className="flex flex-wrap gap-4 items-center">
          <label className="text-xs text-slate-300 font-semibold">모본 여왕벌로 사용할 봉군 선택:</label>
          <select
            value={selectedMaternalColonyId}
            onChange={(e) => handleLoadMotherColony(e.target.value)}
            className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-2.5 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all font-semibold max-w-sm flex-1"
          >
            <option value="">-- 내 봉군 목록 선택 (수동 조절) --</option>
            {allColonies.map((item) => (
              <option key={item.colony.id} value={item.colony.id}>
                {item.apiaryName} - 여왕벌: {item.colony.queen_tag} (코드: {item.colony.code})
              </option>
            ))}
          </select>
          {selectedMaternalColonyId && (
            <span className="text-[11px] text-emerald-400 font-semibold animate-fade">
              ✓ 선택 여왕벌의 추정 유전자형이 모본에 자동 이식되었습니다.
            </span>
          )}
        </div>
      </div>

      {/* Grid Parents vs Projections */}
      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6 items-start">
        {/* Left Parent settings */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md flex flex-col gap-5">
          <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-2 flex items-center gap-2">
            🧬 교배 봉군 부모 선택 (Select Parents)
          </h3>

          {/* 1. Mother Queen Genotypes */}
          <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-xl flex flex-col gap-3">
            <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> 모본: 여왕벌 유전자형 (2n Queen)
            </h4>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-semibold">CSBV 저항성 유전자형</label>
              <select
                value={queenCsbv}
                onChange={(e) => setQueenCsbv(e.target.value)}
                className="bg-slate-950/70 border border-slate-850 text-slate-300 text-xs px-3 py-2 rounded-lg outline-none cursor-pointer focus:border-sky-500 transition-all font-semibold"
              >
                <option value="AA">AA (동형접합 저항성형)</option>
                <option value="Aa">Aa (이형접합 보인자형)</option>
                <option value="aa">aa (동형접합 감수성형)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-semibold">위생 행동 마커 (VSH E23)</label>
              <select
                value={queenVsh}
                onChange={(e) => setQueenVsh(e.target.value)}
                className="bg-slate-950/70 border border-slate-850 text-slate-300 text-xs px-3 py-2 rounded-lg outline-none cursor-pointer focus:border-sky-500 transition-all font-semibold"
              >
                <option value="AA">AA (동형접합 VSH형)</option>
                <option value="Aa">Aa (이형접합 캐리어)</option>
                <option value="aa">aa (위생 행동 없음)</option>
              </select>
            </div>
          </div>

          {/* 2. Polyandry Drones Pool */}
          <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-xl flex flex-col gap-4">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 부본: 수벌 집단 대립유전자 뱅크 (1n Drones - Max 15)
            </h4>

            {/* CSBV sliders and check grids */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-400">CSBV 저항인자 (A)</span>
                <span className="text-sky-400 font-mono">A: {csbvACount} / a: {15 - csbvACount}</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                value={csbvACount}
                onChange={(e) => handleSliderChange(parseInt(e.target.value), "csbv")}
                className="w-full accent-amber-500 h-1.5 rounded bg-slate-900 outline-none cursor-pointer"
              />
              {/* Checkboxes grid */}
              <div className="flex flex-wrap gap-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-900/50 justify-between">
                {csbvDrones.map((checked, i) => (
                  <button
                    key={i}
                    onClick={() => handleCheckboxToggle(i, "csbv")}
                    className={`w-5 h-5 rounded-full text-[9px] font-extrabold flex items-center justify-center border transition-all ${
                      checked
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    }`}
                  >
                    {checked ? "A" : "a"}
                  </button>
                ))}
              </div>
            </div>

            {/* VSH sliders and check grids */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-400">VSH 청소인자 (A)</span>
                <span className="text-purple-400 font-mono">A: {vshACount} / a: {15 - vshACount}</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                value={vshACount}
                onChange={(e) => handleSliderChange(parseInt(e.target.value), "vsh")}
                className="w-full accent-amber-500 h-1.5 rounded bg-slate-900 outline-none cursor-pointer"
              />
              {/* Checkboxes grid */}
              <div className="flex flex-wrap gap-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-900/50 justify-between">
                {vshDrones.map((checked, i) => (
                  <button
                    key={i}
                    onClick={() => handleCheckboxToggle(i, "vsh")}
                    className={`w-5 h-5 rounded-full text-[9px] font-extrabold flex items-center justify-center border transition-all ${
                      checked
                        ? "bg-purple-500/10 border-purple-500 text-purple-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    }`}
                  >
                    {checked ? "A" : "a"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right cross projections */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md flex flex-col gap-6">
          <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-2 flex items-center gap-1.5">
            ⚡ 교배 자손 유전 확률 예측 결과 (Cross Projections)
          </h3>

          {/* Predictions block splits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-xl flex flex-col justify-between">
              <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">
                CSBV 저항인자 자손 비율 (F1 Offspring)
              </h4>
              {renderPercentBar(csbvSplit)}
            </div>
            <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-xl flex flex-col justify-between">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                VSH 청소인자 자손 비율 (F1 Offspring)
              </h4>
              {renderPercentBar(vshSplit)}
            </div>
          </div>

          {/* Punnett Squares */}
          <div className="bg-slate-950/30 border border-slate-900/60 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
              가상 교배 퍼넷 사각형 (Virtual Punnett Squares)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-[10px] text-slate-400 font-semibold text-center mb-1">CSBV 유전자 분리비</h5>
                {renderPunnettTable(queenCsbv, csbvACount)}
              </div>
              <div>
                <h5 className="text-[10px] text-slate-400 font-semibold text-center mb-1">VSH 유전자 분리비</h5>
                {renderPunnettTable(queenVsh, vshACount)}
              </div>
            </div>
          </div>

          {/* Expert advisor */}
          <div className="bg-emerald-500/5 border-l-4 border-emerald-500/80 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              💡 농가 맞춤 교배 가이드 (Breeder Expert Advisory)
            </h4>
            <div className="text-xs text-emerald-200/90 leading-relaxed font-sans flex flex-col gap-2.5">
              {generateAdvisory().map((text, idx) => (
                <p key={idx} dangerouslySetInnerHTML={{ __html: text }}></p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

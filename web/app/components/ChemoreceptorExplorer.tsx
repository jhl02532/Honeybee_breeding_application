import React, { useState } from "react";
import { GENOME_DATA, ORTHOLOGY_MAP } from "../data/genomeData";

export default function ChemoreceptorExplorer() {
  const [searchVal, setSearchVal] = useState("");
  const [classVal, setClassVal] = useState("all");
  const [pathwayVal, setPathwayVal] = useState("all");

  // Gather chemoreceptor items
  const chemoItems: any[] = [];

  // 1. Gather 1:1 Ortholog Chemoreceptors
  ORTHOLOGY_MAP.forEach((pair: any) => {
    const melGene = GENOME_DATA.mellifera.genes.find((g: any) => g.symbol === pair.mellifera.symbol);
    const cerGene = GENOME_DATA.cerana.genes.find((g: any) => g.symbol === pair.cerana.symbol);

    const fClass = (melGene && melGene.functional_class) || (cerGene && cerGene.functional_class) || pair.category;
    const pathId = (melGene && melGene.pathway_id) || (cerGene && cerGene.pathway_id) || "PW_OLFACTORY";

    if (
      fClass === "Chemoreceptor" ||
      pair.category.toLowerCase().includes("chemo") ||
      pair.category.toLowerCase().includes("odor")
    ) {
      chemoItems.push({
        type: melGene && melGene.name.toLowerCase().includes("gustatory") ? "Gr" : (melGene && melGene.name.toLowerCase().includes("ionotropic") ? "Ir" : "Or/Obp"),
        melliferaSymbol: pair.mellifera.symbol,
        melliferaCoords: `${pair.mellifera.chrom}:${pair.mellifera.start.toLocaleString()}-${pair.mellifera.end.toLocaleString()}`,
        ceranaSymbol: pair.cerana.symbol,
        ceranaCoords: `${pair.cerana.chrom}:${pair.cerana.start.toLocaleString()}-${pair.cerana.end.toLocaleString()}`,
        homology: `Mapped Ortholog (${pair.identity})`,
        pathway: pair.pathway,
        pathwayId: pathId,
        melGene: melGene,
        cerGene: cerGene,
      });
    }
  });

  // 2. Gather standalone Mellifera chemoreceptors
  GENOME_DATA.mellifera.genes.forEach((g: any) => {
    if (g.functional_class === "Chemoreceptor" && !chemoItems.find((x) => x.melliferaSymbol === g.symbol)) {
      chemoItems.push({
        type: g.name.toLowerCase().includes("gustatory") ? "Gr" : (g.name.toLowerCase().includes("ionotropic") ? "Ir" : "Or/Obp"),
        melliferaSymbol: g.symbol,
        melliferaCoords: `${g.chrom}:${g.start.toLocaleString()}-${g.end.toLocaleString()}`,
        ceranaSymbol: "-",
        ceranaCoords: "-",
        homology: "동양종 미매핑",
        pathway: g.description,
        pathwayId: g.pathway_id,
        melGene: g,
        cerGene: null,
      });
    }
  });

  // 3. Gather standalone Cerana chemoreceptors
  GENOME_DATA.cerana.genes.forEach((g: any) => {
    if (g.functional_class === "Chemoreceptor" && !chemoItems.find((x) => x.ceranaSymbol === g.symbol)) {
      chemoItems.push({
        type: g.name.toLowerCase().includes("gustatory") ? "Gr" : (g.name.toLowerCase().includes("ionotropic") ? "Ir" : "Or/Obp"),
        melliferaSymbol: "-",
        melliferaCoords: "-",
        ceranaSymbol: g.symbol,
        ceranaCoords: `${g.chrom}:${g.start.toLocaleString()}-${g.end.toLocaleString()}`,
        homology: "서양종 미매핑",
        pathway: g.description,
        pathwayId: g.pathway_id,
        melGene: null,
        cerGene: g,
      });
    }
  });

  // Apply filters
  let filtered = chemoItems;
  const searchLower = searchVal.toLowerCase().trim();
  if (searchLower) {
    filtered = filtered.filter((item) => {
      return (
        item.melliferaSymbol.toLowerCase().includes(searchLower) ||
        item.ceranaSymbol.toLowerCase().includes(searchLower) ||
        item.homology.toLowerCase().includes(searchLower) ||
        item.pathway.toLowerCase().includes(searchLower)
      );
    });
  }

  if (classVal !== "all") {
    filtered = filtered.filter((item) => item.type === classVal);
  }

  if (pathwayVal !== "all") {
    filtered = filtered.filter((item) => item.pathwayId === pathwayVal);
  }

  const pathwaysList = [
    { id: "PW_OLFACTORY", name: "Olfactory Receptor Signal (후각 경로)" },
    { id: "PW_MONOAMINE", name: "Monoamine / Dopamine Signal (도파민/신경전달)" },
    { id: "PW_BEHAVIOR", name: "Behavioral Transition Trigger" },
  ];

  return (
    <div className="animate-fade flex flex-col gap-6">
      {/* Header Panel */}
      <div className="flex items-center bg-slate-900/60 p-4 border border-slate-800 rounded-2xl backdrop-blur-md gap-3">
        <span className="text-3xl">👃</span>
        <div>
          <h2 className="text-xl font-bold text-amber-400">화학수용체 탐색기 (Chemoreceptor Explorer)</h2>
          <p className="text-xs text-slate-400 font-medium">
            후각(Or), 미각(Gr), 이온성 수용체(Ir) 및 관련 신호 전달 분자의 두 종간 물리적 배치 구조를 탐색합니다.
          </p>
        </div>
      </div>

      {/* Query Filters */}
      <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          {/* Text search */}
          <div className="relative flex-1 min-w-[260px]">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="수용체 심볼명, 상동 설명, 세부 기능 검색..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl px-10 py-2.5 text-sm text-slate-200 outline-none focus:border-amber-500 focus:bg-slate-950/90 transition-all"
            />
          </div>

          {/* Type filter */}
          <select
            value={classVal}
            onChange={(e) => setClassVal(e.target.value)}
            className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-2.5 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all font-semibold"
          >
            <option value="all">모든 화학수용체 타입</option>
            <option value="Or/Obp">Or/Obp (후각/바인딩 수용체)</option>
            <option value="Gr">Gr (미각 수용체)</option>
            <option value="Ir">Ir (이온성 채널 수용체)</option>
          </select>

          {/* Pathway filter */}
          <select
            value={pathwayVal}
            onChange={(e) => setPathwayVal(e.target.value)}
            className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-2.5 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all font-semibold"
          >
            <option value="all">모든 생리 기여 경로</option>
            {pathwaysList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Explorer Table */}
        <div className="overflow-x-auto border border-slate-800/60 rounded-xl bg-slate-950/45">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                <th className="p-3.5">유형</th>
                <th className="p-3.5">Apis mellifera 심볼/좌표 (양봉)</th>
                <th className="p-3.5">Apis cerana 심볼/좌표 (토종)</th>
                <th className="p-3.5">상동성 매핑 레벨</th>
                <th className="p-3.5">기여 작용 설명</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500 py-8">
                    검색 조건과 일치하는 화학수용체가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  let typeTag = "bg-sky-500/10 text-sky-400 border border-sky-500/20";
                  if (item.type === "Gr") {
                    typeTag = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
                  } else if (item.type === "Ir") {
                    typeTag = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                  }

                  return (
                    <tr key={idx} className="border-b border-slate-900/60 hover:bg-slate-900/10 transition-colors">
                      <td className="p-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${typeTag}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <strong className="text-sky-400 text-sm block">{item.melliferaSymbol}</strong>
                        <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                          {item.melliferaCoords}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <strong className="text-amber-400 text-sm block">{item.ceranaSymbol}</strong>
                        <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                          {item.ceranaCoords}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-300">{item.homology}</div>
                      </td>
                      <td className="p-3.5 max-w-[320px]">
                        <div className="text-[11px] text-slate-400 leading-relaxed font-sans">
                          {item.pathway}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

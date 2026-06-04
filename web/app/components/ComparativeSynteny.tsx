import React, { useState, useEffect } from "react";
import { GENOME_DATA, ORTHOLOGY_MAP } from "../data/genomeData";

export default function ComparativeSynteny() {
  const [selectedPair, setSelectedPair] = useState<string>("LG1");
  const [selectedOrthologIdx, setSelectedOrthologIdx] = useState<number | null>(null);

  // Map dropdown value to species chromosomes
  const mChromName = selectedPair;
  const cChromName = selectedPair === "LG2" ? "LG12" : selectedPair;

  const mChrom = GENOME_DATA.mellifera.chromosomes.find((c: any) => c.name === mChromName);
  const cChrom = GENOME_DATA.cerana.chromosomes.find((c: any) => c.name === cChromName);

  // Filter ortholog pairs matching these chromosomes
  const pairs = ORTHOLOGY_MAP.filter(
    (p: any) => p.mellifera.chrom === mChromName && p.cerana.chrom === cChromName
  );

  // Automatically select the first ortholog when changing chromosomes
  useEffect(() => {
    if (pairs.length > 0) {
      setSelectedOrthologIdx(0);
    } else {
      setSelectedOrthologIdx(null);
    }
  }, [selectedPair]);

  // Selected Ortholog info card variables
  const activePair = selectedOrthologIdx !== null ? pairs[selectedOrthologIdx] : null;
  const activeMelliferaGene = activePair
    ? GENOME_DATA.mellifera.genes.find((g: any) => g.symbol === activePair.mellifera.symbol)
    : null;
  const activeCeranaGene = activePair
    ? GENOME_DATA.cerana.genes.find((g: any) => g.symbol === activePair.cerana.symbol)
    : null;

  // SVG drawing configuration
  const svgWidth = 960;
  const svgHeight = 360;
  const paddingLeft = 50;
  const paddingRight = 50;
  const usableWidth = svgWidth - paddingLeft - paddingRight;

  const yMellifera = 60;
  const yCerana = 300;
  const barHeight = 16;

  // Chromosome selection list (LG1 to LG16)
  const chromKeys = Array.from({ length: 16 }, (_, i) => `LG${i + 1}`);

  return (
    <div className="animate-fade flex flex-col gap-6">
      {/* Header card */}
      <div className="flex flex-wrap justify-between items-center bg-slate-900/60 p-4 border border-slate-800 rounded-2xl backdrop-blur-md gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔀</span>
          <div>
            <h2 className="text-xl font-bold text-amber-400 font-sans">비교 유전체 분석 (Comparative Synteny)</h2>
            <p className="text-xs text-slate-400 font-medium">동양종(Cerana)과 서양종(Mellifera)의 염색체 정렬 구조 및 1:1 오솔로그(Ortholog) 유전자 상관성을 시각화합니다.</p>
          </div>
        </div>

        {/* Chromosome selector dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-bold">비교 염색체 쌍:</label>
          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-2.5 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all font-semibold"
          >
            {chromKeys.map((lg) => {
              const partner = lg === "LG2" ? "LG12" : lg;
              return (
                <option key={lg} value={lg}>
                  {lg} (Mellifera) ↔ {partner} (Cerana)
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Grid: Comparative Map View + Homology Details inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6 items-start">
        {/* Comparative Map View Card */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
          <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-1.5">
            📊 오솔로그 연동 물리 맵 (Synteny Linkage Map)
          </h3>
          <div className="w-full bg-slate-950/45 border border-slate-900 rounded-xl p-4 overflow-x-auto">
            <div className="min-w-[800px]">
              {mChrom && cChrom ? (
                <svg width="100%" height={`${svgHeight}px`} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="block overflow-visible">
                  <defs>
                    <linearGradient id="grad-mellifera" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="grad-cerana" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ea580c" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>

                  {/* 1. Draw top chromosome (Mellifera) */}
                  <text x={paddingLeft} y={yMellifera - 20} fill="#cbd5e1" fontSize="11" fontWeight="800" fontFamily="sans-serif">
                    Apis mellifera - {mChrom.name} ({(mChrom.size / 1000000).toFixed(2)} Mb)
                  </text>
                  <rect x={paddingLeft} y={yMellifera} width={usableWidth} height={barHeight} rx="8" fill="url(#grad-mellifera)" opacity="0.85" />

                  {/* 2. Draw bottom chromosome (Cerana) */}
                  <text x={paddingLeft} y={yCerana + 30} fill="#cbd5e1" fontSize="11" fontWeight="800" fontFamily="sans-serif">
                    Apis cerana - {cChrom.name} ({(cChrom.size / 1000000).toFixed(2)} Mb)
                  </text>
                  <rect x={paddingLeft} y={yCerana} width={usableWidth} height={barHeight} rx="8" fill="url(#grad-cerana)" opacity="0.85" />

                  {/* 3. Draw top genes ticks (Mellifera) */}
                  {GENOME_DATA.mellifera.genes
                    .filter((g: any) => g.chrom === mChrom.name)
                    .map((gene: any) => {
                      const x = paddingLeft + (gene.start / mChrom.size) * usableWidth;
                      const w = Math.max(4, ((gene.end - gene.start) / mChrom.size) * usableWidth);
                      return (
                        <g key={gene.symbol}>
                          <rect
                            x={x}
                            y={yMellifera - 4}
                            width={w}
                            height={barHeight + 8}
                            rx="2"
                            fill="#38bdf8"
                            opacity="0.9"
                            className="cursor-pointer hover:fill-sky-300 transition-colors"
                          />
                          <text x={x + w / 2} y={yMellifera - 8} fill="#94a3b8" fontSize="8px" fontFamily="monospace" textAnchor="middle">
                            {gene.symbol}
                          </text>
                        </g>
                      );
                    })}

                  {/* 4. Draw bottom genes ticks (Cerana) */}
                  {GENOME_DATA.cerana.genes
                    .filter((g: any) => g.chrom === cChrom.name)
                    .map((gene: any) => {
                      const x = paddingLeft + (gene.start / cChrom.size) * usableWidth;
                      const w = Math.max(4, ((gene.end - gene.start) / cChrom.size) * usableWidth);
                      return (
                        <g key={gene.symbol}>
                          <rect
                            x={x}
                            y={yCerana - 4}
                            width={w}
                            height={barHeight + 8}
                            rx="2"
                            fill="#fbbf24"
                            opacity="0.9"
                            className="cursor-pointer hover:fill-amber-300 transition-colors"
                          />
                          <text x={x + w / 2} y={yCerana + 22} fill="#94a3b8" fontSize="8px" fontFamily="monospace" textAnchor="middle">
                            {gene.symbol}
                          </text>
                        </g>
                      );
                    })}

                  {/* 5. Draw connecting curves for Orthologs */}
                  {pairs.map((pair: any, idx: number) => {
                    const x1 = paddingLeft + ((pair.mellifera.start + pair.mellifera.end) / 2 / mChrom.size) * usableWidth;
                    const y1 = yMellifera + barHeight;
                    const x2 = paddingLeft + ((pair.cerana.start + pair.cerana.end) / 2 / cChrom.size) * usableWidth;
                    const y2 = yCerana;

                    const isActive = selectedOrthologIdx === idx;

                    return (
                      <path
                        key={idx}
                        d={`M ${x1} ${y1} C ${x1} ${y1 + 90}, ${x2} ${y2 - 90}, ${x2} ${y2}`}
                        onClick={() => setSelectedOrthologIdx(idx)}
                        className={`fill-none stroke-purple-400 cursor-pointer transition-all duration-200 ${
                          isActive
                            ? "stroke-amber-400 stroke-[4px] opacity-90 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]"
                            : "stroke-[2px] opacity-20 hover:opacity-75 hover:stroke-[3px]"
                        }`}
                      />
                    );
                  })}
                </svg>
              ) : (
                <div className="text-center text-slate-500 py-12">염색체 맵 데이터를 불러올 수 없습니다.</div>
              )}
            </div>
          </div>
        </div>

        {/* Ortholog details side card info */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md h-full min-h-[380px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-2 mb-4 flex items-center gap-1">
              🔬 오솔로그 정보분석 (Homology Card)
            </h3>

            {activePair ? (
              <div className="flex flex-col gap-4 animate-fade">
                <div className="flex justify-between items-center bg-slate-950/40 p-3.5 border border-slate-900/50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">상동 서열 일치도</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Identity: {activePair.identity}
                  </span>
                </div>

                <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">관련 생리 신호 전달계</div>
                  <div className="text-xs font-bold text-amber-500 leading-snug">{activePair.pathway}</div>
                </div>

                {/* Split Species Block */}
                <div className="flex flex-col gap-3">
                  {/* Western */}
                  <div className="border-l-2 border-sky-400 pl-3">
                    <div className="text-[9px] text-slate-500 font-bold uppercase">Apis mellifera (모계)</div>
                    <div className="text-sm font-bold text-sky-400 mt-0.5">{activePair.mellifera.symbol}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {activePair.mellifera.chrom}:{activePair.mellifera.start.toLocaleString()}-{activePair.mellifera.end.toLocaleString()} bp
                    </div>
                  </div>

                  {/* Eastern */}
                  <div className="border-l-2 border-amber-400 pl-3">
                    <div className="text-[9px] text-slate-500 font-bold uppercase">Apis cerana (부계)</div>
                    <div className="text-sm font-bold text-amber-400 mt-0.5">{activePair.cerana.symbol}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {activePair.cerana.chrom}:{activePair.cerana.start.toLocaleString()}-{activePair.cerana.end.toLocaleString()} bp
                    </div>
                  </div>
                </div>

                {/* Text Descriptions */}
                <div className="bg-slate-950/30 border border-slate-900/60 p-3.5 rounded-xl text-[11px] leading-relaxed flex flex-col gap-3">
                  <div>
                    <strong className="text-slate-400">서양종 기능 주석:</strong>
                    <div className="text-slate-300 mt-1">{activeMelliferaGene ? activeMelliferaGene.description : "-"}</div>
                  </div>
                  <div className="border-t border-slate-900/80 pt-2.5">
                    <strong className="text-slate-400">동양종 기능 주석:</strong>
                    <div className="text-slate-300 mt-1">{activeCeranaGene ? activeCeranaGene.description : "-"}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-16 text-xs">
                상단의 맵에서 곡선을 클릭하여 개별 1:1 Ortholog 연동 유전자를 검사하십시오.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

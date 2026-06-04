import React, { useState, useEffect, useRef } from "react";
import { GENOME_DATA } from "../data/genomeData";

export default function MarkerAssayDesigner() {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>("KZ288474.1_322717");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Find variant configuration across both genomes
  let variant = GENOME_DATA.cerana.variants.find(
    (v: any) => v.id === selectedMarkerId || v.id === `KZ288474.1_${selectedMarkerId}`
  );
  if (!variant) {
    variant = GENOME_DATA.mellifera.variants.find((v: any) => v.id === selectedMarkerId);
  }

  // Fallback defaults if variant is not resolved
  const activeVariant = variant || {
    id: "KZ288474.1_322717",
    trait: "Sacbrood Virus (CSBV) Resistance",
    primer_sequence: {
      fwd: "5'-GGTACCGACTAGCTAGCTAG-3'",
      rev: "5'-AAGCTTCGATCGATCGCATC-3'",
    },
    band_size: {
      ref: "480 bp",
      alt: "310 bp",
    },
    description: "CSBV 저항성 연계 마커입니다.",
  };

  // Determine annealing temp based on marker
  let annealTemp = "58°C, 30s";
  if (selectedMarkerId.includes("322717")) annealTemp = "56°C, 30s";
  if (selectedMarkerId.includes("E23")) annealTemp = "59°C, 30s";

  const refBp = parseInt(activeVariant.band_size.ref) || 400;
  const altBp = parseInt(activeVariant.band_size.alt) || 300;

  // PCR Gel Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas gel
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw boundary border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Draw wells at top (y=22)
    ctx.fillStyle = "#1e293b";
    const numWells = 5;
    const wellWidth = 32;
    const wellHeight = 10;
    const spacing = 38;
    const startX = 35;

    for (let i = 0; i < numWells; i++) {
      const x = startX + i * (wellWidth + spacing);
      ctx.fillRect(x, 22, wellWidth, wellHeight);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.strokeRect(x, 22, wellWidth, wellHeight);
    }

    // Lane headers text labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    const labels = ["Ladder", "WT (Ref)", "Mut (Alt)", "Hetero", "Control"];
    for (let i = 0; i < numWells; i++) {
      const x = startX + i * (wellWidth + spacing) + wellWidth / 2;
      ctx.fillText(labels[i], x, 15);
    }

    // Helper to map molecular weight in bp to Y migration pixel coordinate (logarithmic)
    const bpToY = (bp: number) => {
      const minY = 45;
      const maxY = 210;
      const minBp = 100;
      const maxBp = 1000;
      const val = Math.log10(bp);
      const minVal = Math.log10(minBp);
      const maxVal = Math.log10(maxBp);
      const pct = (maxVal - val) / (maxVal - minVal);
      return minY + pct * (maxY - minY);
    };

    // Draw 100bp DNA Ladder in Lane 0 (gray bands)
    const ladderBps = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    const x0 = startX + 0 * (wellWidth + spacing);
    ctx.shadowBlur = 3;
    ctx.shadowColor = "#475569";
    ctx.fillStyle = "rgba(148, 163, 184, 0.85)";

    ladderBps.forEach((bp) => {
      const y = bpToY(bp);
      ctx.fillRect(x0 + 2, y, wellWidth - 4, 3);
      // labels for ladder
      ctx.fillStyle = "#64748b";
      ctx.font = "7px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${bp}bp`, x0 - 4, y + 2.5);
      ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
    });

    // Lane 1: Reference (WT) - Red band
    const x1 = startX + 1 * (wellWidth + spacing);
    ctx.shadowColor = "#f43f5e";
    ctx.fillStyle = "#f43f5e";
    ctx.shadowBlur = 12;
    const yRef = bpToY(refBp);
    ctx.fillRect(x1 + 2, yRef, wellWidth - 4, 4);

    // Lane 2: Variant (Alt) - Green/Emerald band
    const x2 = startX + 2 * (wellWidth + spacing);
    ctx.shadowColor = "#10b981";
    ctx.fillStyle = "#10b981";
    ctx.shadowBlur = 12;
    const yAlt = bpToY(altBp);
    ctx.fillRect(x2 + 2, yAlt, wellWidth - 4, 4);

    // Lane 3: Hetero (Ref + Alt) - Orange/Gold bands
    const x3 = startX + 3 * (wellWidth + spacing);
    ctx.shadowColor = "#f59e0b";
    ctx.fillStyle = "#f59e0b";
    ctx.shadowBlur = 10;
    ctx.fillRect(x3 + 2, yRef, wellWidth - 4, 3);
    ctx.fillRect(x3 + 2, yAlt, wellWidth - 4, 3);

    // Lane 4: Negative Control (Primer dimers)
    const x4 = startX + 4 * (wellWidth + spacing);
    ctx.shadowColor = "#475569";
    ctx.fillStyle = "rgba(71, 85, 105, 0.4)";
    ctx.shadowBlur = 2;
    ctx.fillRect(x4 + 6, bpToY(80), wellWidth - 12, 2);

    // Reset shadow values
    ctx.shadowBlur = 0;
  }, [selectedMarkerId, refBp, altBp]);

  const diagnosticMarkers = [
    {
      id: "KZ288474.1_322717",
      name: "CSBV-Resist-15 [Apis cerana] 낭충봉아부패병(SBV) 저항성 연계 마커",
    },
    {
      id: "var_atpalpha_del",
      name: "var_atpalpha_del [Apis cerana] 한랭 기후 적응 Atpalpha 결실 구조변이",
    },
    {
      id: "var_E23_intron",
      name: "var_E23_intron [Apis mellifera] 바로아 응애 위생행동(VSH) 진단 마커",
    },
    {
      id: "var_membrin_5utr",
      name: "var_membrin_5utr [Apis mellifera] 채집 정찰벌 vs 동료 소집벌 분화 마커",
    },
  ];

  return (
    <div className="animate-fade flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center bg-slate-900/60 p-4 border border-slate-800 rounded-2xl backdrop-blur-md gap-3">
        <span className="text-3xl">🏷️</span>
        <div>
          <h2 className="text-xl font-bold text-amber-400">분자 마커 디자이너 (Marker Assay Designer)</h2>
          <p className="text-xs text-slate-400 font-medium">
            유용 형질 저항성 진단을 위해 특이적으로 설계된 프라이머 쌍과 아가로스 전기영동 밴드 크기를 분석합니다.
          </p>
        </div>
      </div>

      {/* Grid: PCR Conditions / Primers Card + Agarose Gel canvas */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-6 items-start">
        {/* Left: PCR primers card */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md flex flex-col gap-5">
          <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
            🧬 육종 스크리닝 마커 선택 & PCR 조건
          </h3>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-semibold">육종 마커 선택:</label>
            <select
              value={selectedMarkerId}
              onChange={(e) => setSelectedMarkerId(e.target.value)}
              className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-3 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all font-semibold"
            >
              {diagnosticMarkers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Primer card */}
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col gap-3">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              Target Primer Sequences (PCR)
            </div>
            <div className="flex justify-between items-center border-b border-slate-900/80 pb-2.5">
              <span className="text-[10px] text-slate-400 font-semibold">Forward (5' &rarr; 3')</span>
              <span className="text-xs font-mono text-slate-100 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-900/50">
                {activeVariant.primer_sequence.fwd}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-semibold">Reverse (5' &rarr; 3')</span>
              <span className="text-xs font-mono text-slate-100 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-900/50">
                {activeVariant.primer_sequence.rev}
              </span>
            </div>
          </div>

          {/* Amplification protocol card */}
          <div className="bg-slate-950/30 border border-slate-900/50 rounded-xl p-4 flex flex-col gap-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PCR Amplification Protocol
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-900/50">
                <span className="text-[9px] text-slate-500 font-bold block uppercase">Denaturing</span>
                <span className="text-slate-200 font-semibold mt-1 block">95°C, 30s</span>
              </div>
              <div className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-900/50">
                <span className="text-[9px] text-slate-500 font-bold block uppercase">Annealing</span>
                <span className="text-slate-200 font-semibold mt-1 block">{annealTemp}</span>
              </div>
              <div className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-900/50">
                <span className="text-[9px] text-slate-500 font-bold block uppercase">Extension</span>
                <span className="text-slate-200 font-semibold mt-1 block">72°C, 45s</span>
              </div>
              <div className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-900/50">
                <span className="text-[9px] text-slate-500 font-bold block uppercase">Cycles</span>
                <span className="text-slate-200 font-semibold mt-1 block">35 cycles</span>
              </div>
            </div>
          </div>

          {/* Marker Details description */}
          <div className="bg-slate-950/35 border border-slate-900/60 p-4 rounded-xl text-xs">
            <div className="font-bold text-slate-300 mb-1">마커 정보 주석:</div>
            <p className="text-slate-400 leading-relaxed font-sans">{activeVariant.description}</p>
          </div>
        </div>

        {/* Right: Gel Electrophoresis canvas */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-300 mb-4 w-full flex items-center gap-1.5">
            📊 Agarose Gel 전기영동 패턴 시뮬레이션
          </h3>
          <div className="bg-slate-950/70 border border-slate-900 rounded-xl p-4 flex flex-col items-center w-full">
            <canvas
              ref={canvasRef}
              width={360}
              height={240}
              className="bg-[#090d16] rounded-lg w-full max-w-[360px] h-auto aspect-[3/2] border border-slate-900"
            />
            {/* Legend info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[10px] text-slate-400 font-medium font-sans">
              <div className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-sm"></span> WT(Wildtype) 밴드: {activeVariant.band_size.ref}
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Mut(Variant) 밴드: {activeVariant.band_size.alt}
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-sm"></span> Hetero: WT + Mut 혼합형
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { GENOME_DATA } from "../data/genomeData";

interface GenomeBrowserProps {
  species: "mellifera" | "cerana";
  onSpeciesChange?: (species: "mellifera" | "cerana") => void;
}

export default function GenomeBrowser({ species, onSpeciesChange }: GenomeBrowserProps) {
  const currentGenome = GENOME_DATA[species];
  const chromosomes = currentGenome.chromosomes;
  const genes = currentGenome.genes;
  const qtls = currentGenome.qtls;
  const variants = currentGenome.variants;
  const metadata = currentGenome.metadata;

  // Selected chromosome state
  const [selectedChrom, setSelectedChrom] = useState<string>("LG1");
  const activeChrom = chromosomes.find((c: any) => c.name === selectedChrom) || chromosomes[0];

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<any>(null);
  const [drawerType, setDrawerType] = useState<"gene" | "qtl" | "variant">("gene");

  // Private track states
  const [privateVariants, setPrivateVariants] = useState<any[]>([]);
  const [privateFileName, setPrivateFileName] = useState<string>("");
  const [vcfStatus, setVcfStatus] = useState<string>("대기중");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search and filter states
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Track scroll centering ref
  const trackViewerRef = useRef<HTMLDivElement>(null);
  const trackGeneRef = useRef<HTMLDivElement>(null);
  const [focusLineLeft, setFocusLineLeft] = useState<number | null>(null);

  // Switch selected chromosome on species change
  useEffect(() => {
    setSelectedChrom("LG1");
    setFocusLineLeft(null);
  }, [species]);

  // Open Sliding Details Drawer
  const openDrawer = (item: any, type: "gene" | "qtl" | "variant") => {
    setDrawerItem(item);
    setDrawerType(type);
    setDrawerOpen(true);
  };

  // Locate feature on track map
  const locateFeatureOnMap = (
    chromName: string,
    startBp: number,
    endBp: number,
    type: "gene" | "qtl" | "variant",
    symbol: string
  ) => {
    setSelectedChrom(chromName);

    const targetChrom = chromosomes.find((c: any) => c.name === chromName);
    if (!targetChrom) return;

    const midPoint = (startBp + endBp) / 2;
    const pct = (midPoint / targetChrom.size) * 100;
    setFocusLineLeft(pct);

    // Scroll to center in track viewer
    if (trackViewerRef.current) {
      const containerWidth = trackViewerRef.current.clientWidth;
      const scrollWidth = trackGeneRef.current?.clientWidth || 800;
      const scrollPosition = (pct / 100) * scrollWidth - containerWidth / 2;
      trackViewerRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: "smooth",
      });
    }

    // Load drawer detail
    let matchedItem = null;
    if (type === "gene") {
      matchedItem = genes.find((g: any) => g.symbol === symbol || g.name === symbol);
    } else if (type === "qtl") {
      matchedItem = qtls.find((q: any) => q.name === symbol);
    } else if (type === "variant") {
      matchedItem = variants.find((v: any) => v.id === symbol) || privateVariants.find((v: any) => v.id === symbol);
    }

    if (matchedItem) {
      openDrawer(matchedItem, type);
    }
  };

  // Private VCF Parsing using Web Worker
  const handleVcfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPrivateFileName(file.name);
    setVcfStatus("분석 중...");

    const workerBlobCode = `
      self.onmessage = function(e) {
        const file = e.data.file;
        const chromosomes = e.data.chromosomes;
        
        try {
          const reader = new FileReaderSync();
          const text = reader.readAsText(file);
          const lines = text.split("\\n");
          const loaded = [];
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("#") || !line.trim()) continue;
            const parts = line.trim().split("\\t");
            if (parts.length < 5) continue;
            
            const rawChrom = parts[0];
            const pos = parseInt(parts[1]);
            let id = parts[2];
            const ref = parts[3];
            const alt = parts[4];
            const info = parts[7] || "";
            
            let matchedChrom = rawChrom;
            for (let j = 0; j < chromosomes.length; j++) {
              const c = chromosomes[j];
              if (rawChrom.includes(c.name) || rawChrom.includes(c.accession)) {
                matchedChrom = c.name;
                break;
              }
            }
            
            let trait = "User Custom Variant";
            if (info.includes("TRAIT=")) {
              const match = info.match(/TRAIT=([^;]+)/);
              if (match) trait = match[1].replace(/_/g, " ");
            }
            
            if (id === "." || !id) {
              id = "Lab_Var_" + i;
            }
            
            loaded.push({
              id: id,
              chrom: matchedChrom,
              pos: pos,
              ref: ref,
              alt: alt,
              trait: trait
            });
          }
          
          self.postMessage({ success: true, variants: loaded });
        } catch (err) {
          self.postMessage({ success: false, error: err.message });
        }
      };
    `;

    const blob = new Blob([workerBlobCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    worker.postMessage({
      file: file,
      chromosomes: chromosomes,
    });

    worker.onmessage = (event: any) => {
      URL.revokeObjectURL(workerUrl);
      if (event.data.success) {
        const loaded = event.data.variants;
        if (loaded.length > 0) {
          setPrivateVariants(loaded);
          setVcfStatus(`성공 (${loaded.length}개 로드됨)`);
        } else {
          setVcfStatus("유효한 레코드가 없습니다.");
        }
      } else {
        console.error("Worker parsing error:", event.data.error);
        setVcfStatus("분석 실패");
      }
    };
  };

  // Exporter helpers
  const downloadBlob = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredPool = () => {
    let pool: any[] = [];
    genes.forEach((g: any) => pool.push({ ...g, type: "gene" }));
    qtls.forEach((q: any) => pool.push({ ...q, type: "qtl" }));
    variants.forEach((v: any) =>
      pool.push({ ...v, type: "variant", start: v.pos, end: v.pos, symbol: v.id })
    );

    const term = searchText.toLowerCase().trim();
    if (term) {
      pool = pool.filter((item: any) => {
        const symbol = (item.symbol || "").toLowerCase();
        const name = (item.name || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const ref = (item.references || "").toLowerCase();
        const trait = (item.trait || "").toLowerCase();
        const chrom = (item.chrom || "").toLowerCase();
        return (
          symbol.includes(term) ||
          name.includes(term) ||
          desc.includes(term) ||
          ref.includes(term) ||
          trait.includes(term) ||
          chrom.includes(term)
        );
      });
    }

    if (filterType !== "all") {
      pool = pool.filter((item: any) => item.type === filterType);
    }

    if (filterCategory !== "all") {
      pool = pool.filter((item: any) => item.category === filterCategory);
    }

    return pool;
  };

  const exportToCsv = () => {
    const pool = getFilteredPool();
    let csv = "Type,Symbol_or_ID,Chromosome,Start,End,Strand_Position,Trait_or_Name,Description,References\n";
    pool.forEach((item: any) => {
      const type = item.type.toUpperCase();
      const name = item.symbol || item.name || item.id;
      const start = item.type === "variant" ? item.pos : item.start;
      const end = item.type === "variant" ? item.pos : item.end;
      const strand = item.strand || (item.type === "variant" ? item.type : "+");
      const trait = (item.trait || item.name || "-").replace(/"/g, '""');
      const desc = (item.description || "").replace(/"/g, '""');
      const refs = (item.references || "").replace(/"/g, '""');

      csv += `"${type}","${name}","${item.chrom}",${start},${end},"${strand}","${trait}","${desc}","${refs}"\n`;
    });
    downloadBlob(csv, `honeybee_portal_extract_${species}.csv`, "text/csv");
  };

  const exportToBed = () => {
    const pool = getFilteredPool();
    let bed = "";
    pool.forEach((item: any) => {
      const start = item.type === "variant" ? item.pos - 1 : item.start;
      const end = item.type === "variant" ? item.pos : item.end;
      const name = item.symbol || item.name || item.id;
      const score = 0;
      const strand = item.strand || "+";
      bed += `${item.chrom}\t${start}\t${end}\t${name}\t${score}\t${strand}\n`;
    });
    downloadBlob(bed, `honeybee_portal_features_${species}.bed`, "text/plain");
  };

  const exportToFasta = () => {
    const pool = getFilteredPool();
    let fasta = "";
    pool.forEach((item: any) => {
      if (item.type === "qtl") return; // Skip QTL intervals
      const name = item.symbol || item.id;
      const start = item.type === "variant" ? item.pos : item.start;
      const end = item.type === "variant" ? item.pos : item.end;

      let simulatedSeq = "";
      const len = Math.min(100, end - start + 1);
      const nucleotides = ["A", "T", "C", "G"];
      for (let i = 0; i < len; i++) {
        simulatedSeq += nucleotides[(start + i) % 4];
      }
      fasta += `>${name} | assembly:${metadata.assemblyName} | locus:${item.chrom}:${start}-${end} | length:${end - start + 1}bp\n${simulatedSeq}\n`;
    });
    downloadBlob(fasta, `honeybee_simulated_sequences_${species}.fasta`, "text/plain");
  };

  // Rendering parameters for SVG chromosome overview
  const svgWidth = 1000;
  const svgHeight = 220;
  const paddingLeft = 40;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 40;
  const usableWidth = svgWidth - paddingLeft - paddingRight;
  const usableHeight = svgHeight - paddingTop - paddingBottom;
  const maxChrSize = Math.max(...chromosomes.map((c: any) => c.size));
  const numChroms = chromosomes.length;
  const spacing = usableWidth / (numChroms - 1);

  // Filter values
  const categories = ["Behavior", "Development", "Immunity", "Metabolic", "Sensory"];

  return (
    <div className="animate-fade flex flex-col gap-6">
      {/* Species Selector & Quick Header */}
      <div className="flex justify-between items-center bg-slate-900/60 p-4 border border-slate-800 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧬</span>
          <div>
            <h2 className="text-xl font-bold text-amber-400">꿀벌 게놈 브라우저 (Genome Browser)</h2>
            <p className="text-xs text-slate-400">참조 유전체 상의 QTL 영역, 기능 유전자, Caste 마커 변이를 시각적으로 제공합니다.</p>
          </div>
        </div>

        {/* Species selector tabs */}
        <div className="flex bg-slate-950/60 p-1 border border-slate-800 rounded-xl gap-1">
          <button
            onClick={() => onSpeciesChange?.("mellifera")}
            className={`px-4 py-2 font-bold text-xs rounded-lg transition-all ${
              species === "mellifera"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Apis mellifera (양봉)
          </button>
          <button
            onClick={() => onSpeciesChange?.("cerana")}
            className={`px-4 py-2 font-bold text-xs rounded-lg transition-all ${
              species === "cerana"
                ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Apis cerana (토종)
          </button>
        </div>
      </div>

      {/* Assembly Info Pills */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-slate-900/40 border border-slate-800/80 px-4 py-2 rounded-full text-xs font-semibold text-slate-300">
          Assembly: <strong className="text-amber-400">{metadata.assemblyName}</strong>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 px-4 py-2 rounded-full text-xs font-semibold text-slate-300">
          RefSeq: <strong className="text-amber-400">{metadata.refseqAccession}</strong>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 px-4 py-2 rounded-full text-xs font-semibold text-slate-300">
          Genome Size: <strong className="text-amber-400">{metadata.genomeSize}</strong>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 px-4 py-2 rounded-full text-xs font-semibold text-slate-300">
          GC Content: <strong className="text-amber-400">{metadata.gcContent}</strong>
        </div>
      </div>

      {/* Grid: Chromosome Sidebar + Visual Map */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Left Sidebar: Chromosome Navigation */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800/80 pb-2 flex items-center gap-2">
            📊 염색체 목록 (LGs)
          </h3>
          <div className="flex flex-col gap-2 max-height-[480px] overflow-y-auto pr-1">
            {chromosomes.map((chrom: any) => {
              const geneCount = genes.filter((g: any) => g.chrom === chrom.name).length;
              const qtlCount = qtls.filter((q: any) => q.chrom === chrom.name).length;
              const varCount = variants.filter((v: any) => v.chrom === chrom.name).length;
              const isActive = chrom.name === selectedChrom;

              return (
                <div
                  key={chrom.name}
                  onClick={() => setSelectedChrom(chrom.name)}
                  className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all ${
                    isActive
                      ? "bg-amber-500/10 border-amber-500/40 shadow-inner"
                      : "bg-slate-950/40 border-slate-800/40 hover:bg-slate-800/40 hover:translate-x-1"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chrom.color }}></div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">{chrom.name}</div>
                      <div className="text-[10px] text-slate-400">{(chrom.size / 1000000).toFixed(2)} Mb</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {geneCount > 0 && (
                      <span className="text-[8px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/25 px-1.5 py-0.5 rounded">
                        {geneCount}
                      </span>
                    )}
                    {qtlCount > 0 && (
                      <span className="text-[8px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/25 px-1.5 py-0.5 rounded">
                        {qtlCount}
                      </span>
                    )}
                    {varCount > 0 && (
                      <span className="text-[8px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25 px-1.5 py-0.5 rounded">
                        {varCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Area: SVG Physical Map & Details Tracks */}
        <div className="flex flex-col gap-6">
          {/* SVG Map Overview */}
          <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
            <h3 className="text-sm font-bold text-slate-300 mb-4">📍 물리적 염색체 지도</h3>
            <div className="w-full bg-slate-950/40 border border-slate-900 rounded-xl p-4 overflow-x-auto">
              <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="block min-w-[700px]">
                {/* Size Guideline ticks */}
                {[5, 10, 15, 20, 25].map((tic) => {
                  const ticBp = tic * 1000000;
                  if (ticBp > maxChrSize) return null;
                  const y = paddingTop + (ticBp / maxChrSize) * usableHeight;
                  return (
                    <g key={tic}>
                      <line
                        x1={paddingLeft - 10}
                        y1={y}
                        x2={svgWidth - paddingRight}
                        y2={y}
                        stroke="rgba(255,255,255,0.03)"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={paddingLeft - 15}
                        y={y + 3}
                        fill="#475569"
                        fontSize="8"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {tic}M
                      </text>
                    </g>
                  );
                })}

                {/* Draw Chromosome base bars */}
                {chromosomes.map((chrom: any, index: number) => {
                  const x = paddingLeft + index * spacing;
                  const barWidth = 14;
                  const barHeight = (chrom.size / maxChrSize) * usableHeight;
                  const isSelected = chrom.name === selectedChrom;

                  return (
                    <g
                      key={chrom.name}
                      onClick={() => setSelectedChrom(chrom.name)}
                      className="cursor-pointer group"
                    >
                      {/* Glow selection effect */}
                      {isSelected && (
                        <rect
                          x={x - barWidth / 2 - 2}
                          y={paddingTop - 2}
                          width={barWidth + 4}
                          height={barHeight + 4}
                          rx="6"
                          fill={species === "mellifera" ? "rgba(245,158,11,0.15)" : "rgba(249,115,22,0.15)"}
                        />
                      )}

                      {/* Main Chromosome capsule */}
                      <rect
                        x={x - barWidth / 2}
                        y={paddingTop}
                        width={barWidth}
                        height={barHeight}
                        rx="4"
                        fill={chrom.color}
                        opacity={isSelected ? 1.0 : 0.3}
                        stroke={isSelected ? "#fff" : "none"}
                        strokeWidth={isSelected ? 1.5 : 0}
                        className="transition-all duration-300"
                      />

                      {/* Top text label */}
                      <text
                        x={x}
                        y={svgHeight - 15}
                        fill={isSelected ? "#f8fafc" : "#64748b"}
                        fontSize="9"
                        fontWeight={isSelected ? "bold" : "500"}
                        textAnchor="middle"
                        className="group-hover:fill-slate-200 transition-colors"
                      >
                        {chrom.name}
                      </text>

                      {/* Small dots on chromosomes mapping features */}
                      {[
                        ...genes.filter((g: any) => g.chrom === chrom.name).map((g: any) => ({ pos: (g.start + g.end) / 2, type: "gene" })),
                        ...qtls.filter((q: any) => q.chrom === chrom.name).map((q: any) => ({ pos: (q.start + q.end) / 2, type: "qtl" })),
                        ...variants.filter((v: any) => v.chrom === chrom.name).map((v: any) => ({ pos: v.pos, type: "variant" })),
                      ].map((feat: any, fIdx: number) => {
                        const yPos = paddingTop + (feat.pos / maxChrSize) * usableHeight;
                        let color = "var(--color-gene)";
                        if (feat.type === "qtl") color = "var(--color-qtl)";
                        if (feat.type === "variant") color = "var(--color-variant)";

                        return (
                          <circle
                            key={fIdx}
                            cx={x}
                            cy={yPos}
                            r="1.5"
                            fill={color}
                            opacity={isSelected ? 1.0 : 0.4}
                            style={{ pointerEvents: "none" }}
                          />
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Zoomed-in Track Browser */}
          <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                🔍 {activeChrom.name} 상세 물리 트랙 브라우저
              </h3>

              {/* Upload user VCF file */}
              <div className="flex items-center bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 gap-3">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                  📁 Private VCF/TXT 로드:
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".vcf,.txt"
                  onChange={handleVcfUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-slate-950 font-bold text-[10px] rounded border border-amber-500/25 transition-all"
                >
                  파일 찾기
                </button>
                <span className="text-[10px] text-slate-500 font-mono">{vcfStatus}</span>
              </div>
            </div>

            {/* Scrollable Track container */}
            <div
              ref={trackViewerRef}
              className="w-full bg-slate-950/60 border border-slate-900 rounded-xl p-5 overflow-x-auto relative"
            >
              <div className="flex flex-col gap-6 min-w-[800px] relative">
                {/* Vertical Focus line helper */}
                {focusLineLeft !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-500/60 pointer-events-none z-10 shadow-[0_0_8px_#f59e0b]"
                    style={{ left: `calc(120px + (100% - 120px) * ${focusLineLeft / 100})` }}
                  ></div>
                )}

                {/* Lane 1: Ruler Track */}
                <div className="flex items-center h-8 relative">
                  <div className="w-[120px] text-xs font-bold text-slate-400 tracking-wider">POSITION (MB)</div>
                  <div className="flex-1 h-full relative border-b border-slate-800/80">
                    {Array.from({ length: Math.ceil(activeChrom.size / 1000000) + 1 }).map((_, idx) => {
                      const posBp = idx * 1000000;
                      if (posBp > activeChrom.size) return null;
                      const pct = (posBp / activeChrom.size) * 100;

                      return (
                        <React.Fragment key={idx}>
                          <div
                            className="absolute bottom-0 h-2.5 w-0.5 bg-slate-700"
                            style={{ left: `${pct}%` }}
                          />
                          <div
                            className="absolute bottom-4 transform -translate-x-1/2 text-[9px] font-mono text-slate-400"
                            style={{ left: `${pct}%` }}
                          >
                            {idx}M
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Lane 2: QTL Track */}
                <div className="flex items-center h-12 relative">
                  <div className="w-[120px] text-xs font-bold text-slate-400 tracking-wider">QTL REGIONS</div>
                  <div className="flex-1 h-full relative bg-slate-900/10 border border-dashed border-slate-900/40 rounded">
                    {qtls
                      .filter((q: any) => q.chrom === activeChrom.name)
                      .map((qtl: any) => {
                        const left = (qtl.start / activeChrom.size) * 100;
                        const width = ((qtl.end - qtl.start) / activeChrom.size) * 100;

                        return (
                          <div
                            key={qtl.name}
                            onClick={() => openDrawer(qtl, "qtl")}
                            className="absolute top-1/2 transform -translate-y-1/2 h-7 bg-purple-500/10 border border-purple-500/45 text-purple-400 text-[10px] font-bold rounded-lg flex items-center justify-center px-2 cursor-pointer hover:bg-purple-500/20 hover:scale-y-105 hover:shadow-lg hover:shadow-purple-500/5 transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${qtl.name} (${(qtl.start / 1000000).toFixed(2)} - ${(qtl.end / 1000000).toFixed(2)} Mb)`}
                          >
                            {qtl.name}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Lane 3: Gene Track */}
                <div className="flex items-center h-12 relative">
                  <div className="w-[120px] text-xs font-bold text-slate-400 tracking-wider">GENES</div>
                  <div
                    ref={trackGeneRef}
                    className="flex-1 h-full relative bg-slate-900/10 border border-dashed border-slate-900/40 rounded"
                  >
                    {genes
                      .filter((g: any) => g.chrom === activeChrom.name)
                      .map((gene: any) => {
                        const left = (gene.start / activeChrom.size) * 100;
                        const width = Math.max(((gene.end - gene.start) / activeChrom.size) * 100, 0.6);

                        return (
                          <div
                            key={gene.symbol}
                            onClick={() => openDrawer(gene, "gene")}
                            className="absolute top-1/2 transform -translate-y-1/2 h-6 bg-sky-500/10 border border-sky-500/40 text-sky-400 text-[9px] font-bold rounded flex items-center justify-center px-1.5 cursor-pointer hover:bg-sky-500/20 hover:scale-y-105 transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={`${gene.symbol} (${(gene.start / 1000000).toFixed(3)} Mb)`}
                          >
                            {gene.symbol}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Lane 4: Variants Track */}
                <div className="flex items-center h-8 relative">
                  <div className="w-[120px] text-xs font-bold text-slate-400 tracking-wider">VARIANTS</div>
                  <div className="flex-1 h-full relative bg-slate-900/10 border border-dashed border-slate-900/40 rounded">
                    {variants
                      .filter((v: any) => v.chrom === activeChrom.name)
                      .map((variant: any) => {
                        const left = (variant.pos / activeChrom.size) * 100;

                        return (
                          <div
                            key={variant.id}
                            onClick={() => openDrawer(variant, "variant")}
                            className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-rose-500 border-2 border-slate-950 rounded-full cursor-pointer hover:scale-130 hover:bg-rose-400 transition-all shadow-[0_0_6px_var(--color-variant-glow)]"
                            style={{ left: `${left}%` }}
                            title={`${variant.id} | ${variant.trait} (${(variant.pos / 1000000).toFixed(3)} Mb)`}
                          />
                        );
                      })}
                  </div>
                </div>

                {/* Lane 5: Private VCF Track (Only visible when loaded) */}
                {privateVariants.filter((v) => v.chrom === activeChrom.name).length > 0 && (
                  <div className="flex items-center h-8 relative">
                    <div className="w-[120px] text-xs font-bold text-slate-400 tracking-wider">LAB SNPS</div>
                    <div className="flex-1 h-full relative bg-slate-900/10 border border-dashed border-slate-900/40 rounded">
                      {privateVariants
                        .filter((v) => v.chrom === activeChrom.name)
                        .map((pv: any, idx: number) => {
                          const left = (pv.pos / activeChrom.size) * 100;

                          return (
                            <div
                              key={idx}
                              onClick={() =>
                                openDrawer(
                                  {
                                    id: pv.id,
                                    chrom: pv.chrom,
                                    pos: pv.pos,
                                    ref: pv.ref,
                                    alt: pv.alt,
                                    trait: pv.trait,
                                    description: `사용자 VCF 파일(${privateFileName})에서 불러온 연구실 개별 변이 데이터입니다.`,
                                    references: "Lab Sequencing Project",
                                  },
                                  "variant"
                                )
                              }
                              className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full cursor-pointer hover:scale-130 hover:bg-emerald-400 transition-all shadow-[0_0_6px_#10b981]"
                              style={{ left: `${left}%` }}
                              title={`Private: ${pv.id} (${pv.ref}->${pv.alt}) at ${(pv.pos / 1000000).toFixed(3)} Mb`}
                            />
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Search Engine & Export bar */}
      <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-md flex flex-col gap-4">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800/80 pb-4">
          <h3 className="text-sm font-bold text-slate-300">🔎 통합 유전자 & 변이 검색 테이블</h3>

          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportToCsv}
              className="bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
            >
              📥 CSV 추출
            </button>
            <button
              onClick={exportToBed}
              className="bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
            >
              📥 BED 트랙 내보내기
            </button>
            <button
              onClick={exportToFasta}
              className="bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
            >
              📥 FASTA 시뮬레이션
            </button>
          </div>
        </div>

        {/* Query form filter */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[260px]">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="유전자명, 기능, QTL, Trait, 문헌 참조 검색..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl px-10 py-2.5 text-sm text-slate-200 outline-none focus:border-amber-500 focus:bg-slate-950/90 transition-all"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-2.5 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all"
          >
            <option value="all">모든 유전 정보 형식</option>
            <option value="gene">Gene (유전자)</option>
            <option value="qtl">QTL (형질 유전 자리)</option>
            <option value="variant">Variant (caste 마커 변이)</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-950/70 border border-slate-800/80 text-slate-300 text-xs px-4 py-2.5 rounded-xl outline-none cursor-pointer focus:border-amber-500 transition-all"
          >
            <option value="all">모든 기능 생리 카테고리</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Results table */}
        <div className="overflow-x-auto border border-slate-800/60 rounded-xl bg-slate-950/45">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                <th className="p-3">분류</th>
                <th className="p-3">명칭 / 설명</th>
                <th className="p-3">염색체</th>
                <th className="p-3">물리적 위치 범위 (bp)</th>
                <th className="p-3">기능 설명 / 형질 연구</th>
                <th className="p-3">위치 확인</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredPool().length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-8">
                    검색 필터와 일치하는 유전 정보가 없습니다.
                  </td>
                </tr>
              ) : (
                getFilteredPool().map((item: any, idx: number) => {
                  let typeTag = "";
                  let symbolClass = "";
                  let rangeText = "";
                  let displayTitle = null;

                  if (item.type === "gene") {
                    typeTag = "bg-sky-500/10 text-sky-400 border border-sky-500/20";
                    symbolClass = "text-sky-400";
                    rangeText = `${item.start.toLocaleString()} - ${item.end.toLocaleString()} bp (${item.strand})`;
                    displayTitle = (
                      <div>
                        <strong className="text-sm font-bold">{item.symbol}</strong>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.name}</div>
                      </div>
                    );
                  } else if (item.type === "qtl") {
                    typeTag = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
                    symbolClass = "text-purple-400";
                    rangeText = `${item.start.toLocaleString()} - ${item.end.toLocaleString()} bp`;
                    displayTitle = (
                      <div>
                        <strong className="text-sm font-bold">{item.name}</strong>
                        <div className="text-[10px] text-slate-400 mt-0.5">LOD Locus</div>
                      </div>
                    );
                  } else {
                    typeTag = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                    symbolClass = "text-rose-400";
                    rangeText = `Pos: ${item.pos.toLocaleString()} bp (${item.type})`;
                    displayTitle = (
                      <div>
                        <strong className="text-sm font-bold">{item.id}</strong>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.ref} &rarr; {item.alt}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <tr key={idx} className="border-b border-slate-900/60 hover:bg-slate-900/10 transition-colors">
                      <td className="p-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${typeTag}`}>
                          {item.type.toUpperCase()}
                        </span>
                      </td>
                      <td className={`p-3 font-semibold ${symbolClass}`}>{displayTitle}</td>
                      <td className="p-3 font-bold text-slate-300">{item.chrom}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-400">{rangeText}</td>
                      <td className="p-3 max-w-[340px]">
                        <div className="font-semibold text-slate-300 mb-0.5">
                          {item.type === "variant" ? `형질: ${item.trait}` : item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-relaxed text-ellipsis overflow-hidden">
                          {item.description}
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() =>
                            locateFeatureOnMap(
                              item.chrom,
                              item.type === "variant" ? item.pos : item.start,
                              item.type === "variant" ? item.pos : item.end,
                              item.type,
                              item.symbol || item.name || item.id
                            )
                          }
                          className="bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/20 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          📍 Track 이동
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sliding Drawer Side Details Panel */}
      {drawerOpen && drawerItem && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-[400px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col z-50 animate-slide-left">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <div>
                <span
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{
                    color:
                      drawerType === "variant"
                        ? "var(--color-variant)"
                        : drawerType === "qtl"
                        ? "var(--color-qtl)"
                        : "var(--color-gene)",
                  }}
                >
                  {drawerType.toUpperCase()} | {drawerItem.category || drawerItem.trait || "Behavior"}
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">
                  {drawerItem.symbol || drawerItem.name || drawerItem.id}
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center hover:bg-slate-900 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
              {/* Coords and Info grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-900/30 p-4 border border-slate-900 rounded-xl">
                <div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase">염색체 (LG)</div>
                  <div className="text-xs font-semibold text-slate-200 mt-1">{drawerItem.chrom}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase">위치 좌표</div>
                  <div className="text-[10px] font-mono text-slate-200 mt-1">
                    {drawerType === "variant"
                      ? `${drawerItem.pos.toLocaleString()} bp`
                      : `${drawerItem.start.toLocaleString()} - ${drawerItem.end.toLocaleString()} bp`}
                  </div>
                </div>
              </div>

              {/* Functional description */}
              <div>
                <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-2">상세 기능 주석</h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/20 p-3.5 border border-slate-900 rounded-xl">
                  {drawerItem.description}
                </p>
              </div>

              {/* Research References */}
              <div>
                <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-2">학술 연구 문헌 정보</h4>
                <div className="text-xs font-mono text-slate-300 bg-slate-900/20 p-3.5 border border-slate-900 rounded-xl">
                  {drawerItem.references || "학술 논문 기록이 아직 인덱싱되지 않았습니다."}
                </div>
              </div>

              {/* Curation info (Robertson & Status details) */}
              {drawerType === "gene" && (
                <div className="flex flex-col gap-4 border-t border-slate-900 pt-4">
                  {drawerItem.robertson_id && drawerItem.robertson_id !== "-" && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Robertson ID</span>
                      <span className="text-xs font-mono text-slate-300 bg-slate-900 px-2.5 py-1 rounded">
                        {drawerItem.robertson_id}
                      </span>
                    </div>
                  )}

                  {drawerItem.source && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">데이터 검증 출처</span>
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        {drawerItem.source === "Lab_Curated" ? "국립과학원 수동 큐레이션" : "NCBI RefSeq 표준"}
                      </span>
                    </div>
                  )}

                  {drawerItem.note && (
                    <div>
                      <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-2">큐레이터 검증 메모</h4>
                      <p className="text-xs text-slate-400 leading-relaxed bg-amber-500/5 p-3.5 border border-amber-500/10 rounded-xl">
                        {drawerItem.note}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* NCBI Link buttons */}
              {drawerType === "gene" && drawerItem.ncbiGeneId && (
                <a
                  href={`https://www.ncbi.nlm.nih.gov/gene/${drawerItem.ncbiGeneId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-800 text-center py-2.5 rounded-xl text-xs font-bold transition-colors mt-auto block flex items-center justify-center gap-1.5"
                >
                  🌐 NCBI Gene 표준 포탈 연동
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

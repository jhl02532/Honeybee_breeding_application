"use client";

import React, { useState, useEffect, useRef } from "react";
import { authFetch } from "../utils";

interface TreeNode {
  name?: string;
  length?: number;
  children?: TreeNode[];
  isUserSample?: boolean;
  x?: number;
  y?: number;
}

interface MetadataItem {
  Project_ID: string;
  Original_Sequence_ID: string;
  Year: string;
  Country_Eng: string;
  Region_Kor: string;
  Final_Haplogroup: string;
  Q0?: string;
  Q1?: string;
  Source_Group?: string;
  Barcode?: string; // Simulated sequence barcode
}

export default function PhylogenyPanel() {
  const [treeData, setTreeData] = useState<{ [key: string]: string } | null>(null);
  const [metadata, setMetadata] = useState<MetadataItem[]>([]);
  const [activeTreeKey, setActiveTreeKey] = useState<string>("korean_with_mellifera");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Search & Selection State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  // SVG Zoom & Pan State
  const [zoom, setZoom] = useState<number>(0.8);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 40 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const distanceCacheRef = useRef<Map<string, { closestRefName: string; minDistance: number }>>(new Map());

  // User Sample Simulation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [isSampleInserted, setIsSampleInserted] = useState<boolean>(false);
  const [nearestNodeName, setNearestNodeName] = useState<string>("");

  // SNP Loci selection for user sample
  const [snp1, setSnp1] = useState<string>("A"); // Locus 1
  const [snp2, setSnp2] = useState<string>("T"); // Locus 2
  const [snp3, setSnp3] = useState<string>("G"); // Locus 3
  const [snp4, setSnp4] = useState<string>("A"); // Locus 4
  const [snp5, setSnp5] = useState<string>("T"); // Locus 5

  useEffect(() => {
    const fetchPhylogeny = async () => {
      try {
        setLoading(true);
        const res = await authFetch("/api/v1/researcher/phylogeny-data");
        if (!res.ok) {
          throw new Error("계통수 시각화 데이터를 가져오는 데 실패했습니다.");
        }
        const json = await res.json();
        
        // Enhance metadata with simulated genetic barcodes based on haplogroups
        const enrichedMetadata = (json.metadata || []).map((item: MetadataItem) => {
          let barcode = "A T G A T T A G C G"; // default
          const hg = item.Final_Haplogroup || "K";
          if (hg === "K") barcode = "A T G A T C A C G A";
          else if (hg === "C") barcode = "A T G A T T A G G C";
          else if (hg === "T") barcode = "T T A A C C G G T T";
          else if (hg === "B") barcode = "A C G T A C G T A C";
          else if (hg === "I") barcode = "C C G A T T A G C G";
          return { ...item, Barcode: barcode };
        });

        setTreeData(json.trees);
        setMetadata(enrichedMetadata);
      } catch (err: any) {
        setError(err.message || "서버 통신 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchPhylogeny();
  }, []);

  // Stack-based Newick String Parser (non-recursive to prevent browser call-stack overflows)
  const parseNewick = (newickStr: string): TreeNode => {
    const stack: TreeNode[] = [];
    let current: TreeNode = { children: [] };
    const tokens = newickStr.split(/\s*(;|\(|\)|,|:)\s*/);
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === undefined || token === "" || token === ";") continue;
      
      if (token === "(") {
        const newNode: TreeNode = { children: [] };
        if (!current.children) current.children = [];
        current.children.push(newNode);
        stack.push(current);
        current = newNode;
      } else if (token === ",") {
        const parent = stack[stack.length - 1];
        const newNode: TreeNode = { children: [] };
        parent.children!.push(newNode);
        current = newNode;
      } else if (token === ")") {
        current = stack.pop() || current;
      } else if (token === ":") {
        const val = tokens[++i];
        current.length = parseFloat(val);
      } else {
        current.name = token.replace(/['"]/g, "");
      }
    }
    
    if (current.children && current.children.length > 0) {
      return current.children[0];
    }
    return current;
  };

  // Traversal to inject the user's sample adjacent to the closest reference node
  const injectUserSample = (node: TreeNode, targetName: string): TreeNode => {
    if (!node) return node;

    // Check if children contains the target closest reference node
    if (node.children) {
      const idx = node.children.findIndex(c => c.name === targetName);
      if (idx !== -1) {
        const targetNode = node.children[idx];
        
        // Replace targetNode with a split parent node branching into target and user sample
        const userSampleNode: TreeNode = {
          name: "분석된 내 샘플 (User_Sample)",
          length: 0.0001,
          children: [],
          isUserSample: true
        };

        const newSplitParent: TreeNode = {
          length: (targetNode.length || 0.0002) / 2,
          children: [
            { ...targetNode, length: (targetNode.length || 0.0002) / 2 },
            userSampleNode
          ]
        };

        const updatedChildren = [...node.children];
        updatedChildren[idx] = newSplitParent;
        return { ...node, children: updatedChildren };
      }

      // Recursive call on children
      return {
        ...node,
        children: node.children.map(c => injectUserSample(c, targetName))
      };
    }

    return node;
  };

  // Compile layout coordinates recursively
  const computeCoordinates = (node: TreeNode, depth: number = 0, leafCount = { count: 0 }, maxDepth = { val: 0 }) => {
    if (depth > maxDepth.val) {
      maxDepth.val = depth;
    }

    node.x = depth; // horizontal placement based on depth spacing

    if (!node.children || node.children.length === 0) {
      node.y = leafCount.count * 16; // spacing leaves along Y
      leafCount.count += 1;
    } else {
      node.children.forEach(c => computeCoordinates(c, depth + 1, leafCount, maxDepth));
      // Internal nodes are placed at the center of their children
      const ySum = node.children.reduce((sum, child) => sum + (child.y || 0), 0);
      node.y = ySum / node.children.length;
    }
  };

  // Render SVG links and node elements
  const renderLinks = (node: TreeNode, links: JSX.Element[] = []): JSX.Element[] => {
    if (node.children) {
      node.children.forEach(c => {
        // Draw orthogonal horizontal-vertical cladogram paths
        const pathData = `M ${node.x! * 120} ${node.y!} H ${c.x! * 120} V ${c.y!}`;
        const isHighlight = c.isUserSample || node.isUserSample;
        links.push(
          <path
            key={`link-${node.x}-${node.y}-${c.x}-${c.y}`}
            d={pathData}
            fill="none"
            stroke={isHighlight ? "var(--color-gold)" : "#222222"}
            strokeWidth={isHighlight ? "3" : "2"}
            opacity={1}
            style={{
              stroke: isHighlight ? "var(--color-gold) !important" : "#222222 !important",
              strokeWidth: isHighlight ? "3px !important" : "2px !important",
            }}
          />
        );
        renderLinks(c, links);
      });
    }
    return links;
  };

  const renderNodes = (node: TreeNode, nodes: JSX.Element[] = []): JSX.Element[] => {
    const isLeaf = !node.children || node.children.length === 0;
    const isSearchMatch = searchQuery && node.name && node.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (isLeaf && node.name) {
      nodes.push(
        <g
          key={`node-${node.name}-${node.x}-${node.y}`}
          transform={`translate(${node.x! * 120}, ${node.y!})`}
          style={{ cursor: "pointer" }}
          onClick={() => {
            const meta = metadata.find(m => m.Project_ID === node.name);
            setSelectedNode({ ...node, ...meta });
          }}
        >
          {node.isUserSample ? (
            // Gold Star node for user sample
            <path
              d="M 0,-6 L 2,-2 L 6,-2 L 3,1 L 4,5 L 0,3 L -4,5 L -3,1 L -6,-2 L -2,-2 Z"
              fill="var(--color-gold)"
              stroke="#ffffff"
              strokeWidth="1.5"
              className="pulse-effect"
            />
          ) : (
            // Normal dot node
            <circle
              r={isSearchMatch ? "5" : "3"}
              fill={isSearchMatch ? "#ef4444" : selectedNode?.name === node.name ? "var(--color-gold)" : "var(--text-muted)"}
              stroke={isSearchMatch ? "#ffffff" : "none"}
              strokeWidth={isSearchMatch ? "2" : "0"}
            />
          )}
          <text
            dx={node.isUserSample ? "10" : "8"}
            dy="4"
            fontSize={node.isUserSample || isSearchMatch ? "11px" : "9px"}
            fontWeight={node.isUserSample || isSearchMatch || selectedNode?.name === node.name ? "bold" : "normal"}
            fill={node.isUserSample ? "var(--color-gold)" : isSearchMatch ? "#ef4444" : selectedNode?.name === node.name ? "var(--color-gold)" : "var(--text-muted)"}
          >
            {node.name}
          </text>
        </g>
      );
    } else {
      // Draw internal junction dots
      nodes.push(
        <circle
          key={`int-node-${node.x}-${node.y}`}
          cx={node.x! * 120}
          cy={node.y!}
          r="2.5"
          fill="rgba(255,255,255,0.15)"
        />
      );
      node.children?.forEach(c => renderNodes(c, nodes));
    }
    return nodes;
  };

  // Zoom & Pan Mouse Interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.max(0.2, Math.min(prev * zoomFactor, 3)));
  };

  // Variant Marker comparison nearest-neighbor algorithm
  const handleRunDNAAnalysis = () => {
    setIsSimulating(true);
    setSimProgress(0);
    setIsSampleInserted(false);

    // Dynamic progress bar animation
    const interval = setInterval(() => {
      setSimProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          
          // Execute Hamming distance calculation against database barcodes with memoization
          const userBarcode = `${snp1} ${snp2} ${snp3} ${snp4} ${snp5}`;
          let minDistance = 999;
          let closestRefName = "";

          const cacheKey = `${snp1}_${snp2}_${snp3}_${snp4}_${snp5}_${activeTreeKey}`;
          if (distanceCacheRef.current.has(cacheKey)) {
            const cached = distanceCacheRef.current.get(cacheKey)!;
            closestRefName = cached.closestRefName;
            minDistance = cached.minDistance;
          } else {
            // Select reference database strains based on active tree node leaves
            const currentTreeNodes: string[] = [];
            const currentTreeStr = treeData ? treeData[activeTreeKey] || "" : "";
            const matches = currentTreeStr.match(/[A-Za-z0-9_-]+/g) || [];
            matches.forEach(m => {
              if (m && !["Apis_mellifera_outgroup", "LC640350", "LC640349", "LC640351", "LC640352", "LC640346", "LC640345", "LC640347", "LC640348", "OR936096", "MW309837"].includes(m)) {
                currentTreeNodes.push(m);
              }
            });

            metadata.forEach((ref) => {
              if (!currentTreeNodes.includes(ref.Project_ID)) return;
              const refBarcode = ref.Barcode || "A T G A T T A G C G";
              
              // Compare the 5 locus variants (at corresponding positions in barcode indices 0, 2, 4, 6, 8)
              const refParts = refBarcode.split(" ");
              const userParts = userBarcode.split(" ");
              
              let mismatches = 0;
              for (let i = 0; i < 5; i++) {
                if (refParts[i] !== userParts[i]) mismatches += 1;
              }

              if (mismatches < minDistance) {
                minDistance = mismatches;
                closestRefName = ref.Project_ID;
              }
            });

            // In case no closest match was found, pick a default reference strain
            if (!closestRefName && currentTreeNodes.length > 0) {
              closestRefName = currentTreeNodes[0];
            }

            // Cache the calculated result
            distanceCacheRef.current.set(cacheKey, { closestRefName, minDistance });
          }

          setNearestNodeName(closestRefName);
          setIsSampleInserted(true);
          setIsSimulating(false);

          // Proactively open node info panel for target matched node
          const matchMeta = metadata.find(m => m.Project_ID === closestRefName);
          setSelectedNode({ name: closestRefName, ...matchMeta });

          return 100;
        }
        return p + 20;
      });
    }, 150);
  };

  const handleResetSimulation = () => {
    setIsSampleInserted(false);
    setNearestNodeName("");
    setSelectedNode(null);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(251, 191, 36, 0.2)",
          borderTop: "3px solid var(--color-gold)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "20px", color: "#ef4444", textAlign: "center" }}>
        <h4 style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>⚠️ 데이터 로딩 실패</h4>
        <p style={{ margin: 0, fontSize: "14px" }}>{error}</p>
      </div>
    );
  }

  // Parse and Layout the Active Tree
  let parsedTree: TreeNode = {};
  const rawTreeStr = treeData ? treeData[activeTreeKey] || "" : "";
  if (rawTreeStr) {
    let parsed = parseNewick(rawTreeStr);
    
    // Inject User Sample adjacent to closest reference strain leaf if analysis was completed
    if (isSampleInserted && nearestNodeName) {
      parsed = injectUserSample(parsed, nearestNodeName);
    }
    
    computeCoordinates(parsed);
    parsedTree = parsed;
  }

  const svgLinks = parsedTree.x !== undefined ? renderLinks(parsedTree) : [];
  const svgNodes = parsedTree.x !== undefined ? renderNodes(parsedTree) : [];

  // Compute bounding height based on leaf count to set viewBox height dynamically
  const leafNodesCount = rawTreeStr.match(/\(/g)?.length || 50;
  const computedSvgHeight = Math.max(400, leafNodesCount * 16 + 80);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
      
      {/* ── LEFT SECTION: Interactive DNA Sequencer Widget ── */}
      <div style={{
        flex: "1 1 300px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "14px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "var(--color-gold)", margin: "0 0 4px 0" }}>
            🧬 가상 농가 샘플 시뮬레이터
          </h3>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
            농가에서 분석한 꿀벌 mtDNA 변이 마커(SNP)를 입력하고 시뮬레이션을 작동하여 국내 핵심 계통군 내에서의 유전적 위치를 시각 분석합니다.
          </p>
        </div>

        {/* 5 Mitochondrial SNP Loci Choices */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { label: "Locus 3010 (Haplotype Marker)", val: snp1, setVal: setSnp1 },
            { label: "Locus 4520 (Climate Adaptability)", val: snp2, setVal: setSnp2 },
            { label: "Locus 7890 (CSBV Resistance Locus)", val: snp3, setVal: setSnp3 },
            { label: "Locus 9210 (Cubital-linked Marker)", val: snp4, setVal: setSnp4 },
            { label: "Locus 11450 (Mite Cleansing behavioral)", val: snp5, setVal: setSnp5 },
          ].map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>{item.label}</span>
              <select
                value={item.val}
                onChange={(e) => item.setVal(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-app)",
                  color: "var(--text-main)",
                  fontSize: "12px",
                  outline: "none",
                  fontWeight: "bold"
                }}
              >
                <option value="A">A (Adenine)</option>
                <option value="T">T (Thymine)</option>
                <option value="G">G (Guanine)</option>
                <option value="C">C (Cytosine)</option>
              </select>
            </div>
          ))}
        </div>

        {/* Simulator controls */}
        {isSimulating ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--color-gold)", fontWeight: "bold" }}>
              🧬 분석 정렬 및 유전 거리(Hamming Distance) 계산 중... {simProgress}%
            </span>
            <div style={{ width: "100%", height: "6px", background: "var(--border-color)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${simProgress}%`, height: "100%", background: "var(--color-gold)", transition: "width 0.2s" }} />
            </div>
          </div>
        ) : isSampleInserted ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{
              background: "rgba(251, 191, 36, 0.1)",
              border: "1px solid rgba(251, 191, 36, 0.2)",
              borderRadius: "8px",
              padding: "10px",
              fontSize: "12px",
              lineHeight: 1.5
            }}>
              🎯 분석 완료! 입력된 변이 마커와 유전적으로 가장 인접한 참조 샘플은{" "}
              <strong style={{ color: "var(--color-gold)" }}>{nearestNodeName}</strong>입니다. 계통수 분기점에{" "}
              <strong>'User_Sample'</strong> 노드가 삽입되었습니다.
            </div>
            <button
              onClick={handleResetSimulation}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#f87171",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              시뮬레이션 초기화
            </button>
          </div>
        ) : (
          <button
            onClick={handleRunDNAAnalysis}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-hover))",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "var(--shadow-glow)"
            }}
          >
            🧬 계통 판별 DNA 분석 작동
          </button>
        )}

        {/* Selected node metadata display panel */}
        {selectedNode && (
          <div style={{
            borderTop: "1px solid var(--border-color)",
            paddingTop: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            <h4 style={{ fontSize: "14px", fontWeight: "bold", color: "var(--color-gold)", margin: 0 }}>
              {selectedNode.name === "분석된 내 샘플 (User_Sample)" ? "📍 내 샘플 유전 분석 정보" : "📋 선택된 꿀벌 개체 정보"}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>시료 코드</span>
                <span style={{ fontWeight: "bold", color: "#f3f4f6" }}>{selectedNode.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>수집 연도</span>
                <span>{(selectedNode as any).Year || "2025/2026"}년</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>국가 (Country)</span>
                <span>{(selectedNode as any).Country_Eng || "Rep. Korea"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>수집 권역 (Region)</span>
                <span>{(selectedNode as any).Region_Kor || "격리육종장/농가"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>미토콘드리아 Haplogroup</span>
                <span style={{
                  color: "var(--color-gold)",
                  fontWeight: "bold",
                  background: "var(--color-gold-glow)",
                  padding: "0px 6px",
                  borderRadius: "4px"
                }}>{(selectedNode as any).Final_Haplogroup || "K"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                <span style={{ color: "var(--text-muted)" }}>변이 SNP Loci Barcode</span>
                <span style={{
                  fontFamily: "monospace",
                  background: "var(--bg-app)",
                  padding: "6px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  textAlign: "center",
                  letterSpacing: "1px",
                  color: "var(--color-gold)",
                  border: "1px solid var(--border-color)"
                }}>
                  {selectedNode.name === "분석된 내 샘플 (User_Sample)" 
                    ? `${snp1} ${snp2} ${snp3} ${snp4} ${snp5}` 
                    : (selectedNode as any).Barcode || "A T G A T T A G C G"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT SECTION: Interactive SVG Tree Canvas ── */}
      <div style={{
        flex: "2 1 600px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "14px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxShadow: "var(--shadow-sm)",
        minHeight: "500px"
      }}>
        
        {/* Tree selectors & search */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { key: "korean_with_mellifera", label: "국내 꿀벌 중심 계통수" },
              { key: "korean_only", label: "국내 토종벌 전용 계통수" },
              { key: "balanced", label: "글로벌 참조 균형 계통수" }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTreeKey(t.key);
                  setSelectedNode(null);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  background: activeTreeKey === t.key ? "var(--color-gold-glow)" : "var(--bg-app)",
                  color: activeTreeKey === t.key ? "var(--color-gold)" : "var(--text-muted)",
                  fontSize: "12px",
                  fontWeight: activeTreeKey === t.key ? "bold" : "normal",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ width: "200px" }}>
            <input
              type="text"
              placeholder="시료명 검색 및 강조..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-app)",
                color: "var(--text-main)",
                fontSize: "12px",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Tree canvas instruction guide */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-muted)" }}>
          <span>💡 마우스 드래그로 화면 이동, 휠 스크롤로 확대/축소가 가능합니다.</span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => { setZoom(0.8); setPan({ x: 80, y: 40 }); }} style={{ background: "transparent", border: "none", color: "var(--color-gold)", cursor: "pointer", fontWeight: "bold" }}>
              [화면 리셋]
            </button>
          </div>
        </div>

        {/* SVG Wrapper */}
        <div
          style={{
            flex: 1,
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            background: "var(--bg-app)",
            overflow: "hidden",
            position: "relative",
            minHeight: "400px"
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onWheel={handleWheel}
        >
          {rawTreeStr ? (
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              style={{ userSelect: "none", cursor: isDragging ? "grabbing" : "grab" }}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {svgLinks}
                {svgNodes}
              </g>
            </svg>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "var(--text-muted)", fontSize: "13px" }}>
              선택한 계통수 Newick 데이터를 로드하지 못했습니다.
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { authFetch } from "../utils";

interface TreeNode {
  name?: string;
  length?: number;
  children?: TreeNode[];
  x?: number;
  y?: number;
}

interface MetadataItem {
  Project_ID: string;
  Display_Name: string;
  Color: string;
  Count: number;
  Group: string;
  Italic: boolean;
}

export default function PhylogenyPanel() {
  const [treeData, setTreeData] = useState<{ [key: string]: string } | null>(null);
  const [metadata, setMetadata] = useState<MetadataItem[]>([]);
  const [distances, setDistances] = useState<{ [key: string]: { [key: string]: number } }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Search & Selection State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // SVG Zoom & Pan State
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 30 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Image Modal State
  const [showImageModal, setShowImageModal] = useState<boolean>(false);

  useEffect(() => {
    const fetchPhylogeny = async () => {
      try {
        setLoading(true);
        const res = await authFetch("/api/v1/researcher/phylogeny-data");
        if (!res.ok) {
          throw new Error("계통수 시각화 데이터를 가져오는 데 실패했습니다.");
        }
        const json = await res.json();
        
        setTreeData(json.trees);
        setMetadata(json.metadata || []);
        setDistances(json.distances || {});
      } catch (err: any) {
        setError(err.message || "서버 통신 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchPhylogeny();
  }, []);

  // Stack-based Newick String Parser
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

  // Compile layout coordinates
  const computeCoordinates = (
    node: TreeNode, 
    depth: number = 0, 
    accumulatedX: number = 0,
    leafCount = { count: 0 }, 
    maxDepth = { val: 0 }
  ) => {
    if (depth > maxDepth.val) {
      maxDepth.val = depth;
    }

    node.x = accumulatedX;

    if (!node.children || node.children.length === 0) {
      node.y = leafCount.count * 24; // Y line height spacing
      leafCount.count += 1;
    } else {
      node.children.forEach(c => {
        computeCoordinates(c, depth + 1, accumulatedX + 1.0, leafCount, maxDepth);
      });
      const ySum = node.children.reduce((sum, child) => sum + (child.y || 0), 0);
      node.y = ySum / node.children.length;
    }
  };

  // Render SVG links
  const renderLinks = (node: TreeNode, links: JSX.Element[] = []): JSX.Element[] => {
    if (node.children) {
      node.children.forEach(c => {
        const pathData = `M ${node.x! * 130} ${node.y!} H ${c.x! * 130} V ${c.y!}`;
        links.push(
          <path
            key={`link-${node.x}-${node.y}-${c.x}-${c.y}`}
            d={pathData}
            fill="none"
            stroke="#4b5563"
            strokeWidth="1.8"
            opacity={0.85}
          />
        );
        renderLinks(c, links);
      });
    }
    return links;
  };

  // Render SVG nodes
  const renderNodes = (node: TreeNode, nodes: JSX.Element[] = []): JSX.Element[] => {
    const isLeaf = !node.children || node.children.length === 0;
    const isSearchMatch = searchQuery && node.name && node.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (isLeaf && node.name) {
      const meta = metadata.find(m => m.Project_ID === node.name);
      const nodeColor = meta?.Color || "var(--text-muted)";
      const displayName = meta?.Display_Name || node.name;
      const isItalic = meta?.Italic || false;

      nodes.push(
        <g
          key={`node-${node.name}-${node.x}-${node.y}`}
          transform={`translate(${node.x! * 130}, ${node.y!})`}
          style={{ cursor: "pointer" }}
          onClick={() => setSelectedNode(meta ? { name: node.name, ...meta } : { name: node.name })}
        >
          <circle
            r={isSearchMatch ? "5.5" : "4.5"}
            fill={nodeColor}
            stroke={isSearchMatch || (selectedNode && selectedNode.name === node.name) ? "#ffffff" : "none"}
            strokeWidth={isSearchMatch || (selectedNode && selectedNode.name === node.name) ? "1.5" : "0"}
          />
          <text
            dx="10"
            dy="4"
            fontSize={isSearchMatch || (selectedNode && selectedNode.name === node.name) ? "11px" : "10px"}
            fontWeight={isSearchMatch || (selectedNode && selectedNode.name === node.name) ? "bold" : "normal"}
            fill={(selectedNode && selectedNode.name === node.name) ? "var(--color-gold)" : "#e6edf3"}
            fontStyle={isItalic ? "italic" : "normal"}
          >
            {displayName}
          </text>
        </g>
      );
    } else {
      nodes.push(
        <circle
          key={`int-node-${node.x}-${node.y}`}
          cx={node.x! * 130}
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

  // Parse and Layout the consensus Tree
  let parsedTree: TreeNode = {};
  const rawTreeStr = treeData ? treeData["consensus"] || treeData["korean_with_mellifera"] || "" : "";
  if (rawTreeStr) {
    const parsed = parseNewick(rawTreeStr);
    computeCoordinates(parsed);
    parsedTree = parsed;
  }

  const svgLinks = parsedTree.x !== undefined ? renderLinks(parsedTree) : [];
  const svgNodes = parsedTree.x !== undefined ? renderNodes(parsedTree) : [];

  // Compute distances for selected node
  let sortedDists: [string, any][] = [];
  if (selectedNode && selectedNode.name) {
    const nodeDistances = distances[selectedNode.name] || {};
    sortedDists = Object.entries(nodeDistances)
      .filter(([name]) => name !== selectedNode.name) // exclude self
      .sort((a, b) => a[1] - b[1]); // sort ascending
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", width: "100%" }}>
      
      {/* ── LEFT SECTION: Genetic Distance & Metadata analysis panel ── */}
      <div style={{
        flex: "1 1 320px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "14px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        boxShadow: "var(--shadow-sm)",
        minHeight: "500px"
      }}>
        
        {selectedNode ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Selected Node Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
              <span style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: selectedNode.Color || "var(--text-muted)"
              }} />
              <div>
                <h4 style={{ fontSize: "16px", fontWeight: "bold", color: "#ffffff", margin: 0 }}>
                  {selectedNode.Display_Name || selectedNode.name}
                </h4>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {selectedNode.Group === "cerana" ? "🐝 토종벌 하플로그룹" : (selectedNode.Group === "ref" ? "🍯 해외 참조 품종" : "🦟 외집단 (Outgroup)")}
                </span>
              </div>
            </div>

            {/* Info grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>계통/종 코드</span>
                <span style={{ fontWeight: "bold", fontFamily: "monospace", color: "#f3f4f6" }}>{selectedNode.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>분석 샘플 수</span>
                <span style={{ fontWeight: "bold", color: "var(--color-gold)" }}>{selectedNode.Count} 개체</span>
              </div>
            </div>

            {/* Genetic Distance Analysis */}
            {sortedDists.length > 0 && (
              <div style={{ marginTop: "4px" }}>
                <h5 style={{ fontSize: "12px", fontWeight: "bold", color: "var(--color-gold)", margin: "0 0 8px 0" }}>
                  📊 유전 거리(ML Distance) 판별 결과
                </h5>
                <div style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  overflow: "hidden"
                }}>
                  <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", padding: "8px 12px", fontSize: "11px", fontWeight: "bold", borderBottom: "1px solid var(--border-color)" }}>
                    <span style={{ flex: 1, color: "var(--text-muted)" }}>비교 계통군</span>
                    <span style={{ width: "80px", textAlign: "right", color: "var(--text-muted)" }}>유전 거리</span>
                  </div>
                  <div style={{ maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                    {sortedDists.map(([otherName, dist], idx) => {
                      const otherMeta = metadata.find(m => m.Project_ID === otherName);
                      const otherDisp = otherMeta?.Display_Name || otherName;
                      const otherColor = otherMeta?.Color || "var(--text-muted)";
                      
                      return (
                        <div
                          key={otherName}
                          style={{
                            display: "flex",
                            padding: "8px 12px",
                            fontSize: "11px",
                            borderBottom: idx === sortedDists.length - 1 ? "none" : "1px solid rgba(255,255,255,0.03)",
                            alignItems: "center"
                          }}
                        >
                          <span style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: otherColor,
                            marginRight: "8px",
                            flexShrink: 0
                          }} />
                          <span style={{ flex: 1, color: "#e6edf3", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {otherDisp}
                          </span>
                          <span style={{
                            width: "80px",
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: "bold",
                            color: idx < 3 ? "var(--color-gold)" : "#8b949e"
                          }}>
                            {dist.toFixed(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "240px", color: "var(--text-muted)", textAlign: "center" }}>
            <span style={{ fontSize: "28px" }}>🧬</span>
            <div style={{ fontSize: "13px", fontWeight: "bold" }}>노드 분석 대기 중</div>
            <p style={{ fontSize: "11px", margin: 0, padding: "0 20px", lineHeight: 1.5 }}>
              오른쪽 계통수에서 원형 노드나 계통 이름을 클릭하시면 상세 유전 분석 정보 및 타 품종과의 유전 거리 판별 행렬이 활성화됩니다.
            </p>
          </div>
        )}

        {/* Publication-Ready Visualization Image Card */}
        <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "9px", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Publication-Ready Tree Report
            </span>
            <h5 style={{ fontSize: "13px", fontweight: "bold", color: "#e6edf3", margin: 0 }}>
              고해상도 시각화 계통수 리포트
            </h5>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
              IQ-TREE 및 Ultrafast Bootstrap 지지도(1000회)가 포함된 고화질 시각화 차트 결과 분석 리포트를 확인하세요.
            </p>
            <button
              onClick={() => setShowImageModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--color-gold)",
                background: "rgba(251, 191, 36, 0.05)",
                color: "var(--color-gold)",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s",
                marginTop: "4px"
              }}
            >
              🖼️ 고해상도 분석 이미지 보기
            </button>
          </div>
        </div>

      </div>

      {/* ── RIGHT SECTION: Interactive SVG Tree Canvas ── */}
      <div style={{
        flex: "2 1 500px",
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
        
        {/* Tree Header & Search */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#ffffff", margin: 0 }}>
              🧬 mtDNA 합의 계통수 및 참조 서열 계통 분석
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              IQ-TREE GTR+G 모델 분석 결과 (Outgroup: Bombus ignitus)
            </span>
          </div>

          <div style={{ width: "200px" }}>
            <input
              type="text"
              placeholder="계통명 검색 및 강조..."
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
          <span>💡 마우스 드래그로 화면 이동, 마우스 휠로 확대/축소가 가능합니다.</span>
          <button onClick={() => { setZoom(0.85); setPan({ x: 40, y: 30 }); }} style={{ background: "transparent", border: "none", color: "var(--color-gold)", cursor: "pointer", fontWeight: "bold" }}>
            [화면 리셋]
          </button>
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
            minHeight: "420px"
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
              합의 계통수 데이터를 로드하지 못했습니다.
            </div>
          )}
        </div>
      </div>

      {/* ── HIGH RESOLUTION IMAGE MODAL ── */}
      {showImageModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(13, 17, 23, 0.96)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px"
          }}
          onClick={() => setShowImageModal(false)}
        >
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              fontSize: "24px",
              color: "#ffffff",
              cursor: "pointer",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.2)"
            }}
            onClick={() => setShowImageModal(false)}
          >
            ✕
          </div>
          <img
            src="/mtDNA_phylo_tree.png"
            alt="mtDNA Phylogenetic Tree Analysis"
            style={{
              maxWidth: "95%",
              maxHeight: "85%",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              border: "1px solid #30363d"
            }}
            onClick={(e) => e.stopPropagation()} // prevent close when clicking image
          />
          <div style={{ color: "#8b949e", fontSize: "12px", marginTop: "14px", textAlign: "center" }}>
            <strong>Honeybee mtDNA Phylogenetic Tree Analysis</strong> - IQ-TREE GTR+G (1000 bootstrap replicates)
          </div>
        </div>
      )}

    </div>
  );
}

// Honeybee Genome Hub - Combined Interactive Application Logic

document.addEventListener("DOMContentLoaded", () => {
  // 1. STATE MANAGEMENT
  let selectedSpecies = "mellifera";
  let selectedChrom = "LG1";
  let activeTab = "browser"; // "browser" | "synteny" | "chemo" | "marker"
  
  // Feature Finder state
  let searchFilterText = "";
  let selectedTypeFilter = "all";
  let selectedCategoryFilter = "all";

  // Private custom tracks state
  let privateVariants = [];
  let loadedFileName = "";

  // Data pointers referencing the active species (will be populated dynamically via mock API fetch)
  let GENOME_METADATA = {};
  let CHROMOSOMES = [];
  let GENES = [];
  let QTLS = [];
  let VARIANTS = [];
  let COMPARISONS = [];

  // Mock REST API Fetch Implementation
  async function mockFetch(url, options = {}) {
    // Simulate slight network roundtrip delay (50ms)
    await new Promise(resolve => setTimeout(resolve, 50));

    // Construct a relative URL using origin for parsing parameters
    const parsedUrl = new URL(url, window.location.origin);
    const path = parsedUrl.pathname;
    const species = parsedUrl.searchParams.get("species") || "mellifera";
    const symbol = parsedUrl.searchParams.get("symbol");

    if (!GENOME_DATA[species]) {
      return {
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ error: `Species '${species}' not found in database.` })
      };
    }

    if (path === "/api/genome-metadata") {
      return {
        ok: true,
        json: async () => ({
          metadata: GENOME_DATA[species].metadata,
          description: GENOME_DATA[species].description,
          chromosomes: GENOME_DATA[species].chromosomes
        })
      };
    }

    if (path === "/api/genes") {
      let data = GENOME_DATA[species].genes;
      if (symbol) {
        data = data.filter(g => g.symbol === symbol);
      }
      return {
        ok: true,
        json: async () => data
      };
    }

    if (path === "/api/qtls") {
      return {
        ok: true,
        json: async () => GENOME_DATA[species].qtls
      };
    }

    if (path === "/api/variants") {
      return {
        ok: true,
        json: async () => GENOME_DATA[species].variants
      };
    }

    if (path === "/api/comparisons") {
      return {
        ok: true,
        json: async () => GENOME_DATA[species].comparisons
      };
    }

    if (path === "/api/chemoreceptors") {
      const chemos = GENOME_DATA[species].genes.filter(g => g.functional_class === "Chemoreceptor");
      return {
        ok: true,
        json: async () => chemos
      };
    }

    return {
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ error: "Endpoint not found." })
    };
  }

  // Load species data asynchronously using the mock API
  async function loadSpeciesData(species) {
    try {
      const metaRes = await mockFetch(`/api/genome-metadata?species=${species}`);
      const metaJson = await metaRes.json();
      GENOME_METADATA = metaJson.metadata;
      CHROMOSOMES = metaJson.chromosomes;

      const genesRes = await mockFetch(`/api/genes?species=${species}`);
      GENES = await genesRes.json();

      const qtlsRes = await mockFetch(`/api/qtls?species=${species}`);
      QTLS = await qtlsRes.json();

      const variantsRes = await mockFetch(`/api/variants?species=${species}`);
      VARIANTS = await variantsRes.json();

      const comparisonsRes = await mockFetch(`/api/comparisons?species=${species}`);
      COMPARISONS = await comparisonsRes.json();
    } catch (err) {
      console.error("Failed to fetch genome data from API:", err);
    }
  }

  // 2. DOM ELEMENTS
  const elValAssembly = document.getElementById("val-assembly");
  const elValAccession = document.getElementById("val-accession");
  const elValSize = document.getElementById("val-size");
  
  const elChrListContainer = document.getElementById("chr-list-container");
  const elSvgMapWrapper = document.getElementById("svg-map-wrapper");
  const elTrackBrowserTitle = document.getElementById("track-browser-title");
  const elTrackSelectedInfo = document.getElementById("track-selected-info");
  
  const elTrackRuler = document.getElementById("track-content-ruler");
  const elTrackQtl = document.getElementById("track-content-qtl");
  const elTrackGene = document.getElementById("track-content-gene");
  const elTrackVariant = document.getElementById("track-content-variant");
  const elTrackFocusLine = document.getElementById("track-focus-line");
  const elTrackPrivate = document.getElementById("track-content-private");
  const elPrivateTrackRow = document.getElementById("private-track-row");
  
  const elSearchBox = document.getElementById("search-box");
  const elFilterType = document.getElementById("filter-type");
  const elFilterCategory = document.getElementById("filter-category");
  const elTableBody = document.getElementById("table-body");
  
  const elInfoDrawer = document.getElementById("info-drawer");
  const elCloseDrawerBtn = document.getElementById("close-drawer-btn");
  
  const elDrawerCat = document.getElementById("drawer-cat");
  const elDrawerName = document.getElementById("drawer-name");
  const elDrawerChrom = document.getElementById("drawer-chrom");
  const elDrawerTypeLabel = document.getElementById("drawer-type-label");
  const elDrawerCoords = document.getElementById("drawer-coords");
  const elDrawerDescription = document.getElementById("drawer-description");
  const elDrawerReferences = document.getElementById("drawer-references");
  const elDrawerNcbiLink = document.getElementById("drawer-ncbi-link");
  
  const elDrawerRobertsonItem = document.getElementById("drawer-robertson-item");
  const elDrawerRobertsonId = document.getElementById("drawer-robertson-id");
  const elDrawerSourceItem = document.getElementById("drawer-source-item");
  const elDrawerSourceVal = document.getElementById("drawer-source-val");
  const elDrawerCurationBlock = document.getElementById("drawer-curation-block");
  const elDrawerSourceBadge = document.getElementById("drawer-source-badge");
  const elDrawerStatusBadge = document.getElementById("drawer-status-badge");
  const elDrawerCurationNote = document.getElementById("drawer-curation-note");

  // 3. INITIALIZATION & DYNAMIC CONFIGURATION
  async function init() {
    // Load species data asynchronously before initializing rendering
    await loadSpeciesData(selectedSpecies);

    // Load Species Switcher Listeners
    document.querySelectorAll(".species-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const species = btn.getAttribute("data-species");
        if (species && species !== selectedSpecies) {
          await switchSpecies(species);
        }
      });
    });

    // Load Navigation Tab Listeners
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        if (tab) {
          switchTab(tab);
        }
      });
    });

    // Load Filter Listeners
    elSearchBox.addEventListener("input", (e) => {
      searchFilterText = e.target.value.toLowerCase();
      renderTable();
    });
    
    elFilterType.addEventListener("change", (e) => {
      selectedTypeFilter = e.target.value;
      renderTable();
    });

    elFilterCategory.addEventListener("change", (e) => {
      selectedCategoryFilter = e.target.value;
      renderTable();
    });

    elCloseDrawerBtn.addEventListener("click", closeDrawer);

    // Load Exporters
    document.getElementById("export-csv-btn").addEventListener("click", exportToCsv);
    document.getElementById("export-bed-btn").addEventListener("click", exportToBed);
    document.getElementById("export-fasta-btn").addEventListener("click", exportToFasta);

    // Load VCF Uploader (Uses Web Worker)
    const vcfInput = document.getElementById("vcf-upload-input");
    vcfInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      document.getElementById("vcf-upload-status").textContent = "로딩 중...";
      parseCustomVcfWithWorker(file);
    });

    // Load Synteny Selector
    document.getElementById("synteny-chrom-select").addEventListener("change", () => {
      renderComparativeMap();
    });

    // Load Chemoreceptor search
    document.getElementById("chemo-search-box").addEventListener("input", renderChemoExplorer);
    document.getElementById("chemo-filter-class").addEventListener("change", renderChemoExplorer);
    document.getElementById("chemo-filter-pathway").addEventListener("change", renderChemoExplorer);

    // Load Breeding Marker selector
    document.getElementById("breeding-marker-select").addEventListener("change", (e) => {
      updateBreedingMarkerSimulation(e.target.value);
    });

    // Initial load for starting species
    updateDynamicTexts();

    // Initial Renders
    renderSidebar();
    renderSvgMap();
    renderTrackBrowser();
    renderTable();
    
    // Default designers setup
    updateBreedingMarkerSimulation("KZ288474.1_322717");
    
    // Initialize breeding simulators
    initBreedingSimulators();
    
    // Initialize reliability statistics modal
    initReliabilityModal();
  }

  // Switch active genome dataset, toggle theme styles & trigger reload
  async function switchSpecies(species) {
    selectedSpecies = species;
    selectedChrom = "LG1"; // Default back to chromosome LG1 for the newly selected species

    // Update internal references via mockup API fetch
    await loadSpeciesData(selectedSpecies);

    // Toggle stylesheet body class for theme switching
    if (selectedSpecies === "cerana") {
      document.body.classList.add("theme-cerana");
    } else {
      document.body.classList.remove("theme-cerana");
    }

    // Update switcher buttons active state
    document.querySelectorAll(".species-btn").forEach(btn => {
      if (btn.getAttribute("data-species") === selectedSpecies) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Reset search inputs to prevent cross-species search confusion
    elSearchBox.value = "";
    searchFilterText = "";
    elFilterType.value = "all";
    selectedTypeFilter = "all";
    elFilterCategory.value = "all";
    selectedCategoryFilter = "all";

    // Update static HTML texts
    updateDynamicTexts();

    // Re-render components
    renderSidebar();
    renderSvgMap();
    renderTrackBrowser();
    renderTable();
    
    // Reset uploader
    privateVariants = [];
    elPrivateTrackRow.style.display = "none";
    document.getElementById("vcf-upload-status").textContent = "대기중";
    document.getElementById("vcf-upload-input").value = "";

    // Reset UI indicators
    elTrackFocusLine.style.display = "none";
    closeDrawer();
  }

  // Handle Main Navigation Tabs Switch
  function switchTab(tabId) {
    activeTab = tabId;
    
    // Update active tab buttons
    document.querySelectorAll(".tab-btn").forEach(btn => {
      if (btn.getAttribute("data-tab") === activeTab) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Toggle tab panes
    document.querySelectorAll(".tab-pane").forEach(pane => {
      if (pane.id === `tab-content-${activeTab}`) {
        pane.classList.add("active");
      } else {
        pane.classList.remove("active");
      }
    });

    // Trigger tab-specific renders
    if (activeTab === "browser") {
      renderSidebar();
      renderSvgMap();
      renderTrackBrowser();
      renderTable();
    } else if (activeTab === "synteny") {
      renderComparativeMap();
    } else if (activeTab === "chemo") {
      renderChemoExplorer();
    } else if (activeTab === "marker") {
      // Re-trigger gel simulation drawing
      const activeMarker = document.getElementById("breeding-marker-select").value;
      updateBreedingMarkerSimulation(activeMarker);
    } else if (activeTab === "farmer") {
      if (typeof window.recalculateFarmerSim === 'function') {
        window.recalculateFarmerSim();
      }
    } else if (activeTab === "matchmaker") {
      const mq = document.getElementById("match-queen-csbv");
      if (mq) mq.dispatchEvent(new Event('change'));
    }
  }

  // Dynamically update page-level header text, metadata pills & comparison panels
  function updateDynamicTexts() {
    // Browser Document Metadata
    document.title = `${selectedSpecies === 'mellifera' ? 'Apis mellifera' : 'Apis cerana'} Genomic Mapping Portal (${GENOME_METADATA.assemblyName})`;
    const metaDesc = document.getElementById("meta-desc");
    if (metaDesc) {
      metaDesc.setAttribute("content", `${selectedSpecies === 'mellifera' ? '서양종 꿀벌(Apis mellifera)' : '동양종 꿀벌(Apis cerana)'}의 주요 기능 유전자 및 변이, QTL 정보를 최신 reference genome 어셈블리인 ${GENOME_METADATA.assemblyName}에 매핑하여 함축적으로 시각화하는 인터랙티브 게놈 브라우저 허브입니다.`);
    }

    // Brand Titles
    document.getElementById("brand-title").textContent = `${selectedSpecies === 'mellifera' ? 'Apis mellifera' : 'Apis cerana'} Genomic Portal`;
    document.getElementById("brand-subtitle").textContent = `${selectedSpecies === 'mellifera' ? '서양종 꿀벌' : '동양종 꿀벌'} 주요 기능 유전자, QTL 및 변이 통합 맵`;

    // Metadata Stats Pills
    elValAssembly.textContent = GENOME_METADATA.assemblyName;
    elValAccession.textContent = GENOME_METADATA.refseqAccession;
    elValSize.textContent = GENOME_METADATA.genomeSize;
    document.getElementById("val-chroms").textContent = CHROMOSOMES.length;

    // Main Header Description
    document.getElementById("header-desc").innerHTML = GENOME_DATA[selectedSpecies].description;

    // Search Finder Table Range Header
    document.getElementById("table-header-range").textContent = `Range / 물리적 위치 (${GENOME_METADATA.assemblyName})`;

    // Comparative Assembly Panel Content
    const compContainer = document.getElementById("comparison-container");
    compContainer.innerHTML = "";
    COMPARISONS.forEach(card => {
      const cardEl = document.createElement("div");
      cardEl.className = "comparison-card";
      
      const titleEl = document.createElement("h3");
      titleEl.className = "comparison-card-title";
      titleEl.textContent = card.title;
      cardEl.appendChild(titleEl);

      card.items.forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = "comparison-list-item";
        itemEl.innerHTML = item;
        cardEl.appendChild(itemEl);
      });

      compContainer.appendChild(cardEl);
    });
  }

  // 4. SIDEBAR RENDERING
  function renderSidebar() {
    elChrListContainer.innerHTML = "";
    CHROMOSOMES.forEach(chrom => {
      // Calculate counts for badges based on dynamic lists
      const geneCount = GENES.filter(g => g.chrom === chrom.name).length;
      const qtlCount = QTLS.filter(q => q.chrom === chrom.name).length;
      const varCount = VARIANTS.filter(v => v.chrom === chrom.name).length;

      const item = document.createElement("div");
      item.className = `chr-nav-item ${chrom.name === selectedChrom ? 'active' : ''}`;
      item.innerHTML = `
        <div class="chr-nav-left">
          <div class="chr-dot" style="background-color: ${chrom.color};"></div>
          <div>
            <div class="chr-nav-name">${chrom.name}</div>
            <div class="chr-nav-size">${(chrom.size / 1000000).toFixed(2)} Mb</div>
          </div>
        </div>
        <div class="chr-nav-counts">
          ${geneCount > 0 ? `<span class="count-badge badge-gene">${geneCount}</span>` : ''}
          ${qtlCount > 0 ? `<span class="count-badge badge-qtl">${qtlCount}</span>` : ''}
          ${varCount > 0 ? `<span class="count-badge badge-var">${varCount}</span>` : ''}
        </div>
      `;

      item.addEventListener("click", () => {
        selectChromosome(chrom.name);
      });

      elChrListContainer.appendChild(item);
    });
  }

  // 5. SVG CHROMOSOME OVERVIEW RENDERING
  function renderSvgMap() {
    elSvgMapWrapper.innerHTML = "";
    
    const svgWidth = 1000;
    const svgHeight = 240;
    const paddingLeft = 30;
    const paddingRight = 30;
    const paddingTop = 20;
    const paddingBottom = 40;
    
    const usableWidth = svgWidth - paddingLeft - paddingRight;
    const usableHeight = svgHeight - paddingTop - paddingBottom;
    
    const maxChrSize = Math.max(...CHROMOSOMES.map(c => c.size));
    const numChroms = CHROMOSOMES.length;
    const spacing = usableWidth / (numChroms - 1);
    
    let svgHtml = `<svg width="100%" height="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" style="display: block;">`;
    
    // Add grid lines for size (Mb scale)
    const mbTics = [5, 10, 15, 20, 25];
    mbTics.forEach(tic => {
      const ticBp = tic * 1000000;
      if (ticBp > maxChrSize) return;
      const y = paddingTop + (ticBp / maxChrSize) * usableHeight;
      svgHtml += `
        <line x1="${paddingLeft - 10}" y1="${y}" x2="${svgWidth - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.04)" stroke-dasharray="4" stroke-width="1" />
        <text x="${paddingLeft - 15}" y="${y + 3}" fill="#64748b" font-size="9" font-family="monospace" text-anchor="end">${tic}M</text>
      `;
    });

    // Draw Chromosome Bars
    CHROMOSOMES.forEach((chrom, index) => {
      const x = paddingLeft + index * spacing;
      const barWidth = 18;
      const barHeight = (chrom.size / maxChrSize) * usableHeight;
      const isSelected = chrom.name === selectedChrom;
      
      // Draw chromosome capsule
      svgHtml += `
        <g class="chromosome-bar ${isSelected ? 'selected' : ''}" onclick="selectChromosomeFromSvg('${chrom.name}')">
          <!-- Shadow/Glow -->
          ${isSelected ? `<rect x="${x - barWidth/2 - 2}" y="${paddingTop - 2}" width="${barWidth + 4}" height="${barHeight + 4}" rx="6" fill="var(--color-gold-glow)" />` : ''}
          
          <!-- Base bar -->
          <rect x="${x - barWidth/2}" y="${paddingTop}" width="${barWidth}" height="${barHeight}" rx="4" 
                fill="${chrom.color}" opacity="${isSelected ? 1.0 : 0.4}" stroke="${isSelected ? '#fff' : 'none'}" stroke-width="1.5" />
          
          <!-- Label -->
          <text x="${x}" y="${svgHeight - 15}" fill="${isSelected ? '#f8fafc' : '#94a3b8'}" font-size="10" font-weight="${isSelected ? '700' : '500'}" text-anchor="middle">${chrom.name}</text>
        </g>
      `;

      // Overlay tiny markers representing feature density on chromosomes
      const totalFeatures = [
        ...GENES.filter(g => g.chrom === chrom.name).map(g => ({ pos: (g.start + g.end)/2, type: 'gene' })),
        ...QTLS.filter(q => q.chrom === chrom.name).map(q => ({ pos: (q.start + q.end)/2, type: 'qtl' })),
        ...VARIANTS.filter(v => v.chrom === chrom.name).map(v => ({ pos: v.pos, type: 'variant' }))
      ];

      totalFeatures.forEach(feat => {
        const yPos = paddingTop + (feat.pos / maxChrSize) * usableHeight;
        let color = "var(--color-gene)";
        if (feat.type === 'qtl') color = "var(--color-qtl)";
        if (feat.type === 'variant') color = "var(--color-variant)";
        
        svgHtml += `
          <circle cx="${x}" cy="${yPos}" r="2" fill="${color}" style="pointer-events: none;" />
        `;
      });
    });
    
    svgHtml += `</svg>`;
    elSvgMapWrapper.innerHTML = svgHtml;
  }

  // Handle SVG clicks globally by defining a window function helper
  window.selectChromosomeFromSvg = (name) => {
    selectChromosome(name);
  };

  // State switching
  function selectChromosome(name) {
    selectedChrom = name;
    
    // Update sidebar markers
    renderSidebar();
    
    // Update SVG selection
    renderSvgMap();
    
    // Update track browser
    renderTrackBrowser();
  }

  // 6. DETAILED TRACK BROWSER RENDERING
  function renderTrackBrowser() {
    const chrom = CHROMOSOMES.find(c => c.name === selectedChrom);
    if (!chrom) return;
    
    // Set Header titles
    elTrackBrowserTitle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      염색체 상세 트랙 브라우저 (${chrom.name})
    `;
    elTrackSelectedInfo.textContent = `${chrom.accession} | Size: ${(chrom.size / 1000000).toFixed(2)} Mb`;

    // Clear tracks
    elTrackRuler.innerHTML = "";
    elTrackQtl.innerHTML = "";
    elTrackGene.innerHTML = "";
    elTrackVariant.innerHTML = "";
    elTrackPrivate.innerHTML = "";
    elTrackFocusLine.style.display = "none";

    // Draw Ruler (Mb ticks)
    const totalMb = Math.ceil(chrom.size / 1000000);
    for (let i = 0; i <= totalMb; i++) {
      const posBp = i * 1000000;
      if (posBp > chrom.size) continue;
      const pct = posBp / chrom.size;
      const leftPx = pct * 100;
      
      const tick = document.createElement("div");
      tick.className = "ruler-tick";
      tick.style.left = `${leftPx}%`;
      
      const tickLabel = document.createElement("div");
      tickLabel.className = "ruler-tick-label";
      tickLabel.style.left = `${leftPx}%`;
      tickLabel.textContent = `${i}M`;
      
      elTrackRuler.appendChild(tick);
      elTrackRuler.appendChild(tickLabel);
    }

    // Draw QTLs Track
    const qtls = QTLS.filter(q => q.chrom === chrom.name);
    qtls.forEach(qtl => {
      const left = (qtl.start / chrom.size) * 100;
      const width = ((qtl.end - qtl.start) / chrom.size) * 100;
      
      const block = document.createElement("div");
      block.className = "track-block track-block-qtl";
      block.style.left = `${left}%`;
      block.style.width = `${width}%`;
      block.textContent = qtl.name;
      block.title = `${qtl.name} (${(qtl.start/1000000).toFixed(2)} - ${(qtl.end/1000000).toFixed(2)} Mb)`;
      
      block.addEventListener("click", () => {
        openDrawer(qtl, "qtl");
      });
      elTrackQtl.appendChild(block);
    });

    // Draw Genes Track
    const genes = GENES.filter(g => g.chrom === chrom.name);
    genes.forEach(gene => {
      const left = (gene.start / chrom.size) * 100;
      const width = Math.max(((gene.end - gene.start) / chrom.size) * 100, 0.5); // Ensure visible minimum width
      
      const block = document.createElement("div");
      block.className = "track-block track-block-gene";
      block.style.left = `${left}%`;
      block.style.width = `${width}%`;
      block.textContent = gene.symbol;
      block.title = `${gene.symbol} (${(gene.start/1000000).toFixed(2)} Mb, Strand: ${gene.strand})`;
      
      block.addEventListener("click", () => {
        openDrawer(gene, "gene");
      });
      elTrackGene.appendChild(block);
    });

    // Draw Variants Track
    const variants = VARIANTS.filter(v => v.chrom === chrom.name);
    variants.forEach(variant => {
      const left = (variant.pos / chrom.size) * 100;
      
      const block = document.createElement("div");
      block.className = "track-block track-block-variant";
      block.style.left = `${left}%`;
      block.title = `${variant.id} (${(variant.pos/1000000).toFixed(3)} Mb) - ${variant.trait}`;
      
      block.addEventListener("click", () => {
        openDrawer(variant, "variant");
      });
      elTrackVariant.appendChild(block);
    });

    // Draw Private Tracks if loaded
    const pVars = privateVariants.filter(v => v.chrom === chrom.name);
    if (pVars.length > 0) {
      pVars.forEach(pv => {
        const left = (pv.pos / chrom.size) * 100;
        const block = document.createElement("div");
        block.className = "track-block track-block-variant";
        block.style.left = `${left}%`;
        block.style.background = "#10b981";
        block.style.borderColor = "rgba(0,0,0,0.6)";
        block.title = `Private: ${pv.id} (${pv.ref}->${pv.alt}) at ${(pv.pos/1000000).toFixed(3)} Mb. Trait: ${pv.trait}`;
        
        block.addEventListener("click", () => {
          openDrawer({
            id: pv.id,
            chrom: pv.chrom,
            pos: pv.pos,
            ref: pv.ref,
            alt: pv.alt,
            trait: pv.trait,
            description: `사용자 VCF 파일(${loadedFileName})에서 임베딩된 연구실 전용 마커 변이입니다.`,
            references: "Private Lab Sequencing Target"
          }, "variant");
        });
        elTrackPrivate.appendChild(block);
      });
    }
  }

  // 7. INTEGRATED FEATURE SEARCH & TABLE RENDERING
  function getFilteredPool() {
    let pool = [];
    GENES.forEach(g => pool.push({ ...g, type: "gene" }));
    QTLS.forEach(q => pool.push({ ...q, type: "qtl" }));
    VARIANTS.forEach(v => pool.push({ ...v, type: "variant", start: v.pos, end: v.pos, symbol: v.id }));

    // Apply Search Input Filter
    if (searchFilterText) {
      pool = pool.filter(item => {
        const symbolStr = (item.symbol || "").toLowerCase();
        const nameStr = (item.name || "").toLowerCase();
        const descStr = (item.description || "").toLowerCase();
        const refStr = (item.references || "").toLowerCase();
        const traitStr = (item.trait || "").toLowerCase();
        const chromStr = (item.chrom || "").toLowerCase();
        
        return symbolStr.includes(searchFilterText) || 
               nameStr.includes(searchFilterText) || 
               descStr.includes(searchFilterText) || 
               refStr.includes(searchFilterText) || 
               traitStr.includes(searchFilterText) ||
               chromStr.includes(searchFilterText);
      });
    }

    // Apply Type Filter
    if (selectedTypeFilter !== "all") {
      pool = pool.filter(item => item.type === selectedTypeFilter);
    }

    // Apply Category Filter
    if (selectedCategoryFilter !== "all") {
      pool = pool.filter(item => item.category === selectedCategoryFilter);
    }

    return pool;
  }

  function renderTable() {
    elTableBody.innerHTML = "";
    const pool = getFilteredPool();

    if (pool.length === 0) {
      elTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">검색 필터와 일치하는 유전 정보가 없습니다.</td></tr>`;
      return;
    }

    // Render Rows
    pool.forEach(item => {
      const row = document.createElement("tr");
      
      let typeTag = "";
      let symbolColClass = "";
      let rangeText = "";
      let titleName = "";
      
      if (item.type === "gene") {
        typeTag = `<span class="type-tag tag-gene">GENE</span>`;
        symbolColClass = "symbol-col symbol-col-gene";
        rangeText = `${item.start.toLocaleString()} - ${item.end.toLocaleString()} bp (${item.strand})`;
        titleName = `<strong>${item.symbol}</strong><br><span style="font-size:0.75rem; color:var(--text-secondary);">${item.name}</span>`;
      } else if (item.type === "qtl") {
        typeTag = `<span class="type-tag tag-qtl">QTL</span>`;
        symbolColClass = "symbol-col symbol-col-qtl";
        rangeText = `${item.start.toLocaleString()} - ${item.end.toLocaleString()} bp`;
        titleName = `<strong>${item.name}</strong><br><span style="font-size:0.75rem; color:var(--text-secondary);">LOD Locus</span>`;
      } else {
        typeTag = `<span class="type-tag tag-var">VAR</span>`;
        symbolColClass = "symbol-col symbol-col-var";
        rangeText = `Position: ${item.pos.toLocaleString()} bp (${item.type})`;
        titleName = `<strong>${item.id}</strong><br><span style="font-size:0.75rem; color:var(--text-secondary);">${item.ref} &rarr; ${item.alt}</span>`;
      }

      row.innerHTML = `
        <td>${typeTag}</td>
        <td class="${symbolColClass}">${titleName}</td>
        <td style="font-weight:600;">${item.chrom}</td>
        <td style="font-family:var(--font-mono); font-size:0.8rem;">${rangeText}</td>
        <td>
          <div style="font-weight: 500; margin-bottom: 0.25rem;">${item.type === 'variant' ? `형질: <strong>${item.trait}</strong>` : item.name}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">${item.description}</div>
        </td>
        <td>
          <button class="locate-btn" onclick="locateFeatureOnMap('${item.chrom}', ${item.start}, ${item.end}, '${item.type}', '${item.symbol || item.name || item.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:0.85rem; height:0.85rem;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Locate
          </button>
        </td>
      `;

      elTableBody.appendChild(row);
    });
  }

  // Map Navigation from Table
  window.locateFeatureOnMap = (chromName, startBp, endBp, type, symbol) => {
    // 1. Select the chromosome
    selectChromosome(chromName);

    // 2. Position the highlight FOCUS line in the detailed track browser
    const chrom = CHROMOSOMES.find(c => c.name === chromName);
    if (!chrom) return;
    const midPoint = (startBp + endBp) / 2;
    const pct = (midPoint / chrom.size) * 100;

    elTrackFocusLine.style.display = "block";
    elTrackFocusLine.style.left = `${pct}%`;

    // 3. Scroll the track viewer to center on this focus line
    const trackViewer = document.querySelector(".track-viewer");
    const containerWidth = trackViewer.clientWidth;
    const scrollPosition = (pct / 100) * (elTrackGene.clientWidth || 800) - (containerWidth / 2);
    trackViewer.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: "smooth"
    });

    // 4. Also open the detailed side drawer
    let obj = null;
    if (type === "gene") {
      obj = GENES.find(g => g.symbol === symbol || g.name === symbol);
    } else if (type === "qtl") {
      obj = QTLS.find(q => q.name === symbol);
    } else if (type === "variant") {
      obj = VARIANTS.find(v => v.id === symbol);
      if (!obj) obj = privateVariants.find(v => v.id === symbol);
    }

    if (obj) {
      openDrawer(obj, type);
    }
  };

  window.locateAndOpenGene = (species, symbol) => {
    if (selectedSpecies !== species) {
      switchSpecies(species);
    }
    switchTab("browser");
    const gene = GENES.find(g => g.symbol === symbol || g.id === symbol);
    if (gene) {
      locateFeatureOnMap(gene.chrom, gene.start, gene.end, "gene", gene.symbol);
    }
  };

  // 8. DRAWER MANAGEMENT
  function openDrawer(item, type) {
    elDrawerName.textContent = item.symbol || item.name || item.id;
    elDrawerChrom.textContent = item.chrom;
    elDrawerDescription.textContent = item.description;
    elDrawerReferences.textContent = item.references || "N/A";
    
    // Hide curation elements by default
    if (elDrawerRobertsonItem) elDrawerRobertsonItem.style.display = "none";
    if (elDrawerSourceItem) elDrawerSourceItem.style.display = "none";
    if (elDrawerCurationBlock) elDrawerCurationBlock.style.display = "none";

    let coords = "";
    if (type === "variant") {
      elDrawerCat.textContent = `Variant | ${item.trait}`;
      elDrawerCat.style.color = "var(--color-variant)";
      elDrawerTypeLabel.textContent = "Single Nucleotide Variant (SNP)";
      coords = `Position: ${item.pos.toLocaleString()} bp`;
      elDrawerNcbiLink.style.display = "none";
    } else if (type === "qtl") {
      elDrawerCat.textContent = `QTL Locus | ${item.category || "Behavior"}`;
      elDrawerCat.style.color = "var(--color-qtl)";
      elDrawerTypeLabel.textContent = "Quantitative Trait Loci Region";
      coords = `${item.start.toLocaleString()} - ${item.end.toLocaleString()} bp`;
      elDrawerNcbiLink.style.display = "none";
    } else {
      elDrawerCat.textContent = `Gene | ${item.category || "Development"}`;
      elDrawerCat.style.color = "var(--color-gene)";
      elDrawerTypeLabel.textContent = "Protein-Coding Functional Gene";
      coords = `${item.start.toLocaleString()} - ${item.end.toLocaleString()} bp (${item.strand})`;
      
      // Setup NCBI direct link
      if (item.ncbiGeneId) {
        elDrawerNcbiLink.style.display = "flex";
        elDrawerNcbiLink.href = `https://www.ncbi.nlm.nih.gov/gene/${item.ncbiGeneId}`;
      } else {
        elDrawerNcbiLink.style.display = "none";
      }

      // Show curation info if present
      if (item.robertson_id && item.robertson_id !== "-") {
        if (elDrawerRobertsonItem) {
          elDrawerRobertsonItem.style.display = "flex";
          elDrawerRobertsonId.textContent = item.robertson_id;
        }
      }
      if (item.source) {
        if (elDrawerSourceItem) {
          elDrawerSourceItem.style.display = "flex";
          elDrawerSourceVal.textContent = item.source === "Lab_Curated" ? "Lab Curated" : "NCBI RefSeq";
        }
      }

      if (item.source === "Lab_Curated") {
        if (elDrawerCurationBlock) {
          elDrawerCurationBlock.style.display = "block";
          elDrawerSourceBadge.textContent = "Lab Curated";
          elDrawerSourceBadge.className = "badge-curated-lab";
          elDrawerStatusBadge.textContent = item.status || "Validated";
          elDrawerStatusBadge.className = item.status === "Novel_Locus" ? "badge-status-novel" : "badge-status-validated";
          elDrawerCurationNote.textContent = item.note || "No curation note available.";
        }
      } else if (item.note && item.robertson_id && item.robertson_id !== "-") {
        if (elDrawerCurationBlock) {
          elDrawerCurationBlock.style.display = "block";
          elDrawerSourceBadge.textContent = "NCBI RefSeq";
          elDrawerSourceBadge.className = "badge-curated-refseq";
          elDrawerStatusBadge.textContent = item.status || "Validated";
          elDrawerStatusBadge.className = "badge-status-validated";
          elDrawerCurationNote.textContent = item.note;
        }
      }
    }
    
    elDrawerCoords.textContent = coords;
    elInfoDrawer.classList.add("open");
  }

  function closeDrawer() {
    elInfoDrawer.classList.remove("open");
  }

  // 9. DUAL SPECIES COMPARATIVE SYNTENY RENDERING
  function renderComparativeMap() {
    const wrapper = document.getElementById("synteny-svg-wrapper");
    if (!wrapper) return;
    wrapper.innerHTML = "";

    const selectedPair = document.getElementById("synteny-chrom-select").value;
    // Map dropdown value to species chromosomes
    let mChromName = selectedPair; // e.g. LG1 or LG2
    let cChromName = selectedPair; // e.g. LG1, but if LG2 comparative is chosen, maps to LG12 in Cerana!
    
    if (selectedPair === "LG2") cChromName = "LG12";

    const mChrom = GENOME_DATA.mellifera.chromosomes.find(c => c.name === mChromName);
    const cChrom = GENOME_DATA.cerana.chromosomes.find(c => c.name === cChromName);

    if (!mChrom || !cChrom) return;

    // SVG parameters
    const svgWidth = 960;
    const svgHeight = 360;
    const paddingLeft = 50;
    const paddingRight = 50;
    const usableWidth = svgWidth - paddingLeft - paddingRight;

    let svgHtml = `<svg width="100%" height="${svgHeight}px" viewBox="0 0 ${svgWidth} ${svgHeight}">`;

    // Gradients definitions
    svgHtml += `
      <defs>
        <linearGradient id="grad-mellifera" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#d97706" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>
        <linearGradient id="grad-cerana" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ea580c" />
          <stop offset="100%" stop-color="#f97316" />
        </linearGradient>
      </defs>
    `;

    // Y coordinates for tracks
    const yMellifera = 60;
    const yCerana = 300;
    const barHeight = 16;

    // 1. Draw top chromosome (Mellifera)
    svgHtml += `
      <!-- Top Species Title -->
      <text x="${paddingLeft}" y="${yMellifera - 25}" fill="#cbd5e1" font-size="11" font-weight="800" font-family="sans-serif">Apis mellifera - ${mChrom.name} (${(mChrom.size/1000000).toFixed(2)} Mb)</text>
      <!-- Capsule -->
      <rect x="${paddingLeft}" y="${yMellifera}" width="${usableWidth}" height="${barHeight}" rx="8" fill="url(#grad-mellifera)" opacity="0.85" />
    `;

    // 2. Draw bottom chromosome (Cerana)
    svgHtml += `
      <!-- Bottom Species Title -->
      <text x="${paddingLeft}" y="${yCerana + 35}" fill="#cbd5e1" font-size="11" font-weight="800" font-family="sans-serif">Apis cerana - ${cChrom.name} (${(cChrom.size/1000000).toFixed(2)} Mb)</text>
      <!-- Capsule -->
      <rect x="${paddingLeft}" y="${yCerana}" width="${usableWidth}" height="${barHeight}" rx="8" fill="url(#grad-cerana)" opacity="0.85" />
    `;

    // 3. Draw top genes ticks
    const mGenes = GENOME_DATA.mellifera.genes.filter(g => g.chrom === mChrom.name);
    mGenes.forEach(gene => {
      const x = paddingLeft + (gene.start / mChrom.size) * usableWidth;
      const w = Math.max(4, ((gene.end - gene.start) / mChrom.size) * usableWidth);
      svgHtml += `
        <rect x="${x}" y="${yMellifera - 4}" width="${w}" height="${barHeight + 8}" rx="2" fill="var(--color-gene)" opacity="0.9" style="cursor:pointer;" title="${gene.symbol}"/>
        <text x="${x + w/2}" y="${yMellifera - 8}" fill="#94a3b8" font-size="8px" font-family="monospace" text-anchor="middle">${gene.symbol}</text>
      `;
    });

    // 4. Draw bottom genes ticks
    const cGenes = GENOME_DATA.cerana.genes.filter(g => g.chrom === cChrom.name);
    cGenes.forEach(gene => {
      const x = paddingLeft + (gene.start / cChrom.size) * usableWidth;
      const w = Math.max(4, ((gene.end - gene.start) / cChrom.size) * usableWidth);
      svgHtml += `
        <rect x="${x}" y="${yCerana - 4}" width="${w}" height="${barHeight + 8}" rx="2" fill="var(--color-gold-hover)" opacity="0.9" style="cursor:pointer;" title="${gene.symbol}"/>
        <text x="${x + w/2}" y="${yCerana + 24}" fill="#94a3b8" font-size="8px" font-family="monospace" text-anchor="middle">${gene.symbol}</text>
      `;
    });

    // 5. Draw connecting curves for Orthologs
    const pairs = ORTHOLOGY_MAP.filter(p => p.mellifera.chrom === mChrom.name && p.cerana.chrom === cChrom.name);
    pairs.forEach((pair, idx) => {
      // Calculate top point (Mellifera)
      const x1 = paddingLeft + ((pair.mellifera.start + pair.mellifera.end) / 2 / mChrom.size) * usableWidth;
      const y1 = yMellifera + barHeight;

      // Calculate bottom point (Cerana)
      const x2 = paddingLeft + ((pair.cerana.start + pair.cerana.end) / 2 / cChrom.size) * usableWidth;
      const y2 = yCerana;

      // Draw Cubic Bezier connecting line
      svgHtml += `
        <path d="M ${x1} ${y1} C ${x1} ${y1 + 90}, ${x2} ${y2 - 90}, ${x2} ${y2}" 
              class="synteny-path" id="synteny-path-${idx}" onclick="window.selectOrtholog(${idx})" />
      `;
    });

    svgHtml += `</svg>`;
    wrapper.innerHTML = svgHtml;
    
    // Auto-select first pair if available
    if (pairs.length > 0) {
      window.selectOrtholog(0);
    }
  }

  // Handle ortholog selection display in side card
  window.selectOrtholog = (idx) => {
    const pair = ORTHOLOGY_MAP[idx];
    if (!pair) return;
    
    // Highlight active curve path
    document.querySelectorAll(".synteny-path").forEach(path => path.classList.remove("active"));
    const path = document.getElementById(`synteny-path-${idx}`);
    if (path) path.classList.add("active");

    const melGeneObj = GENOME_DATA.mellifera.genes.find(g => g.symbol === pair.mellifera.symbol);
    const cerGeneObj = GENOME_DATA.cerana.genes.find(g => g.symbol === pair.cerana.symbol);

    const card = document.getElementById("homology-card-container");
    card.innerHTML = `
      <div class="homology-pair-card" style="border-left-color: ${activeTab === 'browser' ? 'var(--color-gold)' : 'var(--color-gene)'}">
        <div class="homology-header">
          <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">1:1 Ortholog Pair</span>
          <span class="homology-percent">Identity: ${pair.identity}</span>
        </div>
        <div style="font-size: 0.8rem; font-weight:700; color:var(--color-gold); margin-bottom: 0.25rem;">
          Pathway: ${pair.pathway}
        </div>
        
        <div class="homology-body">
          <div class="homology-species-block">
            <span class="homology-species-title">Apis mellifera</span>
            <span class="homology-gene-name">${pair.mellifera.symbol}</span>
            <span class="homology-gene-coords">${pair.mellifera.chrom}:${pair.mellifera.start.toLocaleString()}-${pair.mellifera.end.toLocaleString()} (${pair.mellifera.strand})</span>
            <span style="font-size: 0.725rem; color: var(--text-muted);">NCBI ID: ${melGeneObj ? melGeneObj.ncbiGeneId || 'N/A' : 'N/A'}</span>
          </div>

          <div class="homology-species-block" style="border-left: 1px solid rgba(255,255,255,0.06); padding-left: 0.75rem;">
            <span class="homology-species-title">Apis cerana</span>
            <span class="homology-gene-name">${pair.cerana.symbol}</span>
            <span class="homology-gene-coords">${pair.cerana.chrom}:${pair.cerana.start.toLocaleString()}-${pair.cerana.end.toLocaleString()} (${pair.cerana.strand})</span>
            <span style="font-size: 0.725rem; color: var(--text-muted);">NCBI ID: ${cerGeneObj ? cerGeneObj.ncbiGeneId || 'N/A' : 'N/A'}</span>
          </div>
        </div>

        <div class="homology-desc-block">
          <strong>서양종 기능 주석:</strong>
          <div style="margin-top:0.25rem; margin-bottom: 0.5rem; color: var(--text-secondary); font-size:0.8rem;">${melGeneObj ? melGeneObj.description : '-'}</div>
          <strong style="border-top:1px dashed rgba(255,255,255,0.05); display:block; padding-top:0.5rem;">동양종 기능 주석:</strong>
          <div style="margin-top:0.25rem; color: var(--text-secondary); font-size:0.8rem;">${cerGeneObj ? cerGeneObj.description : '-'}</div>
        </div>
      </div>
    `;
  };

  // 10. CHEMORECEPTOR EXPLORER TABLE RENDER
  function renderChemoExplorer() {
    const tableBody = document.getElementById("chemo-table-body");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const searchVal = document.getElementById("chemo-search-box").value.toLowerCase();
    const classVal = document.getElementById("chemo-filter-class").value;
    const pathwayVal = document.getElementById("chemo-filter-pathway").value;

    let chemoItems = [];

    // Gather 1:1 Ortholog Chemoreceptors
    ORTHOLOGY_MAP.forEach(pair => {
      const melGene = GENOME_DATA.mellifera.genes.find(g => g.symbol === pair.mellifera.symbol);
      const cerGene = GENOME_DATA.cerana.genes.find(g => g.symbol === pair.cerana.symbol);

      const fClass = (melGene && melGene.functional_class) || (cerGene && cerGene.functional_class) || pair.category;
      const pathId = (melGene && melGene.pathway_id) || (cerGene && cerGene.pathway_id) || "PW_OLFACTORY";

      if (fClass === "Chemoreceptor" || pair.category.toLowerCase().includes("chemo") || pair.category.toLowerCase().includes("odor")) {
        chemoItems.push({
          type: (melGene && melGene.name.toLowerCase().includes("gustatory")) ? "Gr" : ((melGene && melGene.name.toLowerCase().includes("ionotropic")) ? "Ir" : "Or/Obp"),
          melliferaSymbol: pair.mellifera.symbol,
          melliferaCoords: `${pair.mellifera.chrom}:${pair.mellifera.start.toLocaleString()}-${pair.mellifera.end.toLocaleString()}`,
          ceranaSymbol: pair.cerana.symbol,
          ceranaCoords: `${pair.cerana.chrom}:${pair.cerana.start.toLocaleString()}-${pair.cerana.end.toLocaleString()}`,
          homology: `Mapped Ortholog (${pair.identity})`,
          pathway: pair.pathway,
          pathwayId: pathId,
          melGene: melGene,
          cerGene: cerGene
        });
      }
    });

    // Gather standalone Mellifera chemoreceptors
    GENOME_DATA.mellifera.genes.forEach(g => {
      if (g.functional_class === "Chemoreceptor" && !chemoItems.find(x => x.melliferaSymbol === g.symbol)) {
        chemoItems.push({
          type: g.name.toLowerCase().includes("gustatory") ? "Gr" : (g.name.toLowerCase().includes("ionotropic") ? "Ir" : "Or/Obp"),
          melliferaSymbol: g.symbol,
          melliferaCoords: `${g.chrom}:${g.start.toLocaleString()}-${g.end.toLocaleString()}`,
          ceranaSymbol: "-",
          ceranaCoords: "-",
          homology: "Unmapped in Cerana assembly",
          pathway: g.description,
          pathwayId: g.pathway_id,
          melGene: g,
          cerGene: null
        });
      }
    });

    // Gather standalone Cerana chemoreceptors
    GENOME_DATA.cerana.genes.forEach(g => {
      if (g.functional_class === "Chemoreceptor" && !chemoItems.find(x => x.ceranaSymbol === g.symbol)) {
        chemoItems.push({
          type: g.name.toLowerCase().includes("gustatory") ? "Gr" : (g.name.toLowerCase().includes("ionotropic") ? "Ir" : "Or/Obp"),
          melliferaSymbol: "-",
          melliferaCoords: "-",
          ceranaSymbol: g.symbol,
          ceranaCoords: `${g.chrom}:${g.start.toLocaleString()}-${g.end.toLocaleString()}`,
          homology: "Unmapped in Mellifera assembly",
          pathway: g.description,
          pathwayId: g.pathway_id,
          melGene: null,
          cerGene: g
        });
      }
    });

    // Apply Filter Options
    let filtered = chemoItems;
    if (searchVal) {
      filtered = filtered.filter(item => {
        return item.melliferaSymbol.toLowerCase().includes(searchVal) ||
               item.ceranaSymbol.toLowerCase().includes(searchVal) ||
               item.homology.toLowerCase().includes(searchVal) ||
               item.pathway.toLowerCase().includes(searchVal);
      });
    }

    if (classVal !== "all") {
      filtered = filtered.filter(item => item.type === classVal);
    }

    if (pathwayVal !== "all") {
      filtered = filtered.filter(item => item.pathwayId === pathwayVal);
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">검색 필터와 일치하는 수용체가 없습니다.</td></tr>`;
      return;
    }

    // Render Table Rows
    filtered.forEach(item => {
      const row = document.createElement("tr");

      let typeTag = `<span class="type-tag tag-gene">${item.type}</span>`;
      if (item.type === "Gr") typeTag = `<span class="type-tag tag-qtl">${item.type}</span>`;
      if (item.type === "Ir") typeTag = `<span class="type-tag tag-var">${item.type}</span>`;

      // Find associated variants
      let assoc = [];
      const mVars = GENOME_DATA.mellifera.variants.filter(v => item.melGene && v.gene.includes(item.melliferaSymbol));
      const cVars = GENOME_DATA.cerana.variants.filter(v => item.cerGene && v.gene.includes(item.ceranaSymbol));
      
      mVars.forEach(v => assoc.push(`Am: <strong>${v.id}</strong> (VSH)`));
      cVars.forEach(v => assoc.push(`Ac: <strong>${v.id}</strong> (CSBV)`));

      const variantCell = assoc.length > 0 ? assoc.join("<br>") : `<span style="color:var(--text-muted); font-size:0.75rem;">No linked variants</span>`;

      let melDisplay = `<div style="margin-bottom:0.25rem;">`;
      if (item.melliferaSymbol !== "-") {
        let labelText = item.melliferaSymbol;
        if (item.melGene && item.melGene.robertson_id && item.melGene.robertson_id !== "-") {
          labelText += ` (${item.melGene.robertson_id})`;
        }
        melDisplay += `<a href="#" class="locate-link" style="color:var(--color-gene); font-weight:700;" onclick="window.locateAndOpenGene('mellifera', '${item.melliferaSymbol}'); return false;">${labelText}</a>`;
      } else {
        melDisplay += `<span style="color:var(--text-muted); font-size:0.85rem;">-</span>`;
      }
      melDisplay += `</div>`;
      if (item.melliferaCoords !== "-") {
        melDisplay += `<div style="font-family:var(--font-mono); font-size:0.65rem; color:var(--text-secondary);">${item.melliferaCoords}</div>`;
      }
      if (item.melGene && item.melGene.source === "Lab_Curated") {
        melDisplay += `<div style="margin-top:0.25rem;"><span class="badge-curated-lab">Lab Curated</span></div>`;
      }

      let cerDisplay = `<div style="margin-bottom:0.25rem;">`;
      if (item.ceranaSymbol !== "-") {
        let labelText = item.ceranaSymbol;
        if (item.cerGene && item.cerGene.robertson_id && item.cerGene.robertson_id !== "-") {
          labelText += ` (${item.cerGene.robertson_id})`;
        }
        cerDisplay += `<a href="#" class="locate-link" style="color:var(--color-gold-hover); font-weight:700;" onclick="window.locateAndOpenGene('cerana', '${item.ceranaSymbol}'); return false;">${labelText}</a>`;
      } else {
        cerDisplay += `<span style="color:var(--text-muted); font-size:0.85rem;">-</span>`;
      }
      cerDisplay += `</div>`;
      if (item.ceranaCoords !== "-") {
        cerDisplay += `<div style="font-family:var(--font-mono); font-size:0.65rem; color:var(--text-secondary);">${item.ceranaCoords}</div>`;
      }
      if (item.cerGene && item.cerGene.source === "Lab_Curated") {
        cerDisplay += `<div style="margin-top:0.25rem;"><span class="badge-curated-lab">Lab Curated</span></div>`;
      }

      let pathwayCellContent = `<div style="font-size:0.8rem; line-height:1.4;">${item.pathway}</div>`;
      if (item.melGene && item.melGene.note && item.melGene.source === "Lab_Curated") {
        pathwayCellContent += `
          <div class="curation-note-container" style="margin-top:0.4rem; padding:0.4rem 0.5rem; font-size:0.75rem; border-radius:4px;">
            <strong style="color:#10b981; display:block; margin-bottom:0.15rem;">Am Curation Note:</strong>
            <p style="margin:0; font-size:0.75rem; color:#a7f3d0; line-height:1.3;">${item.melGene.note}</p>
          </div>
        `;
      }
      if (item.cerGene && item.cerGene.note && item.cerGene.source === "Lab_Curated") {
        pathwayCellContent += `
          <div class="curation-note-container" style="margin-top:0.4rem; padding:0.4rem 0.5rem; font-size:0.75rem; border-radius:4px;">
            <strong style="color:#10b981; display:block; margin-bottom:0.15rem;">Ac Curation Note:</strong>
            <p style="margin:0; font-size:0.75rem; color:#a7f3d0; line-height:1.3;">${item.cerGene.note}</p>
          </div>
        `;
      }

      row.innerHTML = `
        <td>${typeTag}</td>
        <td class="symbol-col symbol-col-gene">
          ${melDisplay}
        </td>
        <td class="symbol-col symbol-col-var">
          ${cerDisplay}
        </td>
        <td>
          <div style="font-weight: 700; color: var(--color-gold);">${item.homology}</div>
        </td>
        <td>
          ${pathwayCellContent}
        </td>
        <td style="font-size:0.75rem; line-height:1.3;">
          ${variantCell}
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  // 11. MOLECULAR BREEDING PCR GEL SIMULATION
  function updateBreedingMarkerSimulation(markerId) {
    // Search in all variants across species
    let variant = GENOME_DATA.cerana.variants.find(v => v.id === markerId || v.id === `KZ288474.1_${markerId}`);
    if (!variant) {
      variant = GENOME_DATA.mellifera.variants.find(v => v.id === markerId);
    }

    if (!variant || !variant.is_breeding_marker) return;

    // Fill primers info
    document.getElementById("pcr-primer-fwd").textContent = variant.primer_sequence.fwd;
    document.getElementById("pcr-primer-rev").textContent = variant.primer_sequence.rev;
    
    // Update annealing temp based on marker (CSBV usually 56°C, ATPalpha 58°C, etc.)
    let annealTemp = "58°C";
    if (markerId.includes("322717")) annealTemp = "56°C";
    if (markerId.includes("E23")) annealTemp = "59°C";
    document.getElementById("pcr-temp-anneal").textContent = `${annealTemp}, 30s`;

    // Parse band sizes (e.g., "480 bp", "310 bp")
    const refBp = parseInt(variant.band_size.ref);
    const altBp = parseInt(variant.band_size.alt);

    drawPcrGel(refBp, altBp);
  }

  function drawPcrGel(bandRef, bandAlt) {
    const canvas = document.getElementById("gel-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Clear canvas gel
    ctx.fillStyle = "#040711";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw boundary border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Draw wells at top (y=20)
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
    
    // Helper to map molecular weight in bp to Y migration pixel coordinate
    // logarithmic relationship: distance mig = a - b * log(bp)
    function bpToY(bp) {
      const minY = 45;
      const maxY = 210;
      const minBp = 100;
      const maxBp = 1000;
      const val = Math.log10(bp);
      const minVal = Math.log10(minBp);
      const maxVal = Math.log10(maxBp);
      const pct = (maxVal - val) / (maxVal - minVal);
      return minY + pct * (maxY - minY);
    }
    
    // Draw 100bp DNA Ladder in Lane 0
    const ladderBps = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    const x0 = startX + 0 * (wellWidth + spacing);
    ctx.shadowBlur = 3;
    ctx.shadowColor = "#475569";
    ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
    
    ladderBps.forEach(bp => {
      const y = bpToY(bp);
      ctx.fillRect(x0 + 2, y, wellWidth - 4, 3);
      // text labels for ladder
      ctx.fillStyle = "#64748b";
      ctx.font = "7px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${bp}bp`, x0 - 4, y + 2);
      ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
    });
    
    // Lane 1: Reference (WT) - Red band
    const x1 = startX + 1 * (wellWidth + spacing);
    ctx.shadowColor = "#ef4444";
    ctx.fillStyle = "#ef4444";
    ctx.shadowBlur = 12;
    const yRef = bpToY(bandRef);
    ctx.fillRect(x1 + 2, yRef, wellWidth - 4, 4);
    
    // Lane 2: Variant (Alt) - Green band
    const x2 = startX + 2 * (wellWidth + spacing);
    ctx.shadowColor = "#10b981";
    ctx.fillStyle = "#10b981";
    ctx.shadowBlur = 12;
    const yAlt = bpToY(bandAlt);
    ctx.fillRect(x2 + 2, yAlt, wellWidth - 4, 4);
    
    // Lane 3: Hetero (Ref + Alt alleles co-amplified) - Gold/Orange band
    const x3 = startX + 3 * (wellWidth + spacing);
    ctx.shadowColor = "#f59e0b";
    ctx.fillStyle = "#f59e0b";
    ctx.shadowBlur = 10;
    // draw ref allele band
    ctx.fillRect(x3 + 2, yRef, wellWidth - 4, 3);
    // draw alt allele band
    ctx.fillRect(x3 + 2, yAlt, wellWidth - 4, 3);
    
    // Lane 4: Negative Control (Water blank - should show only primer dimers near bottom)
    const x4 = startX + 4 * (wellWidth + spacing);
    ctx.shadowColor = "#475569";
    ctx.fillStyle = "rgba(71, 85, 105, 0.4)";
    ctx.shadowBlur = 2;
    ctx.fillRect(x4 + 6, bpToY(80), wellWidth - 12, 2); // primer dimer band
    
    // Reset shadow values
    ctx.shadowBlur = 0;
  }

  // 12. LOCAL VCF FILE UPLOADER & OVERLAY TRACK VIA WEB WORKER
  function parseCustomVcfWithWorker(file) {
    loadedFileName = file.name;
    
    // Inline Web Worker code
    const workerBlobCode = `
      self.onmessage = function(e) {
        const file = e.data.file;
        const chromosomes = e.data.chromosomes;
        
        try {
          // Sync read inside Web Worker
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
            
            // Normalize chromosome name to match LG formats
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
      chromosomes: CHROMOSOMES
    });
    
    worker.onmessage = function(e) {
      URL.revokeObjectURL(workerUrl);
      if (e.data.success) {
        const loaded = e.data.variants;
        if (loaded.length > 0) {
          privateVariants = loaded;
          elPrivateTrackRow.style.display = "table-row";
          document.getElementById("vcf-upload-status").textContent = `Loaded ${loaded.length} private variants`;
          renderTrackBrowser();
        } else {
          document.getElementById("vcf-upload-status").textContent = "Empty VCF or no valid records";
        }
      } else {
        console.error("Worker parsing error:", e.data.error);
        document.getElementById("vcf-upload-status").textContent = "Parsing failed";
      }
    };
  }

  // 13. FILE EXPORTERS (CSV, BED, FASTA)
  function downloadBlob(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportToCsv() {
    const pool = getFilteredPool();
    let csv = "Type,Symbol_or_ID,Chromosome,Start,End,Strand_Position,Trait_or_Name,Description,References\n";
    pool.forEach(item => {
      let type = item.type.toUpperCase();
      let name = item.symbol || item.name || item.id;
      let start = item.type === "variant" ? item.pos : item.start;
      let end = item.type === "variant" ? item.pos : item.end;
      let strand = item.strand || (item.type === "variant" ? item.type : "+");
      let trait = (item.trait || item.name || "-").replace(/"/g, '""');
      let desc = (item.description || "").replace(/"/g, '""');
      let refs = (item.references || "").replace(/"/g, '""');
      
      csv += `"${type}","${name}","${item.chrom}",${start},${end},"${strand}","${trait}","${desc}","${refs}"\n`;
    });

    downloadBlob(csv, `honeybee_portal_extract_${selectedSpecies}.csv`, "text/csv");
  }

  function exportToBed() {
    const pool = getFilteredPool();
    let bed = "";
    pool.forEach(item => {
      let start = item.type === "variant" ? item.pos - 1 : item.start;
      let end = item.type === "variant" ? item.pos : item.end;
      let name = item.symbol || item.name || item.id;
      let score = 0;
      let strand = item.strand || "+";
      bed += `${item.chrom}\t${start}\t${end}\t${name}\t${score}\t${strand}\n`;
    });

    downloadBlob(bed, `honeybee_portal_features_${selectedSpecies}.bed`, "text/plain");
  }

  function exportToFasta() {
    const pool = getFilteredPool();
    let fasta = "";
    pool.forEach(item => {
      if (item.type === "qtl") return; // Skip QTL intervals for FASTA extraction
      
      let name = item.symbol || item.id;
      let start = item.type === "variant" ? item.pos : item.start;
      let end = item.type === "variant" ? item.pos : item.end;
      
      // Generate standard mock FASTA sequence for client-side lightweight simulation
      let simulatedSeq = "";
      const len = Math.min(100, end - start + 1);
      const nucleotides = ["A", "T", "C", "G"];
      for (let i = 0; i < len; i++) {
        simulatedSeq += nucleotides[(start + i) % 4];
      }
      
      fasta += `>${name} | assembly:${GENOME_METADATA.assemblyName} | locus:${item.chrom}:${start}-${end} | length:${end - start + 1}bp\n${simulatedSeq}\n`;
    });

    downloadBlob(fasta, `honeybee_simulated_sequences_${selectedSpecies}.fasta`, "text/plain");
  }

  // Add utility strip strings
  String.prototype.strip = function() {
    return this.replace(/^\s+|\s+$/g, '');
  };

  // 12. FARMER BREEDING PORTAL & VIRTUAL MATING SIMULATORS
  let farmerRadarChartInstance = null;

  function initBreedingSimulators() {
    // Farmer Trait Simulator Form Listeners
    const elCsbv = document.getElementById("farmer-csbv");
    const elVsh = document.getElementById("farmer-vsh");
    const elSugar = document.getElementById("farmer-sugar");
    const elTemper = document.getElementById("farmer-temper");
    const elPrintBtn = document.getElementById("farmer-print-btn");

    if (elCsbv && elVsh && elSugar && elTemper) {
      const updateScores = () => {
        const csbvVal = elCsbv.value;
        const vshVal = elVsh.value;
        const sugarVal = elSugar.value;
        const temperVal = elTemper.value;

        // Calculate scores
        let honeyBase = 5;
        let honeySugar = sugarVal === "High" ? 50 : (sugarVal === "Medium" ? 35 : 15);
        let honeyTemper = temperVal === "Aggressive" ? 45 : (temperVal === "Moderate" ? 35 : 25);
        let honeyScore = honeyBase + honeySugar + honeyTemper; // 45 to 100

        let diseaseCsbv = csbvVal === "AA" ? 50 : (csbvVal === "Aa" ? 25 : 0);
        let diseaseVsh = vshVal === "AA" ? 50 : (vshVal === "Aa" ? 25 : 0);
        let diseaseScore = diseaseCsbv + diseaseVsh; // 0 to 100

        let gentleBase = 0;
        let gentleTemper = temperVal === "Gentle" ? 80 : (temperVal === "Moderate" ? 50 : 10);
        let gentleVsh = vshVal === "aa" ? 20 : (vshVal === "Aa" ? 15 : 5);
        let gentleScore = gentleBase + gentleTemper + gentleVsh; // 15 to 100

        let fecundVsh = vshVal === "aa" ? 50 : (vshVal === "Aa" ? 40 : 20);
        let fecundSugar = sugarVal === "Medium" ? 50 : (sugarVal === "Low" ? 35 : 20);
        let fecundityScore = fecundVsh + fecundSugar; // 40 to 100

        // Render Report Narrative
        let reports = [];
        if (diseaseScore >= 80) {
          reports.push("✓ 본 봉군은 낭충봉아부패병(CSBV) 및 바로아 응애 저항성 유전인자가 안정적으로 고정되어 위생 및 면역 활성이 최상위급입니다.");
        } else if (diseaseScore < 40) {
          reports.push("⚠ 질병 저항성 유전자 고정도가 매우 낮습니다. 낭충봉아부패병 및 진드기 감염 취약군이므로 격리 방제 및 저항성 종봉 교배 개량이 긴급 요구됩니다.");
        } else {
          reports.push("• 질병 저항성이 보통 수준입니다. 정기적 약제 방제와 위생 상태 모니터링이 필요합니다.");
        }

        if (honeyScore >= 80) {
          reports.push("✓ 설탕 민감성이 극대화되어 아카시아 등 유밀기의 유밀 수밀력이 매우 탁월할 것으로 예측됩니다.");
        } else if (honeyScore < 60) {
          reports.push("• 수밀력 성향이 다소 정체되어 있습니다. 외역 채집량 증대를 위해 외부 사양 보강이 권장됩니다.");
        }

        if (gentleScore >= 80) {
          reports.push("✓ 온순성이 매우 훌륭하여 관리 및 내검이 대단히 용이하며 벌침 쏘임 사고 우려가 대폭 감소합니다.");
        } else if (gentleScore < 40) {
          reports.push("⚠ 봉군 방어 성향이 지나치게 강해 내검 시 주의(보호 장구 필수)가 필요하며 민가 인근 배치 시 방벽 설치가 필요합니다.");
        }

        if (fecundityScore < 60) {
          reports.push("⚠ 과도한 VSH 작용 또는 채집 쏠림으로 유밀기 육아율(Fecundity) 저하 현상이 보일 수 있으니 단백질 화분떡 공급을 적극 늘려주세요.");
        } else {
          reports.push("✓ 벌통 내 육아 및 여왕벌 산란력이 훌륭하게 유지되어 안정적인 일벌 개체수 회전율을 보장합니다.");
        }

        document.getElementById("farmer-report-text").innerHTML = reports.join("<br><br>");

        // Draw Chart
        drawFarmerRadar(honeyScore, diseaseScore, gentleScore, fecundityScore);
      };

      elCsbv.addEventListener("change", updateScores);
      elVsh.addEventListener("change", updateScores);
      elSugar.addEventListener("change", updateScores);
      elTemper.addEventListener("change", updateScores);

      window.recalculateFarmerSim = () => {
        updateScores();
      };

      if (elPrintBtn) {
        elPrintBtn.addEventListener("click", () => {
          window.print();
        });
      }

      // Initial draw
      updateScores();
    }

    // Matchmaker Selection Listeners (Polyandry Upgrade)
    const mqCsbv = document.getElementById("match-queen-csbv");
    const mqVsh = document.getElementById("match-queen-vsh");
    const mdCsbvSlider = document.getElementById("match-drone-csbv-slider");
    const mdVshSlider = document.getElementById("match-drone-vsh-slider");
    const mdCsbvVal = document.getElementById("match-drone-csbv-val");
    const mdVshVal = document.getElementById("match-drone-vsh-val");

    // Global Polyandry Inheritance Calculation Engine
    window.computePolyandryInheritance = (queen, dronePool) => {
      let countA = 0;
      let count_a = 0;

      if (Array.isArray(dronePool)) {
        dronePool.forEach(allele => {
          if (allele === "A") countA++;
          else if (allele === "a") count_a++;
        });
      } else if (typeof dronePool === 'object' && dronePool !== null) {
        countA = dronePool.A || 0;
        count_a = dronePool.a || 0;
      }

      const total = countA + count_a;
      if (total === 0) {
        return { "AA": 0, "Aa": 0, "aa": 0, "error": "수벌을 최소 1마리 이상 선택해야 합니다." };
      }

      const p = countA / total;
      const q = count_a / total;

      let split = { "AA": 0, "Aa": 0, "aa": 0 };

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

    if (mqCsbv && mqVsh && mdCsbvSlider && mdVshSlider && mdCsbvVal && mdVshVal) {
      let isSyncing = false;

      // Render Checkboxes dynamically
      const renderDroneCheckboxes = (containerId, type, initialCheckedCount) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";
        for (let i = 0; i < 15; i++) {
          const isChecked = i < initialCheckedCount;
          const label = document.createElement("label");
          label.style.cssText = "display: inline-flex; align-items: center; cursor: pointer; user-select: none;";
          
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = `drone-checkbox-${type}`;
          checkbox.dataset.index = i;
          checkbox.checked = isChecked;
          checkbox.style.display = "none";
          
          const badge = document.createElement("span");
          badge.className = `drone-badge-${type}`;
          badge.textContent = isChecked ? "A" : "a";
          badge.style.cssText = `
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.65rem;
            font-weight: bold;
            border: 1px solid ${isChecked ? (type === "csbv" ? "#10b981" : "#c084fc") : "rgba(239, 68, 68, 0.3)"};
            background: ${isChecked ? (type === "csbv" ? "rgba(16, 185, 205, 0.15)" : "rgba(192, 132, 252, 0.15)") : "rgba(239, 68, 68, 0.15)"};
            color: ${isChecked ? (type === "csbv" ? "#10b981" : "#c084fc") : "#ef4444"};
            transition: all 0.15s;
          `;
          
          label.appendChild(checkbox);
          label.appendChild(badge);
          container.appendChild(label);
          
          // Checkbox Listener
          checkbox.addEventListener("change", () => {
            if (isSyncing) return;
            isSyncing = true;

            const allCbs = container.querySelectorAll(`.drone-checkbox-${type}`);
            let checkedCount = 0;
            allCbs.forEach((cb) => {
              const cbBadge = cb.nextSibling;
              if (cb.checked) {
                checkedCount++;
                cbBadge.textContent = "A";
                cbBadge.style.color = type === "csbv" ? "#10b981" : "#c084fc";
                cbBadge.style.borderColor = type === "csbv" ? "#10b981" : "#c084fc";
                cbBadge.style.background = type === "csbv" ? "rgba(16, 185, 205, 0.15)" : "rgba(192, 132, 252, 0.15)";
              } else {
                cbBadge.textContent = "a";
                cbBadge.style.color = "#ef4444";
                cbBadge.style.borderColor = "rgba(239, 68, 68, 0.3)";
                cbBadge.style.background = "rgba(239, 68, 68, 0.15)";
              }
            });

            // Update slider value
            const slider = type === "csbv" ? mdCsbvSlider : mdVshSlider;
            slider.value = checkedCount;

            calculateBreeding();
            isSyncing = false;
          });
        }
      };

      // Sync Slider to Checkboxes
      const syncSliderToCheckboxes = (slider, type) => {
        if (isSyncing) return;
        isSyncing = true;
        const val = parseInt(slider.value);
        const container = document.getElementById(`match-drone-${type}-checkboxes`);
        if (container) {
          const checkboxes = container.querySelectorAll(`.drone-checkbox-${type}`);
          checkboxes.forEach((cb, idx) => {
            const isChecked = idx < val;
            cb.checked = isChecked;
            const badge = cb.nextSibling;
            if (isChecked) {
              badge.textContent = "A";
              badge.style.color = type === "csbv" ? "#10b981" : "#c084fc";
              badge.style.borderColor = type === "csbv" ? "#10b981" : "#c084fc";
              badge.style.background = type === "csbv" ? "rgba(16, 185, 205, 0.15)" : "rgba(192, 132, 252, 0.15)";
            } else {
              badge.textContent = "a";
              badge.style.color = "#ef4444";
              badge.style.borderColor = "rgba(239, 68, 68, 0.3)";
              badge.style.background = "rgba(239, 68, 68, 0.15)";
            }
          });
        }
        isSyncing = false;
      };

      const calculateBreeding = () => {
        const qCsbv = mqCsbv.value; // AA, Aa, aa
        const qVsh = mqVsh.value; // AA, Aa, aa
        const dCsbvCount = parseInt(mdCsbvSlider.value); // A count (0-15)
        const dVshCount = parseInt(mdVshSlider.value); // A count (0-15)

        // Update Slider Labels
        mdCsbvVal.innerHTML = `A 수벌: ${dCsbvCount}마리 / a 수벌: ${15 - dCsbvCount}마리 (${(dCsbvCount / 15 * 100).toFixed(1)}%)`;
        mdVshVal.innerHTML = `A 수벌: ${dVshCount}마리 / a 수벌: ${15 - dVshCount}마리 (${(dVshCount / 15 * 100).toFixed(1)}%)`;

        const csbvSplit = window.computePolyandryInheritance(qCsbv, { A: dCsbvCount, a: 15 - dCsbvCount });
        const vshSplit = window.computePolyandryInheritance(qVsh, { A: dVshCount, a: 15 - dVshCount });

        // Display Split stacked percentage bars & numbers
        const renderSplitText = (split) => {
          if (split.error) {
            return `
              <div style="margin-bottom:0.75rem; width:100%; padding:0.6rem; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:6px; color:#ef4444; font-size:0.725rem; font-weight:bold; text-align:center; line-height:1.4;">
                ⚠ ${split.error}
              </div>
            `;
          }
          const pctAA = (split["AA"] || 0).toFixed(1);
          const pctAa = (split["Aa"] || 0).toFixed(1);
          const pctaa = (split["aa"] || 0).toFixed(1);
          
          return `
            <div style="margin-bottom:0.75rem; width:100%;">
              <div style="display:flex; height:20px; border-radius:10px; overflow:hidden; background:rgba(0,0,0,0.3); margin-bottom:0.5rem; border:1px solid rgba(255,255,255,0.06); padding:2px;">
                ${pctAA > 0 ? `<div style="width:${pctAA}%; background:#10b981; border-radius:8px 0 0 8px; transition: width 0.2s;" title="저항성형 AA: ${pctAA}%"></div>` : ''}
                ${pctAa > 0 ? `<div style="width:${pctAa}%; background:#f59e0b; transition: width 0.2s;" title="보인자형 Aa: ${pctAa}%"></div>` : ''}
                ${pctaa > 0 ? `<div style="width:${pctaa}%; background:#ef4444; border-radius:0 8px 8px 0; transition: width 0.2s;" title="감수성형 aa: ${pctaa}%"></div>` : ''}
              </div>
              <div style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="color:#10b981; display:flex; align-items:center; gap:0.25rem;"><span style="display:inline-block; width:6px; height:6px; background:#10b981; border-radius:50%;"></span> 저항성형 (AA)</span>
                  <span style="font-family:monospace; color:var(--text-primary); font-weight:bold;">${pctAA}%</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="color:#f59e0b; display:flex; align-items:center; gap:0.25rem;"><span style="display:inline-block; width:6px; height:6px; background:#f59e0b; border-radius:50%;"></span> 보인자형 (Aa)</span>
                  <span style="font-family:monospace; color:var(--text-primary); font-weight:bold;">${pctAa}%</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="color:#ef4444; display:flex; align-items:center; gap:0.25rem;"><span style="display:inline-block; width:6px; height:6px; background:#ef4444; border-radius:50%;"></span> 감수성형 (aa)</span>
                  <span style="font-family:monospace; color:var(--text-primary); font-weight:bold;">${pctaa}%</span>
                </div>
              </div>
            </div>
          `;
        };

        document.getElementById("match-prob-csbv").innerHTML = renderSplitText(csbvSplit);
        document.getElementById("match-prob-vsh").innerHTML = renderSplitText(vshSplit);

        // Render Punnett Squares
        const drawPunnett = (queen, countA, count_a) => {
          const total = countA + count_a;
          if (total === 0) {
            return `
              <div style="padding:1rem; text-align:center; color:#ef4444; font-size:0.75rem; font-weight:bold; border:1px dashed rgba(239,68,68,0.25); border-radius:8px; background:rgba(239,68,68,0.04); width:100%; line-height:1.4;">
                ⚠ 수벌을 1마리 이상 선택하십시오.
              </div>
            `;
          }
          const qEggs = queen === "Aa" ? ["A", "a"] : (queen === "AA" ? ["A", "A"] : ["a", "a"]);
          const fA = countA / total;
          const fa = count_a / total;
          
          const pctA = (fA * 100).toFixed(1);
          const pct_a = (fa * 100).toFixed(1);
          
          const getGenoClass = (geno) => {
            if (geno === "AA") return "punnett-cell-genotype resistant";
            if (geno === "Aa" || geno === "aA") return "punnett-cell-genotype carrier";
            return "punnett-cell-genotype susceptible";
          };
          const formatGeno = (geno) => {
            if (geno === "aA") return "Aa";
            return geno;
          };

          return `
            <table class="punnett-table" style="width:100%; border-collapse:collapse; text-align:center;">
              <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
                  <th style="padding:0.45rem; font-size:0.7rem; color:var(--text-muted);">♀ \\ ♂</th>
                  <th style="padding:0.45rem; font-size:0.75rem; color:#10b981; font-weight:700;">A (${pctA}%)</th>
                  <th style="padding:0.45rem; font-size:0.75rem; color:#ef4444; font-weight:700;">a (${pct_a}%)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                  <th style="padding:0.5rem; font-size:0.8rem; color:var(--text-secondary); border-right:1px solid rgba(255,255,255,0.08);">${qEggs[0]} (50%)</th>
                  <td class="${getGenoClass(qEggs[0] + 'A')}" style="padding:0.5rem; font-size:0.8rem; font-weight:bold;">
                    ${formatGeno(qEggs[0] + 'A')}<br>
                    <span style="font-size:0.65rem; color:var(--text-muted); font-weight:normal;">(${(50 * fA).toFixed(1)}%)</span>
                  </td>
                  <td class="${getGenoClass(qEggs[0] + 'a')}" style="padding:0.5rem; font-size:0.8rem; font-weight:bold;">
                    ${formatGeno(qEggs[0] + 'a')}<br>
                    <span style="font-size:0.65rem; color:var(--text-muted); font-weight:normal;">(${(50 * fa).toFixed(1)}%)</span>
                  </td>
                </tr>
                <tr>
                  <th style="padding:0.5rem; font-size:0.8rem; color:var(--text-secondary); border-right:1px solid rgba(255,255,255,0.08);">${qEggs[1]} (50%)</th>
                  <td class="${getGenoClass(qEggs[1] + 'A')}" style="padding:0.5rem; font-size:0.8rem; font-weight:bold;">
                    ${formatGeno(qEggs[1] + 'A')}<br>
                    <span style="font-size:0.65rem; color:var(--text-muted); font-weight:normal;">(${(50 * fA).toFixed(1)}%)</span>
                  </td>
                  <td class="${getGenoClass(qEggs[1] + 'a')}" style="padding:0.5rem; font-size:0.8rem; font-weight:bold;">
                    ${formatGeno(qEggs[1] + 'a')}<br>
                    <span style="font-size:0.65rem; color:var(--text-muted); font-weight:normal;">(${(50 * fa).toFixed(1)}%)</span>
                  </td>
                </tr>
              </tbody>
            </table>
          `;
        };

        document.getElementById("punnett-csbv-container").innerHTML = drawPunnett(qCsbv, dCsbvCount, 15 - dCsbvCount);
        document.getElementById("punnett-vsh-container").innerHTML = drawPunnett(qVsh, dVshCount, 15 - dVshCount);

        // Advisory Korean Text Generator (Polyandry Context)
        let advice = [];
        
        if (csbvSplit.error || vshSplit.error) {
          advice.push(`⚠ <strong>분석 보류:</strong> 수벌 정액 풀이 비어있습니다. 왼쪽 패널에서 슬라이더를 조절하거나 체크박스를 선택하여 교배에 참여할 수벌을 최소 1마리 이상 지정하십시오.`);
        } else {
          // CSBV check
          const aaCsbvPct = csbvSplit["aa"] || 0;
          const AACsbvPct = csbvSplit["AA"] || 0;
          if (aaCsbvPct > 0) {
            advice.push(`⚠ <strong>낭충봉아부패병(CSBV) 취약 위험 개체 발생:</strong> F1 일벌 집단의 <strong>${aaCsbvPct.toFixed(1)}%</strong>가 감수성 유전자형(aa)으로 발현되어 바이러스 감염 시 봉군 전체의 소멸 위험이 높습니다. CSBV 저항성형 수벌(A)의 수(현재 ${dCsbvCount}마리)를 더 늘려 교배 조합을 수정하십시오.`);
          } else if (AACsbvPct === 100) {
            advice.push(`✓ <strong>CSBV 저항성 완전 고정:</strong> F1 일벌 집단의 100%가 저항성형(AA)으로 태어납니다. 바이러스에 매우 우수한 저항력을 가지며 유전학적으로 완벽히 고정된 안전한 조합입니다.`);
          } else {
            advice.push(`• <strong>CSBV 보인자 보유 조합:</strong> F1 일벌의 ${AACsbvPct.toFixed(1)}%가 AA 저항성, ${(csbvSplit["Aa"] || 0).toFixed(1)}%가 Aa 보인자형으로 발현합니다. 질병 증상은 발현하지 않으나, 차세대 여왕벌 육성 시 유전 형질이 분리되므로 추가 저항성 고정 작업이 필요합니다.`);
          }

          // VSH check
          const aaVshPct = vshSplit["aa"] || 0;
          const AAVshPct = vshSplit["AA"] || 0;
          if (aaVshPct > 0) {
            advice.push(`⚠ <strong>응애 자연 정화(VSH) 기능 결핍 위험:</strong> F1 일벌 집단의 <strong>${aaVshPct.toFixed(1)}%</strong>가 VSH 청소 본능이 결핍(aa)됩니다. 이 교배 조합 시 가을철 응애 밀도가 급증할 수 있으므로, VSH 위생 행동을 갖춘 수벌(A)의 비중(현재 ${dVshCount}마리)을 크게 높여 보완 조치하십시오.`);
          } else if (AAVshPct === 100) {
            advice.push(`✓ <strong>친환경 VSH 청소력 고정:</strong> F1 일벌 집단의 100%가 강력한 VSH 청소 본능(AA)을 나타내어 외부 약제 사용량 감축과 진드기 예방이 가능한 이상적인 조합입니다.`);
          } else {
            advice.push(`• <strong>VSH 행동력 혼합군:</strong> VSH 청소 능력이 부분적으로 발현(AA 및 Aa 혼재)하여 일반 봉군보다는 청소 행동이 양호하지만, 청소 본능이 완벽히 고정되지 않은 조합입니다. 개량 고정도를 높이기 위해 VSH 수벌(A)의 수치를 늘리는 것을 권장합니다.`);
          }
        }

        document.getElementById("match-advice-text").innerHTML = advice.join("<br><br>");
      };

      // Set up listeners and initial checkbox render
      renderDroneCheckboxes("match-drone-csbv-checkboxes", "csbv", dCsbvCount);
      renderDroneCheckboxes("match-drone-vsh-checkboxes", "vsh", dVshCount);

      mqCsbv.addEventListener("change", calculateBreeding);
      mqVsh.addEventListener("change", calculateBreeding);

      mdCsbvSlider.addEventListener("input", () => {
        syncSliderToCheckboxes(mdCsbvSlider, "csbv");
        calculateBreeding();
      });
      mdVshSlider.addEventListener("input", () => {
        syncSliderToCheckboxes(mdVshSlider, "vsh");
        calculateBreeding();
      });

      // Initial calculate
      calculateBreeding();
    }
  }

  // 14. BREEDING PREDICTION RELIABILITY MODAL & SVG CORRELATION PLOTS
  function initReliabilityModal() {
    const btnShow = document.getElementById("show-reliability-btn");
    const btnClose = document.getElementById("close-reliability-modal");
    const modal = document.getElementById("reliability-modal");
    
    if (btnShow && btnClose && modal) {
      btnShow.addEventListener("click", () => {
        modal.style.display = "flex";
        drawReliabilityPlot("honey");
        // Reset active tab state
        document.querySelectorAll(".modal-tab-btn").forEach(btn => {
          if (btn.getAttribute("data-trait") === "honey") {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        });
      });
      
      btnClose.addEventListener("click", () => {
        modal.style.display = "none";
      });
      
      // Close on clicking backdrop
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
        }
      });
      
      // Tab change listeners
      document.querySelectorAll(".modal-tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          document.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.remove("active"));
          e.target.classList.add("active");
          const trait = e.target.getAttribute("data-trait");
          drawReliabilityPlot(trait);
        });
      });
    }
  }

  function drawReliabilityPlot(trait) {
    const container = document.getElementById("reliability-plot-container");
    const summary = document.getElementById("reliability-stats-summary");
    if (!container || !summary) return;

    let R2 = 0.84;
    let traitName = "수밀력 (Honey Yield)";
    let observedName = "연간 벌꿀 수확량 (kg)";
    
    if (trait === "honey") {
      R2 = 0.84;
      traitName = "수밀력 (Honey Yield)";
      observedName = "연간 벌꿀 수확량 (kg)";
    } else if (trait === "disease") {
      R2 = 0.91;
      traitName = "질병저항성 (Disease Resistance)";
      observedName = "CSBV/바로아응애 생존율 (%)";
    } else if (trait === "gentle") {
      R2 = 0.78;
      traitName = "온순성 (Gentleness)";
      observedName = "내검시 공격 횟수 역수 (점수)";
    } else if (trait === "fecundity") {
      R2 = 0.82;
      traitName = "번식력 (Fecundity)";
      observedName = "산란 육아권 평면적 (㎠)";
    }

    const rVal = Math.sqrt(R2);
    
    // Generate deterministic points using Math.sin
    const points = [];
    const noiseLevel = (1 - R2) * 20; // scales noise
    for (let i = 0; i < 28; i++) {
      const x = 52 + (i * 1.6);
      const noise = Math.sin(i * 4.3) * noiseLevel;
      const y = Math.max(42, Math.min(98, x + noise));
      points.push({ x, y });
    }

    // Coord transform helpers (Map [40, 100] to SVG [50, 360] and [200, 30])
    const toSvgX = (x) => 50 + (x - 40) * (310 / 60);
    const toSvgY = (y) => 200 - (y - 40) * (170 / 60);

    // Create SVG grid lines, axes, regression line, and points
    let svgContent = `
      <svg viewBox="0 0 400 240" style="width:100%; height:100%; font-family:inherit;">
        <!-- Grid Lines -->
    `;
    
    // X grid lines
    for (let val = 40; val <= 100; val += 10) {
      const sx = toSvgX(val);
      svgContent += `<line x1="${sx}" y1="200" x2="${sx}" y2="30" stroke="rgba(255,255,255,0.05)" stroke-width="1" />`;
      // X labels
      svgContent += `<text x="${sx}" y="215" fill="#cbd5e1" font-size="8" text-anchor="middle">${val}</text>`;
    }

    // Y grid lines
    for (let val = 40; val <= 100; val += 10) {
      const sy = toSvgY(val);
      svgContent += `<line x1="50" y1="${sy}" x2="360" y2="${sy}" stroke="rgba(255,255,255,0.05)" stroke-width="1" />`;
      // Y labels
      svgContent += `<text x="42" y="${sy + 3}" fill="#cbd5e1" font-size="8" text-anchor="end">${val}</text>`;
    }

    // Axes
    svgContent += `
      <line x1="50" y1="200" x2="360" y2="200" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <line x1="50" y1="30" x2="50" y2="200" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      
      <!-- Axis Labels -->
      <text x="205" y="232" fill="#94a3b8" font-size="8" font-weight="bold" text-anchor="middle">예측 유전 점수 (Predicted Score)</text>
      <text x="14" y="115" fill="#94a3b8" font-size="8" font-weight="bold" text-anchor="middle" transform="rotate(-90 14 115)">실제 검사치 (${observedName})</text>
      
      <!-- Regression Line (Ideal y=x correlation) -->
      <line x1="${toSvgX(45)}" y1="${toSvgY(45)}" x2="${toSvgX(95)}" y2="${toSvgY(95)}" class="regression-line" />
    `;

    // Data points
    points.forEach(p => {
      const cx = toSvgX(p.x);
      const cy = toSvgY(p.y);
      svgContent += `<circle cx="${cx}" cy="${cy}" r="3.5" class="data-point" />`;
    });

    svgContent += `
      <!-- Legend -->
      <g transform="translate(60, 45)">
        <rect width="90" height="28" fill="rgba(15,23,42,0.6)" rx="4" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
        <line x1="8" y1="14" x2="22" y2="14" class="regression-line" />
        <text x="27" y="12" fill="#cbd5e1" font-size="7" font-weight="bold">회귀선 (y = x)</text>
        <circle cx="15" cy="21" r="2.5" fill="#10b981" />
        <text x="27" y="24" fill="#cbd5e1" font-size="7" font-weight="bold">실험군 봉군 (N=120)</text>
      </g>
      </svg>
    `;

    container.innerHTML = svgContent;

    // Summary Text
    summary.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.2rem;">
        <span style="font-weight:700; color:var(--text-primary); font-size:0.75rem;">상관분석 검증 통계</span>
        <span style="color:var(--text-muted); font-size:0.65rem;">대상: 국립농업과학원 공동 연구 실험봉군 (N=120)</span>
      </div>
      <div style="display:flex; gap:0.75rem; align-items:center; font-family:monospace; font-weight:bold;">
        <div>R² = <span style="color:var(--color-gold);">${R2.toFixed(2)}</span></div>
        <div style="border-left:1px solid rgba(255,255,255,0.15); padding-left:0.75rem; color:#10b981;">r = ${rVal.toFixed(2)}</div>
        <div style="border-left:1px solid rgba(255,255,255,0.15); padding-left:0.75rem; color:var(--text-muted); font-size:0.65rem;">p &lt; 0.001</div>
      </div>
    `;
  }

  function drawFarmerRadar(honey, disease, gentle, fecundity) {
    const canvas = document.getElementById("farmer-radar-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (typeof Chart === 'undefined') {
      console.warn("Chart.js is not loaded.");
      return;
    }

    if (farmerRadarChartInstance) {
      farmerRadarChartInstance.destroy();
    }

    farmerRadarChartInstance = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['수밀력 (Honey Yield)', '질병저항성 (Disease)', '온순성 (Gentleness)', '번식력 (Fecundity)'],
        datasets: [{
          label: '형질 예측치 (Score)',
          data: [honey, disease, gentle, fecundity],
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          borderColor: '#f59e0b',
          borderWidth: 2,
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#ffffff',
          pointRadius: 4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            grid: {
              color: 'rgba(255, 255, 255, 0.08)'
            },
            angleLines: {
              color: 'rgba(255, 255, 255, 0.08)'
            },
            pointLabels: {
              color: '#cbd5e1',
              font: {
                family: 'Outfit, sans-serif',
                size: 9,
                weight: 'bold'
              }
            },
            ticks: {
              display: false,
              stepSize: 20
            },
            min: 0,
            max: 100
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  // Run initial loading
  init();
});

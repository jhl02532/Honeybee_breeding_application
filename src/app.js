// MelittaBreed Central Controller & UI Renderer
const db = window.db;
const WeatherSimulator = window.WeatherSimulator;
const GeneticsEngine = window.GeneticsEngine;

// --- APP DEVELOPER SAFETY LUCIDE WRAPPER ---
function safeCreateIcons() {
  if (window.lucide) {
    try {
      window.lucide.createIcons();
    } catch (e) {
      console.warn("[Lucide Error Boundary] Failed to render some icons safely:", e);
    }
  }
}

// --- APP DEVELOPER DEBOUNCE UTILITY ---
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// --- APP DEVELOPER UNIDIRECTIONAL STORE MANAGER (Redux-like Store) ---
class MelittaStore {
  constructor(database) {
    this.db = database;
    this.subscribers = new Set();
    
    // Core Central State
    this.state = {
      activeTab: 'dashboard',
      selectedColonyId: 'COL-101', // Default active colony for Genetics Sandbox
      selectionWeights: {
        honey: 20,
        propolis: 10,
        jelly: 10,
        mite: 15,
        virus: 15,
        gentle: 10,
        swarming: 5,
        winter: 10,
        climate: 5
      },
      searchQuery: '',
      dbTable: 'traits'
    };
  }

  getState() {
    return this.state;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback); // Unsubscribe helper
  }

  notify() {
    this.subscribers.forEach(callback => callback(this.state));
  }

  dispatch(action) {
    console.log(`[MelittaStore] Action Dispatched:`, action);
    try {
      switch (action.type) {
        case 'SWITCH_TAB':
          this.state.activeTab = action.payload;
          break;
        case 'SELECT_COLONY':
          this.state.selectedColonyId = action.payload;
          break;
        case 'UPDATE_WEIGHTS':
          this.state.selectionWeights = { ...this.state.selectionWeights, ...action.payload };
          break;
        case 'SET_SEARCH':
          this.state.searchQuery = action.payload;
          break;
        case 'SET_DB_TABLE':
          this.state.dbTable = action.payload;
          break;
        case 'SAVE_APIARY':
          this.db.saveApiary(action.payload);
          break;
        case 'SAVE_QUEEN':
          this.db.saveQueen(action.payload);
          break;
        case 'SAVE_COLONY':
          this.db.saveColony(action.payload);
          break;
        case 'SAVE_TRAIT':
          this.db.saveTrait(action.payload);
          break;
        case 'DELETE_ROW':
          const { table, id } = action.payload;
          if (table === 'apiaries') this.db.deleteApiary(id);
          else if (table === 'queens') this.db.deleteQueen(id);
          else if (table === 'colonies') this.db.deleteColony(id);
          else if (table === 'traits') this.db.deleteTrait(id);
          break;
        case 'RESET_DATABASE':
          this.db.resetDatabase();
          break;
        case 'IMPORT_DATABASE':
          this.db.importDatabase(action.payload);
          break;
        default:
          console.warn(`[MelittaStore] Unknown action: ${action.type}`);
          return;
      }
      this.notify();
    } catch (e) {
      console.error(`[MelittaStore] Error executing action [${action.type}]:`, e);
      alert(`[데이터베이스 정합성 오류] ${e.message}`);
    }
  }
}

class MelittaApp {
  constructor() {
    // Instantiating the state store
    this.store = new MelittaStore(db);
    this.lastStateHash = '';
    
    this.init();
  }

  init() {
    // Unidirectional Data Flow subscription
    this.store.subscribe((state) => this.onStateChange(state));
    
    // Wait for DOM to load fully
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onReady());
    } else {
      this.onReady();
    }
  }

  onStateChange(state) {
    // FRONTEND RENDER GUARD (Memoization Hash Compare)
    // Minimizes redundant expensive DOM calculations and layouts
    const stateHash = state.activeTab + '_' + 
                      state.selectedColonyId + '_' + 
                      state.dbTable + '_' + 
                      state.searchQuery + '_' + 
                      JSON.stringify(state.selectionWeights) + '_' +
                      db.getTraits().length + '_' +
                      db.getColonies().length;
                      
    if (this.lastStateHash === stateHash) {
      return; // Skip rendering when state hash is completely identical
    }
    this.lastStateHash = stateHash;

    console.log("[App Developer] State changed. Invoking reactive re-render.");
    this.renderHeaderStats();
    this.renderActiveTab(state);
  }

  onReady() {
    this.bindEvents();
    
    // Trigger initial render with current store state
    const state = this.store.getState();
    this.renderHeaderStats();
    this.renderActiveTab(state);
    this.updateRecordingWeather(); // Initial weather seeding
  }

  bindEvents() {
    // Navigation Tabs clicking
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const tabName = e.currentTarget.getAttribute('data-tab');
        this.store.dispatch({ type: 'SWITCH_TAB', payload: tabName });
      });
    });

    // Forms Submission
    // Apiary Form
    document.getElementById('apiary-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleApiarySubmit(e.target);
    });

    // Queen Form
    document.getElementById('queen-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleQueenSubmit(e.target);
    });

    // Colony Form
    document.getElementById('colony-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleColonySubmit(e.target);
    });

    // Trait Record Form
    document.getElementById('trait-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleTraitSubmit(e.target);
    });

    // Auto-fill weather on colony selection in Touch Recorder
    document.getElementById('tr-colony-select')?.addEventListener('change', (e) => {
      this.updateRecordingWeather(e.target.value);
    });

    // Touch Recorder number increment/decrement handlers
    document.querySelectorAll('.num-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const inputId = e.currentTarget.getAttribute('data-input');
        const change = parseFloat(e.currentTarget.getAttribute('data-change'));
        const input = document.getElementById(inputId);
        if (input) {
          let val = parseFloat(input.value) || 0;
          val = Math.max(0, val + change);
          const hasDecimalStep = (input.step || '').includes('.') || (input.getAttribute('step') || '').includes('.');
          input.value = hasDecimalStep ? val.toFixed(1) : Math.floor(val);
        }
      });
    });

    // Dynamic slider bubble update
    document.querySelectorAll('.styled-range').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const bubbleId = e.target.getAttribute('data-bubble');
        const bubble = document.getElementById(bubbleId);
        if (bubble) {
          bubble.textContent = `${e.target.value}점`;
        }
      });
    });

    // DBA & App Developer: DEBOUNCED SEARCH AND TABLE FILTER (250ms)
    const handleSearchInput = debounce((e) => {
      this.store.dispatch({ type: 'SET_SEARCH', payload: e.target.value });
    }, 250);

    document.getElementById('db-search-input')?.addEventListener('input', handleSearchInput);

    document.getElementById('db-table-select')?.addEventListener('change', (e) => {
      this.store.dispatch({ type: 'SET_DB_TABLE', payload: e.target.value });
    });

    // Database Actions
    document.getElementById('btn-export-csv')?.addEventListener('click', () => this.exportCurrentTableToCSV());
    document.getElementById('btn-backup-json')?.addEventListener('click', () => this.downloadJSONBackup());
    document.getElementById('btn-reset-db')?.addEventListener('click', () => {
      if (confirm('모든 데이터가 기본 연구용 초기값으로 복구됩니다. 진행하시겠습니까?')) {
        this.store.dispatch({ type: 'RESET_DATABASE' });
      }
    });

    // Import DB triggering
    document.getElementById('db-import-file')?.addEventListener('change', (e) => {
      this.handleJSONImport(e.target);
    });

    // Selection Weights in Genetics Tab
    document.querySelectorAll('.weight-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const trait = e.target.getAttribute('data-trait');
        const newWeight = {};
        newWeight[trait] = parseInt(e.target.value);
        this.store.dispatch({ type: 'UPDATE_WEIGHTS', payload: newWeight });
        document.getElementById(`w-val-${trait}`).textContent = `${e.target.value}%`;
        this.updateWeightsTotal();
      });
    });

    // Researcher & Breeder Actions
    document.getElementById('btn-export-plink')?.addEventListener('click', () => this.exportToPLINKFormat());
    document.getElementById('btn-export-r-pedigree')?.addEventListener('click', () => this.exportToRPedigree());
    document.getElementById('btn-run-mating')?.addEventListener('click', () => this.runMatingSimulation());

    // User Tutorial Accordion Click Handlers
    document.querySelectorAll('.tutorial-card-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const card = e.currentTarget.closest('.tutorial-card');
        const isOpen = card.classList.contains('active');
        
        // Close all other accordions for a smooth, single-open premium feel
        document.querySelectorAll('.tutorial-card').forEach(c => c.classList.remove('active'));
        
        // Toggle the clicked one
        if (!isOpen) {
          card.classList.add('active');
        }
      });
    });

    // Interactive Tab Redirect buttons inside Tutorial
    document.querySelectorAll('.redirect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTabName = e.currentTarget.getAttribute('data-target');
        if (targetTabName) {
          this.store.dispatch({ type: 'SWITCH_TAB', payload: targetTabName });
        }
      });
    });
  }

  // Header Diagnostics Info
  renderHeaderStats() {
    const apiaries = db.getApiaries();
    const colonies = db.getColonies();
    const traits = db.getTraits();
    
    // Update top header info
    document.getElementById('stat-apiaries-count').textContent = apiaries.length;
    document.getElementById('stat-colonies-count').textContent = colonies.length;
    document.getElementById('stat-records-count').textContent = traits.length;
  }

  // Backward compatibility wrapper for old direct invocation
  switchTab(tabName) {
    this.store.dispatch({ type: 'SWITCH_TAB', payload: tabName });
  }

  renderActiveTab(state = null) {
    if (!state) state = this.store.getState();
    const activeTab = state.activeTab;

    // Toggle active state classes on navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === activeTab);
    });

    // Toggle active classes on tab-pane sections
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `${activeTab}-tab`);
    });

    // Dynamically update the header title and matching icon
    const tabMetaData = {
      'dashboard': { title: '연구 대시보드', icon: 'layout-dashboard' },
      'pedigree': { title: '농가 및 계통 관리', icon: 'git-branch' },
      'touch-recorder': { title: '야외 현장기록기', icon: 'tablet' },
      'db-visualizer': { title: '육종 데이터베이스', icon: 'database' },
      'genetics-sandbox': { title: '유전체 샌드박스', icon: 'dna' },
      'tutorial': { title: '사용자 튜토리얼', icon: 'help-circle' }
    };
    
    const meta = tabMetaData[activeTab];
    const titleEl = document.getElementById('tab-title-text');
    if (titleEl && meta) {
      titleEl.innerHTML = `<i data-lucide="${meta.icon}" class="text-gold"></i> ${meta.title}`;
    }

    switch (activeTab) {
      case 'dashboard':
        this.renderDashboard(state);
        break;
      case 'pedigree':
        this.renderPedigreeManager(state);
        break;
      case 'touch-recorder':
        this.renderTouchRecorder(state);
        break;
      case 'db-visualizer':
        this.renderDatabaseVisualizer(state);
        break;
      case 'genetics-sandbox':
        this.renderGeneticsSandbox(state);
        break;
      case 'tutorial':
        this.renderTutorial(state);
        break;
    }
    safeCreateIcons();
  }

  // --- 1. DASHBOARD VIEW ---
  renderDashboard(state = null) {
    if (!state) state = this.store.getState();
    const apiaries = db.getApiaries();
    const colonies = db.getColonies();
    const traits = db.getTraits();

    // 1. Calculate KPI Metrics
    const activeColonies = colonies.filter(c => c.status === 'Healthy').length;
    const avgHoney = traits.length > 0 
      ? (traits.reduce((s, r) => s + r.honeyYield, 0) / traits.length).toFixed(1) 
      : '0.0';
    const avgOverwinter = traits.length > 0
      ? Math.round(traits.reduce((s, r) => s + (r.overwinteringSurvival || 0), 0) / traits.length)
      : '0';

    document.getElementById('kpi-active-colonies').textContent = `${activeColonies} / ${colonies.length}`;
    document.getElementById('kpi-avg-honey').textContent = avgHoney;
    document.getElementById('kpi-overwinter').textContent = `${avgOverwinter}%`;

    // 2. Render SVG Charts wrapped in developer Component Error Boundaries
    // This safeguards the dashboard layout against component runtime crashes
    try {
      this.renderHoneyYieldChart(colonies, traits);
    } catch (e) {
      console.error("[Error Boundary] renderHoneyYieldChart failed:", e);
      document.getElementById('honey-yield-chart-container').innerHTML = `
        <div class="error-boundary-card" style="padding:16px; background:rgba(239, 68, 68, 0.05); border:1px dashed var(--danger); border-radius:8px; color:var(--danger); font-size:12px;">
          <strong>⚠️ 채밀량 분석 차트 일시적 렌더링 실패</strong><br>
          <span style="font-size:11px; color:var(--text-muted);">${e.message}</span>
        </div>
      `;
    }

    try {
      this.renderWeatherTrendsChart();
    } catch (e) {
      console.error("[Error Boundary] renderWeatherTrendsChart failed:", e);
      document.getElementById('weather-trends-chart-container').innerHTML = `
        <div class="error-boundary-card" style="padding:16px; background:rgba(239, 68, 68, 0.05); border:1px dashed var(--danger); border-radius:8px; color:var(--danger); font-size:12px;">
          <strong>⚠️ 기상 예보 추이 차트 일시적 렌더링 실패</strong><br>
          <span style="font-size:11px; color:var(--text-muted);">${e.message}</span>
        </div>
      `;
    }

    try {
      this.renderNationalHealthMap(apiaries, colonies, traits);
    } catch (e) {
      console.error("[Error Boundary] renderNationalHealthMap failed:", e);
      document.getElementById('national-health-map-container').innerHTML = `
        <div class="error-boundary-card" style="padding:16px; background:rgba(239, 68, 68, 0.05); border:1px dashed var(--danger); border-radius:8px; color:var(--danger); font-size:12px;">
          <strong>⚠️ 국가 GIS 보건 방역 지도 렌더링 실패</strong><br>
          <span style="font-size:11px; color:var(--text-muted);">${e.message}</span>
        </div>
      `;
    }
  }

  // Renders a stunning custom SVG Bar Chart of colony honey yields
  renderHoneyYieldChart(colonies, traits) {
    const container = document.getElementById('honey-yield-chart-container');
    if (!container) return;

    // Calculate average honey yield per colony code
    const chartData = colonies.map(col => {
      const colRecords = traits.filter(t => t.colonyId === col.id);
      const avg = colRecords.length > 0
        ? colRecords.reduce((s, r) => s + r.honeyYield, 0) / colRecords.length
        : 0;
      return {
        code: col.hiveCode,
        yield: parseFloat(avg.toFixed(1))
      };
    }).filter(d => d.yield > 0);

    if (chartData.length === 0) {
      container.innerHTML = `<div style="height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted);">형질 기록 데이터가 충분하지 않습니다.</div>`;
      return;
    }

    const width = container.clientWidth || 500;
    const height = 240;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };

    const maxVal = Math.max(...chartData.map(d => d.yield)) * 1.1 || 10;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const barWidth = Math.min(45, (chartWidth / chartData.length) * 0.6);
    const barSpacing = (chartWidth - (barWidth * chartData.length)) / (chartData.length + 1);

    let barsSvg = '';
    let axesSvg = '';
    let labelsSvg = '';

    // Draw Y grid lines & labels
    const gridLinesCount = 5;
    for (let i = 0; i <= gridLinesCount; i++) {
      const yVal = (maxVal / gridLinesCount) * i;
      const yPos = padding.top + chartHeight - (chartHeight * (yVal / maxVal));
      axesSvg += `<line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3" />`;
      axesSvg += `<text x="${padding.left - 10}" y="${yPos + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${Math.round(yVal)}k</text>`;
    }

    // Draw Bars and X Axis Labels
    chartData.forEach((d, idx) => {
      const xPos = padding.left + barSpacing + (idx * (barWidth + barSpacing));
      const barHeight = chartHeight * (d.yield / maxVal);
      const yPos = padding.top + chartHeight - barHeight;

      // Glow gradient for bars
      barsSvg += `
        <defs>
          <linearGradient id="bar-grad-${idx}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FCD34D" />
            <stop offset="100%" stop-color="#D97706" />
          </linearGradient>
        </defs>
        <rect x="${xPos}" y="${yPos}" width="${barWidth}" height="${barHeight}" fill="url(#bar-grad-${idx})" rx="4" class="chart-bar" style="cursor: pointer; transition: all 0.3s;">
          <title>${d.code}: ${d.yield} Kg</title>
        </rect>
        <text x="${xPos + barWidth/2}" y="${yPos - 8}" fill="#FFF" font-size="10" font-weight="600" text-anchor="middle">${d.yield}</text>
      `;

      labelsSvg += `<text x="${xPos + barWidth/2}" y="${height - padding.bottom + 20}" fill="var(--text-muted)" font-size="10" font-weight="500" text-anchor="middle">${d.code}</text>`;
    });

    // Bottom and left axis line
    axesSvg += `
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.1)" />
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.1)" />
    `;

    container.innerHTML = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        ${axesSvg}
        ${barsSvg}
        ${labelsSvg}
      </svg>
    `;
  }

  // Renders Simulated Weather line chart
  renderWeatherTrendsChart() {
    const container = document.getElementById('weather-trends-chart-container');
    if (!container) return;

    // Use Jirisan Apiary coords (API-001) for simulated year averages
    const apiary = db.getApiaries()[0] || { latitude: 35.33, longitude: 127.73 };
    const averages = WeatherSimulator.getApiaryMonthlyAverages(apiary.latitude, apiary.longitude);

    const width = container.clientWidth || 300;
    const height = 240;
    const padding = { top: 20, right: 30, bottom: 40, left: 35 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Averages cover Temperature (-10 to 35) and Humidity (0 to 100)
    // Map Temperature line (Scale -5 to 35)
    const minTemp = -5;
    const maxTemp = 35;
    const tempScale = (t) => padding.top + chartHeight - (chartHeight * ((t - minTemp) / (maxTemp - minTemp)));

    let tempPoints = '';
    let gridSvg = '';
    let labelsSvg = '';

    // Draw Y axes lines
    const grids = 4;
    for (let i = 0; i <= grids; i++) {
      const tempVal = minTemp + ((maxTemp - minTemp) / grids) * i;
      const yPos = tempScale(tempVal);
      gridSvg += `<line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="rgba(255,255,255,0.03)" />`;
      gridSvg += `<text x="${padding.left - 8}" y="${yPos + 4}" fill="var(--text-muted)" font-size="9" text-anchor="end">${Math.round(tempVal)}°C</text>`;
    }

    averages.forEach((av, idx) => {
      const xPos = padding.left + (chartWidth / (averages.length - 1)) * idx;
      const yPos = tempScale(av.temperature);

      tempPoints += `${idx === 0 ? 'M' : 'L'} ${xPos} ${yPos}`;

      // X Label
      if (idx % 2 === 0) {
        labelsSvg += `<text x="${xPos}" y="${height - padding.bottom + 20}" fill="var(--text-muted)" font-size="9" text-anchor="middle">${av.month}</text>`;
      }
    });

    // Bottom and left axis line
    gridSvg += `
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.1)" />
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.1)" />
    `;

    container.innerHTML = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        ${gridSvg}
        <path d="${tempPoints}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="drop-shadow(0 2px 4px var(--primary-glow))" />
        ${averages.map((av, idx) => {
          const xPos = padding.left + (chartWidth / (averages.length - 1)) * idx;
          const yPos = tempScale(av.temperature);
          return `<circle cx="${xPos}" cy="${yPos}" r="3.5" fill="var(--bg-dark)" stroke="var(--primary)" stroke-width="2">
            <title>${av.month}: ${av.temperature}°C</title>
          </circle>`;
        }).join('')}
        ${labelsSvg}
      </svg>
    `;
  }

  // --- 2. PEDIGREE & INFRASTRUCTURE MANAGER ---
  renderPedigreeManager() {
    const apiaries = db.getApiaries();
    const queens = db.getQueens();
    const colonies = db.getColonies();

    // 1. Render Lists & Tables
    this.renderApiaryList(apiaries);
    this.renderQueenList(queens);
    this.renderColonyList(colonies, apiaries, queens);

    // 2. Seed forms dropdown lists
    const apiarySelect = document.getElementById('colony-apiary-select');
    if (apiarySelect) {
      apiarySelect.innerHTML = apiaries.map(a => `<option value="${a.id}">${a.farmName} (${a.owner})</option>`).join('');
    }

    const queenSelect = document.getElementById('colony-queen-select');
    if (queenSelect) {
      queenSelect.innerHTML = queens.map(q => `<option value="${q.id}">${q.id} [${q.breedLine}]</option>`).join('');
    }

    const parentQueenSelect = document.getElementById('queen-dam-select');
    if (parentQueenSelect) {
      parentQueenSelect.innerHTML = `<option value="Unknown">미확인 모계 (Unknown)</option>` + 
        queens.map(q => `<option value="${q.id}">${q.id} (${q.breedLine})</option>`).join('');
    }

    const parentDroneSelect = document.getElementById('queen-sire-select');
    if (parentDroneSelect) {
      parentDroneSelect.innerHTML = `<option value="Unknown">미확인 부계 (Unknown)</option>` + 
        queens.map(q => `<option value="${q.id} (Drone Line)">${q.id} 부계 수컷라인</option>`).join('');
    }
    safeCreateIcons();
  }

  renderApiaryList(apiaries) {
    const container = document.getElementById('apiary-table-body');
    if (!container) return;

    container.innerHTML = apiaries.map(a => `
      <tr>
        <td class="font-bold text-gold">${a.id}</td>
        <td>
          <div class="font-bold">${a.farmName}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${a.address}</div>
        </td>
        <td>${a.owner}</td>
        <td>${a.contact}</td>
        <td>
          <span style="font-family: monospace; font-size:11px;">
            ${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}
          </span>
        </td>
        <td>
          <button class="action-btn-del" data-id="${a.id}" data-type="apiary">
            <i class="lucide-trash-2 nav-icon"></i>
          </button>
        </td>
      </tr>
    `).join('');

    // Bind deletes
    container.querySelectorAll('.action-btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm(`농가 [${id}]를 삭제하시겠습니까? 연결된 봉군 기록이 무효화될 수 있습니다.`)) {
          db.deleteApiary(id);
          this.renderHeaderStats();
          this.renderPedigreeManager();
        }
      });
    });
  }

  renderQueenList(queens) {
    const container = document.getElementById('queen-table-body');
    if (!container) return;

    container.innerHTML = queens.map(q => `
      <tr>
        <td class="font-bold text-gold">${q.id}</td>
        <td>
          <span class="breed-badge ${this.getBreedCssClass(q.breedLine)}">${q.breedLine}</span>
        </td>
        <td>${q.emergenceDate}</td>
        <td>
          <div style="font-size: 12px;">모계: <span class="text-gold">${q.damId}</span></div>
          <div style="font-size: 12px;">부계: <span class="text-muted">${q.sireId}</span></div>
        </td>
        <td><span class="status-pill ${q.status}">${q.status}</span></td>
        <td>
          <button class="action-btn-del" data-id="${q.id}" data-type="queen">
            <i class="lucide-trash-2 nav-icon"></i>
          </button>
        </td>
      </tr>
    `).join('');

    // Bind deletes
    container.querySelectorAll('.action-btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm(`여왕벌 [${id}]를 연구 리스트에서 삭제하시겠습니까?`)) {
          db.deleteQueen(id);
          this.renderHeaderStats();
          this.renderPedigreeManager();
        }
      });
    });
  }

  renderColonyList(colonies, apiaries, queens) {
    const container = document.getElementById('colony-table-body');
    if (!container) return;

    container.innerHTML = colonies.map(c => {
      const apiary = apiaries.find(a => a.id === c.apiaryId) || { farmName: '미정' };
      const queen = queens.find(q => q.id === c.queenId) || { breedLine: '미지계통' };
      
      return `
        <tr>
          <td class="font-bold text-gold">${c.id}</td>
          <td><span class="font-bold">${c.hiveCode}</span></td>
          <td>
            <div style="font-weight: 500;">${apiary.farmName}</div>
          </td>
          <td>
            <div class="font-bold text-gold">${c.queenId}</div>
            <div style="font-size:11px; color:var(--text-muted);">${queen.breedLine}</div>
          </td>
          <td>${c.setupDate}</td>
          <td>${c.frameCount}매</td>
          <td><span class="status-pill ${c.status}">${c.status}</span></td>
          <td>
            <button class="action-btn-del" data-id="${c.id}" data-type="colony">
              <i class="lucide-trash-2 nav-icon"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind deletes
    container.querySelectorAll('.action-btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm(`봉군 [${id}]를 삭제하시겠습니까? 관련 모든 형질 기록이 비활성화됩니다.`)) {
          db.deleteColony(id);
          this.renderHeaderStats();
          this.renderPedigreeManager();
        }
      });
    });
  }

  getBreedCssClass(breedLine) {
    if (breedLine.includes('Carniolan')) return 'carniolan';
    if (breedLine.includes('Italian')) return 'italian';
    if (breedLine.includes('Caucasian')) return 'caucasian';
    return 'local';
  }

  // Handles Pedigree Submissions via Store Dispatch
  handleApiarySubmit(form) {
    const apiary = {
      farmName: form['apiary-name'].value,
      owner: form['apiary-owner'].value,
      address: form['apiary-address'].value,
      contact: form['apiary-contact'].value,
      latitude: parseFloat(form['apiary-lat'].value),
      longitude: parseFloat(form['apiary-lng'].value),
      station: form['apiary-name'].value + ' 기상대'
    };

    this.store.dispatch({ type: 'SAVE_APIARY', payload: apiary });
    form.reset();
    alert('새 양봉가 농가 정보가 데이터베이스에 성공적으로 동기화되었습니다! 🏡');
  }

  handleQueenSubmit(form) {
    const queen = {
      breedLine: form['queen-breed'].value,
      emergenceDate: form['queen-date'].value,
      damId: form['queen-dam'].value,
      sireId: form['queen-sire'].value,
      hatchery: form['queen-hatchery'].value,
      status: 'Active'
    };

    // Store validates and generates dynamic ID
    this.store.dispatch({ type: 'SAVE_QUEEN', payload: queen });
    form.reset();
    alert(`신규 종봉 여왕벌이 육종 Pedigree에 추가되었습니다! 👑`);
  }

  handleColonySubmit(form) {
    const colony = {
      apiaryId: form['colony-apiary'].value,
      hiveCode: form['colony-code'].value,
      queenId: form['colony-queen'].value,
      setupDate: form['colony-setup-date'].value,
      frameCount: parseInt(form['colony-frames'].value),
      hiveType: form['colony-type'].value,
      status: 'Healthy'
    };

    this.store.dispatch({ type: 'SAVE_COLONY', payload: colony });
    form.reset();
    alert('봉군(Colony) 등록 완료! 실시간 형질 기록을 시작할 수 있습니다. 🐝');
  }

  // --- 3. TOUCH PHENOTYPE & WEATHER RECORDER ---
  renderTouchRecorder(state = null) {
    if (!state) state = this.store.getState();
    const colonies = db.getColonies();
    const select = document.getElementById('tr-colony-select');
    if (!select) return;

    select.innerHTML = colonies.map(c => `
      <option value="${c.id}" ${c.id === state.selectedColonyId ? 'selected' : ''}>
        [${c.hiveCode}] - Queen ${c.queenId} (봉군 ${c.id})
      </option>
    `).join('');

    // Update active weather immediately
    if (colonies.length > 0) {
      this.updateRecordingWeather(select.value);
    }
  }

  updateRecordingWeather(colonyId = null) {
    if (!colonyId) {
      const select = document.getElementById('tr-colony-select');
      if (select) colonyId = select.value;
    }
    if (!colonyId) return;

    const colony = db.getColonyById(colonyId);
    if (!colony) return;

    const apiary = db.getApiaryById(colony.apiaryId);
    if (!apiary) return;

    // Get Simulated Live Weather Readings for coordinates
    const weather = WeatherSimulator.getTelemetry(apiary.latitude, apiary.longitude);

    // Populate Weather elements
    const tempField = document.getElementById('tr-env-temp');
    const humidField = document.getElementById('tr-env-humid');
    const statusField = document.getElementById('tr-env-status');
    const badgeContainer = document.getElementById('tr-weather-badge-container');

    if (tempField) tempField.value = weather.temperature;
    if (humidField) humidField.value = weather.humidity;
    if (statusField) statusField.value = weather.weatherStatus;

    if (badgeContainer) {
      badgeContainer.innerHTML = `
        <span class="weather-indicator-badge">
          <i class="lucide-thermometer nav-icon"></i>
          <span>${weather.temperature}°C</span>
        </span>
        <span class="weather-indicator-badge">
          <i class="lucide-droplets nav-icon"></i>
          <span>${weather.humidity}%</span>
        </span>
        <span class="weather-indicator-badge">
          <i class="lucide-cloud nav-icon"></i>
          <span>${this.translateWeather(weather.weatherStatus)}</span>
        </span>
      `;
    }

    // Also update Inspector field default
    const inspectorField = document.getElementById('tr-inspector');
    if (inspectorField && !inspectorField.value) {
      inspectorField.value = "김상식 박사과정";
    }
  }

  translateWeather(status) {
    const map = {
      "Sunny": "맑음 ☀️",
      "Overcast": "흐림 ☁️",
      "Showering": "강우 🌧️",
      "Windy": "강풍 💨"
    };
    return map[status] || status;
  }

  handleTraitSubmit(form) {
    const colonyId = form['tr-colony'].value;
    const colony = db.getColonyById(colonyId);
    
    const record = {
      colonyId: colonyId,
      recordingDate: form['tr-date'].value || new Date().toISOString().split('T')[0],
      honeyYield: parseFloat(form['tr-honey'].value),
      propolisYield: parseFloat(form['tr-propolis'].value),
      royalJellyYield: parseFloat(form['tr-jelly'].value),
      
      // Sliders values
      gentleness: parseInt(form['tr-gentle'].value),
      miteResistance: parseInt(form['tr-mite'].value),
      virusResistance: parseInt(form['tr-virus'].value),
      swarmingRate: parseInt(form['tr-swarming'].value),
      climateAdaptability: parseInt(form['tr-climate'].value),
      overwinteringSurvival: parseInt(form['tr-overwinter'].value),
      
      // Environment
      temperature: parseFloat(form['tr-temp'].value),
      humidity: parseInt(form['tr-humid'].value),
      weatherStatus: form['tr-weather-status'].value,
      inspector: form['tr-inspector'].value || "김상식 박사과정",

      // New daily management logs
      healthGrade: form['tr-health-grade'].value,
      feedingStatus: form['tr-feeding-status'].value,
      treatmentLog: form['tr-treatment-log'].value
    };

    this.store.dispatch({ type: 'SAVE_TRAIT', payload: record });
    
    // Reset inputs, preserving selected colony
    form['tr-honey'].value = "0.0";
    form['tr-propolis'].value = "0";
    form['tr-jelly'].value = "0";
    
    // Reset sliders bubbles text
    form['tr-gentle'].value = 3;
    form['tr-mite'].value = 3;
    form['tr-virus'].value = 3;
    form['tr-swarming'].value = 3;
    form['tr-climate'].value = 3;
    form['tr-overwinter'].value = 90;

    // Reset touch logs
    const healthyRadio = form.querySelector('input[name="tr-health-grade"][value="Healthy"]');
    if (healthyRadio) healthyRadio.checked = true;
    form['tr-feeding-status'].value = "None";
    form['tr-treatment-log'].value = "None";

    document.getElementById('bubble-gentle').textContent = '3점';
    document.getElementById('bubble-mite').textContent = '3점';
    document.getElementById('bubble-virus').textContent = '3점';
    document.getElementById('bubble-swarming').textContent = '3점';
    document.getElementById('bubble-climate').textContent = '3점';
    document.getElementById('bubble-overwinter').textContent = '90%';

    alert(`[봉군 ${colony ? colony.hiveCode : ''}] 현장 기록 저장 완료! 클라우드 및 육종 데이터베이스 서버에 안전하게 전송되었습니다. 📂`);
  }

  // --- 4. DATABASE VISUALIZER VIEW ---
  renderDatabaseVisualizer(state = null) {
    if (!state) state = this.store.getState();
    this.renderDatabaseTable(state.dbTable, state.searchQuery);
  }

  // DBA HIGH PERFORMANCE: Pulls directly from O(1) Materialized Views (db.views)
  // Completely eliminates nested O(N*M) loop join computation in UI rendering!
  renderDatabaseTable(tableName, search = '') {
    const headerRow = document.getElementById('db-table-header-row');
    const bodyRow = document.getElementById('db-table-body-row');
    
    if (!headerRow || !bodyRow) return;

    search = search.toLowerCase().trim();

    if (tableName === 'apiaries') {
      headerRow.innerHTML = `
        <th>ID</th>
        <th>농가명</th>
        <th>소유자</th>
        <th>주소</th>
        <th>연락처</th>
        <th>좌표 (위도, 경도)</th>
        <th>기상국</th>
        <th>작업</th>
      `;

      let data = db.getApiaries() || [];
      if (search) {
        data = data.filter(a => a.farmName.toLowerCase().includes(search) || a.owner.toLowerCase().includes(search) || a.address.toLowerCase().includes(search));
      }

      bodyRow.innerHTML = data.map(a => `
        <tr>
          <td class="font-bold text-gold">${a.id}</td>
          <td class="font-bold">${a.farmName}</td>
          <td>${a.owner}</td>
          <td>${a.address}</td>
          <td>${a.contact}</td>
          <td><span style="font-family:monospace;">${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}</span></td>
          <td><span class="status-pill Healthy">${a.station}</span></td>
          <td>
            <button class="action-btn-del" onclick="window.melittaApp.deleteDbRow('apiaries', '${a.id}')">
              <i class="lucide-trash-2 nav-icon"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }
    
    else if (tableName === 'queens') {
      headerRow.innerHTML = `
        <th>여왕벌 ID</th>
        <th>유전계통 (Line)</th>
        <th>우화일자</th>
        <th>모계 혈통 (Dam)</th>
        <th>부계 혈통 (Sire)</th>
        <th>분양처 및 특이사항</th>
        <th>상태</th>
        <th>작업</th>
      `;

      let data = db.getQueens() || [];
      if (search) {
        data = data.filter(q => q.id.toLowerCase().includes(search) || q.breedLine.toLowerCase().includes(search));
      }

      bodyRow.innerHTML = data.map(q => `
        <tr>
          <td class="font-bold text-gold">${q.id}</td>
          <td><span class="breed-badge ${this.getBreedCssClass(q.breedLine)}">${q.breedLine}</span></td>
          <td>${q.emergenceDate}</td>
          <td class="font-bold text-gold">${q.damId}</td>
          <td class="text-muted">${q.sireId}</td>
          <td style="font-size:12px;">${q.hatchery}</td>
          <td><span class="status-pill ${q.status}">${q.status}</span></td>
          <td>
            <button class="action-btn-del" onclick="window.melittaApp.deleteDbRow('queens', '${q.id}')">
              <i class="lucide-trash-2 nav-icon"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }
    
    else if (tableName === 'colonies') {
      headerRow.innerHTML = `
        <th>봉군 ID</th>
        <th>벌통 코드</th>
        <th>소속 양봉장</th>
        <th>매핑 여왕벌 ID</th>
        <th>설치 일자</th>
        <th>벌통 소비수</th>
        <th>구조/자재</th>
        <th>건강 상태</th>
        <th>작업</th>
      `;

      // Pulled from pre-joined Materialized Views in O(1) direct fetching
      let data = db.views.getColoniesMergedView() || [];
      if (search) {
        data = data.filter(c => c.id.toLowerCase().includes(search) || c.hiveCode.toLowerCase().includes(search) || c.queenId.toLowerCase().includes(search));
      }

      bodyRow.innerHTML = data.map(c => `
        <tr>
          <td class="font-bold text-gold">${c.id}</td>
          <td class="font-bold">${c.hiveCode}</td>
          <td>${c.apiaryName}</td>
          <td class="font-bold text-gold">${c.queenId}</td>
          <td>${c.setupDate}</td>
          <td>${c.frameCount}매</td>
          <td style="font-size: 12px; color: var(--text-muted);">${c.hiveType}</td>
          <td><span class="status-pill ${c.status}">${c.status}</span></td>
          <td>
            <button class="action-btn-del" onclick="window.melittaApp.deleteDbRow('colonies', '${c.id}')">
              <i class="lucide-trash-2 nav-icon"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }
    
    else if (tableName === 'traits') {
      headerRow.innerHTML = `
        <th>기록 ID</th>
        <th>벌통/여왕벌</th>
        <th>조사일자</th>
        <th>꿀(Kg)</th>
        <th>프로(g)</th>
        <th>젤리(g)</th>
        <th>온순/진드기/바이</th>
        <th>분봉/월동/기후</th>
        <th>건강/사양/방제</th>
        <th>기상환경</th>
        <th>조사자</th>
        <th>작업</th>
      `;

      // Pulled from pre-joined Materialized Views in O(1) direct fetching
      let data = db.views.getTraitsMergedView() || [];
      if (search) {
        data = data.filter(t => t.id.toLowerCase().includes(search) || t.colonyId.toLowerCase().includes(search) || t.inspector.toLowerCase().includes(search));
      }

      // Sort by descending date
      data.sort((a,b) => new Date(b.recordingDate) - new Date(a.recordingDate));

      bodyRow.innerHTML = data.map(t => {
        const healthGrade = t.healthGrade || 'Healthy';
        const feedingStatus = t.feedingStatus || 'None';
        const treatmentLog = t.treatmentLog || 'None';

        let healthBadge = `<span class="status-pill Healthy" style="font-size:10px; padding:2px 6px;">Healthy</span>`;
        if (healthGrade === 'Alert') {
          healthBadge = `<span class="status-pill Alert" style="font-size:10px; padding:2px 6px;">Alert</span>`;
        } else if (healthGrade === 'Critical') {
          healthBadge = `<span class="status-pill Critical" style="font-size:10px; padding:2px 6px;">Critical</span>`;
        }

        let feedingBadge = '';
        if (feedingStatus !== 'None') {
          feedingBadge = `<div style="font-size:10px; color:#60a5fa; margin-top:2px; font-weight:600;"><i class="lucide-cup-soda" style="width:10px; height:10px; display:inline-block; vertical-align:middle; margin-right:2px;"></i>${feedingStatus}</div>`;
        } else {
          feedingBadge = `<div style="font-size:10px; color:var(--text-muted); margin-top:2px;">급여 없음</div>`;
        }

        let treatmentBadge = '';
        if (treatmentLog !== 'None') {
          treatmentBadge = `<div style="font-size:10px; color:#f87171; margin-top:2px; font-weight:600;"><i class="lucide-droplet" style="width:10px; height:10px; display:inline-block; vertical-align:middle; margin-right:2px;"></i>${treatmentLog}</div>`;
        } else {
          treatmentBadge = `<div style="font-size:10px; color:var(--text-muted); margin-top:2px;">방제 없음</div>`;
        }

        return `
          <tr>
            <td class="font-bold text-muted">${t.id}</td>
            <td>
              <div class="font-bold text-gold">${t.hiveCode}</div>
              <div style="font-size:10px; color:var(--text-muted);">${t.queenId}</div>
            </td>
            <td>${t.recordingDate}</td>
            <td class="font-bold text-green">${t.honeyYield}</td>
            <td>${t.propolisYield || 0}g</td>
            <td>${t.royalJellyYield || 0}g</td>
            <td>
              <span class="text-gold" style="font-family: monospace;">
                ${t.gentleness}/${t.miteResistance}/${t.virusResistance}
              </span>
            </td>
            <td>
              <span class="text-muted" style="font-family: monospace;">
                ${t.swarmingRate}/${t.overwinteringSurvival}%/${t.climateAdaptability}
              </span>
            </td>
            <td>
              <div style="margin-bottom: 2px;">${healthBadge}</div>
              ${feedingBadge}
              ${treatmentBadge}
            </td>
            <td>
              <div style="font-size:12px;">${t.temperature}°C / ${t.humidity}%</div>
              <div style="font-size:10px; color:var(--text-muted);">${this.translateWeather(t.weatherStatus)}</div>
            </td>
            <td style="font-size:12px;">${t.inspector}</td>
            <td>
              <button class="action-btn-del" onclick="window.melittaApp.deleteDbRow('traits', '${t.id}')">
                <i class="lucide-trash-2 nav-icon"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
    safeCreateIcons();
  }

  deleteDbRow(table, id) {
    if (confirm(`테이블 [${table}]에서 데이터 [${id}]를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      this.store.dispatch({ type: 'DELETE_ROW', payload: { table, id } });
    }
  }

  // CSV Exporter for quantitative genetics migration (PLINK, R ready)
  exportCurrentTableToCSV() {
    const tableName = document.getElementById('db-table-select').value;
    let data = [];
    let headers = [];
    
    if (tableName === 'apiaries') {
      data = db.getApiaries();
      headers = ['ID', 'FarmName', 'Owner', 'Address', 'Contact', 'Latitude', 'Longitude', 'WeatherStation'];
    } else if (tableName === 'queens') {
      data = db.getQueens();
      headers = ['ID', 'BreedLine', 'EmergenceDate', 'DamID', 'SireID', 'HatcheryNote', 'Status'];
    } else if (tableName === 'colonies') {
      data = db.getColonies();
      headers = ['ID', 'ApiaryID', 'HiveCode', 'QueenID', 'SetupDate', 'FrameCount', 'HiveMaterial', 'Status'];
    } else if (tableName === 'traits') {
      data = db.getTraits();
      headers = [
        'RecordID', 'ColonyID', 'Date', 'HoneyYield_Kg', 'Propolis_g', 'RoyalJelly_g',
        'Gentleness_1to5', 'VarroaMiteResist_1to5', 'VirusResist_1to5', 'SwarmingRate_1to5',
        'OverwinteringSurvival_pct', 'ClimateAdaptability_1to5', 'Temperature_C', 'Humidity_pct',
        'WeatherCondition', 'Inspector', 'HealthGrade', 'FeedingStatus', 'TreatmentLog'
      ];
    }

    if (data.length === 0) {
      alert('내보낼 데이터가 없습니다!');
      return;
    }

    // Build CSV Content
    let csvRows = [headers.join(',')];
    data.forEach(item => {
      let values = [];
      if (tableName === 'apiaries') {
        values = [item.id, `"${item.farmName}"`, `"${item.owner}"`, `"${item.address}"`, item.contact, item.latitude, item.longitude, `"${item.station}"` ];
      } else if (tableName === 'queens') {
        values = [item.id, `"${item.breedLine}"`, item.emergenceDate, item.damId, item.sireId, `"${item.hatchery}"`, item.status];
      } else if (tableName === 'colonies') {
        values = [item.id, item.apiaryId, item.hiveCode, item.queenId, item.setupDate, item.frameCount, `"${item.hiveType}"`, item.status];
      } else if (tableName === 'traits') {
        values = [
          item.id, item.colonyId, item.recordingDate, item.honeyYield, item.propolisYield, item.royalJellyYield,
          item.gentleness, item.miteResistance, item.virusResistance, item.swarmingRate,
          item.overwinteringSurvival, item.climateAdaptability, item.temperature, item.humidity,
          item.weatherStatus, `"${item.inspector}"`, `"${item.healthGrade || 'Healthy'}"`, `"${item.feedingStatus || 'None'}"`, `"${item.treatmentLog || 'None'}"`
        ];
      }
      csvRows.push(values.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `melittabreed_${tableName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadJSONBackup() {
    const fullBackup = {
      apiaries: db.getApiaries(),
      queens: db.getQueens(),
      colonies: db.getColonies(),
      traits: db.getTraits(),
      backupDate: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `melittabreed_db_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  handleJSONImport(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.apiaries && importedData.queens && importedData.colonies && importedData.traits) {
          db.importDatabase(importedData);
          this.renderHeaderStats();
          this.renderActiveTab();
          alert('양봉 데이터베이스가 파일 백업으로부터 성공적으로 완벽 복구되었습니다! 📥');
        } else {
          alert('무효한 백업 파일 형식입니다. 필수 테이블이 누락되었습니다.');
        }
      } catch (err) {
        alert('파일을 파싱하는 중 오류가 발생했습니다: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // --- 5. GENETICS SANDBOX VIEW ---
  renderGeneticsSandbox(state = null) {
    if (!state) state = this.store.getState();
    // 1. Recalculate and render ranked Queens
    this.renderBreedingRankings(state);

    // 2. Setup Colony Selector for SNPs
    const colonies = db.getColonies();
    const select = document.getElementById('genetics-colony-select');
    if (select) {
      select.innerHTML = colonies.map(c => `<option value="${c.id}" ${c.id === state.selectedColonyId ? 'selected' : ''}>[${c.hiveCode}] (Queen: ${c.queenId})</option>`).join('');
      select.onchange = (e) => {
        this.store.dispatch({ type: 'SELECT_COLONY', payload: e.target.value });
      };
    }

    // Populate Mating Simulator dropdowns if they exist
    const queens = db.getQueens();
    const damSelect = document.getElementById('mating-dam-select');
    if (damSelect) {
      const currentVal = damSelect.value;
      damSelect.innerHTML = queens.map(q => `<option value="${q.id}">${q.id} (${q.breedLine})</option>`).join('');
      if (currentVal && queens.some(q => q.id === currentVal)) {
        damSelect.value = currentVal;
      }
    }

    const sireSelect = document.getElementById('mating-sire-select');
    if (sireSelect) {
      const currentVal = sireSelect.value;
      sireSelect.innerHTML = queens.map(q => `<option value="${q.id} (Drone Line)">${q.id} 부계 수컷라인</option>`).join('');
      if (currentVal && queens.some(q => `${q.id} (Drone Line)` === currentVal)) {
        sireSelect.value = currentVal;
      }
    }

    // 3. Render SVG chromosomes map
    this.renderChrSNPMap(state);
  }

  renderBreedingRankings(state = null) {
    if (!state) state = this.store.getState();
    const queens = db.getQueens();
    const colonies = db.getColonies();
    const traits = db.getTraits();
    
    const rankings = GeneticsEngine.calculateBreedingValues(queens, colonies, traits, state.selectionWeights);
    const container = document.getElementById('breeding-ranking-list');
    
    if (!container) return;

    if (rankings.length === 0) {
      container.innerHTML = `<li style="padding:16px; color:var(--text-muted);">여왕벌 유전 랭킹 정보가 없습니다.</li>`;
      return;
    }

    container.innerHTML = rankings.map((rank, idx) => {
      let medal = '';
      if (idx === 0) medal = '🥇 ';
      else if (idx === 1) medal = '🥈 ';
      else if (idx === 2) medal = '🥉 ';

      const honeyRaw = rank.raw.honey ? rank.raw.honey.toFixed(1) : '0';
      const miteRaw = rank.raw.mite ? rank.raw.mite.toFixed(1) : '0';
      const gentleRaw = rank.raw.gentle ? rank.raw.gentle.toFixed(1) : '0';

      return `
        <li style="display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); background: ${idx === 0 ? 'rgba(245, 158, 11, 0.04)' : 'transparent'};">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-weight: bold; width: 28px; color: var(--text-gold); font-size:15px;">${medal || `${idx + 1}.`}</span>
            <div>
              <div class="font-bold text-gold">${rank.queenId}</div>
              <div style="font-size:11px; color:var(--text-muted);">${rank.breedLine} (봉군 수: ${rank.colonyCount}개)</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: bold; color: var(--primary);">${rank.breedingValue}<span style="font-size:11px; color:var(--text-muted); font-weight:normal;"> index</span></div>
            <div style="font-size: 10px; color: var(--text-muted);">평균꿀: ${honeyRaw}Kg / 진드기저항: ${miteRaw}점 / 온순성: ${gentleRaw}점</div>
          </div>
        </li>
      `;
    }).join('');
  }

  // Draw 16 glowing Chromosomes representing Apis mellifera (n=16) genome
  renderChrSNPMap(state = null) {
    if (!state) state = this.store.getState();
    const container = document.getElementById('chromosome-svg-container');
    if (!container) return;

    const width = container.clientWidth || 450;
    const height = 210;
    const padding = { top: 15, right: 15, bottom: 25, left: 25 };

    const chrWidth = (width - padding.left - padding.right) / 16;
    const chrHeightMax = height - padding.top - padding.bottom;

    // Standard Apis mellifera chromosome sizes relative mapping (Chr 1 is longest, Chr 16 is shortest)
    const chrLengths = [1.0, 0.95, 0.9, 0.85, 0.82, 0.78, 0.75, 0.72, 0.69, 0.65, 0.62, 0.58, 0.55, 0.52, 0.48, 0.45];

    // Selected colony DNA SNPs
    const genotypes = GeneticsEngine.getSimulatedGenotype(state.selectedColonyId, db.getTraits());

    let chrsSvg = '';
    let centromeresSvg = '';
    let snpDotsSvg = '';

    // Draw chromosomes bars
    for (let i = 0; i < 16; i++) {
      const idx = i + 1;
      const xPos = padding.left + (i * chrWidth) + (chrWidth * 0.15);
      const chHeight = chrHeightMax * chrLengths[i];
      const yPos = padding.top + (chrHeightMax - chHeight) / 2; // centered
      const cWidth = chrWidth * 0.7;

      // Check if a marker exists on this chromosome
      const marker = GeneticsEngine.MARKERS.find(m => m.chr === idx);
      const isMarked = !!marker;

      chrsSvg += `
        <rect x="${xPos}" y="${yPos}" width="${cWidth}" height="${chHeight}" 
              class="chromosome-bar ${isMarked ? 'marked-chr' : ''}" 
              rx="${cWidth/2}" ry="${cWidth/2}"
              fill="${isMarked ? 'rgba(245, 158, 11, 0.1)' : '#1E293B'}"
              stroke="${isMarked ? 'var(--primary)' : '#334155'}"
              stroke-width="${isMarked ? '1.5' : '1'}"
              style="cursor: pointer; transition: all 0.25s;"
              onclick="window.melittaApp.selectChromosome(${idx})">
          <title>염색체 ${idx} (Chr ${idx})${isMarked ? ` - SNP 마커: ${marker.name}` : ''}</title>
        </rect>
      `;

      // Centromere marker circle
      const centromereY = yPos + chHeight * 0.4;
      centromeresSvg += `<circle cx="${xPos + cWidth/2}" cy="${centromereY}" r="${cWidth/2 + 0.5}" fill="#090D16" stroke="rgba(255,255,255,0.08)" stroke-width="0.5" />`;

      // Highlight SNP locus marker dot
      if (isMarked) {
        const snpY = yPos + chHeight * 0.65;
        const geno = genotypes[marker.name] || 'AG';
        let color = 'var(--primary)';
        if (geno === 'AA') color = 'var(--secondary)';
        if (geno === 'GG') color = 'var(--danger)';

        snpDotsSvg += `
          <circle cx="${xPos + cWidth/2}" cy="${snpY}" r="4.5" fill="${color}" filter="drop-shadow(0 0 4px ${color})">
            <title>${marker.name}: ${geno}</title>
          </circle>
          <line x1="${xPos + cWidth/2}" y1="${snpY}" x2="${xPos + cWidth/2}" y2="${snpY + 12}" stroke="${color}" stroke-width="0.8" />
        `;
      }

      // X labels
      if (idx % 2 !== 0 || idx === 16) {
        chrsSvg += `<text x="${xPos + cWidth/2}" y="${height - 5}" fill="var(--text-muted)" font-size="9" text-anchor="middle">${idx}</text>`;
      }
    }

    container.innerHTML = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        ${chrsSvg}
        ${centromeresSvg}
        ${snpDotsSvg}
      </svg>
    `;

    // Render corresponding DNA SNP grid table in Genetics Sandbox
    this.renderSNPDetailsTable(genotypes);
  }

  selectChromosome(chrIdx) {
    const marker = GeneticsEngine.MARKERS.find(m => m.chr === chrIdx);
    const detailPanel = document.getElementById('genetics-marker-detail-card');
    if (!detailPanel) return;

    if (!marker) {
      detailPanel.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted);">
          <i class="lucide-dna nav-icon" style="font-size:32px; display:block; margin-bottom:12px;"></i>
          염색체 <strong>Chr ${chrIdx}</strong> 영역에 연계된 주요 선발 SNP 마커가 없습니다. <br>
          <span style="font-size:11px;">(1, 3, 5, 8, 11, 15번 염색체의 형질 마커를 탭해 보세요.)</span>
        </div>
      `;
      return;
    }

    // Get genotypes
    const state = this.store.getState();
    const genotypes = GeneticsEngine.getSimulatedGenotype(state.selectedColonyId, db.getTraits());
    const geno = genotypes[marker.name] || 'AG';

    let alleleDesc = '';
    if (geno === 'AA') alleleDesc = `<span class="text-green">우수 Homozygous (Favorable Allele AA)</span> - 해당 형질 선발 고정 완료.`;
    else if (geno === 'AG') alleleDesc = `<span class="text-gold">Heterozygous (Carrier AG)</span> - 잡종 강세 또는 분리 육종 진행 중.`;
    else if (geno === 'GG') alleleDesc = `<span class="text-red">Unfavorable Homozygous (GG)</span> - 응애 저항 또는 온순도 도태 대상 유전자형.`;

    detailPanel.innerHTML = `
      <div class="section-title-divider">🧬 Chromosome ${marker.chr} Locus Detail</div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <span class="snp-name-tag" style="font-size: 15px; padding: 4px 10px;">${marker.name}</span>
        <span class="genotype-badge ${geno}">${geno} Type</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr; gap:10px; font-size:13px; line-height:1.6;">
        <div><strong>연계 형질 (Phenotypic Trait):</strong> <span class="text-gold font-bold">${marker.trait}</span></div>
        <div><strong>염색체 좌표 (Marker Coordinates):</strong> ${marker.pos}</div>
        <div><strong>생물학적 기전 및 분자적 기능:</strong> <br><span style="color:var(--text-muted);">${marker.desc}</span></div>
        <div style="margin-top:12px; padding:12px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:6px;">
          <strong>유전자형 판독 (Genotype Call):</strong><br>
          ${alleleDesc}
        </div>
      </div>
    `;
    safeCreateIcons();
  }

  renderSNPDetailsTable(genotypes) {
    const container = document.getElementById('genetics-snps-table-body');
    if (!container) return;

    container.innerHTML = GeneticsEngine.MARKERS.map(m => {
      const geno = genotypes[m.name] || 'AG';
      return `
        <div class="snp-item">
          <div>
            <div style="font-weight: 600;">${m.name} <span style="font-size:10px; color:var(--text-muted); font-weight:normal;">(Chr ${m.chr})</span></div>
            <div style="font-size:11px; color:var(--text-muted);">${m.trait} Locus</div>
          </div>
          <span class="genotype-badge ${geno}">${geno}</span>
        </div>
      `;
    }).join('');

    // Pre-select first marker for detailed card
    this.selectChromosome(1);
  }

  updateWeightsTotal() {
    const state = this.store.getState();
    const total = 
      state.selectionWeights.honey +
      state.selectionWeights.propolis +
      state.selectionWeights.jelly +
      state.selectionWeights.mite +
      state.selectionWeights.virus +
      state.selectionWeights.gentle +
      state.selectionWeights.swarming +
      state.selectionWeights.winter +
      state.selectionWeights.climate;

    const totalBadge = document.getElementById('total-weights-badge');
    const totalVal = document.getElementById('w-val-total');

    if (totalBadge && totalVal) {
      totalVal.textContent = `${total}%`;
      
      if (total === 100) {
        totalBadge.className = 'weights-total-badge ok';
        totalBadge.querySelector('span:first-child').innerHTML = '🟢 총 가중치 합계가 올바릅니다.';
        this.renderBreedingRankings(state); // recalculate dynamically
      } else {
        totalBadge.className = 'weights-total-badge error';
        totalBadge.querySelector('span:first-child').innerHTML = `🔴 총 합계가 100%가 되어야 합니다 (현재 ${total}%).`;
      }
    }
  }

  // --- 5.5 USER TUTORIAL VIEW RENDERER ---
  renderTutorial(state = null) {
    try {
      // Premium initial UX: if no cards are active, open the first Beekeeper card as default
      const activeCard = document.querySelector('.tutorial-card.active');
      if (!activeCard) {
        const beekeeperCard = document.getElementById('tutorial-beekeeper');
        if (beekeeperCard) {
          beekeeperCard.classList.add('active');
        }
      }
      console.log("[MelittaApp] User Tutorial rendered successfully.");
    } catch (e) {
      console.error("[Error Boundary] renderTutorial failed:", e);
      const container = document.getElementById('tutorial-tab');
      if (container) {
        container.innerHTML = `
          <div class="error-boundary-card" style="padding:24px; background:rgba(239, 68, 68, 0.05); border:1px dashed var(--danger); border-radius:12px; color:var(--danger); max-width: 600px; margin: 40px auto;">
            <h3 style="margin-bottom:12px;">⚠️ 사용자 튜토리얼 컴포넌트 일시적 장애</h3>
            <p style="font-size:13px; color:var(--text-muted); line-height:1.6; margin-bottom:16px;">
              로컬 튜토리얼 뷰 렌더링 중 오류가 발생했습니다. 브라우저 저장소 상태 또는 오프라인 리소스를 확인하십시오.
            </p>
            <code style="display:block; padding:12px; background:rgba(0,0,0,0.2); border-radius:6px; font-size:12px; font-family:monospace; color:#FFF;">${e.message}</code>
          </div>
        `;
      }
    }
  }

  // --- 6. NATIONAL GIS HEALTH MAP RENDERER (Government View) ---
  renderNationalHealthMap(apiaries, colonies, traits) {
    this.updateNationalAdvisoryIndicators(apiaries, colonies, traits);

    const hash = JSON.stringify(apiaries.map(a => a.id)) +
                 JSON.stringify(colonies.map(c => ({ id: c.id, status: c.status }))) +
                 traits.length +
                 traits.map(t => t.healthGrade || '').join('');

    if (this.lastMapHash === hash && document.getElementById('national-health-map-svg')) {
      return;
    }
    this.lastMapHash = hash;

    const container = document.getElementById('national-health-map-container');
    if (!container) return;

    const svgWidth = 180;
    const svgHeight = 220;

    let pinsSvg = '';

    apiaries.forEach(apiary => {
      const apiaryColonies = colonies.filter(c => c.apiaryId === apiary.id);
      let apiaryStatus = 'Healthy';
      
      apiaryColonies.forEach(col => {
        const colTraits = traits.filter(t => t.colonyId === col.id);
        if (colTraits.length > 0) {
          colTraits.sort((a, b) => new Date(b.recordingDate) - new Date(a.recordingDate));
          const latest = colTraits[0].healthGrade || 'Healthy';
          if (latest === 'Critical') {
            apiaryStatus = 'Critical';
          } else if (latest === 'Alert' && apiaryStatus !== 'Critical') {
            apiaryStatus = 'Alert';
          }
        }
      });

      let cx = 90;
      let cy = 110;
      let label = apiary.farmName.split(' ')[0] || apiary.id;

      if (apiary.id === 'API-001') {
        cx = 114; cy = 146;
        label = "지리산";
      } else if (apiary.id === 'API-002') {
        cx = 109; cy = 65;
        label = "여주";
      } else if (apiary.id === 'API-003') {
        cx = 79; cy = 173;
        label = "보성";
      }

      let color = 'var(--secondary)';
      if (apiaryStatus === 'Critical') color = 'var(--danger)';
      else if (apiaryStatus === 'Alert') color = 'var(--primary)';

      pinsSvg += `
        <circle cx="${cx}" cy="${cy}" r="12" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.6">
          <animate attributeName="r" values="5;14" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${cx}" cy="${cy}" r="5.5" fill="${color}" stroke="#FFF" stroke-width="1" style="cursor:pointer;" onclick="alert('농가: ${apiary.farmName}\\n상태: ${apiaryStatus}\\n소유자: ${apiary.owner}')">
          <title>${apiary.farmName} (${apiaryStatus})</title>
        </circle>
        <text x="${cx + 8}" y="${cy + 4}" fill="#FFF" font-size="10.5" font-weight="700" font-family="system-ui, sans-serif" filter="drop-shadow(0 1px 2px #000)" style="pointer-events:none;">${label}</text>
      `;
    });

    container.innerHTML = `
      <svg id="national-health-map-svg" width="100%" height="250px" viewBox="0 0 ${svgWidth} ${svgHeight}" style="overflow: visible; background: transparent;">
        <defs>
          <pattern id="map-grid" width="15" height="15" patternUnits="userSpaceOnUse">
            <path d="M 15 0 L 0 0 0 15" fill="none" stroke="rgba(255, 255, 255, 0.03)" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-grid)" rx="6"/>
        
        <line x1="20" y1="20" x2="20" y2="60" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1"/>
        <line x1="20" y1="20" x2="60" y2="20" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1"/>
        <text x="25" y="32" fill="rgba(255, 255, 255, 0.25)" font-size="8" font-family="monospace">N35° E127°</text>

        <path d="M 40 20 L 70 20 L 95 38 L 105 32 L 125 48 L 138 72 L 133 112 L 143 132 L 128 178 L 108 188 L 78 188 L 58 168 L 43 158 L 33 118 L 38 88 L 28 62 Z" 
              stroke="rgba(245, 158, 11, 0.16)" stroke-width="2" fill="rgba(15, 23, 42, 0.7)" filter="drop-shadow(0 0 6px rgba(245, 158, 11, 0.08))"/>
        <path d="M 40 20 L 70 20 L 95 38 L 105 32 L 125 48 L 138 72 L 133 112 L 143 132 L 128 178 L 108 188 L 78 188 L 58 168 L 43 158 L 33 118 L 38 88 L 28 62 Z" 
              stroke="var(--border-active)" stroke-width="1" fill="none"/>
              
        <path d="M 45 204 Q 60 200 75 204 Q 60 208 45 204 Z" stroke="var(--border-active)" stroke-width="0.8" fill="rgba(15, 23, 42, 0.7)"/>
        
        <circle cx="160" cy="85" r="3.5" stroke="var(--border-active)" stroke-width="0.8" fill="rgba(15, 23, 42, 0.7)"/>
        <circle cx="172" cy="89" r="1.5" stroke="var(--border-active)" stroke-width="0.8" fill="rgba(15, 23, 42, 0.7)"/>
        
        ${pinsSvg}
      </svg>
    `;
    safeCreateIcons();
  }

  updateNationalAdvisoryIndicators(apiaries, colonies, traits) {
    let avgMite = 3;
    let avgVirus = 3;
    let avgOverwinter = 90;
    
    if (traits.length > 0) {
      avgMite = traits.reduce((s, t) => s + t.miteResistance, 0) / traits.length;
      avgVirus = traits.reduce((s, t) => s + t.virusResistance, 0) / traits.length;
      avgOverwinter = traits.reduce((s, t) => s + (t.overwinteringSurvival || 90), 0) / traits.length;
    }

    const sacbroodEl = document.getElementById('disease-risk-sacbrood');
    if (sacbroodEl) {
      if (avgVirus > 4.0) {
        sacbroodEl.className = 'text-green';
        sacbroodEl.textContent = '안전 (Safe)';
      } else if (avgVirus >= 3.0) {
        sacbroodEl.className = 'text-gold';
        sacbroodEl.textContent = '주의 (Alert)';
      } else {
        sacbroodEl.className = 'text-red';
        sacbroodEl.textContent = '경계 (Critical)';
      }
    }

    const foulbroodEl = document.getElementById('disease-risk-foulbrood');
    if (foulbroodEl) {
      if (avgOverwinter > 92) {
        foulbroodEl.className = 'text-green';
        foulbroodEl.textContent = '안전 (Safe)';
      } else if (avgOverwinter >= 85) {
        foulbroodEl.className = 'text-gold';
        foulbroodEl.textContent = '주의 (Alert)';
      } else {
        foulbroodEl.className = 'text-red';
        foulbroodEl.textContent = '경계 (Critical)';
      }
    }

    const dwvEl = document.getElementById('disease-risk-dwv');
    if (dwvEl) {
      if (avgVirus > 3.8) {
        dwvEl.className = 'text-green';
        dwvEl.textContent = '안전 (Safe)';
      } else {
        dwvEl.className = 'text-gold';
        dwvEl.textContent = '주의 (Alert)';
      }
    }

    const varroaEl = document.getElementById('disease-risk-varroa');
    if (varroaEl) {
      if (avgMite > 4.0) {
        varroaEl.className = 'text-green';
        varroaEl.textContent = '안전 (Safe)';
      } else if (avgMite >= 3.0) {
        varroaEl.className = 'text-gold';
        varroaEl.textContent = '주의 (Alert)';
      } else {
        varroaEl.className = 'text-red';
        varroaEl.textContent = '경계 (Critical)';
      }
    }

    let worstGrade = 'Healthy';
    apiaries.forEach(apiary => {
      const apiaryColonies = colonies.filter(c => c.apiaryId === apiary.id);
      apiaryColonies.forEach(col => {
        const colTraits = traits.filter(t => t.colonyId === col.id);
        if (colTraits.length > 0) {
          colTraits.sort((a, b) => new Date(b.recordingDate) - new Date(a.recordingDate));
          const latestGrade = colTraits[0].healthGrade || 'Healthy';
          if (latestGrade === 'Critical') {
            worstGrade = 'Critical';
          } else if (latestGrade === 'Alert' && worstGrade !== 'Critical') {
            worstGrade = 'Alert';
          }
        }
      });
    });

    const riskBadge = document.getElementById('national-risk-badge');
    const riskText = document.getElementById('national-risk-text');
    const advisoryText = document.getElementById('disease-advisory-text');

    if (riskBadge && riskText && advisoryText) {
      if (worstGrade === 'Critical') {
        riskBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        riskBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        riskBadge.style.color = 'var(--danger)';
        riskText.textContent = '경계 (Critical)';
        advisoryText.textContent = '경보: 특정 지역 협력 농가에서 심각한 질병/응애 감염(Critical)이 감지되었습니다. 즉시 개미산/티몰 등 긴급 방제를 처방하고 월동 급이를 점검하십시오.';
      } else if (worstGrade === 'Alert') {
        riskBadge.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        riskBadge.style.borderColor = 'rgba(245, 158, 11, 0.2)';
        riskBadge.style.color = 'var(--primary)';
        riskText.textContent = '주의 (Alert)';
        advisoryText.textContent = '주의: 일부 봉장에서 보건 수치 하락(Alert)이 관측되었습니다. 방역 장비를 정비하고 응애 그루밍 수준을 집중적으로 예찰하십시오.';
      } else {
        riskBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        riskBadge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
        riskBadge.style.color = 'var(--secondary)';
        riskText.textContent = '정상 (Healthy)';
        advisoryText.textContent = '정상: 전국 협력 농가의 위생 및 보건 상태가 정상(Healthy) 범주 내에 있습니다. 급이 상태와 주기적인 기상 변화 모니터링을 지속해 주십시오.';
      }
    }
  }

  // --- 7. VIRTUAL BREEDING MATING SIMULATOR (Breeder View) ---
  runMatingSimulation() {
    const damId = document.getElementById('mating-dam-select').value;
    const sireSelVal = document.getElementById('mating-sire-select').value;
    
    if (!damId || !sireSelVal) {
      alert("교배 시뮬레이션을 실행할 여왕벌 계통을 양쪽 모두 선택하십시오.");
      return;
    }

    const sireId = sireSelVal.split(' ')[0];
    const matingResultPanel = document.getElementById('mating-result-panel');
    if (!matingResultPanel) return;

    const kinship = GeneticsEngine.calculateKinshipAndInbreeding(damId, sireId);
    const F = kinship.inbreedingCoefficient;

    const bvs = GeneticsEngine.calculateBreedingValues(db.getQueens(), db.getColonies(), db.getTraits(), this.store.getState().selectionWeights);
    const damBv = bvs.find(b => b.queenId === damId) || { raw: { honey: 25, propolis: 200, jelly: 40, gentle: 3, mite: 3, virus: 3, swarming: 3, winter: 85, climate: 3 } };
    const sireBv = bvs.find(b => b.queenId === sireId) || { raw: { honey: 25, propolis: 200, jelly: 40, gentle: 3, mite: 3, virus: 3, swarming: 3, winter: 85, climate: 3 } };

    const damRaw = damBv.raw;
    const sireRaw = sireBv.raw;

    const mid = {
      honey: (damRaw.honey + sireRaw.honey) / 2,
      propolis: ((damRaw.propolis || 200) + (sireRaw.propolis || 200)) / 2,
      jelly: ((damRaw.jelly || 40) + (sireRaw.jelly || 40)) / 2,
      gentle: (damRaw.gentle + sireRaw.gentle) / 2,
      mite: (damRaw.mite + sireRaw.mite) / 2,
      virus: (damRaw.virus + sireRaw.virus) / 2,
      swarming: (damRaw.swarming + sireRaw.swarming) / 2,
      winter: (damRaw.winter + sireRaw.winter) / 2,
      climate: (damRaw.climate + sireRaw.climate) / 2
    };

    const prog = {
      honey: mid.honey * (1.0 - 0.25 * F),
      propolis: mid.propolis * (1.0 - 0.15 * F),
      jelly: mid.jelly * (1.0 - 0.10 * F),
      gentle: mid.gentle * (1.0 - 0.15 * F),
      mite: mid.mite * (1.0 - 0.30 * F),
      virus: mid.virus * (1.0 - 0.30 * F),
      swarming: mid.swarming * (1.0 + 0.20 * F),
      winter: mid.winter * (1.0 - 0.20 * F),
      climate: mid.climate * (1.0 - 0.15 * F)
    };

    let dangerBadgeClass = 'Safe';
    let dangerBadgeText = '🟢 안전 (Safe) - 아웃브리딩 권장';
    let adviceComment = '✅ [육종가 매칭 지침]: 두 혈통 간 유전 근연도가 매우 낮아 강한 잡종강세(Heterosis) 효과가 기대되는 건강한 매칭입니다. 자손 대의 채밀 생산성 및 진드기 면역 기전 활성도가 높게 증진될 것으로 분석됩니다.';

    if (kinship.dangerLevel === 'Critical') {
      dangerBadgeClass = 'Critical';
      dangerBadgeText = '🔴 위험 (Critical) - 심각한 근친 교배';
      adviceComment = '🚨 [육종가 매칭 지침]: 근친교배 계수가 임계 한계치인 12.5% 이상을 초과했습니다. 자손 꿀벌들에게서 생존성 감쇠 및 응애 청소행동 저해 등 심각한 근친 퇴화(Inbreeding Depression) 현상이 우려되므로 본 매칭을 제고하고 아웃브리딩할 것을 권합니다.';
    } else if (kinship.dangerLevel === 'Warning') {
      dangerBadgeClass = 'Warning';
      dangerBadgeText = '🟡 주의 (Warning) - 경계 근친 교배';
      adviceComment = '⚠️ [육종가 매칭 지침]: 두 혈통 간 공통 선조가 식별되는 경계 수준의 조합입니다. 순종 혈통 고정 선발 목적으로 임시 사용될 수 있으나, 가급적 유전적 근연 거리가 확보된 수컷 종봉 라인 매칭을 유도하십시오.';
    }

    const commonAncestorsStr = kinship.commonAncestors.length > 0 
      ? kinship.commonAncestors.join(', ') 
      : '없음';

    matingResultPanel.style.display = 'block';
    matingResultPanel.innerHTML = `
      <div class="section-title-divider" style="margin-top: 0;"><i class="lucide-heart" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> 가상 교배 및 인공수정 분석 리포트</div>
      
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; background:rgba(255,255,255,0.02); padding:10px; border:1px solid var(--border); border-radius:6px;">
        <div>
          <span style="font-size:12px; color:var(--text-muted);">근친도 계수 (Inbreeding Coeff. F)</span>
          <div style="font-size:24px; font-weight:bold; color:var(--primary);">${(F * 100).toFixed(2)}%</div>
        </div>
        <span class="status-pill ${dangerBadgeClass}" style="padding: 6px 12px; font-size:12px; font-weight:bold; border-radius:4px;">${dangerBadgeText}</span>
      </div>

      <div style="font-size:12px; margin-bottom:14px;">
        <strong>추출된 공통 선조 혈통 (Common Ancestors):</strong> <span class="text-gold font-bold">${commonAncestorsStr}</span>
      </div>

      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:11.5px; text-align:left; margin-bottom:12px;">
          <thead>
            <tr style="border-bottom:1px solid var(--border); color:var(--text-muted);">
              <th style="padding:6px 0;">유전 형질명 (Breed Trait)</th>
              <th style="padding:6px 0;">양친 평균 (Mid-Parent)</th>
              <th style="padding:6px 0; text-align:center;">근친 퇴화 감쇠율</th>
              <th style="padding:6px 0; text-align:right; color:#FFF;">자손 예측 (Progeny)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:6px 0; font-weight:600;">🍯 꿀 생산량 (Honey Yield)</td>
              <td style="padding:6px 0;">${mid.honey.toFixed(1)} Kg</td>
              <td style="padding:6px 0; text-align:center; color:var(--danger); font-weight:600;">-${(F * 25).toFixed(1)}%</td>
              <td style="padding:6px 0; text-align:right; font-weight:bold; color:var(--secondary);">${prog.honey.toFixed(1)} Kg</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:6px 0; font-weight:600;">🌲 프로폴리스 생산량</td>
              <td style="padding:6px 0;">${mid.propolis.toFixed(0)} g</td>
              <td style="padding:6px 0; text-align:center; color:var(--danger); font-weight:600;">-${(F * 15).toFixed(1)}%</td>
              <td style="padding:6px 0; text-align:right; font-weight:bold; color:var(--secondary);">${prog.propolis.toFixed(0)} g</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:6px 0; font-weight:600;">🥛 로얄젤리 생산량</td>
              <td style="padding:6px 0;">${mid.jelly.toFixed(0)} g</td>
              <td style="padding:6px 0; text-align:center; color:var(--danger); font-weight:600;">-${(F * 10).toFixed(1)}%</td>
              <td style="padding:6px 0; text-align:right; font-weight:bold; color:var(--secondary);">${prog.jelly.toFixed(0)} g</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:6px 0; font-weight:600;">🥰 온순도 (Gentleness)</td>
              <td style="padding:6px 0;">${mid.gentle.toFixed(1)} 점</td>
              <td style="padding:6px 0; text-align:center; color:var(--danger); font-weight:600;">-${(F * 15).toFixed(1)}%</td>
              <td style="padding:6px 0; text-align:right; font-weight:bold; color:var(--secondary);">${prog.gentle.toFixed(1)} 점</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:6px 0; font-weight:600;">🛡️ 응애 저항성 (Varroa)</td>
              <td style="padding:6px 0;">${mid.mite.toFixed(1)} 점</td>
              <td style="padding:6px 0; text-align:center; color:var(--danger); font-weight:600;">-${(F * 30).toFixed(1)}%</td>
              <td style="padding:6px 0; text-align:right; font-weight:bold; color:var(--secondary);">${prog.mite.toFixed(1)} 점</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:6px 0; font-weight:600;">🦠 바이러스 저항성</td>
              <td style="padding:6px 0;">${mid.virus.toFixed(1)} 점</td>
              <td style="padding:6px 0; text-align:center; color:var(--danger); font-weight:600;">-${(F * 30).toFixed(1)}%</td>
              <td style="padding:6px 0; text-align:right; font-weight:bold; color:var(--secondary);">${prog.virus.toFixed(1)} 점</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:6px 0; font-weight:600;">🐝 분봉률 (Swarming rate)</td>
              <td style="padding:6px 0;">${mid.swarming.toFixed(1)} 점</td>
              <td style="padding:6px 0; text-align:center; color:var(--danger); font-weight:600;">+${(F * 20).toFixed(1)}%</td>
              <td style="padding:6px 0; text-align:right; font-weight:bold; color:var(--danger);">${prog.swarming.toFixed(1)} 점</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:6px 0; font-weight:600;">❄️ overwintering 생존율</td>
              <td style="padding:6px 0;">${mid.winter.toFixed(0)} %</td>
              <td style="padding:6px 0; text-align:center; color:var(--danger); font-weight:600;">-${(F * 20).toFixed(1)}%</td>
              <td style="padding:6px 0; text-align:right; font-weight:bold; color:var(--secondary);">${prog.winter.toFixed(0)} %</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="padding:10px; background:rgba(0,0,0,0.15); border:1px solid var(--border); border-radius:6px; font-size:11.5px; color:var(--text-muted); line-height:1.5;">
        ${adviceComment}
      </div>
    `;
    safeCreateIcons();
  }

  // --- 8. PLINK NGS GEOM Genomic Dataset Exporter (Academic Researcher View) ---
  exportToPLINKFormat() {
    const colonies = db.getColonies();
    const queens = db.getQueens();
    const traits = db.getTraits();

    if (colonies.length === 0) {
      alert("PLINK 내보내기용 봉군 데이터가 없습니다!");
      return;
    }

    let pedLines = [];
    colonies.forEach(col => {
      const queen = queens.find(q => q.id === col.queenId) || { damId: '0', sireId: '0' };
      
      let dam = queen.damId && queen.damId !== 'Unknown' ? queen.damId : '0';
      let sire = queen.sireId && queen.sireId !== 'Unknown' ? queen.sireId : '0';
      sire = sire.replace(" (Drone Line)", "");

      const colTraits = traits.filter(t => t.colonyId === col.id);
      let avgHoney = 0;
      if (colTraits.length > 0) {
        avgHoney = colTraits.reduce((s, t) => s + t.honeyYield, 0) / colTraits.length;
      }
      const phenoStr = avgHoney > 0 ? avgHoney.toFixed(2) : "-9";

      const genotypes = GeneticsEngine.getSimulatedGenotype(col.id, traits);
      let genoStrings = [];
      GeneticsEngine.MARKERS.forEach(m => {
        const call = genotypes[m.name] || "AG";
        const a1 = call.charAt(0);
        const a2 = call.charAt(1);
        genoStrings.push(`${a1}\t${a2}`);
      });

      const line = `MELITTA\t${col.id}\t${sire}\t${dam}\t2\t${phenoStr}\t${genoStrings.join('\t')}`;
      pedLines.push(line);
    });

    const pedContent = pedLines.join('\n');

    let mapLines = [];
    GeneticsEngine.MARKERS.forEach(m => {
      const physicalBp = Math.round(parseFloat(m.pos.split(' ')[0]) * 1000000);
      mapLines.push(`${m.chr}\t${m.name}\t0\t${physicalBp}`);
    });
    const mapContent = mapLines.join('\n');

    this.downloadFile("melittabreed.ped", pedContent);
    setTimeout(() => {
      this.downloadFile("melittabreed.map", mapContent);
      alert("PLINK 연계 Genomic 데이터셋 (.ped 및 .map 파일) 추출 및 오프라인 로컬 다운로드가 완료되었습니다! 🧬💻");
    }, 300);
  }

  // --- 9. R PEDIGREE TOPOLOGICALLY SORTED Pedigree EXPORTER (Academic Researcher View) ---
  exportToRPedigree() {
    const queens = db.getQueens();
    
    if (queens.length === 0) {
      alert("R pedigree 내보내기용 혈통 데이터가 없습니다!");
      return;
    }

    const allIds = new Set();
    const parentMap = new Map();

    queens.forEach(q => {
      allIds.add(q.id);
      let dam = q.damId && q.damId !== 'Unknown' ? q.damId : '0';
      let sire = q.sireId && q.sireId !== 'Unknown' ? q.sireId : '0';
      sire = sire.replace(" (Drone Line)", "");

      parentMap.set(q.id, { dam, sire });
      if (dam !== '0') allIds.add(dam);
      if (sire !== '0') allIds.add(sire);
    });

    allIds.forEach(id => {
      if (!parentMap.has(id)) {
        parentMap.set(id, { dam: '0', sire: '0' });
      }
    });

    const visited = new Set();
    const sortedIds = [];
    const visiting = new Set();

    const visit = (id) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) return;
      visiting.add(id);

      const parents = parentMap.get(id);
      if (parents) {
        if (parents.dam !== '0' && allIds.has(parents.dam)) {
          visit(parents.dam);
        }
        if (parents.sire !== '0' && allIds.has(parents.sire)) {
          visit(parents.sire);
        }
      }

      visiting.delete(id);
      visited.add(id);
      sortedIds.push(id);
    };

    allIds.forEach(id => visit(id));

    const siresSet = new Set(Array.from(parentMap.values()).map(p => p.sire).filter(s => s !== '0'));

    const rIds = sortedIds.map(id => `"${id}"`).join(', ');
    const rDads = sortedIds.map(id => {
      const p = parentMap.get(id);
      return p.sire === '0' ? 'NA' : `"${p.sire}"`;
    }).join(', ');
    const rMoms = sortedIds.map(id => {
      const p = parentMap.get(id);
      return p.dam === '0' ? 'NA' : `"${p.dam}"`;
    }).join(', ');
    const rSex = sortedIds.map(id => {
      return siresSet.has(id) || id.startsWith('SIRE-') ? 1 : 2;
    }).join(', ');

    const rScript = `# MelittaBreed Academic R Pedigree Matrix (kinship2 compatible)
# Generated: ${new Date().toISOString()}
# This pedigree has been topologically sorted (Founders-First) to prevent kinship2 processing crashes.

library(kinship2)

# 1. Define Pedigree Data Frame
ped_data <- data.frame(
  id = c(${rIds}),
  dad = c(${rDads}),
  mom = c(${rMoms}),
  sex = c(${rSex}),
  famid = 1
)

# 2. Compile Pedigree Object
ped <- pedigree(
  id = ped_data$id,
  dad = ped_data$dad,
  mom = ped_data$mom,
  sex = ped_data$sex,
  famid = ped_data$famid
)

# 3. Print Pedigree Summary
print("--- PEDIGREE SUMMARY ---")
print(ped)

# 4. Generate Kinship Matrix Coefficients
kin_matrix <- kinship(ped)
print("--- KINSHIP COEFFICIENT MATRIX ---")
print(kin_matrix)
`;

    this.downloadFile("melittabreed_pedigree.R", rScript);
    alert("R 생물통계 패키지(kinship2) 전용 topologically-sorted pedigree R 스크립트(.R 파일) 생성이 완료되었습니다! 📈🔬");
  }

  downloadFile(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}

// Bind to window for global inline clicks and isolated namespace wrapper protection
window.MelittaSystem = window.MelittaSystem || {};
window.MelittaSystem.app = new MelittaApp();
window.melittaApp = window.MelittaSystem.app;

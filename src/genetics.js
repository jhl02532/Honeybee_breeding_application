// MelittaBreed Genetics Sandbox and Haplotype Linker
// Implements Selection Index calculation and 16-chromosome SNP mapping simulation for Apis mellifera (n=16)

window.GeneticsEngine = {
  // Key molecular marker definitions mapped to Honeybee chromosomes
  MARKERS: [
    { chr: 1, name: "Am_VMR_01", trait: "Mite Resistance", desc: "Varroa Grooming Behavior locus (응애 그루밍 행동 조절)", pos: "12.4 Mbp" },
    { chr: 3, name: "Am_GNT_03", trait: "Gentleness", desc: "Sting propensity and alarm pheromone receptor (온순함 및 공격성)", pos: "8.1 Mbp" },
    { chr: 5, name: "Am_HON_05", trait: "Honey Yield", desc: "Foraging flight and sugar receptor activation (채밀 비행 및 당수용체)", pos: "22.3 Mbp" },
    { chr: 8, name: "Am_HYG_08", trait: "Virus Resistance", desc: "Hygienic larval uncapping behavior (바이러스/질병 유충 소방 청소 행동)", pos: "15.7 Mbp" },
    { chr: 11, name: "Am_SWR_11", trait: "Swarming Rate", desc: "Queen pheromone sensitivity & swarming trigger (저분봉성 조절 수용체)", pos: "4.9 Mbp" },
    { chr: 15, name: "Am_COL_15", trait: "Climate Adaptability", desc: "Cold tolerance & overwintering metabolic rate (저온 생리 대사 및 기후적응)", pos: "9.2 Mbp" }
  ],

  // Generates simulated SNP genotypes for a colony based on its historical phenotype
  // This simulates the actual lab genotyped profiles (Genomic Linkage)
  getSimulatedGenotype(colonyId, traitsDb) {
    // Fetch colony trait averages to seed realistic genotypes
    const records = traitsDb.filter(t => t.colonyId === colonyId);
    
    // Average scores
    let honeyAvg = 25;
    let miteAvg = 3;
    let gentleAvg = 3;
    let virusAvg = 3;
    let swarmingAvg = 3;
    let climateAvg = 3;

    if (records.length > 0) {
      honeyAvg = records.reduce((s, r) => s + r.honeyYield, 0) / records.length;
      miteAvg = records.reduce((s, r) => s + r.miteResistance, 0) / records.length;
      gentleAvg = records.reduce((s, r) => s + r.gentleness, 0) / records.length;
      virusAvg = records.reduce((s, r) => s + r.virusResistance, 0) / records.length;
      swarmingAvg = records.reduce((s, r) => s + r.swarmingRate, 0) / records.length;
      climateAvg = records.reduce((s, r) => s + r.climateAdaptability, 0) / records.length;
    }

    // Standard mapping helper: higher phenotypic average increases likelihood of dominant favorable alleles (A or G)
    const mapToGenotype = (score, maxVal) => {
      const ratio = score / maxVal;
      const rand = Math.random();
      
      if (ratio > 0.8) {
        // High phenotype -> Highly likely Favorable Homozygous
        return rand > 0.15 ? "AA" : "AG";
      } else if (ratio > 0.5) {
        // Medium phenotype -> Likely Heterozygous
        if (rand > 0.6) return "AA";
        if (rand > 0.15) return "AG";
        return "GG";
      } else {
        // Low phenotype -> Favorable Homozygous is rare, likely Unfavorable Homozygous
        return rand > 0.8 ? "AG" : "GG";
      }
    };

    // Low swarming is favorable, so we invert swarming rate mapping (1 is best, 5 is worst)
    const invertedSwarming = 6 - swarmingAvg;

    return {
      "Am_VMR_01": mapToGenotype(miteAvg, 5),
      "Am_GNT_03": mapToGenotype(gentleAvg, 5),
      "Am_HON_05": mapToGenotype(honeyAvg, 50),
      "Am_HYG_08": mapToGenotype(virusAvg, 5),
      "Am_SWR_11": mapToGenotype(invertedSwarming, 5),
      "Am_COL_15": mapToGenotype(climateAvg, 5)
    };
  },

  // Calculate Selection Index (Breeding Value index) for all Queens
  // weights represent percentage importance of each category (sum to 100%)
  // categories: production (honey, propolis, jelly), health (mite, virus, overwinter), behavior (gentleness, swarming, climate)
  calculateBreedingValues(queens, colonies, traits, weights) {
    // 1. First, calculate colony level averages
    const colonyAverages = colonies.map(col => {
      const records = traits.filter(t => t.colonyId === col.id);
      if (records.length === 0) {
        return {
          colonyId: col.id,
          queenId: col.queenId,
          honey: 20, propolis: 150, jelly: 30,
          gentle: 3, mite: 3, virus: 3, swarming: 3, winter: 80, climate: 3,
          healthPenalty: 0,
          count: 0
        };
      }

      const count = records.length;
      
      // Calculate health penalties (Government & Beekeeper health/disease covariates):
      // healthGrade === 'Critical' -> 12 points penalty, 'Alert' -> 6 points penalty
      // treatmentLog !== 'None' (chemical mite/disease treatment) -> 4 points penalty
      let healthPenalty = 0;
      records.forEach(r => {
        if (r.healthGrade === 'Critical') healthPenalty += 12;
        if (r.healthGrade === 'Alert') healthPenalty += 6;
        if (r.treatmentLog && r.treatmentLog !== 'None') healthPenalty += 4;
      });
      const avgPenalty = healthPenalty / count;

      return {
        colonyId: col.id,
        queenId: col.queenId,
        honey: records.reduce((s, r) => s + r.honeyYield, 0) / count,
        propolis: records.reduce((s, r) => s + (r.propolisYield || 0), 0) / count,
        jelly: records.reduce((s, r) => s + (r.royalJellyYield || 0), 0) / count,
        gentle: records.reduce((s, r) => s + r.gentleness, 0) / count,
        mite: records.reduce((s, r) => s + r.miteResistance, 0) / count,
        virus: records.reduce((s, r) => s + r.virusResistance, 0) / count,
        swarming: records.reduce((s, r) => s + r.swarmingRate, 0) / count,
        winter: records.reduce((s, r) => s + (r.overwinteringSurvival || 80), 0) / count,
        climate: records.reduce((s, r) => s + r.climateAdaptability, 0) / count,
        healthPenalty: avgPenalty,
        count
      };
    });

    // 2. Normalization boundaries based on historical research parameters
    // We scale everything to 0 - 100
    const normalize = (val, min, max, invert = false) => {
      let norm = ((val - min) / (max - min)) * 100;
      norm = Math.max(0, Math.min(100, norm));
      return invert ? 100 - norm : norm;
    };

    // 3. Score each Queen based on her colony's performance
    // If a Queen has multiple colonies, we average them. If none, she gets standard base.
    const queenScores = queens.map(queen => {
      const linkedColonies = colonyAverages.filter(c => c.queenId === queen.id);
      
      let scoreData = {};
      let avgColonyPenalty = 0;
      if (linkedColonies.length === 0) {
        scoreData = {
          honey: 20, propolis: 150, jelly: 30,
          gentle: 3, mite: 3, virus: 3, swarming: 3, winter: 80, climate: 3
        };
        avgColonyPenalty = 0;
      } else {
        const count = linkedColonies.length;
        scoreData = {
          honey: linkedColonies.reduce((s, c) => s + c.honey, 0) / count,
          propolis: linkedColonies.reduce((s, c) => s + c.propolis, 0) / count,
          jelly: linkedColonies.reduce((s, c) => s + c.jelly, 0) / count,
          gentle: linkedColonies.reduce((s, c) => s + c.gentle, 0) / count,
          mite: linkedColonies.reduce((s, c) => s + c.mite, 0) / count,
          virus: linkedColonies.reduce((s, c) => s + c.virus, 0) / count,
          swarming: linkedColonies.reduce((s, c) => s + c.swarming, 0) / count,
          winter: linkedColonies.reduce((s, c) => s + c.winter, 0) / count,
          climate: linkedColonies.reduce((s, c) => s + c.climate, 0) / count
        };
        avgColonyPenalty = linkedColonies.reduce((s, c) => s + c.healthPenalty, 0) / count;
      }

      // Normalise traits to 0-100 scale
      const normHoney = normalize(scoreData.honey, 10, 60);
      const normPropolis = normalize(scoreData.propolis, 50, 600);
      const normJelly = normalize(scoreData.jelly, 10, 100);
      const normGentle = normalize(scoreData.gentle, 1, 5);
      const normMite = normalize(scoreData.mite, 1, 5);
      const normVirus = normalize(scoreData.virus, 1, 5);
      const normSwarming = normalize(scoreData.swarming, 1, 5, true); // Low swarming is best!
      const normWinter = normalize(scoreData.winter, 50, 100);
      const normClimate = normalize(scoreData.climate, 1, 5);

      // Weighted Sub-indices
      // Weights are provided as percentages: honeyWeight, propolisWeight, jellyWeight, miteWeight, gentleWeight, etc.
      const w = {
        honey: (weights.honey || 20) / 100,
        propolis: (weights.propolis || 10) / 100,
        jelly: (weights.jelly || 10) / 100,
        mite: (weights.mite || 15) / 100,
        virus: (weights.virus || 15) / 100,
        gentle: (weights.gentle || 10) / 100,
        swarming: (weights.swarming || 5) / 100,
        winter: (weights.winter || 10) / 100,
        climate: (weights.climate || 5) / 100
      };

      let finalIndex = 
        (normHoney * w.honey) +
        (normPropolis * w.propolis) +
        (normJelly * w.jelly) +
        (normMite * w.mite) +
        (normVirus * w.virus) +
        (normGentle * w.gentle) +
        (normSwarming * w.swarming) +
        (normWinter * w.winter) +
        (normClimate * w.climate);

      // Deduct health penalty derived from phenotypic covariates
      finalIndex = Math.max(0, finalIndex - avgColonyPenalty);

      return {
        queenId: queen.id,
        breedLine: queen.breedLine,
        raw: scoreData,
        normalized: {
          honey: normHoney,
          propolis: normPropolis,
          jelly: normJelly,
          mite: normMite,
          virus: normVirus,
          gentle: normGentle,
          swarming: normSwarming,
          winter: normWinter,
          climate: normClimate
        },
        breedingValue: Number(finalIndex.toFixed(1)),
        colonyCount: linkedColonies.length
      };
    });

    // Rank queens in descending order of breeding value
    return queenScores.sort((a, b) => b.breedingValue - a.breedingValue);
  },

  // Calculate Pedigree Kinship & Inbreeding coefficient (Breeder's View)
  calculateKinshipAndInbreeding(damId, sireId) {
    const queens = window.db.getQueens();
    
    // Recursive lineage tracer
    const getAncestors = (id, currentPathLen = 0, visited = new Set()) => {
      if (!id || id === 'Unknown' || visited.has(id)) return {};
      visited.add(id);
      
      const result = {};
      result[id] = [currentPathLen];
      
      const cleanSireId = id.replace(" (Drone Line)", "");
      const queen = queens.find(q => q.id === id || q.id === cleanSireId);
      if (queen) {
        if (queen.damId && queen.damId !== 'Unknown') {
          const damAns = getAncestors(queen.damId, currentPathLen + 1, new Set(visited));
          for (const [ansId, paths] of Object.entries(damAns)) {
            if (!result[ansId]) result[ansId] = [];
            result[ansId].push(...paths);
          }
        }
        if (queen.sireId && queen.sireId !== 'Unknown') {
          const sireAns = getAncestors(queen.sireId, currentPathLen + 1, new Set(visited));
          for (const [ansId, paths] of Object.entries(sireAns)) {
            if (!result[ansId]) result[ansId] = [];
            result[ansId].push(...paths);
          }
        }
      }
      return result;
    };

    const damAncestors = getAncestors(damId);
    const sireAncestors = getAncestors(sireId);
    
    let inbreedingCoeff = 0;
    const commonAncestors = [];
    
    for (const ansId in damAncestors) {
      if (sireAncestors[ansId]) {
        const damPaths = damAncestors[ansId];
        const sirePaths = sireAncestors[ansId];
        
        for (const dPath of damPaths) {
          for (const sPath of sirePaths) {
            const contribution = Math.pow(0.5, dPath + sPath + 1);
            inbreedingCoeff += contribution;
            if (!commonAncestors.includes(ansId)) {
              commonAncestors.push(ansId);
            }
          }
        }
      }
    }

    // Additional breed-based similarity check (if no direct pedigree link but same lineage strain)
    const damQueen = queens.find(q => q.id === damId);
    const sireCleanId = sireId.replace(" (Drone Line)", "");
    const sireQueen = queens.find(q => q.id === sireCleanId);
    
    let breedSimilarity = 0;
    if (damQueen && sireQueen) {
      if (damQueen.breedLine === sireQueen.breedLine) {
        breedSimilarity = 0.0625; // 6.25% base kinship if they belong to the same pure breed
      }
    }
    
    if (inbreedingCoeff === 0 && breedSimilarity > 0) {
      inbreedingCoeff = breedSimilarity;
    }
    
    inbreedingCoeff = Math.min(1.0, inbreedingCoeff);
    
    return {
      inbreedingCoefficient: inbreedingCoeff,
      commonAncestors: commonAncestors,
      dangerLevel: inbreedingCoeff >= 0.125 ? 'Critical' : (inbreedingCoeff >= 0.05 ? 'Warning' : 'Safe')
    };
  }
};

window.MelittaSystem = window.MelittaSystem || {};
window.MelittaSystem.GeneticsEngine = window.GeneticsEngine;

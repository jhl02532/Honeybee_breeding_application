# K-BEE BANK v2 시험용 시뮬레이션 데이터 (SIMplyBee 0.4.1 / AlphaSimR 2.1.0)
#
# 목적: 공개 데이터에 없는 계통·교미(부계)·유전형·참값 유전가치를 함께 가진 데이터 세트를 만들어
#       v2 테이블(queens, matings, samples, trait_observations, markers, sample_genotypes, breeding_values)과
#       계통도·교배 시뮬레이터 화면을 시험한다. 실제 꿀벌 집단의 값이 아니다.
#
# 설계
# - 기초 집단: quickHaplo 68 개체(16 염색체 × 1,000 분리 자리), csd 대립유전자 기본값(SIMplyBee)
# - 형질 2개(봉군 형질 = 여왕 효과 + 일벌 효과, 상가적):
#     honey   : 채밀량(kg) 봉군 평균 약 30, 표현형 SD 약 8, 유전력 약 0.27, 여왕·일벌 효과 상관 -0.5
#     hygiene : 위생 행동(%) 봉군 평균 약 70, 표현형 SD 약 15, 유전력 약 0.27, 0–100 으로 자름
#     (분산은 tune.R 로 1세대 봉군 유전·표현형 분산을 보고 정함)
# - 6세대(2021–2026), 해마다 봉군 60개. 표현형 지수(두 형질 z 점수 평균) 상위 10봉군 = 어미(딸 여왕 생산),
#   그다음 10봉군 = 수벌 생산 봉군(DPC). DPC 수벌을 모은 집결지에서 여왕마다 nFathersPoisson 마리와 교미.
# - 출력(CSV, v2 적재 형식): queens, matings, samples, traits, markers, genotypes, breeding_values
#   마커는 형질별 효과 절댓값 상위 QTL 30개(참 효과 = 여왕 효과 기준), 유전형은 여왕(2배체) 0/0·0/1·1/1.
#   breeding_values 는 참값: 봉군 유전가치(calcColonyGv, 그 여왕 봉군 기준)와 여왕 개체 유전가치(여왕 효과).

suppressMessages({
  library(SIMplyBee)
})
set.seed(20261030)

args <- commandArgs(trailingOnly = TRUE)
outDir <- if (length(args) > 0) args[1] else "out"
dir.create(outDir, showWarnings = FALSE, recursive = TRUE)

nCol <- 60
nDam <- 10
nDpc <- 10
years <- 2021:2026
nQtlKeep <- 30

founderGenomes <- quickHaplo(nInd = nCol + nDpc, nChr = 16, segSites = 1000)
SP <- SimParamBee$new(founderGenomes)
SP$setTrackPed(TRUE)
nW <- SP$nWorkers

meanA <- c(15, 15 / nW, 35, 35 / nW)
varA <- c(16, 0.4 / nW, 60, 1.5 / nW)
corA <- matrix(c( 1.0, -0.5,  0.0,  0.0,
                 -0.5,  1.0,  0.0,  0.0,
                  0.0,  0.0,  1.0, -0.3,
                  0.0,  0.0, -0.3,  1.0), nrow = 4, byrow = TRUE)
SP$addTraitA(nQtlPerChr = 50, mean = meanA, var = varA, corA = corA,
             name = c("honeyQ", "honeyW", "hygQ", "hygW"))
varE <- c(36, 2 / nW, 135, 7.5 / nW)
corE <- matrix(c(1.0, 0.3, 0.0, 0.0,
                 0.3, 1.0, 0.0, 0.0,
                 0.0, 0.0, 1.0, 0.2,
                 0.0, 0.0, 0.2, 1.0), nrow = 4, byrow = TRUE)
SP$setVarE(varE = varE, corE = corE)

colonyPhenoFun <- function(colony) {
  honey <- mapCasteToColonyPheno(colony, queenTrait = "honeyQ", workersTrait = "honeyW",
                                 traitName = "honey", checkProduction = TRUE)
  hyg <- mapCasteToColonyPheno(colony, queenTrait = "hygQ", workersTrait = "hygW",
                               traitName = "hygiene", checkProduction = FALSE)
  cbind(honey, hyg)
}
colonyGvFun <- function(colony) {
  honey <- mapCasteToColonyGv(colony, queenTrait = "honeyQ", workersTrait = "honeyW", traitName = "honey")
  hyg <- mapCasteToColonyGv(colony, queenTrait = "hygQ", workersTrait = "hygW", traitName = "hygiene")
  cbind(honey, hyg)
}

# ---- 기록용 표 ----
tagOf <- function(id, year) sprintf("SIM-%d-%s", year, id)
queens <- data.frame()     # tag, mother_tag, line, birth_date, origin, external_id
matings <- data.frame()    # queen_tag, method, date, location, est_n_drones, sire_queen_tags, sire_shares
traits <- data.frame()     # trait_code, value, date, queen_tag, method_note
bvs <- data.frame()        # queen_tag, trait_code, value, accuracy, model, model_version, run_date
genoPops <- list()         # queen_tag -> 여왕 Pop (유전형 추출용)
idTag <- c()               # AlphaSimR id -> tag

addQueens <- function(pop, year, line, origin) {
  ids <- pop@id
  tags <- tagOf(ids, year)
  mothers <- ifelse(pop@mother %in% names(idTag), idTag[pop@mother], "")
  idTag[ids] <<- tags
  queens <<- rbind(queens, data.frame(tag = tags, mother_tag = unname(mothers), line = line,
                                      birth_date = sprintf("%d-05-01", year), origin = origin,
                                      external_id = ids))
}

# ---- 기초 집단 ----
base <- createVirginQueens(founderGenomes, nInd = nCol + nDpc)
addQueens(base, years[1] - 1, "founder", "시뮬레이션 기초 집단")
founderDpc <- createMultiColony(base[(nCol + 1):(nCol + nDpc)])
founderDpc <- cross(founderDpc, drones = pullDroneGroupsFromDCA(createDrones(base[1:nDpc], nInd = 200),
                                                                n = nDpc, nDrones = nFathersPoisson),
                    checkCross = "warning")
founderDpc <- buildUp(founderDpc)
virgins <- base[1:nCol]
# 기초 여왕은 자기 연도가 founder 이므로 2021 봉군의 여왕 tag 를 다시 쓰지 않도록 아래에서 별도 tag 를 주지 않는다
dpc <- founderDpc

for (y in years) {
  # 교미: DPC 수벌 → 집결지 → 여왕마다 수벌 무리
  drones <- createDrones(dpc, nInd = 150)
  if (is.list(drones)) drones <- mergePops(drones)
  groups <- pullDroneGroupsFromDCA(drones, n = nInd(virgins), nDrones = nFathersPoisson)
  if (y != years[1]) addQueens(virgins, y, "selected", "시뮬레이션 선발")
  apiary <- createMultiColony(virgins)
  apiary <- cross(apiary, drones = groups, checkCross = "warning")
  apiary <- buildUp(apiary)

  ph <- as.data.frame(calcColonyPheno(apiary, FUN = colonyPhenoFun))
  gv <- as.data.frame(calcColonyGv(apiary, FUN = colonyGvFun))
  pHom <- calcQueensPHomBrood(apiary)
  qIds <- sapply(apiary@colonies, function(c) getQueen(c)@id)
  qTags <- unname(idTag[qIds])
  date <- sprintf("%d-07-15", y)

  ph$hygiene <- pmin(pmax(ph$hygiene, 0), 100)
  traits <- rbind(traits,
    data.frame(trait_code = "honey_kg", value = round(ph$honey, 2), date = date, queen_tag = qTags, method_note = "SIMplyBee 봉군 표현형"),
    data.frame(trait_code = "hygienic_pct", value = round(ph$hygiene, 1), date = date, queen_tag = qTags, method_note = "SIMplyBee 봉군 표현형(0–100 자름)"),
    data.frame(trait_code = "hom_brood_pct", value = round(100 * unlist(pHom), 2), date = date, queen_tag = qTags, method_note = "csd 동형 봉아 기대 비율"))
  qGv <- t(sapply(apiary@colonies, function(c) getQueen(c)@gv[1, ]))  # 열 순서: honeyQ, honeyW, hygQ, hygW
  bvs <- rbind(bvs,
    data.frame(queen_tag = qTags, trait_code = "honey_kg", value = round(gv$honey, 3), accuracy = 1,
               model = "true_value", model_version = "colony_gv", run_date = date),
    data.frame(queen_tag = qTags, trait_code = "hygienic_pct", value = round(gv$hygiene, 3), accuracy = 1,
               model = "true_value", model_version = "colony_gv", run_date = date),
    data.frame(queen_tag = qTags, trait_code = "honey_kg", value = round(qGv[, 1], 3), accuracy = 1,
               model = "true_value", model_version = "queen_effect", run_date = date),
    data.frame(queen_tag = qTags, trait_code = "hygienic_pct", value = round(qGv[, 3], 3), accuracy = 1,
               model = "true_value", model_version = "queen_effect", run_date = date))

  # 교미 기록: 아비 수벌의 어미(= 수벌 생산 여왕)별 비율
  for (k in seq_along(apiary@colonies)) {
    fa <- getFathers(apiary@colonies[[k]])
    tab <- table(fa@mother)
    sires <- unname(idTag[names(tab)])
    matings <- rbind(matings, data.frame(
      queen_tag = qTags[k], method = "mating_station", date = sprintf("%d-05-20", y),
      location = "SIM 교미장", est_n_drones = nInd(fa),
      sire_queen_tags = paste(sires, collapse = ";"),
      sire_shares = paste(round(as.numeric(tab) / nInd(fa), 3), collapse = ";")))
    genoPops[[qTags[k]]] <- getQueen(apiary@colonies[[k]])
  }

  # 선발: 표현형 지수
  idx <- (scale(ph$honey)[, 1] + scale(ph$hygiene)[, 1]) / 2
  ord <- order(idx, decreasing = TRUE)
  dams <- selectColonies(apiary, ID = getId(apiary)[ord[1:nDam]])
  dpc <- selectColonies(apiary, ID = getId(apiary)[ord[(nDam + 1):(nDam + nDpc)]])
  if (y != tail(years, 1)) {
    vq <- createVirginQueens(dams, nInd = ceiling(nCol / nDam))
    if (is.list(vq)) vq <- mergePops(vq)
    virgins <- vq[1:nCol]
  }
  cat(y, "honey", round(mean(ph$honey), 2), "hyg", round(mean(ph$hygiene), 1),
      "gvHoney", round(mean(gv$honey), 2), "gvHyg", round(mean(gv$hygiene), 2),
      "pHom", round(mean(unlist(pHom)), 4), "\n")
}

# 첫 해 여왕은 기초 집단 tag(SIM-2020-*) 를 그대로 쓴다 — 2021 봉군 = 기초 여왕
# ---- 마커: 형질별 여왕 효과 절댓값 상위 QTL ----
markers <- data.frame()
genotypes <- data.frame()
qtlTraits <- list(honey_kg = 1, hygienic_pct = 3)
allQ <- mergePops(genoPops)
for (tc in names(qtlTraits)) {
  tr <- SP$traits[[qtlTraits[[tc]]]]
  eff <- tr@addEff
  keep <- order(abs(eff), decreasing = TRUE)[1:nQtlKeep]
  chrOf <- rep(seq_along(tr@lociPerChr), tr@lociPerChr)
  loc <- tr@lociLoc
  code <- sprintf("sim%d:%d", chrOf[keep], loc[keep])
  markers <- rbind(markers, data.frame(
    panel = "sim_simplybee_v1_qtl", marker_code = code, assembly = "SIMplyBee quickHaplo",
    chrom = paste0("sim", chrOf[keep]), pos = loc[keep], ref = "0", alt = "1", trait_code = tc,
    effect = round(eff[keep], 5), effect_allele = "1", allele_freq = NA, p_value = NA,
    population = "sim", source = "SIMplyBee 참 QTL 효과(여왕 효과)"))
  G <- pullQtlGeno(allQ, trait = qtlTraits[[tc]])[, keep, drop = FALSE]
  gtStr <- c("0/0", "0/1", "1/1")
  for (j in seq_len(ncol(G))) {
    genotypes <- rbind(genotypes, data.frame(
      sample_code = paste0(unname(idTag[allQ@id]), "-Q"), panel = "sim_simplybee_v1_qtl",
      marker_code = code[j], gt = gtStr[G[, j] + 1], af = NA, depth = NA))
  }
  markers$allele_freq[markers$trait_code == tc] <- round(colMeans(G) / 2, 3)
}
genotypes <- genotypes[!duplicated(genotypes[, c("sample_code", "marker_code")]), ]

samples <- data.frame(code = paste0(names(genoPops), "-Q"), queen_tag = names(genoPops), sample_type = "queen",
                      n_individuals = 1, collected_date = NA, platform = "chip", status = "called")

w <- function(df, name) write.csv(df, file.path(outDir, name), row.names = FALSE, na = "")
w(queens, "queens.csv"); w(matings, "matings.csv"); w(samples, "samples.csv"); w(traits, "traits.csv")
w(markers, "markers.csv"); w(genotypes, "genotypes.csv"); w(bvs, "breeding_values.csv")
cat("queens", nrow(queens), "matings", nrow(matings), "traits", nrow(traits), "markers", nrow(markers),
    "genotypes", nrow(genotypes), "bvs", nrow(bvs), "\n")
writeLines(capture.output(sessionInfo()), file.path(outDir, "sessionInfo.txt"))

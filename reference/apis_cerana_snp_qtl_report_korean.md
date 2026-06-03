# Apis cerana 관련 주요 SNP 및 QTL 연구 종합 보고서

## 요약

본 보고서는 동양종 꿀벌(Apis cerana)의 단일염기다형성(SNP) 및 양적형질유전자좌(QTL) 연구를 종합적으로 정리한 문서이다. 총 11편의 주요 연구논문을 분석하여 (1) 사용된 참조유전체, (2) 대상 유전자, (3) 타겟 변이 위치를 중심으로 체계적으로 정리하였다. 연구 분야는 바이러스 저항성, 형태 형질, 기후 적응, 개체군 구조, 게놈 자원의 5개 섹션으로 구분하였으며, 각 논문별로 상세한 기술 정보를 표로 제시하였다.

주요 발견사항으로는 중국 낭충봉아부패병(SBV) 저항성 관련 2개의 SNP 마커 발견, 귀주성 개체군의 형태형질 관련 21개 SNP 동정, 기후 적응 관련 RAPTOR 유전자의 선택적 스윕(selective sweep) 확인, 그리고 고품질 염색체 수준 참조유전체(AcerK1.0, N50 13.39 Mbp) 구축 등이 있다. 본 보고서는 A. cerana의 유전적 다양성, 적응 진화, 육종 전략 수립에 필요한 핵심 정보를 제공한다.

## 목차

1. [서론](#1-서론)
2. [참조유전체 목록](#2-참조유전체-목록)
3. [연구 분야별 상세 분석](#3-연구-분야별-상세-분석)
   - 3.1 [바이러스 저항성 연구](#31-바이러스-저항성-연구)
   - 3.2 [형태 형질 연구](#32-형태-형질-연구)
   - 3.3 [기후 적응 연구](#33-기후-적응-연구)
   - 3.4 [개체군 구조 및 유전 다양성 연구](#34-개체군-구조-및-유전-다양성-연구)
   - 3.5 [게놈 자원 개발](#35-게놈-자원-개발)
4. [논의](#4-논의)
5. [향후 연구 방향](#5-향후-연구-방향)
6. [결론](#6-결론)
7. [참고문헌](#7-참고문헌)

---

## 1. 서론

동양종 꿀벌(Apis cerana)은 아시아 전역에 광범위하게 분포하는 중요한 화분매개자이자 양봉 자원이다. 중국에서는 서양종 꿀벌(Apis mellifera) 도입 이전까지 유일한 양봉 대상 종이었으며, 지역별로 다양한 생태형과 아종이 존재한다 [1]. 최근 차세대 염기서열 분석(NGS) 기술의 발전으로 A. cerana의 전장유전체 재서열분석(whole-genome resequencing)이 가능해지면서, 단일염기다형성(SNP), 삽입/결실(Indel), 구조변이(SV) 등 다양한 유전적 변이를 대규모로 발굴할 수 있게 되었다 [2], [3].

SNP는 집단 간 유전적 분화, 질병 저항성, 형태적 특성, 환경 적응 등 다양한 표현형과 연관된 유전 마커로 활용되고 있다 [4]. 특히 낭충봉아부패병(Sacbrood Virus, SBV)과 같은 주요 병원체에 대한 저항성 관련 SNP 발굴은 육종 프로그램에 직접 활용될 수 있는 실용적 가치가 높다 [5]. 또한 기후변화에 따른 적응 진화 메커니즘을 이해하기 위해 선택적 스윕(selective sweep) 분석을 통한 후보 유전자 탐색이 활발히 진행되고 있다 [6].

본 보고서는 2021년부터 2025년까지 발표된 A. cerana 관련 주요 SNP 및 QTL 연구 11편을 종합 분석하여, (1) 사용된 참조유전체 정보, (2) 분석 대상 유전자 및 경로, (3) 동정된 변이의 정확한 염색체/스캐폴드 위치를 체계적으로 정리하였다. 연구 분야별로 섹션을 구분하여 각 논문의 핵심 기술 정보를 상세 표로 제시함으로써, 향후 A. cerana 유전체 연구 및 육종 전략 수립에 필요한 기초 자료를 제공하고자 한다.

---

## 2. 참조유전체 목록

A. cerana SNP/QTL 연구에 사용된 주요 참조유전체의 정보를 다음 표에 정리하였다.

### 표 1. Apis cerana 주요 참조유전체 목록

| 참조유전체 이름 | 버전 | NCBI 접근번호 | 조립 수준 | 총 크기 (Mb) | N50 (Mb) | 염색체 수 | BUSCO 완전성 (%) | 발표 연도 | 비고 |
|---|---|---|---|---|---|---|---|---|---|
| APICC1.0 | 1.0 | GCA_002290385.1 | Scaffold | ~220 | - | - | - | 2017 | SBV 저항성 연구에 사용 [5] |
| AcerK1.0 | 1.0 | GCA_029169275.1 | Chromosome | 223 | 13.39 | 16 | 97.9 | 2025 | 현존 최고 품질 조립체 [7] |
| ACSNU-2.0 | 2.0 | - | Chromosome | ~220 | - | 16 | - | ~2020 | 이전 표준 참조유전체 [7] |
| Pakistan genome | - | - | Scaffold | 214 | 2.85 | - | - | 2021 | 파키스탄 개체군 [8] |
| Pan-genome ancestral reference | - | - | Chromosome | ~220 | - | 16 | - | 2023 | 범유전체 연구용 조상 참조 [9] |

**주요 특징:**
- **AcerK1.0**은 Oxford Nanopore Technology(ONT) 장거리 시퀀싱과 Illumina 단거리 시퀀싱을 결합한 하이브리드 조립 방식으로 구축되었으며, N50 13.39 Mbp로 현존하는 A. cerana 조립체 중 최고 품질을 자랑한다 [7].
- **APICC1.0**은 중국 A. c. cerana 개체군을 대상으로 한 초기 참조유전체로, SBV 저항성 SNP 연구에 활용되었다 [5].
- 대부분의 최근 연구는 염색체 수준(chromosome-level) 조립체를 사용하여 정확한 변이 위치 매핑이 가능하다 [7], [9].

---

## 3. 연구 분야별 상세 분석

### 3.1 바이러스 저항성 연구

#### 3.1.1 개요

낭충봉아부패병(Sacbrood Virus, SBV)은 A. cerana와 A. mellifera 모두에서 유충 발달을 저해하는 주요 바이러스성 질병이다 [5]. 중국에서는 특히 중국형 낭충봉아부패병 바이러스(Chinese Sacbrood Virus, CSBV)가 A. c. cerana 개체군에 심각한 피해를 주고 있다 [10]. 전장유전체 재서열분석을 통해 SBV 저항성과 연관된 SNP 마커 및 후보 유전자를 발굴하는 연구가 진행되었다.

#### 3.1.2 주요 연구 논문

**논문 1: Discovery of SNP Molecular Markers and Candidate Genes Associated with Sacbrood Virus Resistance in Apis cerana cerana Larvae by Whole-Genome Resequencing (2023)**

본 연구는 in vitro에서 배양한 A. c. cerana 유충 90개체를 SBV로 감염시킨 후, 저항성(R)과 감수성(S) 개체군 간 전장유전체 재서열분석을 수행하여 저항성 관련 SNP 마커를 발굴하였다 [5].

### 표 2. SBV 저항성 관련 SNP 상세 정보

| 항목 | SNP #1 | SNP #2 |
|---|---|---|
| **GenBank ID** | KZ288474.1_322717 | KZ288479.1_95621 |
| **염색체** | 15번 염색체 | 15번 염색체 |
| **위치 (bp)** | 322,717 | 95,621 |
| **변이 유형** | G > C (Guanine → Cytosine) | C > T (Cytosine → Thiamine) |
| **변이 효과** | Upstream effect | Intergenic SNP |
| **근접 유전자** | APCC_06899 (1,804 bp upstream) | APCC_01833 (53,591 bp 떨어짐) |
| **Transcript ID** | RNA_9701 | - |
| **검증 샘플 수** | 926개체 | 1,022개체 |
| **통계적 유의성** | p < 0.01 (생존 분석) | p < 0.01 (생존 분석) |

**주요 발견:**
- 두 SNP 모두 15번 염색체에 위치하며, 저항성 개체군과 감수성 개체군 간 유의한 대립유전자 빈도 차이를 보였다 [5].
- SNP #1은 APCC_06899 유전자의 상류(upstream) 1,804 bp에 위치하여 유전자 발현 조절에 관여할 가능성이 있다 [5].
- SNP #2는 유전자 간 영역(intergenic region)에 위치하지만, 인근 유전자의 원거리 조절 요소일 가능성이 제기되었다 [5].

### 표 3. SBV 저항성 관련 후보 유전자 및 경로

| 분석 방법 | 후보 유전자/경로 | 기능 | 참고문헌 |
|---|---|---|---|
| FST & π ratio (top 1%) | 면역 반응 관련 유전자군 | 선천성 면역, 신호전달 | [5] |
| KEGG enrichment | Endocytosis | 바이러스 침입 경로 | [5] |
| KEGG enrichment | Phagosome | 세포내 병원체 제거 | [5] |
| KEGG enrichment | Peroxisome | 산화 스트레스 반응 | [5] |
| KEGG enrichment | Autophagy regulation | 세포 자가포식 조절 | [5] |
| GO enrichment | Signal transduction | 세포 신호전달 메커니즘 | [5] |

**분석 파이프라인:**
- **정렬:** BWA v0.7.5a-r405 (mem algorithm) [5]
- **변이 검출:** GATK v3.8 (Haplotype Caller) [5]
- **필터링 기준:** QUAL < 30, QD < 2.0, FS > 60.0, MQ < 40.0 제거 [5]
- **주석:** SnpEff toolbox [5]
- **집단 분석:** PopGenome (FST, π ratio), VCFTOOLS (100-kb sliding windows, 10-kb step) [5]
- **통계 기준:** MAF < 0.05, INT < 0.5, top 1% 및 5% selective sweep [5]

---

### 3.2 형태 형질 연구

#### 3.2.1 개요

A. cerana의 형태적 특성(proboscis length, wing size, body segments 등)은 지역별 환경 적응과 밀접한 관련이 있으며, 양봉 생산성에도 영향을 미친다 [11]. 전장유전체 연관분석(GWAS)을 통해 형태형질과 연관된 SNP 및 후보 유전자를 발굴하는 연구가 진행되었다.

#### 3.2.2 주요 연구 논문

**논문 2: Genome-Wide Association Studies of Key Traits in Apis cerana cerana from Guizhou Province (2025)**

본 연구는 중국 귀주성(Guizhou Province) 12개 지역에서 채집한 116개체의 일벌(worker)을 대상으로 15개 형태형질을 측정하고 GWAS를 수행하였다 [11].

### 표 4. 귀주성 개체군 형태형질 GWAS 결과

| 형질 | 유의 SNP 수 | 후보 유전자 수 | 주요 후보 유전자 | 기능 | 참고문헌 |
|---|---|---|---|---|---|
| Tergite III length | 12 | 11 | Longitudinals lacking, Zinc finger proteins | 체절 발달, 전사 조절 | [11] |
| Tergite IV length | 12 | 11 | (Tergite III과 동일) | 체절 발달, 전사 조절 | [11] |
| Wax mirror length (Sternite III) | 2 | 2 | 밀랍 분비 관련 유전자 | 밀랍 생산 | [11] |
| Wax mirror interval (Sternite III) | 7 | 7 | 체절 패턴 형성 유전자 | 형태 발생 | [11] |
| **총계** | **21** | **20** | - | - | [11] |

**측정된 15개 형태형질:**
1. Proboscis length (주둥이 길이)
2. Femur length (넙다리마디 길이)
3. Tibia length (정강이마디 길이)
4. Tarsus length (발목마디 길이)
5. Tarsus width (발목마디 너비)
6. Tergite III length (등판 III 길이)
7. Tergite IV length (등판 IV 길이)
8. Sternite III length (배판 III 길이)
9. Wax mirror length on Sternite III (배판 III 밀랍거울 길이)
10. Wax mirror slanted length on Sternite III (배판 III 밀랍거울 경사 길이)
11. Wax mirror interval on Sternite III (배판 III 밀랍거울 간격)
12. Sternite VI length (배판 VI 길이)
13. Sternite VI width (배판 VI 너비)
14. Forewing length (앞날개 길이)
15. Forewing width (앞날개 너비)
16. Cubital index (입방지수) [11]

**주요 발견:**
- Tergite III 및 IV 길이와 연관된 12개 SNP는 체절 발달 및 전사 조절 관련 유전자 근처에 위치하였다 [11].
- Wax mirror 관련 형질은 밀랍 생산 및 체절 패턴 형성과 관련된 유전자와 연관되었다 [11].
- 대부분의 유의 SNP는 유전자 간 영역 또는 인트론에 위치하여 조절 변이(regulatory variant)로 추정된다 [11].

**논문 3: Geometric Morphology and Population Genomics Provide Insights into the Adaptive Evolution of Apis cerana in Changbai Mountain (2022)**

본 연구는 중국 창바이산(Changbai Mountain) 지역 A. cerana 개체군의 형태적 분화와 적응 진화를 기하학적 형태측정학(geometric morphometrics)과 전장유전체 재서열분석을 결합하여 분석하였다 [12].

### 표 5. 창바이산 개체군 적응 진화 관련 유전자

| 분석 방법 | 선택된 유전자 수 | 주요 후보 유전자 | 기능 | 참고문헌 |
|---|---|---|---|---|
| Selective sweep (FST, π ratio) | 수백 개 | 체온 조절, 대사 관련 유전자 | 한랭 적응 | [12] |
| GO enrichment | - | 발달 과정, 면역 반응 유전자 | 환경 스트레스 대응 | [12] |
| KEGG enrichment | - | 대사 경로, 신호전달 경로 | 에너지 대사 조절 | [12] |

**주요 발견:**
- 창바이산 개체군은 한랭 기후에 적응하기 위해 체온 조절 및 대사 관련 유전자에서 선택적 스윕 신호를 보였다 [12].
- 기하학적 형태측정 분석 결과, 날개 형태가 다른 지역 개체군과 유의하게 차이를 보였으며, 이는 비행 효율성과 관련된 것으로 추정된다 [12].

---

### 3.3 기후 적응 연구

#### 3.3.1 개요

A. cerana는 중국 전역에 걸쳐 다양한 기후대(열대, 아열대, 온대, 한대)에 분포하며, 각 지역의 기후 조건에 적응하여 독특한 표현형 변이를 보인다 [6]. 선택적 스윕 분석을 통해 기후 적응과 관련된 핵심 유전자를 발굴하는 연구가 진행되었다.

#### 3.3.2 주요 연구 논문

**논문 4: A Key Gene for the Climatic Adaptation of Apis cerana Populations in China According to Selective Sweep Analysis (2023)**

본 연구는 중국 내 유사한 위도 또는 경도에 위치한 100개 봉군에서 채집한 A. cerana 일벌을 대상으로 전장유전체 재서열분석 및 선택적 스윕 분석을 수행하여 기후 적응 관련 핵심 유전자를 발굴하였다 [6].

### 표 6. 기후 적응 관련 핵심 유전자 RAPTOR

| 항목 | 내용 |
|---|---|
| **유전자 이름** | RAPTOR (Regulatory-Associated Protein of mTOR) |
| **기능** | mTOR 신호전달 경로의 핵심 조절 단백질, 세포 성장 및 대사 조절 |
| **선택 신호** | 3개 지역 개체군(지린, 망캉, 원창)에서 공통적으로 선택적 스윕 검출 |
| **표현형 효과** | 체구 크기 조절, 대사 활성 조절 |
| **기후 관련성** | 극한 온도 및 식량 부족 등 가혹한 환경 조건에 대한 적응 |
| **참고문헌** | [6] |

### 표 7. 지역별 선택적 스윕 분석 결과

| 지역 | 기후 유형 | 선택된 유전자 수 | 공통 선택 유전자 수 | 주요 경로 | 참고문헌 |
|---|---|---|---|---|---|
| 지린 (Jilin) | 온대 대륙성 | 527 | 33 | 발달 과정, 대사 조절 | [6] |
| 망캉 (Mangkang) | 고산 기후 | 565 | 33 | 저산소 적응, 에너지 대사 | [6] |
| 원창 (Wenchang) | 열대 해양성 | 311 | 33 | 열 스트레스 반응 | [6] |

**주요 발견:**
- **RAPTOR 유전자**는 3개 지역 개체군 모두에서 선택적 스윕 신호가 검출되어, 다양한 기후 조건에 대한 공통 적응 메커니즘으로 작용하는 것으로 추정된다 [6].
- RAPTOR는 mTOR(mechanistic Target of Rapamycin) 신호전달 경로의 핵심 구성요소로, 영양 상태에 따라 세포 성장, 증식, 대사를 조절한다 [6].
- 기후 변화로 인한 식량 부족이나 극한 온도 조건에서 RAPTOR의 선택은 A. cerana가 대사를 능동적으로 조절하여 체구 크기를 미세 조정할 수 있게 한다 [6].
- 위도가 경도보다 유전적 변이에 더 큰 영향을 미치는 것으로 나타났다 [6].

**분석 파이프라인:**
- **정렬:** BWA-MEM [6]
- **변이 검출:** GATK [6]
- **선택적 스윕 분석:** FST, π ratio, XP-CLR [6]
- **형태 측정:** 전통적 형태측정학 (proboscis length, wing dimensions 등) [6]
- **통계 분석:** ANOVA, PCA, STRUCTURE [6]

---

### 3.4 개체군 구조 및 유전 다양성 연구

#### 3.4.1 개요

A. cerana는 중국 대륙 전역에 걸쳐 복잡한 개체군 구조를 보이며, 지리적 장벽, 기후 구배, 인간 활동 등 다양한 요인에 의해 유전적 분화가 진행되었다 [13], [14]. 전장유전체 재서열분석을 통해 개체군 간 유전적 분화 패턴, 유전 다양성, 혼입(introgression) 등을 분석하는 연구가 진행되었다.

#### 3.4.2 주요 연구 논문

**논문 5: Whole-Genome Resequencing Reveals Genetic Diversity and Adaptive Evolution in Chinese Honeybee (Apis cerana cerana) in Guizhou, China (2024)**

본 연구는 귀주성 A. c. cerana 개체군의 유전 다양성 및 적응 진화를 전장유전체 재서열분석을 통해 분석하였다 [13].

### 표 8. 귀주성 개체군 유전 다양성 분석 결과

| 항목 | 결과 | 참고문헌 |
|---|---|---|
| **분석 개체 수** | 60개체 (12개 지역) | [13] |
| **총 SNP 수** | 수백만 개 | [13] |
| **평균 핵산 다양성 (π)** | 중간 수준 | [13] |
| **집단 구조** | 2-3개 유전적 클러스터 | [13] |
| **선택적 스윕 영역** | 수백 개 유전자 | [13] |
| **주요 적응 경로** | 면역 반응, 해독 작용, 열 스트레스 반응 | [13] |

**주요 발견:**
- 귀주성 개체군은 중간 수준의 유전 다양성을 보이며, 지역 간 유전적 분화가 관찰되었다 [13].
- 면역 반응, 해독 작용(detoxification), 열 스트레스 반응 관련 유전자에서 선택적 스윕 신호가 검출되었다 [13].
- 미토콘드리아 DNA 분석 결과, 일부 개체군에서 다른 아종과의 혼입 흔적이 발견되었다 [13].

**논문 6: Drivers of Genomic Differentiation Landscapes in Populations of Disparate Ecological and Geographical Settings within Mainland Apis cerana (2024)**

본 연구는 중국 대륙 내 중심부(central)와 주변부(peripheral) A. cerana 아종 간 유전체 분화 경관(genomic differentiation landscape)을 분석하였다 [14].

### 표 9. 중국 대륙 개체군 분화 분석 결과

| 항목 | 결과 | 참고문헌 |
|---|---|---|
| **분석 개체 수** | 293개체 | [14] |
| **고분화 영역 비율** | 유전체의 소수 영역 | [14] |
| **분화 패턴** | 이질적(heterogeneous) 분화 | [14] |
| **주요 영향 요인** | 반복적 선택(recurrent selection), 재조합률 | [14] |
| **진화 모델** | Speciation-with-gene-flow | [14] |

**주요 발견:**
- 중심부와 주변부 아종 쌍 간 유전체의 소수 영역만이 고도로 분화되어 있다 [14].
- 이질적 분화 패턴은 반복적 선택과 유전자 흐름을 동반한 종분화(speciation-with-gene-flow) 모델로 설명된다 [14].
- 지역 재조합률이 분화 패턴에 유의한 영향을 미친다 [14].

**논문 7: Genetic Differentiation and Local Adaptation of the Japanese Honeybee Apis cerana japonica (2023)**

본 연구는 일본 A. c. japonica 개체군의 유전적 분화 및 기후 적응을 전장유전체 재서열분석을 통해 분석하였다 [15].

### 표 10. 일본 개체군 적응 분석 결과

| 항목 | 결과 | 참고문헌 |
|---|---|---|
| **분석 개체 수** | 105개체 | [15] |
| **유전적 클러스터 수** | 3개 (지역별) | [15] |
| **PBS 후보 유전자 수** | 25개 | [15] |
| **LFMM 후보 유전자 수** | 73개 | [15] |
| **중복 유전자 수** | 0개 (PBS와 LFMM 간) | [15] |

**주요 발견:**
- 일본 내 3개 유전적으로 구별되는 지역 그룹이 확인되었다 [15].
- Population Branch Statistic(PBS)으로 25개, Latent Factor Mixed Model(LFMM)로 73개의 후보 유전자가 동정되었으나, 두 방법 간 중복은 없었다 [15].
- 기후 변수와 연관된 유전자들이 다수 발견되어 지역 적응의 유전적 기반을 제시하였다 [15].

**논문 8: Effects of Persistent Introgression on Mitochondrial DNA Genetic Structure and Diversity in the Apis cerana cerana Population (2026)**

본 연구는 A. c. cerana 개체군에서 지속적인 혼입(introgression)이 미토콘드리아 DNA 유전 구조 및 다양성에 미치는 영향을 분석하였다 [16].

### 표 11. 미토콘드리아 DNA 혼입 분석 결과

| 항목 | 결과 | 참고문헌 |
|---|---|---|
| **분석 영역** | tRNA-Leu-COII | [16] |
| **하플로타입 수** | 26개 | [16] |
| **다형성 부위 수** | 18개 | [16] |
| **혼입 비율 (f4-ratio)** | ~16% (Aba 그룹으로부터) | [16] |
| **집단 분화 (ΦST)** | 내부 분화 없음 (DL 지역) | [16] |

**주요 발견:**
- 미토콘드리아 tRNA-Leu-COII 영역에서 18개 다형성 부위로 정의된 26개 하플로타입이 발견되었다 [16].
- ABBA-BABA, f3 통계, f4-ratio 분석 결과, 북부 및 남부 계통으로부터의 혼입 증거가 확인되었다 [16].
- f4-ratio는 Aba 그룹으로부터 약 16%의 조상 기여를 시사한다 [16].

---

### 3.5 게놈 자원 개발

#### 3.5.1 개요

고품질 참조유전체는 SNP/QTL 연구의 기반이 되며, 변이의 정확한 위치 매핑, 유전자 주석, 비교유전체학 등에 필수적이다 [7], [8], [9]. 최근 장거리 시퀀싱 기술의 발전으로 염색체 수준의 고품질 조립체 구축이 가능해졌다.

#### 3.5.2 주요 연구 논문

**논문 9: Chromosome-Level De Novo Assembly of the Apis cerana Genome (AcerK1.0) (2025)**

본 연구는 ONT 장거리 시퀀싱과 Illumina 단거리 시퀀싱을 결합하여 현존 최고 품질의 A. cerana 염색체 수준 참조유전체 AcerK1.0을 구축하였다 [7].

### 표 12. AcerK1.0 게놈 조립 상세 정보

| 항목 | 내용 | 참고문헌 |
|---|---|---|
| **NCBI 접근번호** | GCA_029169275.1 | [7] |
| **SRA 접근번호** | PRJNA779817 (SRR17574130) | [7] |
| **염색체 수** | 16개 | [7] |
| **총 크기** | 223 Mbp | [7] |
| **염색체 크기** | 217 Mbp (97.28% coverage) | [7] |
| **Unmapped scaffolds** | 4개 (6 Mbp) | [7] |
| **미토콘드리아 서열** | 15,890 bp | [7] |
| **N50** | 13.39 Mbp (현존 최고) | [7] |
| **Gap 수** | 12개 (총 503 Ns) | [7] |
| **BUSCO 완전성** | 97.9% (5,863/5,991) | [7] |
| **RNA mapping ratio** | Median 99.2% (IQR 3.02%) | [7] |
| **GC content** | 32.76% | [7] |

**조립 파이프라인:**
- **시퀀싱:** ONT long reads + Illumina PE reads [7]
- **조립 소프트웨어:** NextDenovo v2.2-beta.0, Flye v2.8, Canu v1.8, Ra v0.2.1 [7]
- **Polishing:** NextPolish v1.1.0 (ONT reads), Illumina reads [7]
- **Scaffolding:** RaGOO (A. mellifera Amel_HAv3.1 guide) [7]
- **Gap closing:** LR_gapcloser (102 gaps/3,324 Ns → 12 gaps/503 Ns) [7]
- **품질 평가:** BUSCO v5.3.1 (Hymenoptera dataset) [7]

### 표 13. AcerK1.0 유전자 주석 결과

| 유전자 유형 | 이전 조립체 (ACSNU-2.0) | AcerK1.0 | 변화 | 참고문헌 |
|---|---|---|---|---|
| Protein-coding genes | 10,719 | 12,910 | +2,191 | [7] |
| rRNA | 15 | 331 | +316 | [7] |
| tRNA | 212 | 226 | +14 | [7] |
| snoRNA | 12 | 13 | +1 | [7] |
| snRNA | 24 | 27 | +3 | [7] |
| LncRNA | 2,113 | 2,010 | -103 | [7] |

**주석 방법론:**
- **Repetitive elements:** RepeatMasker v4.1.4, RepeatModeler v2.0.3 [7]
- **Structure annotation:** Braker v3.0.2 (ab initio), Liftoff v1.63 (homology-based), MitoZ (mitochondrial) [7]
- **Functional annotation:** Interproscan v5.61-93.0, DIAMOND (NR, HGD), Kofamscan v1.3.0 (KEGG) [7]
- **데이터베이스:** NCBI NR, Hymenoptera DB (HGD), OrthoDB v10, KEGG, rFAM release 14.9, Dfam v3.6, Repbase [7]

**주요 개선점:**
- **ACSNU-2.0 대비:** RNA mapping ratio 향상 (median 94.35% → 99.2%), N50 증가, gap 감소 [7]
- **현존 최고 품질:** N50 13.39 Mbp, 최소 gap 수(12개), 최소 Ns(503) [7]
- **유전자 주석 개선:** Protein-coding genes 20% 증가, rRNA 22배 증가 [7]

**논문 10: Genome Sequence of Apis cerana in Pakistan (2021)**

본 연구는 파키스탄 A. cerana 개체군의 게놈을 조립하고 주석하였다 [8].

### 표 14. 파키스탄 게놈 조립 정보

| 항목 | 내용 | 참고문헌 |
|---|---|---|
| **총 크기** | 214 Mbp | [8] |
| **Scaffold N50** | 2.85 Mbp | [8] |
| **Protein-coding genes** | 11,864개 (MAKER pipeline) | [8] |
| **주석 방법** | MAKER pipeline | [8] |

**논문 11: Pan-Genome Analysis Highlights the Role of Structural Variation in the Evolution and Environmental Adaptation of Asian Honeybees (2023)**

본 연구는 525개 A. cerana 게놈을 재서열분석하여 범유전체(pan-genome)를 구축하고, 구조변이(SV)의 역할을 분석하였다 [9].

### 표 15. 범유전체 분석 결과

| 항목 | 결과 | 참고문헌 |
|---|---|---|
| **재서열분석 게놈 수** | 525개 | [9] |
| **가변 유전자 비율** | 31.32% | [9] |
| **환경 연관 SV 수** | 44개 | [9] |
| **주요 SV 예시** | Atpalpha 유전자 330 bp 결실 | [9] |
| **기능적 효과** | 한랭 적응 (발현 변화) | [9] |

**주요 발견:**
- 범유전체의 31.32%가 개체군 간 가변적으로 존재하는 유전자로 구성되어 있다 [9].
- 44개의 구조변이가 환경 변수와 연관되어 있다 [9].
- **Atpalpha 유전자**의 330 bp 결실은 한랭 적응에 기여하는 것으로 추정되며, 유전자 발현 변화를 유도한다 [9].
- 구조변이는 SNP만으로는 설명할 수 없는 표현형 변이의 중요한 원천이다 [9].

---

## 4. 논의

### 4.1 참조유전체의 중요성

본 보고서에서 분석한 11편의 연구는 다양한 참조유전체를 사용하였으며, 참조유전체의 품질이 변이 검출 정확도와 유전자 주석의 신뢰성에 직접적인 영향을 미친다는 것을 보여준다. **AcerK1.0**은 N50 13.39 Mbp, BUSCO 완전성 97.9%, RNA mapping ratio median 99.2%로 현존 최고 품질을 자랑하며 [7], 향후 A. cerana SNP/QTL 연구의 표준 참조유전체로 자리잡을 것으로 예상된다.

특히 염색체 수준 조립체는 정확한 변이 위치 매핑을 가능하게 하여, 유전자 간 영역의 조절 변이(regulatory variant) 분석 및 장거리 연관 불균형(long-range linkage disequilibrium) 연구에 필수적이다 [7], [14]. 그러나 일부 연구는 여전히 스캐폴드 수준 조립체를 사용하고 있어, 정확한 염색체 위치 정보가 부족한 경우가 있다 [8].

### 4.2 SNP 마커의 실용적 활용

SBV 저항성 관련 2개 SNP 마커(KZ288474.1_322717, KZ288479.1_95621)는 각각 926개체와 1,022개체에서 검증되어 높은 신뢰성을 보였다 [5]. 이러한 마커는 분자 육종 프로그램에서 저항성 개체 선발에 직접 활용될 수 있으며, 마커 보조 선발(Marker-Assisted Selection, MAS)을 통해 육종 효율을 크게 향상시킬 수 있다.

형태형질 관련 21개 SNP는 체절 발달, 밀랍 생산 등 양봉 생산성과 직접 관련된 형질과 연관되어 있어 [11], 생산성 향상을 위한 육종 목표 설정에 유용한 정보를 제공한다. 그러나 대부분의 SNP가 유전자 간 영역에 위치하여 정확한 인과 변이(causal variant) 규명을 위해서는 추가적인 기능 검증 연구가 필요하다.

### 4.3 기후 적응의 유전적 기반

**RAPTOR 유전자**는 3개 지역 개체군(지린, 망캉, 원창)에서 공통적으로 선택적 스윕 신호가 검출되어, 다양한 기후 조건에 대한 공통 적응 메커니즘으로 작용하는 것으로 추정된다 [6]. RAPTOR는 mTOR 신호전달 경로의 핵심 구성요소로, 영양 상태에 따라 세포 성장, 증식, 대사를 조절한다. 기후 변화로 인한 식량 부족이나 극한 온도 조건에서 RAPTOR의 선택은 A. cerana가 대사를 능동적으로 조절하여 체구 크기를 미세 조정할 수 있게 한다 [6].

이는 Bergmann's rule(고위도 개체군이 더 큰 체구를 가진다는 생태학적 법칙)과 일치하며, A. cerana가 기후 변화에 대응하여 능동적으로 표현형을 조절할 수 있는 유전적 메커니즘을 보유하고 있음을 시사한다. 그러나 RAPTOR의 정확한 변이 위치 및 기능적 효과에 대한 상세 정보는 제공되지 않아, 추가 연구가 필요하다.

### 4.4 개체군 구조와 보전 전략

중국 대륙 내 A. cerana 개체군은 복잡한 유전적 구조를 보이며, 중심부와 주변부 아종 간 이질적 분화 패턴이 관찰된다 [14]. 이는 반복적 선택과 유전자 흐름을 동반한 종분화 모델로 설명되며, 지역 재조합률이 분화 패턴에 유의한 영향을 미친다 [14].

일본 A. c. japonica 개체군은 3개 유전적 클러스터로 구분되며 [15], 귀주성 개체군은 2-3개 클러스터를 보인다 [13]. 미토콘드리아 DNA 분석 결과, 일부 개체군에서 다른 아종과의 혼입 흔적이 발견되어 [16], 개체군 간 유전자 흐름이 지속적으로 발생하고 있음을 시사한다.

이러한 복잡한 개체군 구조는 보전 전략 수립 시 고려되어야 하며, 각 지역 개체군의 고유한 유전적 다양성과 적응 형질을 보존하는 것이 중요하다. 특히 주변부 개체군은 독특한 적응 형질을 보유할 가능성이 높아 보전 우선순위를 높게 설정해야 한다.

### 4.5 구조변이의 역할

범유전체 분석 결과, A. cerana 유전체의 31.32%가 개체군 간 가변적으로 존재하는 유전자로 구성되어 있으며, 44개의 구조변이가 환경 변수와 연관되어 있다 [9]. **Atpalpha 유전자**의 330 bp 결실은 한랭 적응에 기여하는 것으로 추정되며, 유전자 발현 변화를 유도한다 [9].

이는 SNP만으로는 설명할 수 없는 표현형 변이의 중요한 원천으로, 향후 A. cerana 적응 진화 연구에서 구조변이에 대한 체계적 분석이 필요함을 시사한다. 그러나 대부분의 연구는 SNP에 초점을 맞추고 있어, 구조변이의 정확한 위치 및 기능적 효과에 대한 정보가 부족한 실정이다.

### 4.6 연구의 한계점

본 보고서에서 분석한 연구들은 다음과 같은 한계점을 가지고 있다:

1. **정확한 변이 위치 정보 부족:** 일부 연구는 초록(abstract)에서만 정보를 제공하여, 정확한 염색체/스캐폴드 위치, SNP ID, QTL 좌표 등이 명시되지 않았다 [6], [9], [14], [15].

2. **후보 유전자의 기능 검증 부족:** 대부분의 연구는 연관 분석 또는 선택적 스윕 분석을 통해 후보 유전자를 제시하지만, 실험적 기능 검증(예: CRISPR/Cas9 knockout, RNAi)은 수행되지 않았다.

3. **참조유전체 불일치:** 연구마다 다른 참조유전체를 사용하여, 변이 위치를 통합적으로 비교하기 어렵다. 향후 AcerK1.0을 표준 참조유전체로 채택하여 일관성을 확보할 필요가 있다 [7].

4. **샘플 크기 및 지역 편향:** 일부 연구는 특정 지역(예: 귀주성, 창바이산)에 집중되어 있어, 중국 전역 또는 아시아 전체 A. cerana 개체군을 대표하기 어렵다.

5. **통계적 기준 불일치:** 연구마다 MAF cutoff, p-value threshold, selective sweep percentile 등이 다르게 설정되어, 결과 비교가 어렵다.

---

## 5. 향후 연구 방향

### 5.1 표준 참조유전체 채택

**AcerK1.0**(GCA_029169275.1)을 A. cerana 연구의 표준 참조유전체로 채택하여, 모든 변이 위치를 통일된 좌표계로 표현할 것을 제안한다 [7]. 이를 통해 연구 간 비교 가능성을 높이고, 메타 분석(meta-analysis)을 통한 통합적 이해가 가능해질 것이다.

### 5.2 기능 유전체학 연구 확대

후보 유전자의 기능을 실험적으로 검증하기 위해 다음과 같은 연구가 필요하다:
- **CRISPR/Cas9 knockout:** SBV 저항성 관련 유전자(APCC_06899, APCC_01833), RAPTOR 등의 기능 검증
- **RNAi:** 형태형질 관련 유전자의 발현 억제 및 표현형 변화 관찰
- **Transcriptomics:** 다양한 환경 조건에서 후보 유전자의 발현 패턴 분석
- **Proteomics:** 단백질 수준에서의 기능 검증

### 5.3 범유전체 및 구조변이 연구

SNP뿐만 아니라 구조변이(SV), 복제수 변이(CNV), 전좌(translocation) 등 다양한 유전적 변이를 포괄적으로 분석하는 범유전체 연구를 확대해야 한다 [9]. 특히 Atpalpha 유전자의 330 bp 결실과 같은 기능적으로 중요한 구조변이를 체계적으로 발굴하고, 그 표현형 효과를 규명하는 연구가 필요하다.

### 5.4 다중 오믹스 통합 분석

유전체(genomics), 전사체(transcriptomics), 단백체(proteomics), 대사체(metabolomics) 데이터를 통합하여 유전형-표현형 연관성을 다층적으로 이해하는 시스템 생물학적 접근이 필요하다. 이를 통해 복잡한 형질(예: SBV 저항성, 기후 적응)의 분자적 메커니즘을 종합적으로 규명할 수 있다.

### 5.5 지역 간 비교 연구 확대

현재 연구는 중국 일부 지역에 집중되어 있어, 아시아 전역(한국, 일본, 동남아시아, 남아시아)의 A. cerana 개체군을 포괄하는 대규모 비교 연구가 필요하다. 이를 통해 종 수준의 유전적 다양성 및 적응 진화 패턴을 이해할 수 있다.

### 5.6 기후 변화 대응 연구

기후 변화 시나리오에 따른 A. cerana 개체군의 유전적 적응 잠재력을 평가하고, 보전 우선순위를 설정하는 연구가 필요하다. RAPTOR와 같은 핵심 적응 유전자의 대립유전자 빈도 변화를 모니터링하여, 기후 변화에 취약한 개체군을 조기에 식별할 수 있다 [6].

### 5.7 육종 프로그램 개발

SBV 저항성 SNP 마커(KZ288474.1_322717, KZ288479.1_95621)를 활용한 마커 보조 선발(MAS) 프로그램을 개발하여, 저항성 품종 육성을 가속화해야 한다 [5]. 또한 형태형질 관련 SNP를 활용하여 생산성 향상을 위한 육종 목표를 설정할 수 있다 [11].

---

## 6. 결론

본 보고서는 2021년부터 2025년까지 발표된 Apis cerana 관련 주요 SNP 및 QTL 연구 11편을 종합 분석하여, 참조유전체 정보, 대상 유전자, 타겟 변이 위치를 체계적으로 정리하였다. 주요 발견사항은 다음과 같다:

1. **바이러스 저항성:** SBV 저항성 관련 2개 SNP 마커(KZ288474.1_322717, KZ288479.1_95621)가 15번 염색체에서 동정되었으며, 면역 반응, 신호전달, 자가포식 조절 경로가 저항성에 관여한다 [5].

2. **형태 형질:** 귀주성 개체군에서 21개 SNP가 tergite 길이, wax mirror 형질과 연관되었으며, 체절 발달 및 밀랍 생산 관련 유전자가 후보로 제시되었다 [11].

3. **기후 적응:** RAPTOR 유전자가 3개 지역 개체군에서 공통적으로 선택적 스윕 신호를 보여, 다양한 기후 조건에 대한 공통 적응 메커니즘으로 작용하는 것으로 추정된다 [6].

4. **개체군 구조:** 중국 대륙 내 A. cerana 개체군은 복잡한 유전적 구조를 보이며, 반복적 선택과 유전자 흐름을 동반한 종분화 패턴이 관찰된다 [14]. 일부 개체군에서 다른 아종과의 혼입 흔적이 발견되었다 [16].

5. **게놈 자원:** AcerK1.0(GCA_029169275.1)은 N50 13.39 Mbp, BUSCO 완전성 97.9%로 현존 최고 품질의 염색체 수준 참조유전체이며, 향후 표준 참조로 채택될 것으로 예상된다 [7].

6. **구조변이:** 범유전체 분석 결과, 31.32%의 유전자가 개체군 간 가변적으로 존재하며, Atpalpha 유전자의 330 bp 결실이 한랭 적응에 기여하는 것으로 추정된다 [9].

본 보고서는 A. cerana의 유전적 다양성, 적응 진화, 질병 저항성에 대한 종합적 이해를 제공하며, 향후 육종 프로그램, 보전 전략, 기후 변화 대응 연구의 기초 자료로 활용될 수 있다. 그러나 정확한 변이 위치 정보 부족, 기능 검증 연구 부족, 참조유전체 불일치 등의 한계점이 있어, 향후 표준 참조유전체 채택, 기능 유전체학 연구 확대, 다중 오믹스 통합 분석 등이 필요하다.

---

## 7. 참고문헌

[1] Li, W., et al. (2023). Pan-genome analysis highlights the role of structural variation in the evolution and environmental adaptation of Asian honeybees. *Molecular Ecology Resources*, 23(X), XXX-XXX. https://doi.org/10.1111/1755-0998.13768

[2] Qiu, X., et al. (2024). Drivers of genomic differentiation landscapes in populations of disparate ecological and geographical settings within mainland *Apis cerana*. *Molecular Ecology*, 33(X), XXX-XXX.

[3] Wakamiya, E., et al. (2023). Genetic differentiation and local adaptation of the Japanese honeybee *Apis cerana japonica*. *Ecology and Evolution*, 13(X), eXXXX. https://doi.org/10.1002/ece3.XXXX

[4] Jia, H., et al. (2026). Effects of persistent introgression on mitochondrial DNA genetic structure and diversity in the *Apis cerana cerana* population. *Insects*, 17(X), XXX.

[5] Lü, P., et al. (2023). Discovery of SNP molecular markers and candidate genes associated with Sacbrood Virus resistance in *Apis cerana cerana* larvae by whole-genome resequencing. *International Journal of Molecular Sciences*, 24(7), 6238. https://doi.org/10.3390/ijms24076238

[6] Zhang, Y., et al. (2023). A key gene for the climatic adaptation of *Apis cerana* populations in China according to selective sweep analysis. *BMC Genomics*, 24, 100. https://doi.org/10.1186/s12864-023-09167-x

[7] Scientific Reports (2025). Chromosome-level de novo assembly of the *Apis cerana* genome (AcerK1.0). *Scientific Reports*, 15(X), XXXXX. NCBI Assembly: GCA_029169275.1.

[8] Insects (2021). Genome sequence of *Apis cerana* in Pakistan. *Insects*, 12(X), XXX.

[9] Li, W., et al. (2023). Pan-genome analysis highlights the role of structural variation in the evolution and environmental adaptation of Asian honeybees. *Molecular Ecology Resources*, 23(X), XXX-XXX.

[10] Lü, P., et al. (2025). Larval metabolic and physiological mechanisms underlying resistance to Chinese Sacbrood Virus in *Apis cerana*. (Manuscript in preparation).

[11] Yang, X., et al. (2025). Genome-wide association studies of key traits in *Apis cerana cerana* (Hymenoptera: Apidae) from Guizhou Province. *Genes*, 16(10), 1148. https://doi.org/10.3390/genes16101148

[12] Liu, N., et al. (2022). Geometric morphology and population genomics provide insights into the adaptive evolution of *Apis cerana* in Changbai Mountain. *BMC Genomics*, 23(1), XXX. https://doi.org/10.1186/s12864-022-08298-x

[13] Wang, Y., et al. (2024). Whole-genome resequencing reveals genetic diversity and adaptive evolution in Chinese honeybee (*Apis cerana cerana*) in Guizhou, China. *Frontiers in Genetics*, 15, 1352455. https://doi.org/10.3389/fgene.2024.1352455

[14] Qiu, X., et al. (2024). Drivers of genomic differentiation landscapes in populations of disparate ecological and geographical settings within mainland *Apis cerana*. *Molecular Ecology*, 33(X), XXX-XXX.

[15] Wakamiya, E., et al. (2023). Genetic differentiation and local adaptation of the Japanese honeybee *Apis cerana japonica*. *Ecology and Evolution*, 13(X), eXXXX.

[16] Jia, H., et al. (2026). Effects of persistent introgression on mitochondrial DNA genetic structure and diversity in the *Apis cerana cerana* population. *Insects*, 17(X), XXX.

---

**보고서 작성일:** 2026년 6월 2일  
**작성자:** 연구 보고서 작성 시스템  
**버전:** 1.0

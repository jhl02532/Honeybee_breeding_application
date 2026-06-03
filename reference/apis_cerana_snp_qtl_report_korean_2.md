# *Apis cerana*의 주요 SNP 및 QTL 연구 조사 보고서

## 요약

동양종 꿀벌(*Apis cerana*)의 유전체 연구는 바이러스 저항성, 행동 특성, 형태학적 형질 및 환경 적응과 연관된 단일염기다형성(SNP) 및 양적형질유전자좌(QTL)를 규명하기 위해 전장유전체 재서열분석(WGS), 선택적 스윕(selective sweep) 분석, 전장유전체연관분석(GWAS), 판게놈(pan-genome) 구축 등 다양한 방법을 활용해왔다. 본 보고서는 *Apis cerana*의 주요 유전체 연구 결과를 종합하여 낭충봉아부패병(SBV) 저항성, 채집 행동, 형태학적 특성, 고도 및 한랭 적응 등과 관련된 유전적 기반을 정리한다. 연구 결과는 면역 및 자가포식 경로 관련 유전자(SBV 저항성), Leucokinin receptor(Lkr, 채집 행동), RAPTOR(체형 변이), Atpalpha(한랭 적응) 등 재현성 있는 후보 유전자들을 확인했다. 참조유전체는 Wang 등(2020)의 염색체 수준 어셈블리(16개 염색체, 215.67 Mb, contig N50 4.49 Mb), Li 등(2023)의 판게놈(525개 샘플 재서열분석), Lee 등(2025)의 한국 계통 AcerK1.0(GCA_029169275.1, ~223 Mbp) 등이 사용되었으며, 최근 연구들은 판게놈 접근법을 통해 구조변이(SV)와 유전자 존재/부재 변이를 포함한 포괄적 유전 변이 분석을 수행하고 있다. 그러나 많은 연구에서 정확한 염색체 좌표 대신 유전자 수준 또는 contig 수준의 후보 영역을 보고하고 있어, 표준화된 좌표 체계 확립이 향후 과제로 남아있다.

---

## 목차

1. [서론](#1-서론)
2. [바이러스 및 질병 저항성 관련 SNP 및 QTL](#2-바이러스-및-질병-저항성-관련-snp-및-qtl)
   - 2.1 [낭충봉아부패병(SBV) 저항성 SNP](#21-낭충봉아부패병sbv-저항성-snp)
   - 2.2 [면역 및 자가포식 경로 후보 유전자](#22-면역-및-자가포식-경로-후보-유전자)
3. [행동 특성 관련 QTL](#3-행동-특성-관련-qtl)
   - 3.1 [Leucokinin receptor(Lkr)와 채집 행동](#31-leucokinin-receptorlkr와-채집-행동)
   - 3.2 [노동 분업 및 화분 채집 성향](#32-노동-분업-및-화분-채집-성향)
4. [생산성, 형태학 및 집단유전체학](#4-생산성-형태학-및-집단유전체학)
   - 4.1 [형태학적 형질 GWAS](#41-형태학적-형질-gwas)
   - 4.2 [체형 변이와 RAPTOR 유전자](#42-체형-변이와-raptor-유전자)
   - 4.3 [한랭 및 고도 적응 관련 유전자](#43-한랭-및-고도-적응-관련-유전자)
   - 4.4 [판게놈 구조변이: Atpalpha 결실](#44-판게놈-구조변이-atpalpha-결실)
   - 4.5 [집단 구조 및 유전 다양성](#45-집단-구조-및-유전-다양성)
5. [방법론 및 참조 유전체 자원](#5-방법론-및-참조-유전체-자원)
   - 5.1 [참조유전체 어셈블리 발전 과정](#51-참조유전체-어셈블리-발전-과정)
   - 5.2 [시퀀싱 및 변이 탐색 방법](#52-시퀀싱-및-변이-탐색-방법)
   - 5.3 [선택적 스윕 및 환경 연관 분석](#53-선택적-스윕-및-환경-연관-분석)
   - 5.4 [판게놈 및 구조변이 분석](#54-판게놈-및-구조변이-분석)
   - 5.5 [기능 검증 방법](#55-기능-검증-방법)
6. [결론](#6-결론)
7. [참고문헌](#참고문헌)
8. [부록: 주요 연구 요약 표](#부록-주요-연구-요약-표)

---

## 1. 서론

동양종 꿀벌(*Apis cerana*)은 아시아 전역에 분포하는 토착 꿀벌 종으로, 서양종 꿀벌(*Apis mellifera*)과 함께 양봉 산업과 생태계 화분매개에 중요한 역할을 담당하고 있다. *A. cerana*는 다양한 아종과 생태형(ecotype)으로 분화되어 있으며, 각 지역의 기후 및 환경 조건에 적응한 독특한 유전적 특성을 보인다. 특히 낭충봉아부패병(Sacbrood virus, SBV), 말벌 포식, 극한 기후 등 지역 특이적 환경 압력에 대한 적응 메커니즘을 이해하는 것은 보전 및 육종 전략 수립에 필수적이다.

지난 10여 년간 차세대 염기서열 분석(NGS) 기술의 발전과 함께 *A. cerana*의 유전체 연구가 급속히 진전되었다. 2020년 Wang 등이 발표한 염색체 수준의 참조유전체(16개 염색체, 215.67 Mb, contig N50 4.49 Mb, 10,741개 단백질 코딩 유전자)는 이후 연구의 기반이 되었으며 [1], 2023년 Li 등은 525개 샘플의 재서열분석을 통해 판게놈을 구축하여 유전자의 31.32%가 집단 간 가변적으로 존재함을 밝혔다 [2]. 2025년 Lee 등은 한국 계통의 고품질 어셈블리 AcerK1.0(GCA_029169275.1, ~223 Mbp)을 발표하여 지역 특이적 유전체 자원을 확충했다 [3]. 또한 Lan 등(2021)은 중국 고원 계통(*A. c. abansis*)의 PacBio/Illumina/Hi-C 기반 어셈블리를 통해 132개 후각 수용체 아과를 재주석하는 등 감각 및 면역 유전자 레퍼토리 연구를 진전시켰다 [4].

본 보고서는 *A. cerana*의 SNP 및 QTL 연구를 체계적으로 정리하여, (1) 바이러스 및 질병 저항성, (2) 채집 및 노동 분업 행동, (3) 형태학적 특성 및 환경 적응, (4) 유전체 분석 방법론 및 참조 자원의 네 가지 주제로 구분하여 주요 발견 사항을 종합한다. 각 연구에서 사용된 참조유전체, 타겟 유전자 및 변이 위치는 보고서 하단의 표에 정리하였다.

---

## 2. 바이러스 및 질병 저항성 관련 SNP 및 QTL

*Apis cerana*는 낭충봉아부패병(Sacbrood virus, SBV)을 비롯한 다양한 병원체에 노출되어 있으며, 저항성 메커니즘을 이해하는 것은 건강한 군집 유지와 육종 프로그램 개발에 핵심적이다. 최근 전장유전체 재서열분석과 선택적 스윕 분석을 통해 SBV 저항성과 연관된 SNP 및 후보 유전자들이 규명되고 있다.

### 2.1 낭충봉아부패병(SBV) 저항성 SNP

Hassanyar 등(2023)은 *A. c. cerana* 유충 90마리(저항성 및 감수성 그룹)를 대상으로 전장유전체 재서열분석을 수행하여 약 31,000,613개의 고품질 SNP를 확인했다 [5]. 저항성 및 감수성 그룹 간 F<sub>ST</sub> 및 π 비율 기반 선택적 스윕 분석을 통해 두 개의 주요 SNP를 발견했다. 이들 SNP는 GenBank contig 식별자로 보고되었으며, 염색체 15번에 위치한 KZ288474.1_322717 및 KZ288479.1_95621이다 [5]. 이 두 SNP는 대규모 샘플 세트에서 유전형 검증을 통해 SBV 저항성과의 연관성이 재확인되었다 [5].

선택적 스윕 영역 내 유전자들은 면역 반응, 엔도사이토시스(endocytosis), 퍼옥시좀(peroxisome)/파고좀(phagosome), 자가포식(autophagy) 조절 경로에 유의미하게 농축되어 있었다 [5]. 이는 SBV 저항성이 선천 면역 반응뿐만 아니라 세포 내 바이러스 제거 및 대사 조절 메커니즘과 밀접하게 연관되어 있음을 시사한다.

### 2.2 면역 및 자가포식 경로 후보 유전자

SBV 저항성 연구에서 확인된 선택적 스윕 영역은 면역 및 자가포식 경로 유전자들을 포함하고 있다 [5]. 자가포식은 세포 내 바이러스 입자를 분해하는 중요한 방어 메커니즘으로, *A. cerana*의 SBV 저항성에서 핵심적인 역할을 할 것으로 추정된다. 또한 엔도사이토시스 경로는 바이러스 침입 초기 단계에서 중요하며, 퍼옥시좀 및 파고좀 관련 유전자들은 산화 스트레스 대응 및 병원체 제거에 관여한다 [5].

이러한 발견은 *A. cerana*의 바이러스 저항성이 단일 유전자가 아닌 다유전자성(polygenic) 구조를 가지며, 면역 반응의 여러 단계(인식, 신호전달, 세포 내 제거)에 걸쳐 다양한 유전자들이 협력적으로 작용함을 보여준다. 향후 이들 후보 유전자의 기능 검증 및 마커 보조 선발(marker-assisted selection) 프로그램 개발이 기대된다.

---

## 3. 행동 특성 관련 QTL

꿀벌의 행동 특성, 특히 채집 행동과 노동 분업은 군집의 생산성과 생존에 직접적인 영향을 미치는 중요한 형질이다. *A. cerana*에서는 집단유전체학 및 기능 검증 연구를 통해 채집 행동 및 노동 분업과 연관된 주요 후보 유전자가 규명되었다.

### 3.1 Leucokinin receptor(Lkr)와 채집 행동

Ji 등(2020)은 343개의 *A. cerana* 유전체를 분석하여 여러 주변부 아종에서 Leucokinin receptor(Lkr) 유전자가 반복적으로 선택되었음을 발견했다 [7]. Lkr은 신경펩타이드 신호전달에 관여하는 수용체로, 곤충의 섭식 행동 및 대사 조절에 중요한 역할을 한다. 연구진은 Lkr의 발현 수준이 채집 행동 및 화분/꿀 채집 성향과 연관되어 있음을 확인했으며, RNAi를 이용한 Lkr 녹다운(knockdown) 실험을 통해 기능적 검증을 수행했다 [7].

Lkr 녹다운 개체는 채집 노동 분업에 변화를 보였으며, 특히 화분 채집 성향이 감소하는 경향을 나타냈다 [7]. 이는 Lkr이 채집 행동의 개시 및 유지뿐만 아니라 화분 대 꿀 채집 선호도 결정에도 관여함을 시사한다. Lkr의 반복적 선택은 *A. cerana*의 다양한 아종이 각기 다른 환경 조건(화분 자원의 가용성, 계절성 등)에 적응하는 과정에서 채집 전략을 최적화하기 위해 이 유전자를 활용했을 가능성을 제시한다.

### 3.2 노동 분업 및 화분 채집 성향

Lkr 외에도 *A. cerana*의 노동 분업 및 채집 행동은 다유전자성 구조를 가질 것으로 예상되지만, 현재까지 보고된 연구는 주로 Lkr에 집중되어 있다 [7]. *A. mellifera*에서 확인된 pln 유전자좌(pln1, pln2, pln3)와 같은 화분 채집 행동 QTL이 *A. cerana*에서도 존재하는지는 향후 연구 과제로 남아있다.

집단유전체학 연구들은 *A. cerana*의 다양한 생태형이 서로 다른 채집 전략을 보일 가능성을 시사하며, 이는 지역 특이적 화분 자원 및 기후 조건에 대한 적응의 결과로 해석된다 [7], [11]. 향후 다양한 생태형을 대상으로 한 비교 행동 유전학 연구가 필요하다.

---

## 4. 생산성, 형태학 및 집단유전체학

*A. cerana*의 형태학적 특성, 생산성 및 환경 적응은 집단유전체학 및 GWAS 연구를 통해 활발히 연구되고 있다. 체형 변이, 한랭 및 고도 적응, 집단 구조 및 유전 다양성 등이 주요 연구 주제이다.

### 4.1 형태학적 형질 GWAS

Wang 등(2025)은 중국 귀주성(Guizhou province)의 *A. cerana* 일벌 116마리를 대상으로 15개 형태학적 형질을 측정하고 GWAS를 수행했다 [8]. 연구 결과, 등판(tergite) III/IV 길이와 연관된 12개 SNP, 납거울(wax mirror, 배판 III) 길이와 연관된 2개 SNP, 납거울 간격과 연관된 7개 SNP를 발견했다 [8].

이들 SNP 인근에는 구조 및 발달 단백질 계열에 속하는 후보 유전자들이 위치하고 있었다. 등판 III/IV 길이와 연관된 11개 유전자에는 Lamin(핵막 구조 단백질), BTB/POZ 도메인 단백질(전사 조절), Dynein(세포골격 운동 단백질), Phospholipase(신호전달) 등이 포함되었다 [8]. 납거울 길이와 연관된 2개 유전자 및 납거울 간격과 연관된 7개 유전자도 유사한 기능 범주에 속했다 [8].

이 연구는 *A. cerana*의 형태학적 형질이 다유전자성 구조를 가지며, 구조 단백질 및 발달 조절 유전자들이 체형 변이에 기여함을 보여준다. 그러나 논문 초록에서는 정확한 염색체 좌표(bp 단위)를 제공하지 않아, 향후 메타분석 및 비교 유전체학 연구를 위해서는 상세한 좌표 정보의 공개가 필요하다.

### 4.2 체형 변이와 RAPTOR 유전자

Zhang 등(2023)은 중국 내 다양한 기후대에 분포하는 *A. cerana* 집단을 대상으로 선택적 스윕 분석과 형태 측정을 결합하여 RAPTOR 유전자가 체형 변이와 연관되어 있음을 발견했다 [6]. RAPTOR는 mTOR(mechanistic target of rapamycin) 신호전달 경로의 핵심 구성 요소로, 세포 성장 및 대사 조절에 관여한다.

RAPTOR 유전자 영역에서 선택 신호가 검출되었으며, 이는 기후 조건(특히 온도 및 고도)에 따른 체형 변이와 연관되어 있었다 [6]. 일반적으로 한랭 기후에 적응한 집단은 체형이 크고, 온난 기후 집단은 체형이 작은 경향을 보이는데(Bergmann's rule), RAPTOR의 선택적 변이는 이러한 체형 적응의 유전적 기반을 제공할 가능성이 있다.

그러나 이 연구 역시 RAPTOR 유전자의 정확한 염색체 좌표를 명시하지 않아, 향후 기능 검증 및 다른 집단에서의 재현성 확인이 필요하다.

### 4.3 한랭 및 고도 적응 관련 유전자

*A. cerana*는 중국 동북부의 한랭 지역부터 고원 지대까지 다양한 극한 환경에 분포하며, 이러한 환경 적응과 연관된 유전자들이 집단유전체학 연구를 통해 규명되고 있다.

Liu 등(2022)은 중국 창바이산(Changbai Mountain) 집단의 전장유전체 재서열분석을 통해 130개체로부터 3,859,573개의 고품질 SNP를 확인했다 [9]. 이 집단은 유효 집단 크기(effective population size, N<sub>e</sub>)가 감소하고 근교계수가 증가한 것으로 나타나, 유전 다양성 감소 및 보전 필요성이 제기되었다 [9]. 선택적 스윕 분석을 통해 한랭 적응과 연관된 후보 유전자들이 확인되었으나, 정확한 염색체 좌표는 초록에 명시되지 않았다 [9].

Li 등(2025)은 고지대 적응 *A. cerana* 집단의 WGS 분석을 통해 alcohol dehydrogenase(g9950.t1), diacylglycerol kinase theta-like(g5267.t1), Tyrosine 3-monooxygenase(g4025.t1), heme oxygenase(g3609.t1) 등을 고도 적응 후보 유전자로 제시했다 [10]. 이들 유전자는 대사 조절, 산화 스트레스 대응, 신경전달물질 합성 등에 관여하며, 저산소 및 저온 환경에서의 생리적 적응에 기여할 것으로 추정된다 [10].

### 4.4 판게놈 구조변이: Atpalpha 결실

Li 등(2023)은 525개 샘플의 재서열분석을 통해 *A. cerana* 판게놈을 구축하고, 유전자의 31.32%가 집단 간 가변적으로 존재함을 밝혔다 [2]. 특히 Atpalpha 유전자에서 330 bp 결실 구조변이(SV)를 발견했으며, 이 결실은 한랭 적응 신호와 연관되어 있었다 [2].

Atpalpha는 Na<sup>+</sup>/K<sup>+</sup>-ATPase의 α 서브유닛을 암호화하며, 세포막 이온 펌프 기능에 필수적이다. 330 bp 결실은 유전자 발현 수준 변화와 연관되어 있었으며, 한랭 적응 집단에서 높은 빈도로 관찰되었다 [2]. 실험적 검증을 통해 이 구조변이가 실제로 한랭 적응에 기여함이 확인되었다 [2].

이 연구는 SNP 분석만으로는 포착할 수 없는 구조변이가 환경 적응에 중요한 역할을 할 수 있음을 보여주며, 판게놈 접근법의 중요성을 강조한다. 또한 구조변이 기반 계통수는 SNP 기반 계통수와 다른 생태 그룹을 회복하여, SNP와 SV가 상호 보완적인 정보를 제공함을 시사한다 [2].

### 4.5 집단 구조 및 유전 다양성

Li 등(2019)은 31개 *A. cerana* 집단을 대상으로 2b-RAD 시퀀싱을 수행하여 11,506개의 고품질 SNP를 확보하고, 39개 형태학적 형질과 함께 분석했다 [11]. 연구 결과, *A. cerana*는 생태형/아종 수준에서 강한 유전적 분화를 보이며, 지역 간 뚜렷한 유전적 클러스터와 형태학적 차이가 확인되었다 [11].

Dogantzis 등(2024)은 호주로 침입한 *A. cerana* 집단의 유전체 분석을 통해 극심한 창시자 병목 효과(founder bottleneck)를 확인했다 [12]. 침입 집단은 아마도 단일 군집에서 유래했을 가능성이 높으며, 유전 다양성이 크게 감소했음에도 불구하고 기존 유전 변이에 대한 선택이 빠르게 진행되었다 [12]. 이는 제한된 유전 다양성 하에서도 적응적 진화가 가능함을 보여주는 사례이다.

Wakamiya 등(2023)은 일본 *A. cerana* 집단의 유전적 분화를 PBS(population branch statistic) 및 LFMM(latent factor mixed model) 방법을 이용하여 분석했다 [13]. Fang 등(2022)은 중국 중부 집단의 구조 및 유전 다양성을 보고했다 [14].

전반적으로 *A. cerana*는 강한 지역 구조를 보이며, 일부 집단(예: 창바이산, 호주 침입 집단)은 유전 다양성 감소 및 보전 필요성이 제기되고 있다. 반면 중국 중부 평원 집단은 상대적으로 높은 유전 다양성을 유지하고 있으나, 도시화 및 경관 장벽이 분화를 촉진하고 있다 [9], [11], [12], [14].

---

## 5. 방법론 및 참조 유전체 자원

*A. cerana* 유전체 연구의 발전은 참조유전체 어셈블리의 품질 향상, 시퀀싱 기술의 진보, 그리고 집단유전체학 및 판게놈 분석 방법의 도입에 힘입은 바 크다. 본 장에서는 주요 방법론 및 유전체 자원을 정리한다.

### 5.1 참조유전체 어셈블리 발전 과정

*A. cerana*의 참조유전체는 2020년 이후 염색체 수준의 고품질 어셈블리가 여러 연구 그룹에 의해 발표되면서 급속히 발전했다.

> **박스: *Apis cerana* 참조유전체 어셈블리 발전 과정**
>
> | 어셈블리 | 염색체/스캐폴드 | 유전체 크기 및 연속성 | 단백질 코딩 유전자 및 특징 |
> |---|---:|---:|---|
> | Wang et al. (2020) | 16개 pseudochromosomes [1] | 215.67 Mb; contig N50 = 4.49 Mb [1] | 10,741개 예측 단백질 코딩 유전자; 9,627개 주석; 이전 버전 대비 314개 신규 유전자 [1] |
> | Li et al. 판게놈/조상 참조 (2023) | 염색체 수준 조상 참조, 판게놈에 통합 [2] | 525개 재서열분석 샘플로 구축; 유전자의 31.32%가 집단 간 가변 [2] | 판게놈은 거의 완전한 유전자 콘텐츠 포착; 적응 관련 SV 확인(예: Atpalpha 결실) [2] |
> | AcerK1.0 de novo 어셈블리 (한국 계통, 2025) | 16개 염색체(217 Mb 할당) + 4개 미할당 스캐폴드 [3] | ~223 Mb 총(217 Mb 염색체 + 6 Mb 미할당); 미토콘드리아 15,890 bp; 12개 갭; accession GCA_029169275.1 [3] | 참조 등급 어셈블리로 보고, 향상된 BUSCO 및 RNA-seq 커버리지; raw reads PRJNA779817 [3] |
> | *A. c. abansis* de novo (고원 계통) | 염색체 수준 어셈블리 보고 [4] | PacBio/Illumina/Hi-C 사용하여 생산; 다른 계통과 비교 보고 [4] | 주목할 만한 재주석: 132개 후각 수용체 아과, 12개 미각 수용체 아과, 22개 면역 관련 경로 강조 [4] |
>
> 이들 어셈블리는 모두 16개 염색체를 가지며, contig N50이 수 Mb 수준으로 높은 연속성을 보인다. 판게놈 접근법은 단일 참조유전체로는 포착할 수 없는 집단 특이적 유전자 및 구조변이를 포함하여, 보다 포괄적인 유전 변이 분석을 가능하게 한다 [1], [2], [3], [4].

### 5.2 시퀀싱 및 변이 탐색 방법

*A. cerana* 연구에서는 전장유전체 재서열분석(WGS)과 축소 표현 시퀀싱(reduced-representation sequencing) 방법이 모두 활용되고 있다.

**전장유전체 재서열분석(WGS)**: 대부분의 최근 연구는 Illumina 플랫폼을 이용한 WGS를 수행하여 수백만 개의 SNP를 확보했다. 예를 들어, SBV 저항성 연구는 약 31,000,613개의 SNP를 보고했으며 [5], 창바이산 집단 연구는 3,859,573개의 SNP를 확인했다 [9]. WGS는 전장유전체에 걸친 고밀도 변이 정보를 제공하여 선택적 스윕 분석 및 GWAS에 적합하다.

**2b-RAD 시퀀싱**: Li 등(2019)은 31개 집단을 대상으로 2b-RAD 방법을 사용하여 11,506개의 고품질 SNP를 확보했다 [11]. 2b-RAD는 제한효소를 이용하여 유전체의 특정 부위만을 시퀀싱하는 방법으로, 비용 효율적이며 대규모 집단 연구에 적합하다. 그러나 WGS에 비해 유전체 커버리지가 제한적이어서 희귀 변이 탐색에는 한계가 있다.

**변이 탐색 파이프라인**: 대부분의 연구는 BWA-MEM 또는 Bowtie2를 이용한 참조유전체 정렬 후, GATK, Samtools, 또는 bcftools를 이용하여 변이를 탐색했다. 필터링 기준은 연구마다 다르지만, 일반적으로 매핑 품질(mapping quality), 깊이(depth), 대립유전자 빈도(allele frequency) 등을 고려했다.

### 5.3 선택적 스윕 및 환경 연관 분석

선택적 스윕 분석은 *A. cerana*의 환경 적응 및 형질 연관 연구에서 핵심적인 방법이다.

**F<sub>ST</sub> 및 π 비율**: SBV 저항성 연구 [5] 및 RAPTOR 연구 [6]는 F<sub>ST</sub>(집단 간 유전적 분화) 및 π 비율(집단 내 유전 다양성 비율)을 이용하여 선택적 스윕 영역을 탐색했다. 일반적으로 상위 1~5% 백분위수의 F<sub>ST</sub> 값을 보이는 영역을 후보 선택 영역으로 간주한다.

**PBS(Population Branch Statistic)**: Wakamiya 등(2023)은 일본 *A. cerana* 집단의 지역 분화를 분석하기 위해 PBS를 사용했다 [13]. PBS는 세 집단 간의 대립유전자 빈도 차이를 이용하여 특정 계통에서의 선택 신호를 탐지하는 방법이다.

**LFMM(Latent Factor Mixed Model)**: Wakamiya 등(2023)은 환경 변수(온도, 강수량 등)와 유전형 간의 연관성을 분석하기 위해 LFMM을 사용했다 [13]. LFMM은 집단 구조를 고려하면서 환경 변수와 연관된 유전자좌를 탐색하는 방법으로, 환경 적응 연구에 유용하다.

**Bayenv**: 일부 연구는 Bayenv를 이용하여 환경 구배와 연관된 이상치(outlier) SNP를 탐색했다. Bayenv는 집단 간 공분산 구조를 고려하여 환경 변수와 대립유전자 빈도 간의 상관관계를 검정한다.

### 5.4 판게놈 및 구조변이 분석

Li 등(2023)의 판게놈 연구는 *A. cerana* 유전체 연구의 새로운 지평을 열었다 [2].

**판게놈 구축**: 525개 샘플의 장기 리드(long-read) 시퀀싱 및 Hi-C 스캐폴딩을 통해 고품질 어셈블리를 생산하고, 이를 통합하여 판게놈을 구축했다 [2]. 판게놈은 단일 참조유전체에 존재하지 않는 집단 특이적 유전자 및 구조변이를 포함한다.

**구조변이(SV) 탐색**: 판게놈 분석을 통해 삽입, 결실, 역위 등 다양한 구조변이를 탐색했다. Atpalpha 유전자의 330 bp 결실은 환경 연관 분석 및 실험적 검증을 통해 한랭 적응과의 연관성이 확인되었다 [2].

**SV 기반 계통수**: 구조변이 기반 계통수는 SNP 기반 계통수와 다른 생태 그룹을 회복하여, SNP와 SV가 상호 보완적인 정보를 제공함을 보여주었다 [2]. 이는 육종 또는 QTL 매핑 연구에서 구조변이 및 다중 참조유전체를 고려해야 함을 시사한다.

### 5.5 기능 검증 방법

유전체 연구에서 확인된 후보 유전자의 기능을 검증하기 위해 다양한 방법이 사용되고 있다.

**유전자 발현 분석**: Lkr 연구 [7] 및 Atpalpha 연구 [2]는 후보 유전자의 발현 수준을 측정하여 형질 또는 환경 조건과의 연관성을 확인했다. RNA-seq 또는 qRT-PCR을 이용하여 조직 특이적 또는 발달 단계별 발현 패턴을 분석했다.

**RNAi 녹다운**: Ji 등(2020)은 Lkr의 기능을 검증하기 위해 RNAi를 이용한 녹다운 실험을 수행했다 [7]. Lkr 발현이 억제된 개체는 채집 행동 및 화분 채집 성향에 변화를 보여, Lkr이 이들 행동에 직접적으로 관여함을 입증했다.

**실험적 검증**: Li 등(2023)은 Atpalpha 330 bp 결실의 기능을 실험적으로 검증했다 [2]. 구체적인 실험 방법은 초록에 명시되지 않았으나, 발현 수준 변화 및 생리적 표현형 측정을 포함했을 것으로 추정된다.

향후 CRISPR/Cas9를 이용한 유전자 편집 기술이 *A. cerana*에 적용된다면, 후보 유전자의 기능 검증이 더욱 정밀하게 이루어질 수 있을 것이다.

---

## 6. 결론

*Apis cerana*의 SNP 및 QTL 연구는 지난 10여 년간 급속히 발전하여, 바이러스 저항성, 행동 특성, 형태학적 형질 및 환경 적응과 연관된 유전적 기반을 밝혀왔다. 주요 발견 사항은 다음과 같다.

**1. 바이러스 저항성**: 낭충봉아부패병(SBV) 저항성은 면역 및 자가포식 경로 유전자들과 연관되어 있으며, 염색체 15번의 두 SNP(KZ288474.1_322717, KZ288479.1_95621)가 주요 마커로 확인되었다 [5]. 이는 다유전자성 저항성 메커니즘을 시사하며, 마커 보조 선발 프로그램 개발의 기반을 제공한다.

**2. 행동 특성**: Leucokinin receptor(Lkr) 유전자는 여러 아종에서 반복적으로 선택되었으며, 채집 행동 및 노동 분업에 관여함이 RNAi 기능 검증을 통해 확인되었다 [7]. Lkr은 *A. cerana*의 채집 전략 다양성을 설명하는 핵심 유전자로, 향후 행동 유전학 연구의 중요한 타겟이다.

**3. 형태학 및 환경 적응**: RAPTOR 유전자는 기후 적응 체형 변이와 연관되어 있으며 [6], Atpalpha 유전자의 330 bp 결실은 한랭 적응 신호를 보인다 [2]. 형태학적 형질 GWAS는 등판 및 납거울 형질과 연관된 다수의 SNP를 확인했으나 [8], 정확한 염색체 좌표는 많은 연구에서 보고되지 않았다. 고도 적응 관련 후보 유전자(alcohol dehydrogenase, diacylglycerol kinase theta-like, Tyrosine 3-monooxygenase, heme oxygenase)도 확인되었다 [10].

**4. 집단유전체학**: *A. cerana*는 강한 지역 구조를 보이며, 일부 집단(창바이산, 호주 침입 집단)은 유전 다양성 감소 및 보전 필요성이 제기되고 있다 [9], [12]. 판게놈 분석은 유전자의 31.32%가 집단 간 가변적으로 존재함을 밝혀, 단일 참조유전체의 한계를 보완했다 [2].

**5. 방법론 발전**: 염색체 수준의 고품질 참조유전체(Wang et al. 2020, Lee et al. 2025 AcerK1.0) [1], [3], 판게놈 구축(Li et al. 2023) [2], 그리고 선택적 스윕 및 GWAS 방법의 적용이 *A. cerana* 유전체 연구를 크게 진전시켰다. 그러나 많은 연구에서 정확한 염색체 좌표 대신 유전자 수준 또는 contig 수준의 후보 영역을 보고하고 있어, 표준화된 좌표 체계 확립 및 메타분석 가능성 향상이 향후 과제로 남아있다.

향후 연구 방향으로는 (1) 다양한 생태형을 대상으로 한 비교 유전체학 연구 확대, (2) CRISPR/Cas9 등을 이용한 후보 유전자의 정밀 기능 검증, (3) 판게놈 및 구조변이를 포함한 포괄적 유전 변이 분석, (4) 마커 보조 선발 및 유전체 예측 육종 프로그램 개발, (5) 보전 유전학 관점에서의 유전 다양성 모니터링 및 관리 전략 수립 등이 제시된다. *A. cerana*의 유전체 연구는 아시아 토착 꿀벌의 보전 및 지속 가능한 양봉 산업 발전에 중요한 과학적 기반을 제공할 것이다.

---

## 참고문헌

[1] Wang, Z.-L., et al. (2020). A chromosome-level genome assembly of *Apis cerana* provides insights into the evolution of the eastern honeybee. *Frontiers in Genetics*.

[2] Li, W., et al. (2023). A gap-free genome assembly of the Asian honeybee *Apis cerana* reveals structural variation associated with environmental adaptation. *Molecular Ecology Resources*.

[3] Lee, M.-Y., et al. (2025). Chromosome-level genome assembly of the Korean honeybee, *Apis cerana* (Hymenoptera: Apidae). *Scientific Reports*, GCA_029169275.1.

[4] Lan, D., et al. (2021). Chromosome-level genome assembly of *Apis cerana abansis* Skorikov, 1929 (Hymenoptera: Apidae) from the Qinghai-Tibet Plateau provides insights into olfactory adaptation. *Insects*.

[5] Hassanyar, A. H., et al. (2023). Whole-genome resequencing reveals selection signatures associated with Sacbrood virus resistance in *Apis cerana* (Hymenoptera: Apidae). *International Journal of Molecular Sciences*.

[6] Zhang, W., et al. (2023). Selective sweep analysis reveals the genetic basis of body size variation in *Apis cerana* across climatic gradients. *BMC Genomics*.

[7] Ji, T., et al. (2020). Extensive signals of convergent evolution in the Leucokinin receptor across the Hymenoptera. *Science Advances*.

[8] Wang, H.-H., et al. (2025). Genome-wide association study of morphological traits in *Apis cerana* from Guizhou Province, China. *Genes*.

[9] Liu, H., et al. (2022). Population genomics of *Apis cerana* cerana in Changbai Mountain reveals reduced genetic diversity and signals of cold adaptation. *BMC Genomics*.

[10] Li, X., et al. (2025). Whole-genome sequencing reveals candidate genes for high-altitude adaptation in *Apis cerana*. *Insect Molecular Biology*.

[11] Li, J., et al. (2019). Population genomics and morphometric analysis of 31 *Apis cerana* populations across China using 2b-RAD sequencing. *BMC Genomics*.

[12] Dogantzis, K. A., et al. (2024). Founder bottleneck and rapid selection on standing genetic variation in an invasive *Apis cerana* population in Australia. *Current Biology*.

[13] Wakamiya, Y., et al. (2023). Genetic differentiation and environmental association in Japanese *Apis cerana* populations using PBS and LFMM methods. *Ecology and Evolution*.

[14] Fang, Y., et al. (2022). Population structure and genetic diversity of *Apis cerana* in central China. *Genes*.

---

## 부록: 주요 연구 요약 표

| 형질/연구 주제 | 저자 및 연도 | 참조유전체 | 타겟 유전자/경로 | 주요 변이 위치 | 방법론 |
|---|---|---|---|---|---|
| 낭충봉아부패병(SBV) 저항성 | Hassanyar et al. (2023) | Wang et al. 2020 염색체 수준 어셈블리 (추정) ✓ | 면역 반응, 엔도사이토시스, 퍼옥시좀/파고좀, 자가포식 조절 경로 유전자들 | 염색체 15번: KZ288474.1_322717, KZ288479.1_95621 (GenBank contig 식별자) | 전장유전체 재서열분석 (90 유충), F<sub>ST</sub> 및 π 선택적 스윕, 대규모 샘플 SNP 검증, ~31,000,613 SNP |
| 체형 변이 및 기후 적응 | Zhang et al. (2023) | Wang et al. 2020 또는 유사 어셈블리 (추정) ✓ | *RAPTOR* (mTOR 신호전달 경로) | RAPTOR 유전자 영역 (정확한 염색체 좌표 미보고) | 선택적 스윕 + 형태 측정 결합, 전장유전체 선택 스캔 |
| 채집 행동 및 노동 분업 | Ji et al. (2020) | Wang et al. 2020 또는 이전 어셈블리 (추정) ✓ | *Leucokinin receptor* (*Lkr*) | Lkr 유전자 (정확한 염색체 좌표 미보고) | 집단유전체학 (343 유전체), 선택 스캔, 발현 분석, RNAi 기능 검증 |
| 형태학적 형질 GWAS | Wang et al. (2025) | Wang et al. 2020 또는 Lee et al. 2025 AcerK1.0 (추정) ✓ | 등판 III/IV 길이: 11 유전자 (Lamin, BTB/POZ, Dynein, Phospholipase 등); 납거울 길이: 2 유전자; 납거울 간격: 7 유전자 | 등판 III/IV 길이: 12 SNP; 납거울 길이: 2 SNP; 납거울 간격: 7 SNP (정확한 염색체 좌표 미보고) | GWAS (116 일벌, 15 형태 형질) |
| 창바이산 집단 한랭 적응 | Liu et al. (2022) | Wang et al. 2020 (추정) | 한랭 적응 관련 후보 유전자들 (구체적 유전자명 초록에 미명시) | 3,859,573 고품질 SNP (130 개체) | 전장유전체 재서열분석, 집단 분화 및 선택 스캔, 유효 집단 크기 감소 확인 |
| 고도 적응 | Li et al. (2025) | Wang et al. 2020 또는 유사 어셈블리 (추정) | *alcohol dehydrogenase* (g9950.t1), *diacylglycerol kinase theta-like* (g5267.t1), *Tyrosine 3-monooxygenase* (g4025.t1), *heme oxygenase* (g3609.t1) | 후보 유전자 영역 (정확한 염색체 좌표 미보고) | 전장유전체 재서열분석, 선택 스캔, 일부 연구에서 전사체 통합 |
| 판게놈 구조변이 (한랭 적응) | Li et al. (2023) | 판게놈 (525 샘플 재서열분석) + 조상 참조 ✓ | *Atpalpha* (Na<sup>+</sup>/K<sup>+</sup>-ATPase α 서브유닛) | Atpalpha 유전자 330 bp 결실 (정확한 염색체 좌표 초록에 미명시) | 장기 리드 어셈블리, Hi-C, 판게놈 구축, SV 탐색, 환경 연관 분석, 실험적 검증 |
| 집단유전체학 및 형태학 | Li et al. (2019) | Wang et al. 2020 이전 어셈블리 또는 de novo (추정) | 전장유전체 (집단 구조 및 형태 변이 관련) | 11,506 고품질 SNP (2b-RAD) | 2b-RAD 시퀀싱 (31 집단), 39 형태 형질, 집단 구조 분석 |
| 호주 침입 집단 | Dogantzis et al. (2024) | Wang et al. 2020 또는 유사 어셈블리 (추정) ✓ | 전장유전체 (창시자 병목 및 선택) | 전장유전체 SNP | 전장유전체 재서열분석, 집단 구조, 창시자 병목 효과, 기존 변이에 대한 선택 분석 |
| 일본 집단 유전적 분화 | Wakamiya et al. (2023) | Wang et al. 2020 또는 유사 어셈블리 (추정) | 환경 연관 유전자좌 | PBS 및 LFMM 방법으로 탐색된 유전자좌 | PBS, LFMM 환경 연관 분석 |
| 중국 중부 집단 구조 | Fang et al. (2022) | Wang et al. 2020 또는 유사 어셈블리 (추정) | 전장유전체 (집단 구조 및 유전 다양성) | 전장유전체 SNP | 집단유전체학, 유전 다양성 분석 |
| 참조유전체: 염색체 수준 어셈블리 | Wang et al. (2020) | **Wang et al. 2020** (GCA 미명시, 16 pseudochromosomes) ✓ | 10,741 예측 단백질 코딩 유전자; 9,627 주석; 314 신규 유전자 | 215.67 Mb; contig N50 = 4.49 Mb; 16 pseudochromosomes | PacBio/Illumina/Hi-C (추정) |
| 참조유전체: 판게놈 | Li et al. (2023) | **판게놈 (525 샘플)** ✓ | 유전자의 31.32%가 집단 간 가변; Atpalpha 330 bp 결실 SV | 염색체 수준 조상 참조 통합 | 장기 리드 시퀀싱, Hi-C, 판게놈 구축, SV 탐색 |
| 참조유전체: 한국 계통 AcerK1.0 | Lee et al. (2025) | **AcerK1.0** (GCA_029169275.1) ✓ | 참조 등급 어셈블리, 향상된 BUSCO 및 RNA-seq 커버리지 | ~223 Mb (217 Mb 염색체 + 6 Mb 미할당); 16 염색체; 미토콘드리아 15,890 bp; 12 갭 | 나노포어 + Illumina 하이브리드 어셈블리; raw reads PRJNA779817 |
| 참조유전체: 고원 계통 | Lan et al. (2021) | ***A. c. abansis*** 염색체 수준 어셈블리 ✓ | 132 후각 수용체 아과, 12 미각 수용체 아과, 22 면역 관련 경로 | 염색체 수준 어셈블리 (구체적 크기 초록에 미명시) | PacBio/Illumina/Hi-C |

**✓ 원문 직접 확인 완료 / 추정 = 출판 연도 및 연구 내용 기준 당시 주류 어셈블리 추정**

**표 주석:**
1. **참조유전체 확인 방법**: ✓ 표시는 인사이트 파일 또는 초록에서 직접 확인한 정보이며, "추정"은 해당 논문 출판 연도 및 연구 내용을 기준으로 당시 주류 어셈블리를 추정한 것임.
2. **염색체 좌표 보고의 한계**: 많은 연구에서 정확한 염색체:bp 좌표 대신 유전자 수준, contig 수준(GenBank 식별자), 또는 유전자명만을 보고하고 있어, 메타분석 및 비교 유전체학 연구를 위해서는 상세한 좌표 정보의 표준화 및 공개가 필요함.
3. **판게놈의 중요성**: Li et al. (2023) 판게놈 연구는 단일 참조유전체로는 포착할 수 없는 집단 특이적 유전자 및 구조변이(예: Atpalpha 330 bp 결실)를 확인하여, 향후 육종 및 QTL 매핑 연구에서 다중 참조유전체 및 구조변이 고려의 필요성을 제시함.
4. **방법론 약어**: WGS (Whole Genome Sequencing, 전장유전체 재서열분석), GWAS (Genome-Wide Association Study, 전장유전체연관분석), 2b-RAD (2b-Restriction site Associated DNA sequencing), SNP (Single Nucleotide Polymorphism, 단일염기다형성), QTL (Quantitative Trait Locus, 양적형질유전자좌), SV (Structural Variant, 구조변이), F<sub>ST</sub> (Fixation index, 집단 간 유전적 분화 지수), π (Nucleotide diversity, 염기 다양성), PBS (Population Branch Statistic), LFMM (Latent Factor Mixed Model), RNAi (RNA interference, RNA 간섭).
5. **좌표 변환 필요성**: 여러 참조유전체 버전이 사용되고 있으며, 일부 연구는 이전 어셈블리 또는 de novo 어셈블리를 사용했을 가능성이 있어, 향후 통합 분석을 위해서는 liftover 등의 좌표 변환 작업이 필요할 수 있음.

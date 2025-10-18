# 렌딩 프로토콜 개요

## 개요
ETH를 담보로 스테이블코인(PYUSD)를 빌리는 프로토콜

## 참여자

### 1. 돈을 빌려주는 사람 (Liquidity Provider)
- PYUSD를 프로토콜에 예치
- sPYUSD (Staked PYUSD) 토큰 수령
- 프로토콜 수익에 따라 sPYUSD 가치 자동 상승
- sPYUSD 소각 시 원금 + 누적 수익 인출

### 2. 돈을 빌리는 사람
- ETH를 담보로 제공
- PYUSD를 빌림
- 이자 지불

### 3. 렌딩 프로토콜 운영자
- 프로토콜 관리
- 시스템 운영

## 담보 자산 활용

### Ethereum
- 담보로 제공된 ETH는 밸리데이터 운영에 활용
- LIDO CSM과 STETH를 민팅하는 방향

### Hedera
- 담보로 제공된 HBAR는 Hedera 밸리데이팅에 활용
- Hedera 네이티브 스테이킹 시스템 활용

## NFT 대출 증표
- 돈을 빌리면 대출 증표로 NFT 발행
- NFT와 담보금/대출금 정보를 매핑하여 컨트랙트에 저장
- NFT와 대출금을 반환하면 담보금 회수 가능

## sPYUSD (Staked PYUSD) 시스템

### 개념
- PYUSD 유동성 공급 시 발행되는 이자 수익 토큰
- ERC-20 표준 토큰
- 시간이 지날수록 가치가 자동으로 상승하는 구조

### 작동 원리

#### 1. 공급 (Supply)
```
사용자: PYUSD 1,000 예치
→ 프로토콜: Exchange Rate에 따라 sPYUSD 발행
→ 사용자: sPYUSD 수령 (예: 950 sPYUSD)
```

#### 2. 수익 누적
```
대출자들이 이자 지불
→ 프로토콜 총 PYUSD 증가
→ Exchange Rate 자동 상승
→ 모든 sPYUSD 보유자의 가치 상승
```

#### 3. 인출 (Withdraw)
```
사용자: sPYUSD 950 소각
→ 프로토콜: Exchange Rate로 PYUSD 계산
→ 사용자: PYUSD 수령 (예: 1,050 PYUSD)
→ 수익: 50 PYUSD (5% 수익)
```

### Exchange Rate 계산

#### 공식
```
Exchange Rate = (총 PYUSD 잔액 + 누적 이자) / 총 sPYUSD 발행량

초기값: 1.0 (1 sPYUSD = 1 PYUSD)
시간 경과: 1.05, 1.10, 1.15... (지속적 상승)
```

#### 발행량 계산
```
발행 sPYUSD = 공급 PYUSD / Exchange Rate

예시:
- 1,000 PYUSD 공급
- Exchange Rate = 1.05
- 발행 sPYUSD = 1,000 / 1.05 = 952.38 sPYUSD
```

#### 인출량 계산
```
인출 PYUSD = 소각 sPYUSD × Exchange Rate

예시:
- 952.38 sPYUSD 소각
- Exchange Rate = 1.10
- 인출 PYUSD = 952.38 × 1.10 = 1,047.62 PYUSD
- 수익: 47.62 PYUSD (4.76%)
```

### 장점

1. **자동 복리**
   - 별도 claim 없이 자동으로 가치 상승
   - 가스비 절약

2. **양도 가능**
   - ERC-20 토큰이므로 자유롭게 전송 가능
   - DEX에서 거래 가능

3. **실시간 수익 확인**
   - Exchange Rate 조회로 현재 가치 즉시 확인
   - 투명한 수익률 계산

4. **프로토콜 성장과 연동**
   - 대출 수요 증가 → 이자 수익 증가 → sPYUSD 가치 상승
   - 프로토콜과 공급자의 이해관계 일치

### 예시 시나리오

#### 시나리오 1: 안정적 운영
```
Day 0:
- Alice: 10,000 PYUSD 공급
- Exchange Rate: 1.0
- Alice 수령: 10,000 sPYUSD

Day 30:
- 프로토콜 이자 수익: 500 PYUSD
- Exchange Rate: 1.05
- Alice 보유 가치: 10,000 × 1.05 = 10,500 PYUSD

Day 60:
- 추가 이자 수익: 550 PYUSD
- Exchange Rate: 1.10
- Alice 보유 가치: 10,000 × 1.10 = 11,000 PYUSD

Alice 인출:
- 10,000 sPYUSD 소각
- 11,000 PYUSD 받음
- 총 수익: 1,000 PYUSD (10%)
```

#### 시나리오 2: 복수 공급자
```
Day 0:
- Alice: 10,000 PYUSD 공급 → 10,000 sPYUSD
- Exchange Rate: 1.0
- Total: 10,000 PYUSD, 10,000 sPYUSD

Day 30:
- 이자 수익: 500 PYUSD
- Exchange Rate: 1.05
- Bob: 5,250 PYUSD 공급 → 5,000 sPYUSD
- Total: 15,750 PYUSD, 15,000 sPYUSD

Day 60:
- 이자 수익: 800 PYUSD
- Exchange Rate: 1.10
- Alice 가치: 10,000 × 1.10 = 11,000 PYUSD
- Bob 가치: 5,000 × 1.10 = 5,500 PYUSD

비율:
- Alice: 10,000 / 15,000 = 66.7% 지분
- Bob: 5,000 / 15,000 = 33.3% 지분
```

## 숏 포지션 기능
- 대출 시 일정 비율을 숏 포지션으로 설정 가능
- 최대 숏 포지션 비율: 30%

## 청산 시스템

### 청산 메커니즘

#### Health Factor 기반 청산
```
Health Factor = (담보 가치 USD × liquidationRatio) / (부채 가치 USD × 10000)

청산 조건: Health Factor < 1.0
```

#### liquidationRatio의 역할
- **대출 한도 결정**: 담보 대비 최대 대출 가능 금액
- **청산 기준점**: 가격 하락 시 청산 시작 지점

#### liquidationRatio 별 특성

| 청산률 | 최대 LTV | 담보비율 | ETH 가격 하락 허용치 | 위험도 |
|-------|----------|---------|-------------------|--------|
| 50% | 50% | 200% | 50% 하락까지 안전 | 낮음 😊 |
| 60% | 60% | 167% | 40% 하락까지 안전 | 보통 |
| 70% | 70% | 143% | 30% 하락까지 안전 | 보통 |
| 80% | 80% | 125% | 20% 하락까지만 안전 | 높음 ⚠️ |

### 청산 과정

#### 1. 청산 조건 확인
- Pyth Network 오라클로 실시간 ETH 가격 확인
- Health Factor 계산
- Health Factor < 1.0 시 청산 가능

#### 2. 청산 실행
```
청산자(누구나 가능):
1. 부채 금액(대출금 + 이자) PYUSD 지불
2. 담보 ETH + 0.1% 청산 보너스 수령
3. 남은 담보는 대출자에게 반환
```

#### 3. 청산 보너스
- **보너스율**: 0.1% (10 basis points)
- **목적**: 청산 봇들이 적극적으로 청산을 수행하도록 인센티브 제공
- **효과**: 프로토콜의 bad debt 위험 최소화

### 청산 예시

#### 예시 1: 50% liquidationRatio, 정상 청산
```
초기 대출:
- 담보: 1 ETH @ $2,000 = $2,000
- 대출: $1,000 PYUSD (50% LTV)
- Health Factor: 1.0

ETH 가격 50% 하락:
- 담보: 1 ETH @ $1,000 = $1,000
- 부채: $1,000 PYUSD
- Health Factor: 0.5 → 청산 가능!

청산 실행:
- 청산자 지불: $1,000 PYUSD
- 청산자 수령: $1,001 어치 ETH (1.001 ETH, 0.1% 보너스)
- 청산자 이득: $1
- 대출자 반환: 없음 (담보 전부 청산)
```

#### 예시 2: 80% liquidationRatio, 공격적 대출
```
초기 대출:
- 담보: 1 ETH @ $2,000 = $2,000
- 대출: $1,600 PYUSD (80% LTV)
- Health Factor: 1.0

ETH 가격 20% 하락:
- 담보: 1 ETH @ $1,600 = $1,600
- 부채: $1,600 PYUSD
- Health Factor: 0.8 → 청산 가능!

청산 실행:
- 청산자 지불: $1,600 PYUSD
- 청산자 수령: $1,601.60 어치 ETH (1.001 ETH, 0.1% 보너스)
- 청산자 이득: $1.60
- 대출자 반환: 없음 (담보 전부 청산)
```

#### 예시 3: 60% liquidationRatio, 부분 청산
```
초기 대출:
- 담보: 1 ETH @ $2,000 = $2,000
- 대출: $1,000 PYUSD (50% LTV, 청산률 60%)
- Health Factor: 1.2

ETH 가격 40% 하락:
- 담보: 1 ETH @ $1,200 = $1,200
- 부채: $1,000 PYUSD
- Health Factor: 0.72 → 청산 가능!

청산 실행:
- 청산자 지불: $1,000 PYUSD
- 청산자 수령: $1,001 어치 ETH (0.834 ETH, 0.1% 보너스)
- 청산자 이득: $1
- 대출자 반환: 0.166 ETH (약 $199 가치)
```

### 청산자 (Liquidator)

#### 누가 청산하나?
- **청산 봇** (99%): 자동화된 프로그램이 24/7 모니터링
- **프로페셔널**: DeFi 전문 트레이더/회사
- **일반 사용자**: PYUSD 보유자 누구나 가능

#### 청산 봇 작동 방식
```javascript
// 청산 봇 pseudo-code
while (true) {
  loans = getAllActiveLoans();

  for (loan of loans) {
    healthFactor = getHealthFactor(loan.id);

    if (healthFactor < 1.0) {
      profit = calculateProfit(loan); // 0.1% 보너스

      if (profit > gasCost) {
        liquidate(loan.id); // 청산 실행
      }
    }
  }

  sleep(10_seconds);
}
```

### Bad Debt 방지

#### 청산 보너스의 중요성
- ❌ **보너스 없음**: 청산자가 청산하지 않음 → bad debt 발생
- ✅ **0.1% 보너스**: 청산 봇들이 경쟁적으로 청산 → bad debt 최소화

#### Bad Debt 시나리오 (보너스 없을 경우)
```
ETH 급락 50%:
- 담보: $1,000 ETH
- 부채: $1,000 PYUSD
- 청산자 이득: $0 (가스비만 손실)
- 결과: 아무도 청산하지 않음

ETH 추가 하락 55%:
- 담보: $900 ETH
- 부채: $1,000 PYUSD
- Bad Debt: $100 (프로토콜 손실)
```

#### 청산 보너스로 방지
```
ETH 하락 50%:
- 담보: $1,000 ETH
- 부채: $1,000 PYUSD
- 청산자 이득: $1 (0.1% 보너스)
- 결과: 청산 봇이 즉시 청산
- Bad Debt: $0
```

## 컨트랙트 아키텍처

### 체인별 독립 컨트랙트
- Ethereum과 Hedera는 완전히 분리된 컨트랙트로 관리
- 각 체인의 특성에 맞는 최적화된 구현
- 크로스체인 통신은 별도 브릿지 컨트랙트 활용

### Ethereum 컨트랙트
- `EthereumLendingPool.sol`: ETH 담보 대출 관리
- `StakedPYUSD.sol`: sPYUSD ERC-20 토큰 (이자 수익 토큰)
- `StETHVaultManager.sol`: LIDO stETH 통합 관리
- `EthereumLoanNFT.sol`: ERC-721 대출 증표
- `EthereumLiquidator.sol`: 청산 로직
- `EthereumShortManager.sol`: 숏 포지션 관리

### Hedera 컨트랙트
- `HederaLendingPool.js`: HBAR 담보 대출 관리
- `HederaStakingManager.js`: 네이티브 스테이킹 관리
- `HederaLoanNFT.js`: HTS 기반 대출 증표
- `HederaLiquidator.js`: 청산 로직
- `HederaShortManager.js`: 숏 포지션 관리

### 공통 인터페이스
- `ILendingPool`: 대출 풀 표준 인터페이스
- `ILiquidation`: 청산 표준 인터페이스
- `IPriceOracle`: 가격 오라클 인터페이스

## 프로토콜 설정값

### 지원 네트워크
- Ethereum
- Hedera

### Ethereum 설정
- 밸리데이터 타입: LIDO CSM
- stETH 민팅: 활성화

### Hedera 설정
- 스테이킹: 활성화
- 네이티브 스테이킹: 활성화

### 청산 설정
- 최소 청산률: 50%
- 최대 청산률: 80%

### 숏 포지션 설정
- 숏 포지션: 활성화
- 최대 숏 비율: 30%

### 오라클 설정
- 오라클 제공자: Pyth Network
- 엔드포인트: https://api.pyth.network

### NFT 설정
- 대출 증표 NFT: 활성화
- Ethereum NFT 표준: ERC-721
- Hedera NFT 표준: HTS (Hedera Token Service)

### 스테이블코인
- 대출 스테이블코인: PYUSD
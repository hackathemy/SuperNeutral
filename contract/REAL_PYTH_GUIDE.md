# 실제 Pyth Network Oracle 사용 가이드

## 🔍 현재 상황

**Ethereum Sepolia L1에는 Pyth Network oracle이 배포되어 있지 않습니다.**

Pyth는 주로 Layer 2 네트워크에 배포되어 있으며, 귀하의 프로젝트는 이미 **Arbitrum Sepolia 크로스체인 기능**을 지원하므로, Arbitrum Sepolia에서 실제 Pyth oracle을 사용하는 것이 최적의 선택입니다.

## 📋 사용 가능한 Pyth Oracle 주소

| 네트워크 | Pyth Oracle 주소 | Chain ID |
|---------|-----------------|----------|
| **Arbitrum Sepolia** ✅ | `0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF` | 421614 |
| Base Sepolia | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` | 84532 |
| Optimism Sepolia | `0x0708325268dF9F66270F1401206434524814508b` | 11155420 |
| Scroll Sepolia | `0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c` | 534351 |

## 🚀 방법 1: Arbitrum Sepolia에 실제 Pyth로 배포 (추천)

### 1단계: Arbitrum Sepolia ETH 받기

```bash
# Arbitrum Sepolia 테스트넷 ETH 받기
# 링크: https://faucet.quicknode.com/arbitrum/sepolia
```

또는:
- https://www.alchemy.com/faucets/arbitrum-sepolia
- https://bwarelabs.com/faucets/arbitrum-testnet

### 2단계: 컨트랙트 배포

```bash
cd contract

# 실제 Pyth oracle로 Arbitrum Sepolia에 배포
npm run deploy:arbitrum
```

배포 스크립트는 다음을 수행합니다:
- ✅ MockPYUSD 배포
- ✅ EthereumLoanNFT 배포
- ✅ MockStETHVault 배포
- ✅ StakedPYUSD 배포
- ✅ EthereumLendingPool 배포 (**실제 Pyth Oracle 사용**)
- ✅ 권한 설정 및 초기 유동성 공급

### 3단계: 배포 주소 확인

배포가 완료되면 다음과 같은 정보가 출력됩니다:

```
=================================
🎉 Arbitrum Sepolia Deployment Complete!
=================================
📋 Contract Addresses:
  🔴 REAL Pyth Oracle: 0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF
  MockPYUSD: 0x...
  EthereumLoanNFT: 0x...
  MockStETHVault: 0x...
  StakedPYUSD: 0x...
  EthereumLendingPool: 0x...
=================================
```

**중요**: EthereumLendingPool 주소를 복사해두세요!

### 4단계: Oracle 가격 업데이트

실제 Pyth oracle은 가격을 수동으로 업데이트해야 합니다.

#### 4-1: 스크립트 수정

`scripts/update-pyth-prices.js` 파일을 열고, 배포된 주소로 업데이트:

```javascript
// Line 33: 배포된 EthereumLendingPool 주소로 변경
const LENDING_POOL_ADDRESS = "0x64DcD6515B56bE5C77f589E97CEb991DF5289649"; // 여기에 실제 주소 입력
```

#### 4-2: 가격 업데이트 실행

```bash
npm run oracle:update:pyth
```

이 스크립트는:
1. Pyth Hermes API에서 최신 가격 데이터 가져오기
2. 가격 업데이트 수수료 계산
3. Pyth oracle에 가격 업데이트 제출
4. 새 가격 검증

### 5단계: 프론트엔드 설정 업데이트

#### 5-1: 컨트랙트 주소 업데이트

`frontend/src/config/contracts.ts`:

```typescript
export const CONTRACTS = {
  // Arbitrum Sepolia 배포 주소로 변경
  LendingPool: "0x..." as `0x${string}`,
  LoanNFT: "0x..." as `0x${string}`,
  MockPYUSD: "0x..." as `0x${string}`,
  // ...
} as const;
```

#### 5-2: Arbitrum Sepolia 네트워크 활성화

RainbowKit이 이미 Arbitrum Sepolia를 지원하므로, 사용자는 지갑에서 네트워크를 전환하기만 하면 됩니다.

## 🔄 Pyth 가격 업데이트 주기

### 자동 업데이트 (프로덕션용)

실제 프로덕션 환경에서는 가격을 자동으로 업데이트해야 합니다:

```javascript
// 예시: 매 5분마다 가격 업데이트
setInterval(async () => {
  await updatePythPrices();
}, 5 * 60 * 1000);
```

### 수동 업데이트 (테스트용)

테스트 중에는 필요할 때마다 수동으로 업데이트:

```bash
npm run oracle:update:pyth
```

## 📊 Price Feed IDs

Pyth는 모든 네트워크에서 동일한 Price Feed ID를 사용합니다:

```solidity
// ETH/USD
bytes32 public constant ETH_USD_PRICE_FEED =
    0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

// PYUSD/USD (동일하게 사용 가능)
bytes32 public constant PYUSD_USD_PRICE_FEED =
    0x41f3625971ca2ed2263e78573fe5ce23e13d2558ed3f2e47ab0f84fb9e7ae722;
```

더 많은 Price Feed ID는 여기서 확인:
- https://www.pyth.network/developers/price-feed-ids

## 🛠️ 방법 2: Sepolia L1에서 계속 Mock 사용

Sepolia L1에서 계속 개발하고 싶다면 현재 Mock Oracle을 사용하세요:

```bash
# Mock Oracle로 Sepolia에 배포 (현재 방식)
npm run deploy:sepolia:mock

# Mock Oracle 가격 업데이트
npm run oracle:update
```

**장점**:
- ✅ 간단한 테스트
- ✅ 가격 수동 제어 가능
- ✅ 업데이트 수수료 없음

**단점**:
- ❌ 실제 가격 데이터 아님
- ❌ 프로덕션 환경에 사용 불가

## 📚 참고 자료

### Pyth Network 공식 문서
- Price Feeds: https://docs.pyth.network/price-feeds
- Contract Addresses: https://docs.pyth.network/price-feeds/contract-addresses
- Hermes API: https://hermes.pyth.network/docs/

### Arbitrum Sepolia
- Explorer: https://sepolia.arbiscan.io/
- Faucet: https://faucet.quicknode.com/arbitrum/sepolia
- RPC: https://sepolia-rollup.arbitrum.io/rpc
- Chain ID: 421614

### 가격 업데이트 API
- Hermes Service: https://hermes.pyth.network/
- Price Feed IDs: https://www.pyth.network/developers/price-feed-ids

## ⚠️ 주의사항

1. **가격 업데이트 수수료**: 실제 Pyth oracle은 가격 업데이트 시 소량의 ETH가 필요합니다
2. **가격 유효기간**: 가격은 5분 이상 오래되면 `Price too old` 에러 발생
3. **네트워크 전환**: 프론트엔드에서 Arbitrum Sepolia로 네트워크 전환 필요
4. **테스트넷 ETH**: Arbitrum Sepolia ETH가 필요합니다

## 🎯 추천 워크플로우

### 개발 단계
```
Sepolia L1 (Mock Oracle)
└─ 빠른 테스트 및 개발
```

### 통합 테스트 단계
```
Arbitrum Sepolia (Real Pyth Oracle)
└─ 실제 오라클로 통합 테스트
```

### 프로덕션 배포
```
Arbitrum One / Ethereum Mainnet (Real Pyth Oracle)
└─ 실제 운영 환경
```

## ❓ FAQ

**Q: Sepolia L1에서 실제 Pyth를 사용할 수 없나요?**
A: 네, Pyth는 Sepolia L1에 배포되어 있지 않습니다. L2 네트워크 사용을 권장합니다.

**Q: 어떤 네트워크를 사용해야 하나요?**
A: 귀하의 프로젝트는 이미 Arbitrum Sepolia 크로스체인 기능이 있으므로 Arbitrum Sepolia를 추천합니다.

**Q: Mock Oracle과 Real Pyth의 차이는?**
A: Mock은 테스트용으로 가격을 수동 설정 가능하지만, Real Pyth는 실제 시장 가격을 제공합니다.

**Q: 가격 업데이트 비용은?**
A: Arbitrum Sepolia는 매우 낮은 가스비로 업데이트 가능합니다 (보통 <$0.01).

**Q: 프로덕션에서도 동일하게 사용 가능한가요?**
A: 네, 동일한 코드를 Arbitrum One 또는 Ethereum Mainnet에 배포할 수 있습니다.

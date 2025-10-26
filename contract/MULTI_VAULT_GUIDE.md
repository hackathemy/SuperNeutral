# Multi-Protocol Vault System - Complete Guide

## 🎯 Overview

담보로 예치된 ETH를 **실제 프로토콜**에 예치하여 수익을 발생시키는 멀티 프로토콜 Vault 시스템입니다.

### 지원 프로토콜

| 프로토콜 | Sepolia | Mainnet | APY | 구현 상태 |
|---------|---------|---------|-----|----------|
| **Aave V3** | ✅ 실제 | ✅ 실제 | 2-3% | ✅ 완료 |
| **Rocket Pool** | ❌ 없음 | ✅ 실제 | 3-4% | ✅ 완료 |
| **LIDO** | ❌ 없음 | ✅ 실제 | 3-5% | ✅ 완료 (기존 코드) |

---

## 🏗️ 시스템 아키텍처

```
User Borrow (ETH Collateral)
    ↓
EthereumLendingPool
    ↓
VaultRouter (전략 선택)
    ├─ [0] Aave V3 Vault (기본값)
    │     ↓
    │     ETH → WETH → Aave Pool
    │     ↓
    │     aWETH 수령 (자동 수익 누적)
    │
    ├─ [1] Rocket Pool Vault
    │     ↓
    │     ETH → Rocket Pool Deposit
    │     ↓
    │     rETH 수령 (가치 상승)
    │
    └─ [2] LIDO Vault
          ↓
          ETH → LIDO Stake
          ↓
          stETH 수령 (rebase)
```

---

## 📊 각 프로토콜별 작동 방식

### 1. Aave V3 (기본 전략)

```solidity
// 예치 흐름
depositETH()
  → WETH.deposit{value: msg.value}()  // ETH → WETH
  → AavePool.supply(WETH, amount)     // WETH 공급
  → aWETH 수령                         // 이자 수익 자동 누적
```

**특징:**
- ✅ aWETH는 rebasing token (잔액이 자동 증가)
- ✅ 언제든지 즉시 출금 가능
- ✅ Sepolia에서 실제로 작동
- ✅ 가스비 효율적

**Sepolia 주소:**
- Pool: `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`
- WETH: `0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c`
- aWETH: `0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830`

---

### 2. Rocket Pool

```solidity
// 예치 흐름
depositETH()
  → RocketDepositPool.deposit{value: msg.value}()
  → rETH 수령
  → rETH/ETH 환율이 시간에 따라 증가
```

**특징:**
- ✅ rETH 가치가 ETH 대비 지속적으로 상승
- ✅ 분산화된 이더리움 스테이킹
- ✅ 1:1보다 약간 낮은 비율로 rETH 수령 (커미션)
- ❌ Sepolia에는 없음 (Mainnet/Hoodi only)

**Mainnet 주소:**
- Storage: `0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46`
- Deposit Pool: `0xDD3f50F8A6CafbE9b31a427582963f465E745AF8`
- rETH: `0xae78736Cd615f374D3085123A210448E74Fc6393`

---

### 3. LIDO

```solidity
// 예치 흐름
depositETH()
  → LIDO.submit{value: msg.value}(address(0))
  → stETH 수령
  → stETH 잔액이 매일 rebase로 증가
```

**특징:**
- ✅ stETH는 rebasing token
- ✅ 최대 규모의 liquid staking 프로토콜
- ✅ Curve pool 통해 즉시 출금 가능
- ❌ Sepolia에는 없음 (Mainnet only)

**Mainnet 주소:**
- LIDO (stETH): `0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84`
- Curve Pool: `0xDC24316b9AE028F1497c275EB9192a3Ea0f67022`

---

## 🚀 배포 가이드

### Sepolia 배포 (Aave V3 실제 사용)

```bash
# 1. 컴파일
npm run compile

# 2. Sepolia에 배포 (Aave V3 활성화)
npm run deploy:multi

# 결과:
# ✅ VaultRouter 배포
# ✅ Aave V3 Vault 배포 (실제 프로토콜 연동)
# ✅ Rocket Pool Vault 배포 안함 (Sepolia 미지원)
# ✅ LIDO Vault 배포 안함 (Sepolia 미지원)
# ✅ EthereumLendingPool → VaultRouter 연결
```

### Mainnet 배포 (모든 프로토콜 실제 사용)

```bash
# 1. .env 설정
ALCHEMY_KEY=your_mainnet_key
PRIVATE_KEY=your_private_key

# 2. Mainnet에 배포
npm run deploy:mainnet

# 결과:
# ✅ VaultRouter 배포
# ✅ Aave V3 Vault 배포 (실제)
# ✅ Rocket Pool Vault 배포 (실제)
# ✅ LIDO Vault 배포 (실제)
# ✅ 모든 vault 등록
# ✅ 기본 전략: Aave V3
```

---

## 🔧 전략 관리

### 현재 전략 확인

```bash
npm run vault:status
```

출력 예시:
```
🎯 Current Active Strategy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Strategy: Aave V3
Vault: 0x...
Balance: 10.5 ETH
Rewards: 0.25 ETH

📊 All Available Strategies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ [0] Aave V3 (Real)
   Balance: 10.5 ETH
   Rewards: 0.25 ETH
   Status: 🟢 ACTIVE

  [1] Rocket Pool (Real - Mainnet only)
   Balance: 0 ETH
   Rewards: 0 ETH

  [2] LIDO (Real - Mainnet only)
   Balance: 0 ETH
   Rewards: 0 ETH
```

### 전략 전환

```bash
# Rocket Pool로 전환 (Mainnet only)
npm run vault:switch -- 1

# LIDO로 전환 (Mainnet only)
npm run vault:switch -- 2

# Aave V3로 복귀
npm run vault:switch -- 0
```

**중요:** 전략 전환 시 기존 예치금은 자동 이동되지 않습니다. 마이그레이션이 필요합니다.

---

## 💰 사용 예시

### 1. PYUSD 공급

```javascript
const pyusd = await ethers.getContractAt("IERC20", pyusdAddress);
const lendingPool = await ethers.getContractAt("ILendingPool", poolAddress);

// Approve
await pyusd.approve(poolAddress, ethers.parseUnits("10000", 6));

// Supply
await lendingPool.supplyPYUSD(
    ethers.parseUnits("10000", 6),
    ethers.ZeroAddress
);
```

### 2. ETH 담보로 대출 (자동으로 Aave V3에 예치)

```javascript
await lendingPool.borrow(
    ethers.parseUnits("1000", 6),      // 1000 PYUSD 대출
    6000,                               // 60% 청산 비율
    0,                                  // 숏 비율 (향후 구현)
    ethers.ZeroAddress,
    { value: ethers.parseEther("0.5") } // 0.5 ETH 담보
);

// 이 0.5 ETH는 자동으로:
// 1. VaultRouter로 전송
// 2. Aave V3 Vault로 라우팅
// 3. WETH로 변환
// 4. Aave Pool에 공급
// 5. aWETH 수령 (수익 자동 누적)
```

### 3. 수익 확인

```javascript
const vault = await ethers.getContractAt("AaveV3Vault", vaultAddress);

const balance = await vault.getStETHBalance();
const rewards = await vault.getTotalRewards();

console.log("Total Value:", ethers.formatEther(balance), "ETH");
console.log("Earned Rewards:", ethers.formatEther(rewards), "ETH");
```

### 4. 대출 상환 (ETH + 수익 회수)

```javascript
await lendingPool.repay(tokenId);

// 자동으로:
// 1. PYUSD 대출금 + 이자 상환
// 2. Aave V3에서 aWETH 출금
// 3. WETH → ETH 변환
// 4. 원금 + Aave 수익을 사용자에게 반환
```

---

## 🔄 전략 마이그레이션

기존 예치금을 다른 프로토콜로 이동하려면:

```javascript
const vaultRouter = await ethers.getContractAt("VaultRouter", routerAddress);

// Aave V3 → Rocket Pool 마이그레이션
await vaultRouter.migrateStrategy(
    0,  // from: Aave V3
    1,  // to: Rocket Pool
    0   // amount: 0 = all
);
```

마이그레이션 흐름:
```
1. Aave V3에서 aWETH 출금
2. WETH → ETH 변환
3. Rocket Pool에 ETH 예치
4. rETH 수령
5. 활성 전략을 Rocket Pool로 변경
```

---

## 📈 수익 비교

### Sepolia (테스트넷)

| 프로토콜 | 실제 수익 | 테스트 가능 |
|---------|----------|-----------|
| Aave V3 | ✅ Yes (~2-3%) | ✅ Yes |
| Rocket Pool | ❌ N/A | ❌ No |
| LIDO | ❌ N/A | ❌ No |

### Mainnet (프로덕션)

| 프로토콜 | 예상 APY | 장점 | 단점 |
|---------|---------|------|------|
| Aave V3 | 2-3% | 즉시 출금, 가스 효율 | 낮은 수익률 |
| Rocket Pool | 3-4% | 분산화, 안정적 | rETH 프리미엄 변동 |
| LIDO | 3-5% | 최대 유동성, 검증됨 | 중앙화 우려 |

**권장 전략:**
1. **기본**: Aave V3 (안정적, 즉시 출금)
2. **장기**: Rocket Pool (높은 수익, 분산화)
3. **최대 수익**: LIDO (최고 APY, 최대 유동성)

---

## ⚠️ 중요 고려사항

### 1. 네트워크별 가용성

**Sepolia:**
- ✅ Aave V3만 실제 작동
- ❌ Rocket Pool, LIDO는 코드만 준비됨

**Mainnet:**
- ✅ 모든 프로토콜 실제 작동
- ✅ 실시간 전략 전환 가능

### 2. 가스 비용

| 작업 | Aave V3 | Rocket Pool | LIDO |
|------|---------|-------------|------|
| Deposit | ~180k gas | ~120k gas | ~100k gas |
| Withdraw | ~200k gas | ~150k gas | ~180k gas |
| **Total** | ~380k gas | ~270k gas | ~280k gas |

### 3. 출금 제한

- **Aave V3**: 즉시 출금 (풀 유동성만 확인)
- **Rocket Pool**: 즉시 (rETH → ETH swap)
- **LIDO**: Curve pool 사용 (slippage 발생 가능)

### 4. 스마트 컨트랙트 리스크

모든 프로토콜은 감사를 받았지만:
- Aave V3: Lowest risk (가장 많이 사용됨)
- Rocket Pool: Low risk (검증된 프로토콜)
- LIDO: Low risk (최대 TVL)

---

## 🎓 프로토콜 선택 가이드

### 언제 Aave V3를 사용?

- ✅ Sepolia 테스트
- ✅ 짧은 예치 기간
- ✅ 즉시 출금 가능성 필요
- ✅ 가스비 걱정 (상대적으로 높음)

### 언제 Rocket Pool을 사용?

- ✅ Mainnet 배포
- ✅ 장기 예치
- ✅ 분산화 중시
- ✅ 중간 수익률 선호

### 언제 LIDO를 사용?

- ✅ Mainnet 배포
- ✅ 최대 수익률 원함
- ✅ 최대 유동성 필요
- ✅ DeFi 통합 (stETH는 널리 사용됨)

---

## 📝 배포 체크리스트

### Sepolia 배포

- [ ] `.env` 파일 설정 (ALCHEMY_KEY, PRIVATE_KEY)
- [ ] Sepolia ETH 보유 확인 (최소 0.15 ETH)
- [ ] `npm run compile` 실행
- [ ] `npm run deploy:multi` 실행
- [ ] 배포 주소 확인 (`deployment-multi-vault.json`)
- [ ] `npm run vault:status` 로 상태 확인
- [ ] Aave V3 vault가 active인지 확인

### Mainnet 배포 (향후)

- [ ] 모든 컨트랙트 감사 완료
- [ ] Mainnet fork에서 충분히 테스트
- [ ] 멀티시그 지갑 설정
- [ ] Timelock 컨트랙트 배포
- [ ] `.env` 파일 Mainnet 설정
- [ ] 충분한 ETH 준비 (가스비)
- [ ] `npm run deploy:mainnet` 실행
- [ ] 모든 vault 등록 확인
- [ ] 각 프로토콜별 테스트 예치
- [ ] 모니터링 시스템 설정

---

## 🔍 문제 해결

### "Strategy not registered" 오류

```solidity
// VaultRouter에 vault 등록 필요
await vaultRouter.registerVault(
    0,  // Aave V3
    aaveVaultAddress
);
```

### "Insufficient liquidity" (Aave)

- Aave pool에 WETH 유동성 부족
- 더 작은 금액으로 시도
- 다른 전략으로 전환 고려

### "Deposit pool full" (Rocket Pool)

- Rocket Pool 예치 한도 도달
- 나중에 재시도
- Aave V3나 LIDO 사용

### Sepolia에서 Rocket Pool/LIDO 사용 불가

- **정상입니다!** Sepolia에는 해당 프로토콜이 없음
- Aave V3만 사용 가능
- Mainnet 배포 시 모든 프로토콜 사용 가능

---

## 📊 모니터링

### 실시간 상태 확인

```bash
# 전체 시스템 상태
npm run vault:status

# 특정 vault 상태
npm run vault:info -- 0  # Aave V3
npm run vault:info -- 1  # Rocket Pool
npm run vault:info -- 2  # LIDO
```

### Aave UI에서 확인

1. https://app.aave.com 방문
2. Testnet 모드 활성화
3. Sepolia 선택
4. Vault 주소로 검색
5. Supplied Assets에서 WETH 확인

---

## 🚀 다음 단계

### 현재 완료

- [x] VaultRouter 구현
- [x] Aave V3 Vault (실제 프로토콜)
- [x] Rocket Pool Vault (실제 프로토콜)
- [x] LIDO Vault (기존 StETHVaultManager)
- [x] 전략 전환 기능
- [x] Sepolia 배포 스크립트
- [x] 관리 도구 (status, switch)

### 향후 개발

- [ ] 자동 리밸런싱 (APY 기반)
- [ ] 멀티 vault 분산 예치
- [ ] Flash loan 통한 전략 전환
- [ ] 수익 자동 재투자
- [ ] Governance 토큰 클레임
- [ ] 고급 수익 최적화 전략

---

## 📚 참고 자료

### 프로토콜 문서

- **Aave V3**: https://docs.aave.com/developers/
- **Rocket Pool**: https://docs.rocketpool.net/
- **LIDO**: https://docs.lido.fi/

### 테스트넷 리소스

- Sepolia Faucet: https://www.alchemy.com/faucets/ethereum-sepolia
- Sepolia Explorer: https://sepolia.etherscan.io
- Aave Testnet: https://app.aave.com (testnet mode)

### 코드 저장소

- Aave V3 Core: https://github.com/aave/aave-v3-core
- Rocket Pool: https://github.com/rocket-pool/rocketpool
- LIDO: https://github.com/lidofinance/lido-dao

---

**준비 완료!** 실제 수익을 발생시키는 멀티 프로토콜 vault 시스템을 Sepolia에서 테스트하세요:

```bash
npm run deploy:multi
```

**질문이나 문제가 있으신가요?** 이 가이드의 "문제 해결" 섹션을 확인하거나 각 프로토콜의 공식 문서를 참조하세요.

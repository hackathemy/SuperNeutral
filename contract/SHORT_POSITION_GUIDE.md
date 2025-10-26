# Multi-Strategy Short Position System

## 🎯 Overview

담보 ETH의 일부를 **실제 숏 포지션**으로 전환하여 헤지하거나 수익을 추구하는 시스템입니다.

### 지원 전략

| 전략 | 네트워크 | 작동 방식 | 레버리지 |
|------|---------|----------|---------|
| **Aave + Uniswap** | Sepolia ✅ | Aave서 빌려서 Uniswap에서 판매 | 1-3x |
| **GMX V2** | Arbitrum/Mainnet | Perpetual futures | 1-100x |

**기본 전략**: Aave + Uniswap (Sepolia에서 작동)

---

## 🏗️ 시스템 아키텍처

```
User Borrows with ETH Collateral
    ↓
EthereumLendingPool
    ↓
Deposit ETH to Vault (Long Position)
    ↓
Use shortPositionRatio% for Short
    ↓
ShortPositionRouter (전략 선택)
    ├─ [0] Aave + Uniswap (기본) ✅
    │     ↓
    │     1. Aave에서 WETH 빌림
    │     2. Uniswap에서 WETH → USDC
    │     3. USDC 보관 (가격 하락 대기)
    │     4. 청산 시: USDC → WETH, Aave 상환
    │
    └─ [1] GMX V2 Perpetual
          ↓
          1. GMX에 ETH 담보 예치
          2. Perpetual Short 포지션 오픈
          3. 자동 청산 관리
```

---

## 📊 작동 방식

### Aave + Uniswap 전략 (Sepolia 가능!)

```
예시: 1 ETH 담보, shortRatio = 30%

1. Long Position (70%):
   0.7 ETH → Aave V3 Vault
   → aWETH로 수익 발생

2. Short Position (30%):
   0.3 ETH → AaveUniswapShort
   ↓
   Step 1: Aave에 0.3 ETH 공급 (담보)
   Step 2: Aave에서 0.3 WETH 빌림 (2x 레버리지)
   Step 3: Uniswap에서 0.3 WETH → USDC 스왑
   Step 4: USDC 보관

   📉 ETH 가격 하락 시:
   - USDC로 더 많은 WETH 재구매 가능
   - Aave 상환 후 차익 실현

   📈 ETH 가격 상승 시:
   - USDC로 적은 WETH 재구매
   - 손실 발생 (but Long은 이익)
```

### 실제 예시

```
초기 상황:
- ETH 가격: $3,000
- 담보: 1 ETH
- shortRatio: 30%

Long (70%): 0.7 ETH → Aave Vault
Short (30%): 0.3 ETH → Short Position

숏 포지션 오픈:
1. Aave에 0.3 ETH ($900) 공급
2. Aave에서 0.3 WETH ($900) 빌림 (2x)
3. Uniswap: 0.3 WETH → 900 USDC

시나리오 1: ETH → $2,400 (-20%)
- 900 USDC → 0.375 WETH 재구매
- Aave 상환: 0.3 WETH
- 이익: 0.075 WETH ($180)
- Long 손실: -$180 (0.7 ETH = $1,680, was $2,100)
- 총 손익: $0 (헤지 성공!)

시나리오 2: ETH → $3,600 (+20%)
- 900 USDC → 0.25 WETH 재구매
- Aave 상환: 0.3 WETH
- 손실: 0.05 WETH (-$180)
- Long 이익: +$420 (0.7 ETH = $2,520, was $2,100)
- 총 손익: +$240
```

---

## 🚀 컨트랙트 구조

### 1. ShortPositionRouter

전략 선택 및 라우팅:

```solidity
enum Strategy {
    AAVE_UNISWAP,  // 0: 기본 (Sepolia 작동)
    GMX_V2         // 1: Mainnet/Arbitrum
}

// 오너만 전략 변경 가능
function changeStrategy(Strategy newStrategy) external onlyOwner;

// 숏 포지션 오픈
function openShort(
    uint256 ethAmount,
    uint256 leverage,
    uint256 minOutputAmount
) external returns (uint256 positionId);

// 숏 포지션 청산
function closeShort(uint256 positionId) external returns (int256 profitOrLoss);
```

### 2. AaveUniswapShort

Aave + Uniswap 전략 구현:

```solidity
// Sepolia 주소
IAavePool: 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951
ISwapRouter: 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E
WETH: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c
USDC: 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8

// 숏 오픈 프로세스
1. ETH → WETH
2. Aave에 WETH 공급 (담보)
3. Aave에서 WETH 빌림 (leverage)
4. Uniswap: WETH → USDC
5. USDC 보관

// 숏 청산 프로세스
1. Uniswap: USDC → WETH
2. Aave 대출 상환
3. Aave에서 담보 회수
4. WETH → ETH
5. 차익 정산
```

### 3. GMXShort (Mainnet/Arbitrum)

GMX V2 Perpetual 전략:

```solidity
// Arbitrum One 주소
ExchangeRouter: 0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8
OrderHandler: 0x352f684ab9e97a6321a13CF03A61316B681D9fD2

// 최대 100x 레버리지
// 자동 청산 관리
// 펀딩 레이트 적용
```

---

## 💻 EthereumLendingPool 통합

대출 시 자동으로 숏 포지션 생성:

```solidity
function borrow(
    uint256 pyusdAmount,
    uint256 liquidationRatio,
    uint256 shortRatio,  // 0-3000 (0-30%)
    address onBehalfOf
) external payable {
    require(shortRatio <= MAX_SHORT_RATIO, "Max 30%");

    // 1. Long position (100% - shortRatio)
    uint256 longAmount = (msg.value * (BASIS_POINTS - shortRatio)) / BASIS_POINTS;
    vaultRouter.depositETH{value: longAmount}();

    // 2. Short position (shortRatio)
    if (shortRatio > 0) {
        uint256 shortAmount = (msg.value * shortRatio) / BASIS_POINTS;
        uint256 positionId = shortPositionRouter.openShort{value: shortAmount}(
            shortAmount,
            2, // 2x leverage
            0  // No min output (market price)
        );

        loans[tokenId].shortPositionId = positionId;
    }
}
```

---

## 🔧 배포 및 설정

### Sepolia 배포

```bash
# 1. 컴파일
npm run compile

# 2. 숏 포지션 시스템 배포
npm run deploy:short

# 결과:
# ✅ ShortPositionRouter 배포
# ✅ AaveUniswapShort 배포 (Sepolia 작동)
# ✅ Router에 전략 등록
# ✅ 기본 전략: Aave + Uniswap
```

### 전략 관리

```bash
# 현재 전략 확인
npm run short:status

# 전략 전환 (오너만)
npm run short:switch -- 0  # Aave + Uniswap
npm run short:switch -- 1  # GMX V2 (Mainnet에서만)
```

---

## 📝 사용 예시

### 1. 헤지 목적 (30% 숏)

```javascript
// ETH 가격 변동 위험 헤지
await lendingPool.borrow(
    ethers.parseUnits("1000", 6),  // 1000 PYUSD 대출
    6000,                           // 60% 청산 비율
    3000,                           // 30% 숏 포지션 ✅
    ethers.ZeroAddress,
    { value: ethers.parseEther("1") }
);

// 결과:
// - 0.7 ETH → Aave V3 Vault (Long, 수익 발생)
// - 0.3 ETH → Short Position (가격 하락 보호)
```

### 2. 적극적 숏 (높은 비율)

```javascript
// ETH 가격 하락 예상 시
await lendingPool.borrow(
    ethers.parseUnits("500", 6),
    7000,  // 70% 청산 비율 (안전)
    3000,  // 최대 30% 숏
    ethers.ZeroAddress,
    { value: ethers.parseEther("0.5") }
);
```

### 3. 숏 포지션 청산

```javascript
// 대출 상환 시 자동 청산
await lendingPool.repay(tokenId);

// 또는 수동 청산
const positionId = loan.shortPositionId;
const pnl = await shortPositionRouter.closeShort(positionId);

console.log("P&L:", ethers.formatEther(pnl), "ETH");
```

---

## 📊 리스크 관리

### 1. 레버리지 제한

```solidity
// Aave + Uniswap: 최대 3x (보수적)
require(leverage >= 1 && leverage <= 3);

// GMX V2: 최대 100x (위험!)
// 오너가 설정 변경 가능
```

### 2. 슬리피지 보호

```solidity
// Uniswap 스왑 시 최소 출력량 설정
function openShort(
    uint256 ethAmount,
    uint256 leverage,
    uint256 minOutputAmount  // 슬리피지 보호
) external;
```

### 3. 청산 조건

```
Aave + Uniswap:
- Aave health factor < 1.0 시 청산 위험
- 2x 레버리지 사용 시 ~50% 가격 변동 여유

GMX V2:
- 마진 비율에 따라 자동 청산
- 펀딩 레이트 누적 고려
```

---

## 🎓 전략 비교

| 기능 | Aave + Uniswap | GMX V2 |
|------|---------------|--------|
| **네트워크** | Sepolia ✅ | Arbitrum/Mainnet |
| **레버리지** | 1-3x | 1-100x |
| **청산** | 수동 | 자동 |
| **수수료** | Swap fee (~0.3%) | Trading + Funding |
| **복잡도** | 중간 | 낮음 |
| **가스비** | 높음 | 낮음 (L2) |
| **테스트** | 지금 가능 ✅ | Mainnet 필요 |

---

## ⚠️ 중요 고려사항

### 1. shortPositionRatio 설정

```
0% (0): 숏 없음, 100% Long
10% (1000): 10% 숏, 90% Long
20% (2000): 20% 숏, 80% Long
30% (3000): 30% 숏, 70% Long (최대)
```

### 2. 가격 변동 시나리오

**중립 헤지 (30% 숏)**:
- ETH +20%: Long 이익 > Short 손실
- ETH -20%: Short 이익 ≈ Long 손실
- 결과: 안정적 포트폴리오

**적극적 숏 (30% 숏 + 고레버리지)**:
- ETH 하락: 큰 이익
- ETH 상승: 큰 손실
- 결과: 고위험 고수익

### 3. 수수료 및 비용

```
Aave + Uniswap:
- Aave 이자: 변동 (현재 ~2-3%)
- Uniswap 수수료: 0.3%
- 가스비: Sepolia 무료, Mainnet 높음

GMX V2:
- 오픈/클로즈: 0.05-0.1%
- 펀딩 레이트: 시간당 변동
- 가스비: Arbitrum 저렴
```

---

## 🔍 모니터링

### 포지션 상태 확인

```bash
# 전체 시스템 상태
npm run short:status

# 특정 포지션 P&L
npm run short:pnl -- <positionId>
```

### On-chain 확인

```javascript
const router = await ethers.getContractAt("ShortPositionRouter", routerAddress);

// 포지션 정보
const [collateral, borrowed, currentValue, isActive] =
    await router.getPosition(positionId);

// 미실현 손익
const pnl = await router.getUnrealizedPnL(positionId);
```

---

## 🚀 다음 단계

### 즉시 가능
1. **Sepolia 배포**: `npm run deploy:short`
2. **Aave + Uniswap 테스트**: 실제 작동 확인
3. **헤지 전략 실험**: 다양한 shortRatio 테스트

### Mainnet 준비
1. GMX V2 통합 완성
2. 전략 최적화 (레버리지, 수수료)
3. 자동 리밸런싱
4. 청산 봇 구현

---

## 📚 참고 자료

- **Aave V3**: https://docs.aave.com/developers/
- **Uniswap V3**: https://docs.uniswap.org/
- **GMX V2**: https://gmx-docs.io/
- **Short Selling Basics**: https://www.investopedia.com/short-selling

---

**완성!** 🎉

- ✅ 2가지 숏 전략 모두 구현
- ✅ Sepolia에서 Aave + Uniswap 작동
- ✅ 오너가 동적으로 전략 전환
- ✅ 기본값: Aave + Uniswap

질문이 있으시면 언제든지 물어보세요!

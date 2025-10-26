# 🏦 Borrow Methods Guide

## 두 가지 Borrow 방법

이 프로젝트는 **두 가지 다른 방법**으로 PYUSD를 빌릴 수 있습니다:

---

## 1. 📍 Direct Borrow (Sepolia에서 직접)

**URL**: `/borrow`

### 사용 시나리오
- ✅ **Sepolia 네트워크**에 이미 ETH가 있는 경우
- ✅ 가장 빠르고 간단한 방법
- ✅ 브릿지 수수료 없음

### 작동 방식
```
1. Sepolia 네트워크로 연결
2. ETH 담보 입력
3. PYUSD 빌리기
4. 완료! (1개 트랜잭션)
```

### 특징
- **네트워크**: Sepolia만 사용
- **트랜잭션 수**: 1개
- **가스 비용**: 낮음 (브릿지 비용 없음)
- **속도**: 빠름 (~15초)
- **사용자 경험**: 간단함

### 실행 방법
1. MetaMask를 **Sepolia**로 연결
2. http://localhost:3000/borrow 접속
3. 파라미터 설정:
   - ETH 담보량
   - Liquidation Ratio (50-80%)
   - Short Ratio (0-30%)
   - 빌릴 PYUSD 양
4. "Borrow PYUSD" 클릭

---

## 2. 🌉 Cross-Chain Borrow (Arbitrum Sepolia → Sepolia)

**URL**: `/borrow-crosschain`

### 사용 시나리오
- ✅ **Arbitrum Sepolia**에 ETH가 있는 경우
- ✅ Sepolia로 자산을 옮기지 않고 바로 빌리고 싶을 때
- ✅ 크로스체인 기능을 테스트하고 싶을 때

### 작동 방식
```
1. Arbitrum Sepolia 네트워크로 연결
2. ETH 담보 입력 (Arbitrum Sepolia의 ETH)
3. Avail Nexus SDK가 자동으로:
   ├─ ETH를 Arbitrum → Sepolia로 브릿지
   └─ Sepolia에서 자동으로 borrow 실행
4. Sepolia에서 Loan NFT 받기
5. Sepolia에서 PYUSD 받기
```

### 특징
- **네트워크**: Arbitrum Sepolia (시작) → Sepolia (실행)
- **트랜잭션 수**: 2개 (브릿지 + 실행) - 하지만 자동!
- **가스 비용**: 높음 (브릿지 비용 포함)
- **속도**: 느림 (~2-5분, 브릿지 시간 포함)
- **사용자 경험**: 원클릭 자동화
- **기술**: Avail Nexus SDK 사용

### 실행 방법
1. MetaMask를 **Arbitrum Sepolia**로 연결
2. http://localhost:3000/borrow-crosschain 접속
3. 파라미터 설정 (동일)
4. "Bridge ETH & Borrow PYUSD" 클릭
5. 자동으로 브릿지 + 실행!

---

## 🔀 네트워크별 자동 안내

### Sepolia 네트워크 감지 시
- `/borrow-crosschain` 접속하면:
  - ℹ️ "Sepolia에서는 직접 Borrow를 사용하세요" 메시지 표시
  - `/borrow` 페이지로 이동 버튼 제공

### Arbitrum Sepolia 외 네트워크 감지 시
- `/borrow-crosschain` 접속하면:
  - 네트워크 전환 버튼 제공
  - 또는 `/borrow` 페이지 링크 제공

---

## 📊 비교표

| 항목 | Direct Borrow | Cross-Chain Borrow |
|------|--------------|-------------------|
| **시작 네트워크** | Sepolia | Arbitrum Sepolia |
| **실행 네트워크** | Sepolia | Sepolia |
| **트랜잭션 수** | 1개 | 2개 (자동) |
| **소요 시간** | ~15초 | ~2-5분 |
| **가스 비용** | 낮음 | 높음 (브릿지 포함) |
| **편의성** | 간단 | 자동화 |
| **사용 케이스** | Sepolia에 ETH 있음 | Arbitrum에 ETH 있음 |
| **기술** | 직접 컨트랙트 호출 | Avail Nexus SDK |

---

## 🎯 어떤 방법을 선택해야 할까요?

### Direct Borrow 선택 (/borrow)
```
✅ Sepolia에 이미 ETH가 있다
✅ 가장 빠르고 저렴한 방법을 원한다
✅ 간단한 테스트를 하고 싶다
```

### Cross-Chain Borrow 선택 (/borrow-crosschain)
```
✅ Arbitrum Sepolia에 ETH가 있다
✅ Sepolia로 자산을 옮기고 싶지 않다
✅ 크로스체인 기능을 경험하고 싶다
✅ Avail Nexus SDK를 테스트하고 싶다
```

---

## 🔧 기술적 차이점

### Direct Borrow (Sepolia)
```typescript
// 직접 컨트랙트 호출
await writeContract({
  address: LENDING_POOL,
  functionName: "borrow",
  args: [pyusdAmount, liquidationRatio, shortRatio, address(0)],
  value: collateralInWei,
});
```

### Cross-Chain Borrow (Arbitrum → Sepolia)
```typescript
// Nexus SDK를 통한 브릿지 + 실행
await nexusSdk.bridgeAndExecute({
  toChainId: sepolia.id,
  token: "ETH",
  amount: collateral,
  execute: {
    contractAddress: LENDING_POOL,
    functionName: "borrow",
    buildFunctionParams: (token, amount, chainId, userAddress) => ({
      functionParams: [pyusdAmount, liquidationRatio, shortRatio, userAddress],
      value: collateralInWei,
    }),
  },
});
```

**핵심 차이**:
- Direct: `address(0)` → 자신에게 NFT 발행
- Cross-Chain: `userAddress` → onBehalfOf로 원래 주소에 NFT 발행

---

## 💡 추천 워크플로우

### 초보자
```
1. Sepolia에서 Direct Borrow로 시작
2. 익숙해지면 Cross-Chain 시도
```

### 개발자
```
1. Direct Borrow로 기본 기능 테스트
2. Cross-Chain Borrow로 Avail Nexus 통합 테스트
```

### 사용자
```
- Sepolia에 ETH 있음 → Direct Borrow
- Arbitrum에 ETH 있음 → Cross-Chain Borrow
```

---

## 🚀 빠른 시작

### 옵션 1: Sepolia Direct Borrow
```bash
# 1. Sepolia testnet ETH 받기
https://sepoliafaucet.com/

# 2. 앱 실행
npm run dev

# 3. 접속
http://localhost:3000/borrow
```

### 옵션 2: Cross-Chain Borrow
```bash
# 1. Arbitrum Sepolia ETH 받기
https://faucet.quicknode.com/arbitrum/sepolia

# 2. 앱 실행
npm run dev

# 3. 접속
http://localhost:3000/borrow-crosschain
```

---

## ❓ FAQ

**Q: Sepolia에서 /borrow-crosschain을 사용하면?**
A: 자동으로 Direct Borrow 페이지(/borrow)로 안내됩니다.

**Q: 두 방법 모두 같은 컨트랙트를 사용하나요?**
A: 네! 둘 다 Sepolia의 같은 LendingPool 컨트랙트를 사용합니다.

**Q: NFT는 어디로 발행되나요?**
A:
- Direct: Sepolia에서 연결된 주소로
- Cross-Chain: Sepolia에서 Arbitrum의 원래 주소로 (onBehalfOf)

**Q: 어느 것이 더 안전한가요?**
A: 둘 다 안전합니다. Cross-Chain은 Avail 브릿지를 추가로 신뢰해야 합니다.

---

## 📚 관련 문서

- **전체 가이드**: `/CROSS_CHAIN_GUIDE.md`
- **빠른 시작**: `/frontend/README_CROSSCHAIN.md`
- **컨트랙트 문서**: `/contract/CLAUDE.md`

---

## ✅ 결론

**간단히 말하면:**
- 🏠 Sepolia에 있다? → `/borrow` 사용
- 🌉 Arbitrum에 있다? → `/borrow-crosschain` 사용

둘 다 같은 결과를 얻지만, 시작점이 다릅니다! 🎉

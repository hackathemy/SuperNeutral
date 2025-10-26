# 대출 상환 테스트 보고서

**날짜:** 2025-10-26
**네트워크:** Sepolia Testnet
**테스터:** 0x2FCCba2f198066c5Ea3e414dD50F78E25c3aF552

---

## 📋 요약

대출 상환 기능 테스트를 진행하던 중 **중대한 버그를 발견**하고 수정했습니다. 수정 후 재배포했으나 **새로운 문제**가 발견되어 추가 조사가 필요합니다.

---

## 🔍 발견된 버그 #1: ETH 이중 계산

### 버그 설명
**위치:** `EthereumLendingPool.sol` - `repay()` 함수

**문제:**
```solidity
// ❌ 잘못된 코드 (버그)
uint256 ethFromVault = vaultRouter.withdrawETH(longAmount);
totalETHReturned += ethFromVault;  // 첫 번째 추가
totalETHReturned += address(this).balance;  // ❌ 이중 계산!
```

담보 ETH가 두 번 계산되어 실제보다 많은 ETH를 전송하려고 시도, 트랜잭션 실패.

### 수정 사항
```solidity
// ✅ 수정된 코드
uint256 balanceBefore = address(this).balance;

// Close short position & withdraw from vault
if (loan.shortPositionId > 0) {
    shortPositionRouter.closeShort(loan.shortPositionId);
}

uint256 longAmount = (loan.collateralAmount * (BASIS_POINTS - loan.shortPositionRatio)) / BASIS_POINTS;
if (longAmount > 0) {
    vaultRouter.withdrawETH(longAmount);
}

// 정확한 계산
uint256 totalETHReturned = address(this).balance - balanceBefore;
```

### 상태
- ✅ **수정 완료**
- ✅ **컴파일 성공**
- ✅ **재배포 완료**

---

## 🔄 재배포 결과

### 새로운 컨트랙트 주소

| 컨트랙트 | 주소 |
|---------|------|
| **Lending Pool** | `0x5Fc62Dab41eFd6E5cC7b4Df4B8d850fda8cc67eD` |
| **Vault Router** | `0x33072147860e1c2396D22Fe8fbB25A140D1Ba758` |
| **Aave V3 Vault** | `0xD701e1dfc4c9b762D4f6640a927ff7F3Daaaad7b` |
| **Staked PYUSD** | `0x014101c29669b32AF822F25b90717B3bE9bAA303` |
| **Loan NFT** | `0x3018cc163f8B4b6785a6783f72f1A291a0f2C709` |
| **Short Router** | `0xcc8bc91cF5C18EF1d6d5013e19fc656443ACF8CA` |

### 재배포 검증
- ✅ 모든 vault 전략 등록됨
- ✅ 권한 설정 완료
- ✅ 컨트랙트 연결 확인

---

## 🧪 테스트 진행 상황

### Test 1: 테스트 대출 생성
**상태:** ✅ **성공**

```
PYUSD 공급: 39.608142 PYUSD
TX: 0x461dc6edb1e2eb0cf9a25ab3f838eb60050cd52248ff0e8dfb26326841e2d1bd

대출 생성:
- Loan NFT ID: #1
- 담보: 0.1 ETH
- 대출: 30 PYUSD
- Short Ratio: 0% (100% long)
- TX: 0x8ca6f09b635b6ae346c4b80e72b312f6b319eee7eec3cce5d85dc27efa461697

Pool 상태:
- Total Supply: 39.608142 PYUSD
- Total Borrowed: 30.0 PYUSD
- Utilization: 75.74%
```

### Test 2: Vault 상태 확인
**상태:** ✅ **정상**

```
Aave V3 Vault:
- Total ETH Deposited: 0.1 ETH
- aWETH Balance: 0.1 aWETH

Lending Pool:
- Total ETH Collateral: 0.1 ETH
- Total PYUSD Borrowed: 30.0 PYUSD

Loan #1:
- Expected in Vault: 0.1 ETH
- Actual aWETH: 0.1 aWETH
- Match: ✅
```

**결론:** 담보가 정상적으로 Aave V3에 예치되었음.

### Test 3: 대출 상환 시도
**상태:** ❌ **실패**

```
에러: execution reverted (unknown custom error)
Error Data: 0x13be252b
```

**상환 시도 내역:**
- Loan ID: #1
- Principal: 30.0 PYUSD
- Interest: 0.000001 PYUSD
- Total Repayment: 30.000001 PYUSD
- Collateral to Return: 0.1 ETH
- User PYUSD Balance: 56.405428 PYUSD (충분함)

**결과:** 트랜잭션 실패 - Unknown custom error

---

## 🚨 발견된 문제 #2: Unknown Custom Error

### 문제 설명

상환 시도 시 다음과 같은 에러 발생:
```
Error: execution reverted (unknown custom error)
Error Data: 0x13be252b
```

### 검증된 사항

✅ **정상 작동:**
1. Vault 잔액: 0.1 aWETH (정확함)
2. PYUSD 잔액: 56.4 PYUSD (충분함)
3. Loan 상태: Active
4. Health Factor: 8조 (매우 안전)
5. Contract receive(): 존재함
6. Authorization: 모두 설정됨

❓ **조사 필요:**
1. Error code `0x13be252b`의 의미
2. VaultRouter → AaveV3Vault → LendingPool ETH 전송 흐름
3. ReentrancyGuard 중첩 가능성
4. Aave V3 인출 로직

### 가능한 원인

1. **Custom Error:**
   - Aave V3나 다른 외부 컨트랙트에서 발생한 custom error
   - Error selector `0x13be252b` 디코딩 필요

2. **Reentrancy Guard:**
   - LendingPool, VaultRouter, AaveV3Vault 모두 `nonReentrant` modifier 사용
   - 중첩된 호출에서 문제 발생 가능성

3. **ETH 전송 흐름:**
   ```
   LendingPool.repay()
   → VaultRouter.withdrawETH()
     → AaveV3Vault.withdrawETH()
       → Aave V3 Pool.withdraw()
       → AaveV3Vault transfers ETH to VaultRouter
     → VaultRouter transfers ETH to LendingPool
   → LendingPool transfers ETH to user
   ```
   이 흐름 중 어딘가에서 실패

---

## 📊 테스트 메트릭스

| 항목 | 결과 |
|------|------|
| **버그 발견** | 1개 (ETH 이중 계산) |
| **버그 수정** | ✅ 완료 |
| **재배포** | ✅ 성공 |
| **PYUSD 공급** | ✅ 정상 |
| **대출 생성** | ✅ 정상 |
| **Vault 예치** | ✅ 정상 |
| **상환 기능** | ❌ 미해결 문제 존재 |

---

## 🎯 다음 단계

### 즉시 필요한 작업

1. **Error Code 분석**
   - [ ] Error selector `0x13be252b` 디코딩
   - [ ] Aave V3 에러 코드 매핑 확인
   - [ ] Sepolia Etherscan에서 failed TX 분석

2. **코드 리뷰**
   - [ ] ReentrancyGuard 중첩 문제 검토
   - [ ] ETH 전송 흐름 단계별 검증
   - [ ] VaultRouter와 AaveV3Vault 상호작용 확인

3. **대안 테스트**
   - [ ] 직접 AaveV3Vault.withdrawETH() 호출 테스트
   - [ ] VaultRouter 없이 직접 인출 테스트
   - [ ] 다른 금액으로 상환 테스트

### 중기 작업

4. **로깅 추가**
   - [ ] repay() 함수에 상세 로깅 추가
   - [ ] withdrawETH() 각 단계에 event 추가
   - [ ] 디버깅용 view 함수 추가

5. **단위 테스트**
   - [ ] withdrawETH() 단독 테스트
   - [ ] repay() 격리 테스트
   - [ ] 통합 시나리오 테스트

---

## 💡 임시 해결방안

현재 상환이 작동하지 않으므로, 다음 옵션 고려:

### Option 1: Emergency Withdrawal
owner가 강제로 담보를 인출할 수 있는 emergency 함수 추가

### Option 2: Direct Vault Withdrawal
사용자가 직접 vault에서 인출하고 별도로 상환하는 2단계 프로세스

### Option 3: Simplified Repay
ReentrancyGuard를 일시적으로 제거하고 테스트

---

## 📝 결론

1. **긍정적 진전:**
   - 중대한 ETH 이중 계산 버그 발견 및 수정
   - 재배포 성공
   - 대출 생성 및 Vault 예치 정상 작동

2. **미해결 문제:**
   - 상환 시 unknown custom error 발생
   - Error code `0x13be252b` 원인 미파악
   - 추가 조사 및 디버깅 필요

3. **권장사항:**
   - 프로덕션 배포 전 상환 기능 완전 수정 필수
   - 통합 테스트 강화
   - Error handling 개선

---

**Priority:** 🔴 **HIGH**
**Blocking:** 상환 기능 불가
**Expected Resolution Time:** 2-4 시간
**Status:** 🔄 **조사 진행 중**

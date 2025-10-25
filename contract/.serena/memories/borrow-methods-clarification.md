# Borrow Methods 명확화

## 최종 구조

### 1. Direct Borrow (Sepolia)
- **경로**: `/borrow`
- **네트워크**: Sepolia only
- **용도**: Sepolia에서 직접 borrow
- **특징**: 
  - 1개 트랜잭션
  - 빠름 (~15초)
  - 저렴 (브릿지 비용 없음)

### 2. Cross-Chain Borrow (Arbitrum → Sepolia)
- **경로**: `/borrow-crosschain`
- **네트워크**: Arbitrum Sepolia → Sepolia
- **용도**: Arbitrum Sepolia에서 Sepolia로 cross-chain borrow
- **특징**:
  - 2개 트랜잭션 (자동)
  - 느림 (~2-5분)
  - 비쌈 (브릿지 비용 포함)
  - Avail Nexus SDK 사용

## 네트워크 감지 로직

### /borrow-crosschain 페이지
1. Sepolia 감지 → Direct Borrow 페이지로 안내
2. Arbitrum Sepolia → Cross-chain borrow 실행
3. 기타 네트워크 → Arbitrum Sepolia로 전환 또는 Direct Borrow 안내

### /borrow 페이지  
- Sepolia에서만 작동
- Cross-chain borrow 페이지로 링크 제공

## 사용자 경험

### Sepolia 사용자
→ `/borrow` 사용 (직접)

### Arbitrum Sepolia 사용자
→ `/borrow-crosschain` 사용 (크로스체인)

## 문서화
- `/frontend/BORROW_METHODS.md` - 상세 비교 가이드
- 한국어로 작성
- 표와 예제 포함

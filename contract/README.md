# Hardhat 3 프로젝트 - eth-online

## 🚀 Hardhat 3에서 플러그인 없이 배포 성공!

이 프로젝트는 **Hardhat 3.0.7**을 사용하여 플러그인 없이 스마트 컨트랙트를 배포하는 방법을 보여줍니다.

## 주요 특징

- ✅ **Hardhat 3** 최신 버전 사용
- ✅ **플러그인 없이 배포** - 3가지 방법 구현
- ✅ **ESM 모듈** 시스템 지원
- ✅ **Solidity 0.8.28** 사용

## 설치

```bash
npm install
```

## 사용 가능한 명령어

```bash
# 컨트랙트 컴파일
npm run compile

# 로컬 노드 실행
npm run node

# 배포 (3가지 방법)
npm run deploy           # 간단한 배포
npm run deploy:ethers    # ethers.js Web3Provider 사용
npm run deploy:raw       # Raw Provider 사용

# 로컬 네트워크에 배포
npm run deploy:local     # 별도 터미널에서 npm run node 실행 후

# 클린업
npm run clean
```

## 배포 방법

### 방법 1: Simple Deployment
가장 간단한 배포 방법입니다.
```javascript
const provider = new ethers.BrowserProvider(connection.provider);
const factory = new ethers.ContractFactory(abi, bytecode, signer);
const contract = await factory.deploy();
```

### 방법 2: Ethers.js Web3Provider
자세한 로깅과 함께 배포합니다.
```javascript
const provider = new ethers.BrowserProvider(connection.provider);
// 상세한 배포 정보와 검증 포함
```

### 방법 3: Raw Provider
Low-level JSON-RPC 호출을 직접 사용합니다.
```javascript
const provider = connection.provider;
await provider.request({ method: "eth_sendTransaction", params: [...] });
```

## 프로젝트 구조

```
eth-online/
├── contracts/          # Solidity 스마트 컨트랙트
│   └── Lock.sol
├── scripts/            # 배포 스크립트
│   ├── deploy-simple.js
│   ├── deploy-ethers.js
│   └── deploy-raw.js
├── test/              # 테스트 파일
├── hardhat.config.js  # Hardhat 설정
└── package.json       # 프로젝트 의존성
```

## Hardhat 3 현재 상태

### ✅ 작동하는 기능
- Solidity 컴파일
- 컨트랙트 배포 (플러그인 없이!)
- 로컬 노드 실행
- ESM 모듈 지원

### ❌ 아직 작동하지 않는 기능
- Mocha/Chai 테스팅 (플러그인 호환성 대기 중)
- 대부분의 Hardhat 2.x 플러그인

## 기술 스택

- **Hardhat**: 3.0.7
- **Ethers.js**: 6.15.0
- **Solidity**: 0.8.28
- **Node.js**: 18+

## 라이선스

ISC

## 참고

자세한 내용은 [CLAUDE.md](./CLAUDE.md) 파일을 참조하세요.
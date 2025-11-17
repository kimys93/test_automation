# ReportPortal 사용 가이드

## 포트 설명

- **8082**: ReportPortal 메인 UI (테스트 결과를 보는 곳) ✅
- **8081**: Traefik Dashboard (트래픽 관리용, 테스트 결과 없음) ❌
- **8080**: ReportPortal API (내부 사용)

**중요**: 테스트 결과는 **8082**에서만 확인할 수 있습니다!

## ReportPortal 구조 이해

### 1. Launch (런치)
- **의미**: 한 번의 테스트 실행 단위
- **예시**: 
  - "Playwright Tests - 2024-01-15"
  - "Jenkins Build #123"
  - 각 테스트 실행마다 새로운 Launch가 생성됨
- **위치**: ReportPortal 메인 화면 → Launches 탭

### 2. Dashboard & Widget
- **Dashboard**: 여러 위젯을 모아서 보는 대시보드
- **Widget**: 통계, 차트, 그래프 등을 보여주는 위젯
  - 테스트 통계
  - 실패율 추이
  - 실행 시간 추이
  - 등등

**주의**: Widget은 통계를 보는 것이고, 실제 상세 테스트 결과는 **Launches**에서 봐야 합니다!

## Playwright 결과를 ReportPortal에 보여주는 방법

### 현재 설정 확인

1. **환경 변수 확인**:
   ```env
   REPORTPORTAL_ENABLED=true
   REPORTPORTAL_ENDPOINT=http://IP주소소:8082/api/v1  # ⚠️ /api/v1 필요!
   REPORTPORTAL_TOKEN=your_token
   REPORTPORTAL_PROJECT=test-automation
   REPORTPORTAL_LAUNCH=Playwright Tests
   ```

2. **API 엔드포인트 확인**:
   - `REPORTPORTAL_ENDPOINT`는 반드시 `/api/v1`로 끝나야 합니다
   - 예: `http://localhost:8082/api/v1` ✅
   - 예: `http://localhost:8082` ❌ (작동 안 함)

### 테스트 결과 확인 방법

#### 방법 1: Launches에서 확인 (권장)
1. `http://localhost:8082` 접속
2. 로그인
3. 프로젝트 선택
4. 상단 메뉴에서 **"Launches"** 클릭
5. Launch 목록에서 테스트 실행 선택
6. 상세 결과 확인:
   - 각 테스트 케이스별 결과
   - 스크린샷 (실패 시)
   - 로그 및 에러 메시지
   - 실행 시간

#### 방법 2: Dashboard Widget으로 통계 확인
1. `http://localhost:8082` 접속
2. **"Dashboard"** 메뉴 클릭
3. Widget 추가/편집:
   - **"Add Widget"** 클릭
   - 원하는 위젯 타입 선택:
     - **Overall Statistics**: 전체 통계
     - **Launch Statistics**: Launch별 통계
     - **Failed Cases**: 실패한 케이스
     - **Pass Rate**: 통과율
     - **Duration**: 실행 시간
   - Launch 필터 설정 (특정 Launch만 보려면)
   - 저장

### 문제 해결

#### 문제: 테스트 결과가 ReportPortal에 안 나타남

**확인 사항:**

1. **환경 변수가 제대로 설정되었는지 확인**
   ```bash
   # Jenkins에서 실행 시
   echo $REPORTPORTAL_ENABLED
   echo $REPORTPORTAL_ENDPOINT
   echo $REPORTPORTAL_TOKEN
   ```

2. **API 엔드포인트 확인**
   - `REPORTPORTAL_ENDPOINT`가 `/api/v1`로 끝나는지 확인
   - 예: `http://localhost:8082/api/v1` ✅

3. **토큰 확인**
   - ReportPortal에서 생성한 토큰이 올바른지 확인
   - 프로젝트 권한이 있는지 확인

4. **네트워크 연결 확인**
   - Jenkins 서버에서 ReportPortal 서버로 접근 가능한지 확인
   - `localhost`가 아닌 경우 실제 IP 주소 사용

5. **패키지 설치 확인**
   ```bash
   npm list @reportportal/agent-js-playwright
   ```

6. **테스트 실행 로그 확인**
   - ReportPortal 연결 관련 에러 메시지 확인
   - 네트워크 오류 확인

#### 문제: Launch는 보이는데 상세 결과가 없음

- Launch가 생성되었지만 테스트가 실행되지 않았을 수 있음
- Launch를 클릭해서 상세 페이지 확인
- 테스트 케이스가 등록되었는지 확인

## 올바른 사용 흐름

1. **테스트 실행**
   ```bash
   npm run test:sanity
   ```

2. **ReportPortal 확인**
   - `http://localhost:8082` 접속
   - **Launches** 탭에서 최신 Launch 확인
   - Launch 클릭하여 상세 결과 확인

3. **Dashboard 설정 (선택사항)**
   - Dashboard에서 Widget 추가
   - 통계 및 추이 확인

## Launch vs Widget 차이

| 항목 | Launch | Widget |
|------|--------|--------|
| 용도 | 개별 테스트 실행 결과 | 통계 및 추이 |
| 위치 | Launches 탭 | Dashboard |
| 내용 | 테스트 케이스별 상세 결과 | 집계된 통계 데이터 |
| 사용 시점 | 각 테스트 실행 후 | 여러 실행의 추이 확인 |

**결론**: 
- **상세 결과**는 **Launches**에서 확인
- **통계 및 추이**는 **Dashboard Widget**에서 확인


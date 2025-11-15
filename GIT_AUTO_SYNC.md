# Git 자동 동기화 설정 가이드

다른 사람이 코드를 변경했을 때 자동으로 최신 코드를 가져오는 방법입니다.

## 방법 1: VS Code 자동 동기화 (가장 간단) ⭐

VS Code를 사용하는 경우, 이미 `.vscode/settings.json`에 자동 동기화 설정이 포함되어 있습니다.

### 설정 확인
1. VS Code에서 프로젝트 열기
2. **설정** (Cmd + ,) → "git autofetch" 검색
3. **Git: Autofetch** 체크되어 있는지 확인

### 동작 방식
- VS Code가 실행 중일 때 **3분마다 자동으로** `git fetch` 실행
- 원격 저장소에 변경사항이 있으면 **소스 제어 패널**에 표시
- **동기화 아이콘** 클릭하면 자동으로 pull

### 수동 동기화
- **소스 제어 패널** (Cmd + Shift + G)에서 **동기화 아이콘** 클릭
- 또는 **Command Palette** (Cmd + Shift + P) → "Git: Sync" 실행

---

## 방법 2: GitHub Desktop (GUI 도구)

### 설치
```bash
brew install --cask github-desktop
```

### 설정
1. GitHub Desktop 실행
2. **Preferences** → **Advanced** → **Automatically fetch for updates** 체크
3. **Automatically fetch every [10] minutes** 설정

### 장점
- GUI로 변경사항 확인 가능
- 충돌 해결이 쉬움
- 히스토리 시각화

---

## 방법 3: Cursor/VS Code 확장 프로그램

### GitLens 확장 프로그램
1. **Extensions** (Cmd + Shift + X)에서 "GitLens" 검색
2. 설치 후 자동으로 Git 상태 표시
3. 변경사항 실시간 확인 가능

---

## 방법 4: macOS 자동화 (백그라운드 실행)

터미널을 사용하지 않고도 자동으로 동기화하려면:

### 간단한 방법
1. **Automator** 앱 실행
2. **Application** 선택
3. **Run Shell Script** 추가
4. 다음 스크립트 입력:
   ```bash
   cd /Users/kimys/Desktop/test_automation
   git pull origin main
   ```
5. 저장 후 **스케줄러**에서 주기적으로 실행

---

## 추천 방법

**VS Code 사용자**: 방법 1 (이미 설정됨)  
**GUI 선호**: 방법 2 (GitHub Desktop)  
**백그라운드 자동화**: 방법 4 (Automator)

---

## 주의사항

- 자동 pull은 **로컬에 커밋되지 않은 변경사항이 없을 때만** 안전합니다
- 충돌이 발생하면 수동으로 해결해야 합니다
- VS Code는 실행 중일 때만 자동 fetch가 작동합니다


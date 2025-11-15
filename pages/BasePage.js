import dotenv from 'dotenv';

// .env 파일에서 환경 변수 로드
dotenv.config();

/**
 * 기본 페이지 클래스
 * 모든 페이지 객체의 부모 클래스
 */
class BasePage {
  constructor(page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL;
    // 기본 요소들
    this.body = this.page.locator('body');
    this.navigation = this.page.locator('nav, header, .navbar, a[href*="login"], a[href*="board"]');
  }

  // 페이지로 이동 (path: 이동할 경로)
  async goto(path) {
    await this.page.goto(path);
  }

  // 대기 (ms: 대기 시간 밀리초)
  async wait(ms) {
    await this.page.waitForTimeout(ms);
  }

  // 페이지 본문 내용 가져오기
  async getBodyContent() {
    return await this.body.textContent();
  }

  // 네비게이션 요소 개수 확인
  async getNavigationCount() {
    return await this.navigation.count();
  }

  // 로그아웃 수행
  async logout() {
    const logoutButton = this.page.locator('button:has-text("로그아웃"), a:has-text("로그아웃"), #logoutBtn, .logout-button');
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click();
      await this.wait(1000); // 로그아웃 처리 대기
    } else {
      // 로그아웃 버튼이 없으면 쿠키/세션 삭제를 위해 로그인 페이지로 이동
      await this.goto('/login');
    }
  }
}

export default BasePage;
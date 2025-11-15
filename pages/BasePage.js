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
    // 드롭다운 메뉴 열기 (사용자 프로필 메뉴 등)
    const dropdownToggle = this.page.locator('.dropdown-toggle, .user-menu, [data-bs-toggle="dropdown"], button[aria-expanded="false"]').first();
    const logoutButton = this.page.locator('button:has-text("로그아웃"), a:has-text("로그아웃"), #logoutBtn, .logout-button, .dropdown-item:has-text("로그아웃")');
    
    // 드롭다운이 열려있는지 확인
    const isDropdownOpen = await this.page.locator('.dropdown-menu.show, .dropdown-menu[style*="display: block"]').count() > 0;
    
    if (!isDropdownOpen) {
      // 드롭다운이 닫혀있으면 열기
      if (await dropdownToggle.count() > 0) {
        await dropdownToggle.click();
        await this.wait(500); // 드롭다운 열림 대기
      }
    }
    
    // 로그아웃 버튼 클릭
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
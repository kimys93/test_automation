// @ts-ignore - dotenv 타입 선언이 없어도 정상 동작
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
    this.baseURL = 'http://192.168.219.103:3000';
    // 기본 요소들
    this.body = this.page.locator('body');
    this.navigation = this.page.locator('nav, header, .navbar');
    // 로그아웃 링크
    this.logoutLink = this.page.locator('a[onclick*="logout"], a:has-text("로그아웃")');
  }

  /**
   * 페이지로 이동
   * @param {string} path - 이동할 경로
   */
  async goto(path) {
    const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 대기
   * @param {number} ms - 대기 시간 (밀리초)
   */
  async wait(ms) {
    await this.page.waitForTimeout(ms);
  }

  /**
   * 페이지 본문 내용 가져오기
   */
  async getBodyContent() {
    return await this.body.textContent();
  }

  /**
   * 네비게이션 요소 개수 확인
   */
  async getNavigationCount() {
    return await this.navigation.count();
  }

  /**
   * 로그아웃 수행
   */
  async logout() {
    // 로그아웃 링크 클릭
    if (await this.logoutLink.count() > 0) {
      await this.logoutLink.first().click();
      await this.wait(1000);
    } else {
      // 로그아웃 링크가 없으면 로그인 페이지로 이동
      await this.goto('/login');
    }
  }
}

export default BasePage;

import BasePage from './BasePage.js';

/**
 * 로그인 페이지 객체
 */
class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    // 사용자명 입력 필드
    this.usernameInput = this.page.locator('#loginUsername');
    // 비밀번호 입력 필드
    this.passwordInput = this.page.locator('#loginPassword');
    // 로그인 제출 버튼
    this.submitButton = this.page.locator('button[type="submit"]');
    // 회원가입 링크
    this.registerLink = this.page.locator('a[href="/register"]');
    // 로그인 폼
    this.loginForm = this.page.locator('#loginForm');
  }

  /**
   * 로그인 페이지로 이동
   */
  async navigate() {
    await this.goto('/login');
  }

  /**
   * 로그인 수행
   * @param {string} username - 사용자명
   * @param {string} password - 비밀번호
   */
  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.waitForPageTransition();
    await this.wait(1000); // 로그인 처리 대기
  }
}

export default LoginPage;

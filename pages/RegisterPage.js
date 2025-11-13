import BasePage from './BasePage.js';

/**
 * 회원가입 페이지 객체
 */
class RegisterPage extends BasePage {
  constructor(page) {
    super(page);
    // 사용자명 입력 필드
    this.usernameInput = this.page.locator('#registerUsername, #username');
    // 이메일 입력 필드
    this.emailInput = this.page.locator('#registerEmail, #email');
    // 비밀번호 입력 필드
    this.passwordInput = this.page.locator('#registerPassword, #password');
    // 비밀번호 확인 입력 필드
    this.confirmPasswordInput = this.page.locator('#confirmPassword, #passwordConfirm');
    // 회원가입 제출 버튼
    this.submitButton = this.page.locator('button[type="submit"]');
    // 회원가입 폼 컨테이너
    this.registerForm = this.page.locator('#registerForm, form');
  }

  // 메서드
  /**
   * 회원가입 페이지로 이동
   */
  async navigate() {
    await this.goto('/register');
  }

  // 회원가입 수행 (userData: {username, email, password, confirmPassword})
  async register(userData) {
    if (userData.username) {
      await this.usernameInput.fill(userData.username);
    }
    if (userData.email) {
      await this.emailInput.fill(userData.email);
    }
    if (userData.password) {
      await this.passwordInput.fill(userData.password);
    }
    if (userData.confirmPassword) {
      await this.confirmPasswordInput.fill(userData.confirmPassword);
    }
    await this.submitButton.click();
  }
}

export default RegisterPage;


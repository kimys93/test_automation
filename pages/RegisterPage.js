import BasePage from './BasePage.js';

/**
 * 회원가입 페이지 객체
 */
class RegisterPage extends BasePage {
  constructor(page) {
    super(page);
    // 아이디 입력 필드
    this.usernameInput = this.page.locator('#username');
    // 아이디 중복확인 버튼
    this.checkUsernameButton = this.page.locator('#checkUsername');
    // 비밀번호 입력 필드
    this.passwordInput = this.page.locator('#password');
    // 비밀번호 확인 입력 필드
    this.confirmPasswordInput = this.page.locator('#confirmPassword');
    // 이름 입력 필드
    this.nameInput = this.page.locator('#name');
    // 이메일 입력 필드
    this.emailInput = this.page.locator('#email');
    // 이메일 중복확인 버튼
    this.checkEmailButton = this.page.locator('#checkEmail');
    // 성별 라디오 버튼
    this.genderM = this.page.locator('#genderM');
    this.genderF = this.page.locator('#genderF');
    // 전화번호 입력 필드
    this.phoneInput = this.page.locator('#phone');
    // 회원가입 제출 버튼
    this.submitButton = this.page.locator('button[type="submit"]');
    // 회원가입 폼
    this.registerForm = this.page.locator('#registerForm');
  }

  /**
   * 회원가입 페이지로 이동
   */
  async navigate() {
    await this.goto('/register');
    await this.wait(1000);
  }

  /**
   * 아이디 중복확인
   * @param {string} username - 확인할 아이디
   */
  async checkUsername(username) {
    await this.usernameInput.fill(username);
    await this.checkUsernameButton.click();
    await this.wait(1000);
  }

  /**
   * 이메일 중복확인
   * @param {string} email - 확인할 이메일
   */
  async checkEmail(email) {
    await this.emailInput.fill(email);
    await this.checkEmailButton.click();
    await this.wait(1000);
  }

  /**
   * 회원가입 수행
   * @param {object} userData - 회원가입 정보
   */
  async register(userData) {
    if (userData.username) {
      await this.usernameInput.fill(userData.username);
    }
    if (userData.password) {
      await this.passwordInput.fill(userData.password);
    }
    if (userData.confirmPassword) {
      await this.confirmPasswordInput.fill(userData.confirmPassword);
    }
    if (userData.name) {
      await this.nameInput.fill(userData.name);
    }
    if (userData.email) {
      await this.emailInput.fill(userData.email);
    }
    if (userData.gender === 'M') {
      await this.genderM.check();
    } else if (userData.gender === 'F') {
      await this.genderF.check();
    }
    if (userData.phone) {
      await this.phoneInput.fill(userData.phone);
    }
    await this.submitButton.click();
    await this.wait(2000);
  }
}

export default RegisterPage;

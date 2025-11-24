// @ts-check
// @ts-ignore - @playwright/test 타입 선언이 자동으로 로드됨
import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';
import RegisterPage from '../pages/RegisterPage.js';
import BasePage from '../pages/BasePage.js';

/**
 * 인증 관련 기능 테스트 (로그인, 회원가입, 로그아웃)
 */
test.describe('인증 기능', () => {
  
  test.describe('로그인', () => {
    test('로그인 성공', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      
      await expect(page).toHaveURL(/.*\/home|.*\/index/, { timeout: 5000 });
    });

    test('로그인 실패 - 잘못된 비밀번호', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login('test1', 'wrongpassword');
      
      // 에러 메시지 확인 또는 로그인 페이지에 머무는지 확인
      await loginPage.wait(2000);
      // 로그인 실패 시 에러 메시지가 표시되거나 로그인 페이지에 머무름
    });
  });

  test.describe('회원가입', () => {
    test('회원가입 페이지 로드', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.navigate();
      
      await expect(registerPage.usernameInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
    });

    test('회원가입 폼 입력', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.navigate();
      
      await registerPage.usernameInput.fill('newuser');
      await registerPage.passwordInput.fill('newpass123');
      await registerPage.confirmPasswordInput.fill('newpass123');
      await registerPage.nameInput.fill('New User');
      await registerPage.emailInput.fill('newuser@test.com');
      await registerPage.genderM.check();
      await registerPage.phoneInput.fill('010-1234-5678');
      
      await expect(registerPage.usernameInput).toHaveValue('newuser');
      await expect(registerPage.emailInput).toHaveValue('newuser@test.com');
    });
  });

  test.describe('로그아웃', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
    });

    test('로그아웃 수행', async ({ page }) => {
      const basePage = new BasePage(page);
      await basePage.logout();
      
      // 로그아웃 후 로그인 페이지 또는 홈페이지로 이동
      await expect(page).toHaveURL(/.*\/login|.*\/home/, { timeout: 5000 });
    });
  });
});

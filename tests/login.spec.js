// @ts-check
// @ts-ignore - @playwright/test 타입 선언이 자동으로 로드됨
import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';

/**
 * 로그인 기능 테스트
 */
test.describe('로그인 기능', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test('로그인 페이지 로드 확인', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/로그인/);
    
    // 로그인 폼 요소 확인
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('로그인 폼 입력 테스트', async () => {
    // 사용자명 입력
    await loginPage.usernameInput.fill('testuser');
    
    // 비밀번호 입력
    await loginPage.passwordInput.fill('testpass');
    
    // 입력값 확인
    await expect(loginPage.usernameInput).toHaveValue('testuser');
    await expect(loginPage.passwordInput).toHaveValue('testpass');
  });

  test('로그인 시도 (실제 계정 정보 필요)', async ({ page }) => {
    // 실제 테스트 계정 정보로 변경 필요
    const username = 'test1';
    const password = 'test1234';
    
    await loginPage.login(username, password);
    
    // 로그인 성공 시 홈페이지 또는 게시판으로 이동
    await expect(page).toHaveURL(/.*\/home|.*\/index/, { timeout: 5000 });
  });

  test('회원가입 링크 클릭', async ({ page }) => {
    // 회원가입 링크 클릭
    await loginPage.registerLink.click();
    
    // 회원가입 페이지로 이동했는지 확인
    await expect(page).toHaveURL(/.*register/);
  });
});

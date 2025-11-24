// @ts-check
// @ts-ignore - @playwright/test 타입 선언이 자동으로 로드됨
import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';
import BoardPage from '../pages/BoardPage.js';
import WritePage from '../pages/WritePage.js';
import RegisterPage from '../pages/RegisterPage.js';
import DetailPage from '../pages/DetailPage.js';
import ReservationPage from '../pages/ReservationPage.js';
import BasePage from '../pages/BasePage.js';

/**
 * Regression Test - 전체 기능 회귀 테스트
 * 모든 기능이 정상 작동하는지 종합적으로 검증
 */
test.describe('Regression Test - 전체 기능 검증', () => {
  
  // 로그인 관련 테스트
  test.describe('로그인 기능', () => {
    test('로그인 페이지 로드', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      
      await expect(loginPage.usernameInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('로그인 폼 입력', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      
      await loginPage.usernameInput.fill('testuser');
      await loginPage.passwordInput.fill('testpass');
      
      await expect(loginPage.usernameInput).toHaveValue('testuser');
      await expect(loginPage.passwordInput).toHaveValue('testpass');
    });

    test('회원가입 링크', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      
      await loginPage.registerLink.click();
      await expect(page).toHaveURL(/.*register/);
    });

    test('로그인 성공', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      
      await expect(page).toHaveURL(/.*\/home|.*\/index/);
    });
  });

  // 회원가입 관련 테스트
  test.describe('회원가입 기능', () => {
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

  // 게시판 관련 테스트
  test.describe('게시판 기능', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
    });

    test('게시판 페이지 로드', async ({ page }) => {
      const boardPage = new BoardPage(page);
      await boardPage.navigate();
      
      await expect(boardPage.pageTitle).toBeVisible();
      await expect(boardPage.postsTable).toBeVisible();
    });

    test('게시글 작성', async ({ page }) => {
      const boardPage = new BoardPage(page);
      const writePage = new WritePage(page);
      
      await boardPage.navigate();
      await boardPage.writeButton.click();
      
      const testTitle = `Regression 테스트 게시글 ${Date.now()}`;
      const testContent = 'Regression 테스트용 게시글 내용입니다.';
      
      await writePage.writePost(testTitle, testContent);
      
      await boardPage.navigate();
      await expect(boardPage.getPostByTitle(testTitle)).toBeVisible({ timeout: 5000 });
    });

    test('게시글 상세 조회', async ({ page }) => {
      const boardPage = new BoardPage(page);
      const detailPage = new DetailPage(page);
      
      await boardPage.navigate();
      await boardPage.clickFirstPost();
      
      await expect(detailPage.postTitle).toBeVisible();
      await expect(detailPage.postContent).toBeVisible();
    });

    test('댓글 작성', async ({ page }) => {
      const boardPage = new BoardPage(page);
      const detailPage = new DetailPage(page);
      
      await boardPage.navigate();
      await boardPage.clickFirstPost();
      
      const commentText = `Regression 테스트 댓글 ${Date.now()}`;
      await detailPage.writeComment(commentText);
      
      await expect(detailPage.commentsList).toContainText(commentText, { timeout: 3000 });
    });

    test('게시글 수정', async ({ page }) => {
      const boardPage = new BoardPage(page);
      const writePage = new WritePage(page);
      const detailPage = new DetailPage(page);
      
      // 게시글 작성
      await boardPage.navigate();
      await boardPage.writeButton.click();
      const testTitle = `수정 테스트 ${Date.now()}`;
      await writePage.writePost(testTitle, '원본 내용');
      
      // 게시글 상세로 이동
      await boardPage.navigate();
      await boardPage.clickPostByTitle(testTitle);
      
      // 수정 버튼 클릭
      if (await detailPage.editButton.isVisible()) {
        await detailPage.clickEditButton();
        await expect(page).toHaveURL(/.*\/modify|.*\/edit/);
      }
    });

    test('게시글 삭제', async ({ page }) => {
      const boardPage = new BoardPage(page);
      const writePage = new WritePage(page);
      const detailPage = new DetailPage(page);
      
      // 게시글 작성
      await boardPage.navigate();
      await boardPage.writeButton.click();
      const testTitle = `삭제 테스트 ${Date.now()}`;
      await writePage.writePost(testTitle, '삭제될 내용');
      
      // 게시글 상세로 이동
      await boardPage.navigate();
      await boardPage.clickPostByTitle(testTitle);
      
      // 삭제 버튼 클릭
      if (await detailPage.deleteButton.isVisible()) {
        await detailPage.confirmDelete();
        await boardPage.navigate();
        await expect(boardPage.getPostByTitle(testTitle)).not.toBeVisible({ timeout: 3000 });
      }
    });
  });

  // 회의실 예약 관련 테스트
  test.describe('회의실 예약 기능', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
    });

    test('회의실 예약 페이지 로드', async ({ page }) => {
      const reservationPage = new ReservationPage(page);
      await reservationPage.navigate();
      
      await expect(reservationPage.calendar).toBeVisible({ timeout: 5000 });
    });

    test('예약 모달 열기', async ({ page }) => {
      const reservationPage = new ReservationPage(page);
      await reservationPage.navigate();
      
      // 캘린더에서 날짜 클릭 (오늘 날짜)
      const today = new Date().toISOString().split('T')[0];
      await reservationPage.clickDate(today);
      
      // 예약 모달이 열리는지 확인
      await expect(reservationPage.reservationModal).toBeVisible({ timeout: 3000 });
    });
  });

  // 로그아웃 테스트
  test.describe('로그아웃 기능', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
    });

    test('로그아웃 수행', async ({ page }) => {
      const basePage = new BasePage(page);
      await basePage.logout();
      
      await expect(page).toHaveURL(/.*\/login|.*\/home/);
    });
  });
});

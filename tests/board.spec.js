// @ts-nocheck
import { test, expect } from '@playwright/test';
import BoardPage from '../pages/BoardPage.js';
import LoginPage from '../pages/LoginPage.js';

/**
 * 게시판 주요 기능 테스트
 */
test.describe('게시판 기능', () => {
  let boardPage;

  test.beforeEach(async ({ page }) => {
    // 로그인 먼저 수행
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('test1', 'test1234');
    
    boardPage = new BoardPage(page);
    await boardPage.navigate();
  });

  test('게시글 목록 표시 확인', async () => {
    // 게시글 목록 테이블 확인
    await expect(boardPage.postsTable).toBeVisible();
    await expect(boardPage.tableHeader).toBeVisible();
  });

  test('게시글 개수 확인', async () => {
    const postCount = await boardPage.getPostCount();
    expect(postCount).toBeGreaterThanOrEqual(0);
  });

  test('글쓰기 페이지 이동', async ({ page }) => {
    // 글쓰기 버튼 클릭
    await boardPage.writeButton.click();
    
    // 글쓰기 페이지로 이동 확인
    await expect(page).toHaveURL(/.*write/);
  });

  test('게시글 클릭하여 상세 페이지 이동', async ({ page }) => {
    const postCount = await boardPage.getPostCount();
    
    if (postCount > 0) {
      await boardPage.clickFirstPost();
      await expect(page).toHaveURL(/.*\/post\/\d+/);
    }
  });
});

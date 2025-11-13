// @ts-check
import { test, expect } from '@playwright/test';
import BoardPage from '../pages/BoardPage.js';

/**
 * 게시판 기본 기능 테스트 예제
 */
test.describe('게시판 기본 기능', () => {
  let boardPage;

  test.beforeEach(async ({ page }) => {
    boardPage = new BoardPage(page);
    await boardPage.navigate();
  });

  test('게시판 페이지 로드 확인', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/게시판/);
    
    // 주요 요소들이 표시되는지 확인
    await expect(boardPage.pageTitle).toContainText('게시판');
    await expect(boardPage.writeButton).toBeVisible();
    await expect(boardPage.searchInput).toBeVisible();
  });

  test('검색 기능 테스트', async () => {
    // 검색어 입력 및 검색 실행
    await boardPage.search('테스트');
  });

  test('글쓰기 버튼 클릭', async ({ page }) => {
    // 글쓰기 버튼 클릭
    await boardPage.writeButton.click();
    
    // 글쓰기 페이지로 이동했는지 확인
    await expect(page).toHaveURL(/.*write/);
  });
});


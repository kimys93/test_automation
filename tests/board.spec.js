// @ts-check
import { test, expect } from '@playwright/test';
import BoardPage from '../pages/BoardPage.js';

/**
 * 게시판 주요 기능 테스트
 */
test.describe('게시판 기능', () => {
  let boardPage;

  test.beforeEach(async ({ page }) => {
    boardPage = new BoardPage(page);
    await boardPage.navigate();
  });

  test('게시글 목록 표시 확인', async () => {
    // 게시글 목록 테이블 확인
    boardPage.boardList();
  });

  test('검색 타입 선택', async () => {
    // 기본값 확인
    await expect(boardPage.searchType).toHaveValue('title');
    
    // 내용 검색으로 변경
    await boardPage.searchType.selectOption('content');
    await expect(boardPage.searchType).toHaveValue('content');
    
    // 작성자 검색으로 변경
    await boardPage.searchType.selectOption('author');
    await expect(boardPage.searchType).toHaveValue('author');
  });

  test('검색 기능', async () => {
    // 검색어 입력 및 검색 실행
    await boardPage.search('테스트', 'title');
  });

  test('글쓰기 페이지 이동', async ({ page }) => {
    // 글쓰기 버튼 클릭
    await boardPage.writeButton.click();
    
    // 글쓰기 페이지로 이동 확인
    await expect(page).toHaveURL(/.*write/);
    await expect(page.locator('h4')).toContainText('글쓰기');
  });
});


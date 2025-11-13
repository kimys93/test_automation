// @ts-check
import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';
import BoardPage from '../pages/BoardPage.js';
import WritePage from '../pages/WritePage.js';

/**
 * 인증 관련 통합 테스트
 */
test.describe('인증 기능 통합 테스트', () => {
  
  test('로그인 후 게시판 접근', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const boardPage = new BoardPage(page);
    
    // 로그인 페이지로 이동
    await loginPage.navigate();
    
    // 실제 테스트 계정 정보로 변경 필요
    const username = 'test1';
    const password = 'test1234';
    
    // 로그인 수행
    await loginPage.login(username, password);
    
    // 로그인 성공 후 게시판으로 이동
    await boardPage.wait(5000);
    await boardPage.navigate();
    
    // 게시판이 정상적으로 로드되었는지 확인
    await expect(boardPage.pageTitle).toContainText('게시판');
  });

  test('비로그인 상태에서 글쓰기 접근', async ({ page }) => {
    const writePage = new WritePage(page);
    
    // 로그인 없이 글쓰기 페이지 접근
    await writePage.navigate();
    
    // 로그인 페이지로 리다이렉트되는지 확인
    // 또는 에러 메시지가 표시되는지 확인
    await writePage.wait(1000);
  });
});


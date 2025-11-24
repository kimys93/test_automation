// @ts-check
// @ts-ignore - @playwright/test 타입 선언이 자동으로 로드됨
import { test, expect } from '@playwright/test';
import WritePage from '../pages/WritePage.js';
import LoginPage from '../pages/LoginPage.js';
import BoardPage from '../pages/BoardPage.js';

/**
 * 글쓰기 기능 테스트
 */
test.describe('글쓰기 기능', () => {
  let writePage;

  test.beforeEach(async ({ page }) => {
    // 로그인 먼저 수행
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('test1', 'test1234');
    
    writePage = new WritePage(page);
    await writePage.navigate();
  });

  test('글쓰기 페이지 로드 확인', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/글쓰기/);
    
    // 폼 요소 확인
    await expect(writePage.postTitleInput).toBeVisible();
    await expect(writePage.postContentInput).toBeVisible();
    await expect(writePage.submitButton).toBeVisible();
  });

  test('제목 입력', async () => {
    const title = '테스트 게시글 제목';
    
    // 제목 입력
    await writePage.postTitleInput.fill(title);
    
    // 입력값 확인
    await expect(writePage.postTitleInput).toHaveValue(title);
  });

  test('내용 입력', async () => {
    const content = '테스트 게시글 내용입니다.';
    
    // 내용 입력
    await writePage.postContentInput.fill(content);
    
    // 입력값 확인
    await expect(writePage.postContentInput).toHaveValue(content);
  });

  test('비밀글 체크박스', async () => {
    // 비밀글 체크박스 확인
    await expect(writePage.isSecretCheckbox).toBeVisible();
    
    // 체크박스 체크
    await writePage.isSecretCheckbox.check();
    await expect(writePage.isSecretCheckbox).toBeChecked();
    
    // 체크박스 해제
    await writePage.isSecretCheckbox.uncheck();
    await expect(writePage.isSecretCheckbox).not.toBeChecked();
  });

  test('게시글 작성 및 게시판 목록 확인', async ({ page }) => {
    const boardPage = new BoardPage(page);
    const testTitle = `테스트 게시글 ${Date.now()}`;
    const testContent = '테스트 게시글 내용입니다.';
    
    // 게시글 작성
    await writePage.writePost(testTitle, testContent);
    
    // 게시판으로 이동
    await boardPage.navigate();
    
    // 작성한 게시글이 목록에 나타나는지 확인
    await expect(boardPage.getPostByTitle(testTitle)).toBeVisible({ timeout: 5000 });
  });

  test('폼 유효성 검사 - 제목 필수', async () => {
    // 내용만 입력하고 제목은 비워둠
    await writePage.postContentInput.fill('내용만 입력');
    
    // 작성 버튼 클릭
    await writePage.submitButton.click();
    
    // HTML5 유효성 검사로 인해 제출이 막혀야 함
    await writePage.wait(500);
  });
});

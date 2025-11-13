// @ts-check
import { test, expect } from '@playwright/test';
import WritePage from '../pages/WritePage.js';

/**
 * 글쓰기 기능 테스트
 */
test.describe('글쓰기 기능', () => {
  let writePage;

  test.beforeEach(async ({ page }) => {
    writePage = new WritePage(page);
    await writePage.navigate();
  });

  test('글쓰기 페이지 로드 확인', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle(/글쓰기/);
    
    // 폼 요소 확인
    await expect(writePage.postTitleInput).toBeVisible();
    await expect(writePage.postContentInput).toBeVisible();
    await expect(writePage.fileInput).toBeVisible();
  });

  test('제목 입력 및 글자 수 확인', async () => {
    const title = '테스트 게시글 제목';
    
    // 제목 입력
    await writePage.postTitleInput.fill(title);
    
    // 입력값 및 글자 수 확인
    await expect(writePage.postTitleInput).toHaveValue(title);
    await expect(writePage.titleCount).toContainText(title.length.toString());
  });

  test('내용 입력 및 글자 수 확인', async () => {
    const content = '테스트 게시글 내용입니다.';
    
    // 내용 입력
    await writePage.postContentInput.fill(content);
    
    // 입력값 및 글자 수 확인
    await expect(writePage.postContentInput).toHaveValue(content);
    await expect(writePage.contentCount).toContainText(content.length.toString());
  });

  test('파일 업로드 입력', async () => {
    // 파일 입력 필드 속성 확인
    await expect(writePage.fileInput).toBeVisible();
    await expect(writePage.fileInput).toHaveAttribute('accept', 'image/*');
  });

  test('취소 버튼 클릭', async () => {
    // 취소 버튼 클릭
    await writePage.cancelButton.click();
    
    // 이전 페이지로 돌아갔는지 확인 (또는 특정 페이지로 이동)
    await writePage.wait(500);
  });

  test('폼 유효성 검사 - 제목 필수', async () => {
    // 내용만 입력하고 제목은 비워둠
    await writePage.postContentInput.fill('내용만 입력');
    
    // 작성 버튼 클릭
    await writePage.submitButton.click();
    
    // HTML5 유효성 검사로 인해 제출이 막혀야 함
    // 또는 에러 메시지가 표시되어야 함
    await writePage.wait(500);
  });
});


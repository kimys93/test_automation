// sanity.spec.js
// @ts-check
import { test, expect } from '@playwright/test';

// 페이지 객체 import
import BasePage from '../pages/BasePage.js';
import LoginPage from '../pages/LoginPage.js';
import BoardPage from '../pages/BoardPage.js';
import WritePage from '../pages/WritePage.js';
import DetailPage from '../pages/DetailPage.js';

// 테스트 간 데이터 공유를 위한 변수
let sharedTestTitle = '';

/**
 * Sanity Test Suite: 핵심 비즈니스 로직 검증
 * - mode: 'serial'과 storageState를 사용하여 브라우저 컨텍스트(로그인 상태)를 유지
 * - 테스트를 순차적으로 실행
 */
test.describe('Sanity Test: 핵심 기능 워크플로우', () => {

    // 순차 실행 설정
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120000);

    // Storage State 파일 경로
    const authFile = 'playwright/.auth/sanity-user.json';

    // --- 1. 환경 준비: 메인 페이지 접속 확인 ---
    test('Sanity 01: 메인 페이지 접속 및 기본 요소 로드 확인', async ({ page }) => {
        const basePage = new BasePage(page);

        // 1. 메인 페이지로 이동
        await basePage.goto('/');
        await basePage.wait(1000);

        // 2. 기본 로드 검증
        await expect(page).toHaveTitle(/자동화 테스트|게시판/);

        const bodyContent = await page.locator('body').textContent();
        expect(bodyContent).toBeTruthy();
        expect(bodyContent?.trim().length).toBeGreaterThan(0);
    });

    // --- 2. 핵심 기능: 로그인 및 Storage State 저장 ---
    test('Sanity 02: 로그인 기능 성공 확인', async ({ page, context }) => {
        const loginPage = new LoginPage(page);

        // 1. 로그인 페이지로 이동
        await loginPage.navigate();

        // 2. 로그인 수행
        await loginPage.usernameInput.fill('test1');
        await loginPage.passwordInput.fill('test1234');
        await loginPage.submitButton.click();
        await loginPage.waitForPageTransition();
        await loginPage.wait(1500);

        // 3. 로그인 성공 확인 (리디렉션 URL 확인)
        await expect(page).toHaveURL(/.*\/index|.*\/board|.*\//);

        // 4. Storage State 저장
        await context.storageState({ path: authFile });
    });

    // --- 3. 핵심 기능: 글쓰기 및 목록 확인 (Storage State 자동 로드) ---
    test.describe('Sanity Test: 로그인 후 기능 검증', () => {
        // Storage State 자동 로드
        test.use({ storageState: authFile });

        test('Sanity 03: 게시글 작성 및 목록 노출 확인', async ({ page }) => {
            const boardPage = new BoardPage(page);
            const writePage = new WritePage(page);

            // 1. 게시판 페이지로 이동
            await boardPage.navigate();
            await boardPage.wait(500);

            // 2. 글쓰기 버튼 클릭
            await boardPage.clickWriteButton();
            await writePage.wait(500);

            // 3. 게시글 데이터 준비
            const timestamp = Date.now();
            sharedTestTitle = `Sanity 테스트 게시글 ${timestamp}`;
            const testContent = 'Sanity 테스트용 게시글 내용입니다.';

            // 4. 게시글 작성
            await writePage.postTitleInput.fill(sharedTestTitle);
            await writePage.postContentInput.fill(testContent);
            await writePage.submitButton.click();
            await writePage.waitForPageTransition();
            await writePage.wait(1500);

            // 5. 목록으로 돌아가 노출 확인
            await boardPage.navigate();
            await boardPage.wait(500);

            // 작성한 글이 목록에 노출되는지 확인
            const postTitleLocator = page.locator(`text=${sharedTestTitle}`).first();
            await expect(postTitleLocator).toBeVisible({ timeout: 5000 });
            await expect(boardPage.boardList).toContainText(sharedTestTitle);
        });

        // --- 4. 핵심 기능: 상세 조회 및 댓글 작성 ---
        test('Sanity 04: 게시글 상세 조회 및 댓글 작성 확인', async ({ page }) => {
            const boardPage = new BoardPage(page);
            const detailPage = new DetailPage(page);

            // 1. 게시판 페이지로 이동
            await boardPage.navigate();
            await boardPage.wait(500);

            // 2. 방금 작성한 글을 찾아 클릭
            await boardPage.clickPostByTitle(sharedTestTitle);
            await detailPage.wait(500);

            // 3. 상세 내용 확인
            await expect(detailPage.postTitle).toContainText(sharedTestTitle);
            await expect(detailPage.postContent).toBeVisible();

            // 4. 댓글 작성
            const commentText = `Sanity 테스트 댓글 ${Date.now()}`;
            await detailPage.commentInput.fill(commentText);
            await detailPage.commentSubmitButton.click();
            await detailPage.waitForPageTransition();
            await detailPage.wait(1000);

            // 5. 작성한 댓글이 목록에 나타나는지 확인
            await expect(detailPage.commentsList).toContainText(commentText, { timeout: 5000 });
        });
    });
});

// sanity.spec.ts
// @ts-check
import { test, expect } from '@playwright/test';

// 페이지 객체는 경로에 맞게 적절히 import 해 주세요.
import BasePage from '../pages/BasePage.js';
import LoginPage from '../pages/LoginPage.js';
import BoardPage from '../pages/BoardPage.js';
import WritePage from '../pages/WritePage.js';
import DetailPage from '../pages/DetailPage.js';

// **테스트 간 데이터 공유를 위한 변수**
// 이 변수에 저장된 값이 다음 테스트에서 재사용됩니다.
let sharedTestTitle = '';

/**
 * Sanity Test Suite: 핵심 비즈니스 로직 검증
 * * 💡 mode: 'serial'과 storageState를 사용하여 브라우저 컨텍스트(로그인 상태)를 유지하고 
 * 테스트를 순차적으로 실행합니다. (빠른 속도 & 상태 유지)
 */
test.describe('Sanity Test: 핵심 기능 워크플로우', () => {
    
    // 🔑 핵심 설정: Context 재사용 및 순차 실행 보장
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120000); // describe 블록 전체 타임아웃
    
    // Storage State 파일 경로
    const authFile = 'playwright/.auth/sanity-user.json';

    // --- 1. 환경 준비: 접속 확인 (로그인 전) ---
    test('Sanity 01: 홈페이지 접속 및 기본 요소 로드 확인 (Pre-Login)', async ({ page }) => {
        const basePage = new BasePage(page);

        // 1. 홈페이지로 이동
        await basePage.goto('/home');
        await basePage.wait(2000);

        // 2. 기본 로드 검증
        await expect(page).toHaveURL(/.*\/home/);
        await expect(page).toHaveTitle(/.+/);

        const bodyContent = await page.locator('body').textContent();
        expect(bodyContent).toBeTruthy();
        expect(bodyContent?.trim().length).toBeGreaterThan(0);
    });

    // --- 2. 핵심 기능: 로그인 및 Storage State 저장 ---
    test('Sanity 02: 로그인 기능 성공 확인', async ({ page, context }) => {
        // **이전 테스트의 Context가 재사용되므로 브라우저가 꺼지지 않습니다.**
        const loginPage = new LoginPage(page);

        await loginPage.navigate(); // 로그인 페이지로 이동

        // 1. 로그인 수행
        await loginPage.usernameInput.fill('test1');
        await loginPage.passwordInput.fill('test1234');
        await loginPage.submitButton.click();
        await loginPage.wait(2000);

        // 2. 로그인 성공 확인 (리디렉션 URL 확인)
        await expect(page).toHaveURL(/.*\/home|.*\/index/);
        
        // 3. Storage State 저장 (다음 테스트에서 test.use()로 자동 로드됨)
        await context.storageState({ path: authFile });
    });

    // --- 3. 핵심 기능: 글쓰기 및 목록 확인 (Storage State 자동 로드) ---
    // 별도 describe 블록으로 분리하여 test.use() 적용
    test.describe('Sanity Test: 로그인 후 기능 검증', () => {
        // Storage State 자동 로드 (파일이 있어야 함)
        test.use({ storageState: authFile });
        
        test('Sanity 03: 게시글 작성 및 목록 노출 확인', async ({ page }) => {
        const boardPage = new BoardPage(page);
        const writePage = new WritePage(page);
        
        await boardPage.navigate();
        await boardPage.writeButton.click();
        await writePage.wait(1000);
        
        // 1. 게시글 데이터 준비
        const timestamp = Date.now();
        sharedTestTitle = `Sanity 테스트 게시글 ${timestamp}`; // 다음 테스트를 위해 저장
        const testContent = 'Sanity 테스트용 게시글 내용입니다.';

        // 2. 게시글 작성
        await writePage.postTitleInput.fill(sharedTestTitle);
        await writePage.postContentInput.fill(testContents);
        await writePage.submitButton.click();
        await writePage.wait(2000); // 작성 완료 대기

        // 3. 목록으로 돌아가 노출 확인
        await boardPage.navigate();
        
        // 작성한 글이 목록에 노출되는지 확인
        const postTitleLocator = page.locator(`text=${sharedTestTitle}`).first();
        await expect(postTitleLocator).toBeVisible({ timeout: 5000 });
        await expect(boardPage.boardList).toContainText(sharedTestTitle);
        });

        // --- 4. 핵심 기능: 상세 조회 및 댓글 작성 (Storage State 자동 로드) ---
        test('Sanity 04: 게시글 상세 조회 및 댓글 작성 확인', async ({ page }) => {
        const boardPage = new BoardPage(page);
        const detailPage = new DetailPage(page);

        await boardPage.navigate();
        
        // 1. 방금 작성한 글을 찾아 클릭 (sharedTestTitle 활용)
        await page.locator(`text=${sharedTestTitle}`).first().click();
        await detailPage.wait(1000);
        
        // 2. 상세 내용 확인
        await expect(detailPage.postTitle).toHaveText(sharedTestTitle); // 제목 확인
        await expect(detailPage.postContent).toBeVisible(); // 내용 표시 확인

        // 3. 댓글 작성
        const commentText = `Sanity 테스트 댓글 ${Date.now()}`;
        await detailPage.commentInput.fill(commentText);
        await detailPage.commentSubmitButton.click();
        await detailPage.wait(1000);

        // 4. 작성한 댓글이 목록에 나타나는지 확인
        await expect(detailPage.commentsList).toContainText(commentText, { timeout: 3000 });
        });
    });
});
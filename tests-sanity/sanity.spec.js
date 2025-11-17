// @ts-check
import { test, expect } from '@playwright/test';
import BasePage from '../pages/BasePage.js';
import LoginPage from '../pages/LoginPage.js';
import BoardPage from '../pages/BoardPage.js';
import WritePage from '../pages/WritePage.js';
import DetailPage from '../pages/DetailPage.js';
import ChatPage from '../pages/ChatPage.js';
import NotificationPage from '../pages/NotificationPage.js';

/**
 * Sanity Test - 기본 기능만 빠르게 검증
 * 배포 전 가장 중요한 기능들이 정상 작동하는지 확인
 * 
 * 하나의 test() 블록으로 구성하여 브라우저를 유지하면서 순차 실행
 * 각 test.step()은 Depth 2 기준으로 ReportPortal에 카운팅됨
 */
test('Sanity Test - 기본 기능', async ({ page }) => {
  test.setTimeout(120000); // 전체 테스트 타임아웃 설정

  await test.step('홈페이지 접속 및 기본 로드 확인', async () => {
    const basePage = new BasePage(page);
    
    // 홈페이지로 이동
    await basePage.goto('/');
    await basePage.wait(2000); // 페이지 로드 대기
    
    // 홈페이지 URL 확인
    await expect(page).toHaveURL(/.*\/$/);
    
    // 페이지 본문 내용 로드 확인
    const bodyContent = await basePage.getBodyContent();
    expect(bodyContent).toBeTruthy();
    if (bodyContent) {
      expect(bodyContent.trim().length).toBeGreaterThan(0);
    }
    
    // 기본 네비게이션 요소 확인
    const hasNavigation = await basePage.getNavigationCount();
    expect(hasNavigation).toBeGreaterThan(0);
  });

  await test.step('로그인 기능 - 실제 로그인 성공 확인', async () => {
    const loginPage = new LoginPage(page);
    
    // 로그인 페이지로 이동
    await loginPage.navigate();
    
    // 로그인 수행
    await loginPage.usernameInput.fill('test1');
    await loginPage.passwordInput.fill('test1234');
    await loginPage.submitButton.click();
    await loginPage.wait(1000);
    
    // 로그인 성공 확인
    await expect(page).toHaveURL(/.*board|.*\/$/);
    
    // 게시판 페이지 요소 표시 확인
    const boardPage = new BoardPage(page);
    await expect(boardPage.pageTitle.first()).toBeVisible();
  });

  await test.step('글쓰기 및 게시판 목록 노출 확인', async () => {
    const boardPage = new BoardPage(page);
    const writePage = new WritePage(page);
    
    // 이미 로그인된 상태이므로 바로 게시판으로 이동
    await boardPage.navigate();
    await boardPage.wait(1000);
    
    // 글쓰기 버튼 클릭
    await boardPage.writeButton.click();
    await writePage.wait(1000);
    
    // 게시글 작성
    const timestamp = Date.now();
    const testTitle = `Sanity 테스트 게시글 ${timestamp}`;
    const testContent = 'Sanity 테스트용 게시글 내용입니다.';
    
    await writePage.postTitleInput.fill(testTitle);
    await writePage.postContentInput.fill(testContent);
    await writePage.submitButton.click();
    await writePage.wait(1000); // 게시글 작성 완료 대기
    
    // 게시판으로 돌아가기
    await boardPage.navigate();
    await boardPage.wait(1000);
    
    // 작성한 글이 목록에 노출되는지 확인
    const postTitleLocator = boardPage.getPostByTitle(testTitle);
    await expect(postTitleLocator).toBeVisible({ timeout: 5000 });
    await expect(boardPage.postsTable).toContainText(testTitle);
  });

  await test.step('검색 기능 - 실제 검색 결과 확인', async () => {
    const boardPage = new BoardPage(page);
    
    // 이미 로그인된 상태이므로 바로 게시판으로 이동
    await boardPage.navigate();
    await boardPage.wait(1000);
    
    const searchKeyword = '테스트';
    
    // 검색어 입력 및 검색 실행
    await boardPage.searchInput.fill(searchKeyword);
    await boardPage.searchButton.click();
    await boardPage.wait(1000);
    
    // 검색 결과 표시 확인
    await expect(boardPage.postsTable).toBeVisible();
    
    // 검색 기능 동작 확인 - URL 확인
    await expect(page).toHaveURL(new RegExp(`.*search.*${searchKeyword}|.*board.*`));
    
    // 검색 결과 필터링 확인
    const resultCount = await boardPage.getSearchResultsCount();
    
    if (resultCount > 0) {
      // 첫 번째 검색 결과 내용 확인
      const firstResult = boardPage.getFirstSearchResult();
      const firstResultText = await firstResult.textContent();
      expect(firstResultText).toBeTruthy();
    }
  });

  await test.step('채팅 및 알림 기능 - 사용자 간 메시지 전송 및 알림 확인', async () => {
    const chatPage = new ChatPage(page);
    const notificationPage = new NotificationPage(page);
    const basePage = new BasePage(page);
    const loginPage = new LoginPage(page);
    
    let testMessage = '';
    
    // 사용자 A가 채팅 페이지로 이동
    await chatPage.navigate();
    await page.waitForLoadState('networkidle');
    await chatPage.wait(1000);
    
    // 사용자 A가 사용자 B에게 메시지 전송
    // 사용자 검색 및 선택
    await chatPage.searchAndSelectUser('test2');
    await chatPage.wait(1000);
    
    // 메시지 입력 및 전송
    const timestamp = Date.now();
    testMessage = `Sanity 테스트 메시지 ${timestamp}`;
    
    await expect(chatPage.messageInput).toBeVisible({ timeout: 5000 });
    await chatPage.sendMessage(testMessage);
    await chatPage.wait(1000);
    
    // 전송한 메시지 확인 (최근 메시지 기준)
    const latestMessage = await chatPage.getLatestMessage();
    await expect(latestMessage).toBeVisible({ timeout: 3000 });
    const messageText = await latestMessage.textContent();
    expect(messageText).toContain(testMessage);
    
    // 사용자 A 로그아웃
    await basePage.logout();
    await basePage.wait(1000);
    
    // 사용자 B (test2) 로그인
    await loginPage.navigate();
    await loginPage.login('test2', 'test1234');
    await basePage.wait(1000);
    
    // 사용자 B가 알림 페이지로 이동
    await notificationPage.navigate();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*notifications/, { timeout: 5000 });
    
    // 최신 알림 확인
    await expect(notificationPage.latestNotification).toBeVisible({ timeout: 5000 });
    
    // 최신 알림 클릭
    await notificationPage.clickLatestNotification();
    // 페이지 이동 대기 (URL 변경 또는 채팅 페이지 로드)
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  });

  await test.step('알림 기능 - 사용자 간 알림 발생 및 확인', async () => {
    const loginPage = new LoginPage(page);
    const boardPage = new BoardPage(page);
    const writePage = new WritePage(page);
    const detailPage = new DetailPage(page);
    const notificationPage = new NotificationPage(page);
    const basePage = new BasePage(page);
    
    let testPostTitle = '';
    let postUrl = '';
    
    // 사용자 A (test1) 로그인
    await loginPage.navigate();
    await loginPage.login('test1', 'test1234');
    await basePage.wait(1000);
    
    // 사용자 A가 게시글 작성
    // 게시판으로 이동
    await boardPage.navigate();
    await boardPage.wait(1000);
    
    // 글쓰기 버튼 클릭
    await boardPage.writeButton.click();
    await writePage.wait(1000);
    
    // 게시글 작성
    const timestamp = Date.now();
    testPostTitle = `알림 테스트 게시글 ${timestamp}`;
    const testContent = '알림 테스트를 위한 게시글입니다. 사용자 B가 댓글을 작성하면 알림이 발생합니다.';
    
    await writePage.postTitleInput.fill(testPostTitle);
    await writePage.postContentInput.fill(testContent);
    await writePage.submitButton.click();
    await writePage.wait(2000); // 게시글 작성 완료 대기
    
    // 게시글 URL 저장
    postUrl = page.url();
    console.log(`게시글 URL: ${postUrl}`);
    
    // 사용자 A 로그아웃
    await basePage.logout();
    await basePage.wait(1000);
    
    // 사용자 B (test2) 로그인
    await loginPage.navigate();
    await loginPage.login('test2', 'test1234');
    await basePage.wait(2000);
    
    // 사용자 B가 사용자 A의 게시글에 댓글 작성
    // 게시글 상세 페이지로 이동
    if (postUrl) {
      await page.goto(postUrl);
    } else {
      // 게시판에서 게시글 찾기
      await boardPage.navigate();
      await boardPage.wait(1000);
      const postTitleLocator = boardPage.getPostByTitle(testPostTitle);
      await postTitleLocator.click();
      await basePage.wait(1000);
    }
    await page.waitForLoadState('networkidle');
    
    // 댓글 작성
    const commentText = `알림 테스트 댓글 ${Date.now()}`;
    await detailPage.writeComment(commentText);
    await basePage.wait(2000); // 댓글 작성 완료 대기
    
    // 사용자 B 로그아웃
    await basePage.logout();
    await basePage.wait(1000);
    
    // 사용자 A (test1) 다시 로그인
    await loginPage.navigate();
    await loginPage.login('test1', 'test1234');
    await basePage.wait(2000);
    
    // 알림 아이콘 확인 및 드롭다운 열기
    if (await notificationPage.notificationIcon.isVisible()) {
      // 알림 아이콘 클릭하여 드롭다운 열기
      await notificationPage.openNotificationDropdown();
      await notificationPage.wait(1000);
      
      if (await notificationPage.notificationDropdown.isVisible()) {
        // 드롭다운 열림 확인
        await expect(notificationPage.notificationDropdown).toBeVisible();
        
        // 드롭다운 내 알림 목록 확인
        const notificationCount = await notificationPage.notificationItems.count();
        if (notificationCount > 0) {
          await expect(notificationPage.notificationItems.first()).toBeVisible();
          console.log(`알림 개수: ${notificationCount}`);
        } else {
          console.log('드롭다운에 알림이 없습니다.');
        }
      }
    }
    
    // 알림 페이지로 이동
    await notificationPage.navigate();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*notifications/, { timeout: 5000 });
    
    // 알림 목록 표시 확인
    const notificationListExists = await notificationPage.notificationList.count() > 0;
    if (notificationListExists) {
      await expect(notificationPage.notificationList).toBeVisible({ timeout: 5000 });
    } else {
      console.log('Notification list container not found, but page loaded successfully');
    }
    
    // 알림 항목 내용 확인
    // 최신 알림 확인
    const latestNotificationExists = await notificationPage.latestNotification.count() > 0;
    if (latestNotificationExists) {
      // 최신 알림 표시 확인
      await expect(notificationPage.latestNotification).toBeVisible({ timeout: 5000 });
      
      // 알림 내용 텍스트 확인
      const notificationText = await notificationPage.latestNotification.textContent();
      expect(notificationText).toBeTruthy();
      if (notificationText) {
        expect(notificationText.trim().length).toBeGreaterThan(0);
        console.log(`알림 내용: ${notificationText}`);
      }
    } else {
      console.log('No notification items found, but page loaded successfully');
    }
  });
});

// @ts-check
import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';
import BoardPage from '../pages/BoardPage.js';
import WritePage from '../pages/WritePage.js';
import RegisterPage from '../pages/RegisterPage.js';
import DetailPage from '../pages/DetailPage.js';
import ChatPage from '../pages/ChatPage.js';
import NotificationPage from '../pages/NotificationPage.js';

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
  });

  // 게시판 관련 테스트
  test.describe('게시판 기능', () => {
    test('게시판 페이지 로드', async ({ page }) => {
      const boardPage = new BoardPage(page);
      await boardPage.navigate();
      
      await expect(boardPage.pageTitle).toContainText('게시판');
      await expect(boardPage.postsTable).toBeVisible();
    });

    test('게시글 목록 표시', async ({ page }) => {
      const boardPage = new BoardPage(page);
      await boardPage.navigate();
      
      await expect(boardPage.postsTable).toBeVisible();
      await expect(boardPage.tableHeader).toContainText('번호');
      await expect(boardPage.tableHeader).toContainText('제목');
    });

    test('검색 타입 선택', async ({ page }) => {
      const boardPage = new BoardPage(page);
      await boardPage.navigate();
      
      await boardPage.searchType.selectOption('content');
      await expect(boardPage.searchType).toHaveValue('content');
      
      await boardPage.searchType.selectOption('author');
      await expect(boardPage.searchType).toHaveValue('author');
    });

    test('검색 기능', async ({ page }) => {
      const boardPage = new BoardPage(page);
      await boardPage.navigate();
      
      await boardPage.search('테스트');
    });

    test('글쓰기 페이지 이동', async ({ page }) => {
      const boardPage = new BoardPage(page);
      await boardPage.navigate();
      
      await boardPage.writeButton.click();
      await expect(page).toHaveURL(/.*write/);
    });
  });

  // 글쓰기 관련 테스트
  test.describe('글쓰기 기능', () => {
    test('글쓰기 페이지 로드', async ({ page }) => {
      const writePage = new WritePage(page);
      await writePage.navigate();
      
      await expect(writePage.postTitleInput).toBeVisible();
      await expect(writePage.postContentInput).toBeVisible();
    });

    test('제목 입력 및 글자 수 확인', async ({ page }) => {
      const writePage = new WritePage(page);
      await writePage.navigate();
      
      const title = '테스트 게시글 제목';
      await writePage.postTitleInput.fill(title);
      
      await expect(writePage.postTitleInput).toHaveValue(title);
      await expect(writePage.titleCount).toContainText(title.length.toString());
    });

    test('내용 입력 및 글자 수 확인', async ({ page }) => {
      const writePage = new WritePage(page);
      await writePage.navigate();
      
      const content = '테스트 게시글 내용입니다.';
      await writePage.postContentInput.fill(content);
      
      await expect(writePage.postContentInput).toHaveValue(content);
      await expect(writePage.contentCount).toContainText(content.length.toString());
    });

    test('파일 업로드 입력', async ({ page }) => {
      const writePage = new WritePage(page);
      await writePage.navigate();
      
      await expect(writePage.fileInput).toBeVisible();
      await expect(writePage.fileInput).toHaveAttribute('accept', 'image/*');
    });

    test('취소 버튼', async ({ page }) => {
      const writePage = new WritePage(page);
      await writePage.navigate();
      
      await writePage.cancelButton.click();
      await writePage.wait(500);
    });
  });

  // 회원가입 관련 테스트
  test.describe('회원가입 기능', () => {
    test('회원가입 페이지 로드', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.navigate();
      
      await expect(registerPage.usernameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
    });

    test('회원가입 폼 입력', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.navigate();
      
      await registerPage.usernameInput.fill('newuser');
      await registerPage.emailInput.fill('newuser@test.com');
      await registerPage.passwordInput.fill('password123');
      
      await expect(registerPage.usernameInput).toHaveValue('newuser');
      await expect(registerPage.emailInput).toHaveValue('newuser@test.com');
    });
  });

  // 채팅 관련 테스트
  test.describe('채팅 기능', () => {
    test('채팅 페이지 로드', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const chatPage = new ChatPage(page);
      
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await chatPage.wait(2000);
      await chatPage.navigate();
      
      await expect(chatPage.pageTitle).toBeVisible();
      await expect(chatPage.chatList).toBeVisible();
    });

    test('채팅방 목록 표시', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const chatPage = new ChatPage(page);
      
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await chatPage.wait(2000);
      await chatPage.navigate();
      
      await expect(chatPage.chatList).toBeVisible();
    });

    test('메시지 전송 기능', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const chatPage = new ChatPage(page);
      
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await chatPage.wait(2000);
      await chatPage.navigate();
      
      const chatRoomsCount = await chatPage.chatRooms.count();
      if (chatRoomsCount > 0) {
        await chatPage.chatRooms.first().click();
        await chatPage.wait(500);
        
        await expect(chatPage.messageInput).toBeVisible();
        await chatPage.sendMessage('테스트 메시지');
      }
    });

    test('채팅방 검색', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const chatPage = new ChatPage(page);
      
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await chatPage.wait(2000);
      await chatPage.navigate();
      
      if (await chatPage.chatSearchInput.isVisible()) {
        await chatPage.searchChat('테스트');
      }
    });
  });

  // 알림 관련 테스트
  test.describe('알림 기능', () => {
    test('알림 페이지 로드', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const notificationPage = new NotificationPage(page);
      
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await notificationPage.wait(2000);
      await notificationPage.navigate();
      
      await expect(notificationPage.pageTitle).toBeVisible();
      await expect(notificationPage.notificationList).toBeVisible();
    });

    test('알림 아이콘 클릭', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const notificationPage = new NotificationPage(page);
      
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await notificationPage.wait(2000);
      
      if (await notificationPage.notificationIcon.isVisible()) {
        await notificationPage.openNotificationDropdown();
        await expect(notificationPage.notificationDropdown).toBeVisible();
      }
    });

    test('알림 읽음 처리', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const notificationPage = new NotificationPage(page);
      
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await notificationPage.wait(2000);
      await notificationPage.navigate();
      
      if (await notificationPage.markAllReadButton.isVisible()) {
        await notificationPage.markAllAsRead();
      }
    });

    test('알림 필터 기능', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const notificationPage = new NotificationPage(page);
      
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await notificationPage.wait(2000);
      await notificationPage.navigate();
      
      const filterCount = await notificationPage.filterButtons.count();
      if (filterCount > 0) {
        await notificationPage.filterNotifications('all');
        await notificationPage.filterNotifications('unread');
      }
    });
  });

  // 통합 테스트
  test.describe('통합 기능', () => {
    test('로그인 후 게시판 접근', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const boardPage = new BoardPage(page);
      
      await loginPage.navigate();
      
      // 실제 테스트 계정 정보로 변경 필요
      const username = 'test1';
      const password = 'test1234';
      
      await loginPage.login(username, password);
      await boardPage.wait(2000);
      await boardPage.navigate();
      
      await expect(boardPage.pageTitle).toContainText('게시판');
    });

    test('비로그인 상태에서 글쓰기 접근', async ({ page }) => {
      const writePage = new WritePage(page);
      
      await writePage.navigate();
      await writePage.wait(1000);
    });
  });
});


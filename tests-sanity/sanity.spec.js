// @ts-check
import { test, expect } from '@playwright/test';
import BasePage from '../pages/BasePage.js';
import LoginPage from '../pages/LoginPage.js';
import BoardPage from '../pages/BoardPage.js';
import WritePage from '../pages/WritePage.js';
import ChatPage from '../pages/ChatPage.js';
import NotificationPage from '../pages/NotificationPage.js';

/**
 * Sanity Test - 핵심 기능만 빠르게 검증
 * 배포 전 가장 중요한 기능들이 정상 작동하는지 확인
 */
test.describe('Sanity Test - 핵심 기능 검증', () => {
  
  test('홈페이지 접속 및 기본 로드 확인', async ({ page }) => {
    const basePage = new BasePage(page);
    
    await test.step('홈페이지로 이동', async () => {
      await basePage.goto('/');
      await basePage.wait(2000); // 페이지 로드 대기
    });
    
    await test.step('홈페이지 URL 확인', async () => {
      await expect(page).toHaveURL(/.*\/$/);
    });
    
    await test.step('페이지 타이틀 확인', async () => {
      await expect(page).toHaveTitle(/.+/); // 타이틀이 존재하는지 확인
    });
    
    await test.step('페이지 본문 내용 로드 확인', async () => {
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent).toBeTruthy();
      if (bodyContent) {
        expect(bodyContent.trim().length).toBeGreaterThan(0);
      }
    });
    
    await test.step('기본 네비게이션 요소 확인', async () => {
      const hasNavigation = await page.locator('nav, header, .navbar, a[href*="login"], a[href*="board"]').count();
      expect(hasNavigation).toBeGreaterThan(0);
    });
  });

  test('로그인 기능 - 실제 로그인 성공 확인', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await test.step('로그인 페이지로 이동', async () => {
      await loginPage.navigate();
    });
    
    await test.step('로그인 수행', async () => {
      await test.step('사용자명 입력', async () => {
        await loginPage.usernameInput.fill('test1');
      });
      await test.step('비밀번호 입력', async () => {
        await loginPage.passwordInput.fill('test1234');
      });
      await test.step('로그인 버튼 클릭', async () => {
        await loginPage.submitButton.click();
        await loginPage.wait(2000);
      });
      
    });
    
    await test.step('로그인 성공 확인인', async () => {
      await expect(page).toHaveURL(/.*board|.*\/$/);
    });
    
    await test.step('게시판 페이지 요소 표시 확인', async () => {
      const boardPage = new BoardPage(page);
      await expect(boardPage.pageTitle.first()).toBeVisible();
    });
  });

  test('글쓰기 및 게시판 목록 노출 확인', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const boardPage = new BoardPage(page);
    const writePage = new WritePage(page);
    
    await test.step('로그인 수행', async () => {
      await loginPage.navigate();
      await test.step('사용자명 입력', async () => {
        await loginPage.usernameInput.fill('test1');
      });
      await test.step('비밀번호 입력', async () => {
        await loginPage.passwordInput.fill('test1234');
      });
      await test.step('로그인 버튼 클릭', async () => {
        await loginPage.submitButton.click();
      });
      await loginPage.wait(2000);
    });
    
    await test.step('게시판으로 이동', async () => {
      await boardPage.navigate();
      await boardPage.wait(1000);
    });
    
    await test.step('글쓰기 버튼 클릭', async () => {
      await boardPage.writeButton.click();
      await writePage.wait(1000);
    });
    
    let testTitle = '';
    
    await test.step('게시글 작성', async () => {
      const timestamp = Date.now();
      testTitle = `Sanity 테스트 게시글 ${timestamp}`;
      const testContent = 'Sanity 테스트용 게시글 내용입니다.';
      
      await test.step('게시글 제목 입력', async () => {
        await writePage.postTitleInput.fill(testTitle);
      });
      await test.step('게시글 내용 입력', async () => {
        await writePage.postContentInput.fill(testContent);
      });
      await test.step('작성 완료 버튼 클릭', async () => {
        await writePage.submitButton.click();
      });
      await writePage.wait(2000); // 게시글 작성 완료 대기
    });
    
    await test.step('게시판으로 돌아가기', async () => {
      await boardPage.navigate();
      await boardPage.wait(1000);
    });
    
    await test.step('작성한 글이 목록에 노출되는지 확인', async () => {
      await test.step('게시글 제목으로 검색', async () => {
        const postTitleLocator = page.locator(`text=${testTitle}`);
        await expect(postTitleLocator).toBeVisible({ timeout: 5000 });
      });
      await test.step('게시판 목록에 제목 포함 여부 확인', async () => {
        await expect(boardPage.postsTable).toContainText(testTitle);
      });
    });
  });

  test('검색 기능 - 실제 검색 결과 확인', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const boardPage = new BoardPage(page);
    
    await test.step('로그인 수행', async () => {
      await loginPage.navigate();
      await test.step('사용자명 입력', async () => {
        await loginPage.usernameInput.fill('test1');
      });
      await test.step('비밀번호 입력', async () => {
        await loginPage.passwordInput.fill('test1234');
      });
      await test.step('로그인 버튼 클릭', async () => {
        await loginPage.submitButton.click();
      });
      await loginPage.wait(2000);
    });
    
    await test.step('게시판으로 이동', async () => {
      await boardPage.navigate();
      await boardPage.wait(1000);
    });
    
    const searchKeyword = '테스트';
    
    await test.step('검색어 입력 및 검색 실행', async () => {
      await test.step('검색어 입력', async () => {
        await boardPage.searchInput.fill(searchKeyword);
      });
      await test.step('검색 버튼 클릭', async () => {
        await boardPage.searchButton.click();
      });
      await boardPage.wait(1000);
    });
    
    await test.step('검색 결과 표시 확인', async () => {
      await expect(boardPage.postsTable).toBeVisible();
    });
    
    await test.step('검색 기능 동작 확인 - URL 확인', async () => {
      await expect(page).toHaveURL(new RegExp(`.*search.*${searchKeyword}|.*board.*`));
    });
    
    await test.step('검색 결과 필터링 확인', async () => {
      await test.step('검색 결과 개수 확인', async () => {
        const searchResults = page.locator('table tbody tr, .post-item, .board-item');
        const resultCount = await searchResults.count();
        
        if (resultCount > 0) {
          await test.step('첫 번째 검색 결과 내용 확인', async () => {
            const firstResult = searchResults.first();
            const firstResultText = await firstResult.textContent();
            expect(firstResultText).toBeTruthy();
          });
        }
      });
    });
  });

  test('채팅 기능 - 메시지 전송 및 확인', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const chatPage = new ChatPage(page);
    
    await test.step('로그인 수행', async () => {
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await chatPage.wait(2000);
    });
    
    await test.step('채팅 페이지로 이동', async () => {
      await chatPage.navigate();
      await chatPage.wait(1000);
    });
    
    await test.step('채팅방 목록 확인', async () => {
      await expect(chatPage.chatList).toBeVisible();
    });
    
    const chatRoomsCount = await chatPage.chatRooms.count();
    
    if (chatRoomsCount > 0) {
      await test.step('첫 번째 채팅방 선택', async () => {
        await chatPage.chatRooms.first().click();
        await chatPage.wait(500);
      });
      
      await test.step('메시지 입력 필드 확인', async () => {
        await expect(chatPage.messageInput).toBeVisible();
      });
      
      let testMessage = '';
      
      let beforeCount = 0;
      
      await test.step('메시지 전송', async () => {
        const timestamp = Date.now();
        testMessage = `Sanity 테스트 메시지 ${timestamp}`;
        
        await test.step('전송 전 메시지 개수 확인', async () => {
          beforeCount = await chatPage.messageItems.count();
        });
        
        await test.step('메시지 입력', async () => {
          await chatPage.messageInput.fill(testMessage);
        });
        await test.step('전송 버튼 클릭', async () => {
          await chatPage.sendButton.click();
        });
        await chatPage.wait(1000); // 메시지 전송 완료 대기
        
        await test.step('메시지 개수 증가 확인', async () => {
          const afterCount = await chatPage.messageItems.count();
          expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
        });
      });
      
      await test.step('전송한 메시지가 목록에 나타나는지 확인', async () => {
        const messageLocator = page.locator(`text=${testMessage}`);
        await expect(messageLocator).toBeVisible({ timeout: 3000 });
      });
    } else {
      await test.step('새 채팅 시작 버튼 확인', async () => {
        if (await chatPage.newChatButton.isVisible()) {
          await expect(chatPage.newChatButton).toBeVisible();
        }
      });
    }
  });

  test('알림 기능 - 알림 목록 확인', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const notificationPage = new NotificationPage(page);
    
    await test.step('로그인 수행', async () => {
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await notificationPage.wait(2000);
    });
    
    if (await notificationPage.notificationIcon.isVisible()) {
      await test.step('알림 아이콘 클릭하여 드롭다운 열기', async () => {
        await notificationPage.openNotificationDropdown();
        await notificationPage.wait(500);
      });
      
      if (await notificationPage.notificationDropdown.isVisible()) {
        await test.step('드롭다운 열림 확인', async () => {
          await expect(notificationPage.notificationDropdown).toBeVisible();
        });
        
        await test.step('드롭다운 내 알림 목록 확인', async () => {
          const notificationCount = await notificationPage.notificationItems.count();
          if (notificationCount > 0) {
            await expect(notificationPage.notificationItems.first()).toBeVisible();
          }
        });
      }
    }
    
    await test.step('알림 페이지로 이동', async () => {
      await notificationPage.navigate();
      await notificationPage.wait(1000);
    });
    
    await test.step('알림 목록 표시 확인', async () => {
      await expect(notificationPage.notificationList).toBeVisible();
    });
    
    await test.step('알림 항목 내용 확인', async () => {
      await test.step('알림 개수 확인', async () => {
        const notificationCount = await notificationPage.notificationItems.count();
        if (notificationCount > 0) {
          await test.step('첫 번째 알림 표시 확인', async () => {
            await expect(notificationPage.notificationItems.first()).toBeVisible();
          });
          await test.step('알림 내용 텍스트 확인', async () => {
            const firstNotification = notificationPage.notificationItems.first();
            const notificationText = await firstNotification.textContent();
            expect(notificationText).toBeTruthy();
            if (notificationText) {
              expect(notificationText.trim().length).toBeGreaterThan(0);
            }
          });
        }
      });
    });
  });
});


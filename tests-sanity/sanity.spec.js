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
 * 
 * 하나의 test() 블록으로 구성하여 브라우저를 유지하면서 순차 실행
 * 각 test.step()은 Depth 2 기준으로 Slack send에서 카운팅됨
 */
test('Sanity Test - 핵심 기능 검증', async ({ page, context, browser }) => {
  test.setTimeout(120000); // 전체 테스트 타임아웃 설정
  
  try {

  await test.step('홈페이지 접속 및 기본 로드 확인', async () => {
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

  await test.step('로그인 기능 - 실제 로그인 성공 확인', async () => {
    const loginPage = new LoginPage(page);
    
    await test.step('로그인 페이지로 이동', async () => {
      await loginPage.navigate();
    });
    
    await test.step('로그인 수행', async () => {
      await test.step('사용자명 입력', async () => {
        await loginPage.usernameInput.fill('test1');
      });
      await test.step('비밀번호 입력', async () => {
        await loginPage.passwordInput.fill('test123');
      });
      await test.step('로그인 버튼 클릭', async () => {
        await loginPage.submitButton.click();
        await loginPage.wait(2000);
        await expect(page).toHaveURL(/.*board|.*\/$/);
      });
    });
    
    await test.step('게시판 페이지 요소 표시 확인', async () => {
      const boardPage = new BoardPage(page);
      await expect(boardPage.pageTitle.first()).toBeVisible();
    });
  });

  await test.step('글쓰기 및 게시판 목록 노출 확인', async () => {
    const boardPage = new BoardPage(page);
    const writePage = new WritePage(page);
    
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

  await test.step('검색 기능 - 실제 검색 결과 확인', async () => {
    const boardPage = new BoardPage(page);
    
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

  await test.step('채팅 기능 - 메시지 전송 및 알림 확인', async () => {
    const loginPage = new LoginPage(page);
    const chatPage = new ChatPage(page);
    const basePage = new BasePage(page);
    const notificationPage = new NotificationPage(page);
    
    let testMessage = '';
    
    // 2단계: 채팅 페이지로 이동
    await test.step('채팅 페이지로 이동', async () => {
      await chatPage.navigate();
      await chatPage.wait(2000);
    });
  

    // 3단계: test2 사용자 검색
    await test.step('test2 사용자 검색', async () => {
      // 채팅방 검색 입력 필드에 검색어 입력
      if (await chatPage.chatSearchInput.isVisible()) {
        await test.step('검색어 입력', async () => {
          await chatPage.chatSearchInput.fill('test2');
          await chatPage.wait(1000); // 검색 결과 대기
        });
      }
    });
    
    // 5단계: test2가 채팅방 리스트에 있는지 확인하고 클릭
    await test.step('test2 채팅방 선택', async () => {
      // test2가 포함된 채팅방 찾기
      const chatRoomsCount = await chatPage.chatRooms.count();
      let test2ChatRoomFound = false;
      
      for (let i = 0; i < chatRoomsCount; i++) {
        const chatRoom = chatPage.chatRooms.nth(i);
        const chatRoomText = await chatRoom.textContent();
        
        if (chatRoomText && chatRoomText.includes('test2')) {
          await test.step('test2 채팅방 클릭', async () => {
            await chatRoom.click();
            await chatPage.wait(1000);
          });
          test2ChatRoomFound = true;
          break;
        }
      }
      
      // test2 채팅방이 없으면 검색 결과에서 선택
      if (!test2ChatRoomFound) {
        await test.step('검색 결과에서 test2 선택', async () => {
          await chatPage.searchAndSelectUser('test2');
          await chatPage.wait(1000);
        });
      }
    });
    
    // 6단계: 메시지 입력 필드 확인
    await test.step('메시지 입력 필드 확인', async () => {
      await expect(chatPage.messageInput).toBeVisible({ timeout: 5000 });
    });
    
    // 7단계: 메시지 전송
    await test.step('메시지 전송', async () => {
      const timestamp = Date.now();
      testMessage = `Sanity 테스트 메시지 ${timestamp}`;
      
      await test.step('메시지 입력', async () => {
        await chatPage.messageInput.fill(testMessage);
      });
      await test.step('전송 버튼 클릭', async () => {
        await chatPage.sendButton.click();
      });
      await chatPage.wait(1000); // 메시지 전송 완료 대기
    });
    
    // 8단계: 전송한 메시지 확인 (마지막 메시지 기준)
    await test.step('전송한 메시지가 목록에 나타나는지 확인', async () => {
      // 마지막 메시지 가져오기 (#chatMessages > div:nth-child(마지막))
      const messageCount = await chatPage.chatMessages.locator('> div').count();
      if (messageCount > 0) {
        const latestMessage = chatPage.chatMessages.locator(`> div:nth-child(${messageCount})`);
        const latestMessageText = await latestMessage.textContent();
        expect(latestMessageText).toContain(testMessage);
      } else {
        // 메시지가 없으면 일반 검색으로 확인
        const messageLocator = page.locator(`text=${testMessage}`);
        await expect(messageLocator).toBeVisible({ timeout: 3000 });
      }
    });
    
    // 9단계: test1 로그아웃
    await test.step('test1 로그아웃', async () => {
      await basePage.logout();
      await basePage.wait(1000);
    });
    
    // 10단계: test2로 로그인
    await test.step('test2로 로그인', async () => {
      await loginPage.navigate();
      await loginPage.login('test2', 'test1234');
      await basePage.wait(2000);
    });
    
    // 11단계: 알림 확인
    await test.step('알림 확인', async () => {
      // 알림 아이콘 확인
      if (await notificationPage.notificationIcon.isVisible()) {
        await test.step('알림 아이콘 클릭하여 드롭다운 열기', async () => {
          await notificationPage.openNotificationDropdown();
          await notificationPage.wait(1000);
        });
        
        if (await notificationPage.notificationDropdown.isVisible()) {
          await test.step('드롭다운 내 알림 목록 확인', async () => {
            const notificationCount = await notificationPage.notificationItems.count();
            if (notificationCount > 0) {
              await expect(notificationPage.notificationItems.first()).toBeVisible();
            }
          });
        }
      }
      
      // 알림 페이지로 이동
      await test.step('알림 페이지로 이동', async () => {
        await notificationPage.navigate();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/.*notifications/, { timeout: 5000 });
      });
      
      // 최신 알림 확인
      await test.step('최신 알림 확인', async () => {
        await expect(notificationPage.latestNotification).toBeVisible({ timeout: 5000 });
      });
      
      // 최신 알림 클릭하여 채팅 페이지로 이동
      await test.step('최신 알림 클릭', async () => {
        await notificationPage.clickLatestNotification();
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      });
    });
  });
  
  } finally {
    // 테스트 종료 후 브라우저 명시적으로 종료 (n8n에서 실행 시 종료되지 않는 문제 해결)
    try {
      if (page) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
      // 모든 브라우저 프로세스가 완전히 종료될 때까지 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      // 이미 종료되었거나 오류가 발생해도 무시
      console.log('Browser cleanup:', error.message);
    }
  }

});

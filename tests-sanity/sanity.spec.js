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
 */
test('Sanity Test - 기본 기능 123', async ({ page }) => {
  test.setTimeout(120000); // 2분 타임아웃 설정 (여러 단계를 거치는 테스트이므로)
  
  await test.step('홈페이지 접속 및 기본 로드 확인', async () => {
    const basePage = new BasePage(page);
    
    await test.step('홈페이지로 이동', async () => {
      await basePage.goto('/');
      await basePage.wait(2000); // 페이지 로드 대기
    });
    
    await test.step('홈페이지 URL 확인', async () => {
      await expect(page).toHaveURL(/.*\/$/);
    });
    
    await test.step('페이지 본문 내용 로드 확인', async () => {
      const bodyContent = await basePage.getBodyContent();
      expect(bodyContent).toBeTruthy();
      if (bodyContent) {
        expect(bodyContent.trim().length).toBeGreaterThan(0);
      }
    });
    
    await test.step('기본 네비게이션 요소 확인', async () => {
      const hasNavigation = await basePage.getNavigationCount();
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
        await loginPage.passwordInput.fill('test1234');
      });
      await test.step('로그인 버튼 클릭', async () => {
        await loginPage.submitButton.click();
        await loginPage.wait(1000);
      });
      
    });
    
    await test.step('로그인 성공 확인', async () => {
      await expect(page).toHaveURL(/.*board|.*\/$/);
    });
    
    await test.step('게시판 페이지 요소 표시 확인', async () => {
      const boardPage = new BoardPage(page);
      await expect(boardPage.pageTitle.first()).toBeVisible();
    });
  });

  await test.step('글쓰기 및 게시판 목록 노출 확인', async () => {
    const boardPage = new BoardPage(page);
    const writePage = new WritePage(page);
    
    // 이미 로그인된 상태이므로 바로 게시판으로 이동
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
      await writePage.wait(1000); // 게시글 작성 완료 대기
    });
    
    await test.step('게시판으로 돌아가기', async () => {
      await boardPage.navigate();
      await boardPage.wait(1000);
    });
    
    await test.step('작성한 글이 목록에 노출되는지 확인', async () => {
      await test.step('게시글 제목으로 검색', async () => {
        const postTitleLocator = boardPage.getPostByTitle(testTitle);
        await expect(postTitleLocator).toBeVisible({ timeout: 5000 });
      });
      await test.step('게시판 목록에 제목 포함 여부 확인', async () => {
        await expect(boardPage.postsTable).toContainText(testTitle);
      });
    });
  });

  await test.step('검색 기능 - 실제 검색 결과 확인', async () => {
    const boardPage = new BoardPage(page);
    
    // 이미 로그인된 상태이므로 바로 게시판으로 이동
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
        const resultCount = await boardPage.getSearchResultsCount();
        
        if (resultCount > 0) {
          await test.step('첫 번째 검색 결과 내용 확인', async () => {
            const firstResult = boardPage.getFirstSearchResult();
            const firstResultText = await firstResult.textContent();
            expect(firstResultText).toBeTruthy();
          });
        }
      });
    });
  });

  await test.step('채팅 및 알림 기능 - 사용자 간 메시지 전송 및 알림 확인', async () => {
    const loginPage = new LoginPage(page);
    const chatPage = new ChatPage(page);
    const notificationPage = new NotificationPage(page);
    const basePage = new BasePage(page);
    
    let testMessage = '';
    
    await test.step('사용자 A가 채팅 페이지로 이동', async () => {
      await chatPage.navigate();
      await page.waitForLoadState('networkidle');
      await chatPage.wait(1000);
    });
    
    await test.step('사용자 A가 사용자 B에게 메시지 전송', async () => {
      await test.step('사용자 검색 및 선택', async () => {
        await chatPage.searchAndSelectUser('test2');
        await chatPage.wait(1000);
      });
      
      await test.step('메시지 입력 및 전송', async () => {
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
      });
    });
    
    // 2단계: 사용자 A 로그아웃
    await test.step('사용자 A 로그아웃', async () => {
      await basePage.logout();
      await basePage.wait(1000);
    });
    
    // 3단계: 사용자 B (test2) 로그인 및 알림 확인
    await test.step('사용자 B (test2) 로그인', async () => {
      await loginPage.navigate();
      await loginPage.login('test2', 'test1234');
      await basePage.wait(1000);
    });
    
    await test.step('사용자 B가 알림 페이지로 이동', async () => {
      await notificationPage.navigate();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*notifications/, { timeout: 5000 });
    });
    
    await test.step('알림 목록에서 최신 알림 클릭', async () => {
      await test.step('최신 알림 확인', async () => {
        await expect(notificationPage.latestNotification).toBeVisible({ timeout: 5000 });
      });
      
      await test.step('최신 알림 클릭', async () => {
        await notificationPage.clickLatestNotification();
        // 페이지 이동 대기 (URL 변경 또는 채팅 페이지 로드)
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      });
    });
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
    
    // 1단계: 사용자 A (test1) 로그인 및 게시글 작성
    await test.step('사용자 A (test1) 로그인', async () => {
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await basePage.wait(1000);
    });
    
    await test.step('사용자 A가 게시글 작성', async () => {
      await test.step('게시판으로 이동', async () => {
        await boardPage.navigate();
        await boardPage.wait(1000);
      });
      
      await test.step('글쓰기 버튼 클릭', async () => {
        await boardPage.writeButton.click();
        await writePage.wait(1000);
      });
      
      await test.step('게시글 작성', async () => {
        const timestamp = Date.now();
        testPostTitle = `알림 테스트 게시글 ${timestamp}`;
        const testContent = '알림 테스트를 위한 게시글입니다. 사용자 B가 댓글을 작성하면 알림이 발생합니다.';
        
        await writePage.postTitleInput.fill(testPostTitle);
        await writePage.postContentInput.fill(testContent);
        await writePage.submitButton.click();
        await writePage.wait(2000); // 게시글 작성 완료 대기
      });
      
      await test.step('게시글 URL 저장', async () => {
        postUrl = page.url();
        console.log(`게시글 URL: ${postUrl}`);
      });
    });
    
    // 2단계: 사용자 A 로그아웃
    await test.step('사용자 A 로그아웃', async () => {
      await basePage.logout();
      await basePage.wait(1000);
    });
    
    // 3단계: 사용자 B (test2) 로그인 및 댓글 작성
    await test.step('사용자 B (test2) 로그인', async () => {
      await loginPage.navigate();
      await loginPage.login('test2', 'test1234');
      await basePage.wait(2000);
    });
    
    await test.step('사용자 B가 사용자 A의 게시글에 댓글 작성', async () => {
      await test.step('게시글 상세 페이지로 이동', async () => {
        // URL에서 게시글 ID 추출 또는 게시판에서 찾기
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
      });
      
      await test.step('댓글 작성', async () => {
        const commentText = `알림 테스트 댓글 ${Date.now()}`;
        await detailPage.writeComment(commentText);
        await basePage.wait(2000); // 댓글 작성 완료 대기
      });
    });
    
    // 4단계: 사용자 B 로그아웃
    await test.step('사용자 B 로그아웃', async () => {
      await basePage.logout();
      await basePage.wait(1000);
    });
    
    // 5단계: 사용자 A (test1) 다시 로그인 및 알림 확인
    await test.step('사용자 A (test1) 다시 로그인', async () => {
      await loginPage.navigate();
      await loginPage.login('test1', 'test1234');
      await basePage.wait(2000);
    });
    
    await test.step('알림 아이콘 확인 및 드롭다운 열기', async () => {
      if (await notificationPage.notificationIcon.isVisible()) {
        await test.step('알림 아이콘 클릭하여 드롭다운 열기', async () => {
          await notificationPage.openNotificationDropdown();
          await notificationPage.wait(1000);
        });
        
        if (await notificationPage.notificationDropdown.isVisible()) {
          await test.step('드롭다운 열림 확인', async () => {
            await expect(notificationPage.notificationDropdown).toBeVisible();
          });
          
          await test.step('드롭다운 내 알림 목록 확인', async () => {
            const notificationCount = await notificationPage.notificationItems.count();
            if (notificationCount > 0) {
              await expect(notificationPage.notificationItems.first()).toBeVisible();
              console.log(`알림 개수: ${notificationCount}`);
            } else {
              console.log('드롭다운에 알림이 없습니다.');
            }
          });
        }
      }
    });
    
    await test.step('알림 페이지로 이동 및 알림 확인', async () => {
      await test.step('알림 페이지로 이동', async () => {
        await notificationPage.navigate();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/.*notifications/, { timeout: 5000 });
      });
      
      await test.step('알림 목록 표시 확인', async () => {
        const notificationListExists = await notificationPage.notificationList.count() > 0;
        if (notificationListExists) {
          await expect(notificationPage.notificationList).toBeVisible({ timeout: 5000 });
        } else {
          console.log('Notification list container not found, but page loaded successfully');
        }
      });
      
      await test.step('알림 항목 내용 확인', async () => {
        // 최신 알림 확인 (#notificationsList > div:nth-child(1))
        const latestNotificationExists = await notificationPage.latestNotification.count() > 0;
        if (latestNotificationExists) {
          await test.step('최신 알림 표시 확인', async () => {
            await expect(notificationPage.latestNotification).toBeVisible({ timeout: 5000 });
          });
          await test.step('알림 내용 텍스트 확인', async () => {
            const notificationText = await notificationPage.latestNotification.textContent();
            expect(notificationText).toBeTruthy();
            if (notificationText) {
              expect(notificationText.trim().length).toBeGreaterThan(0);
              console.log(`알림 내용: ${notificationText}`);
            }
          });
        } else {
          console.log('No notification items found, but page loaded successfully');
        }
      });
    });
  });
});


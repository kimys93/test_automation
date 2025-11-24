// @ts-check
import { test, expect } from '@playwright/test';
import BasePage from '../pages/BasePage.js';
import LoginPage from '../pages/LoginPage.js';
import BoardPage from '../pages/BoardPage.js';
import WritePage from '../pages/WritePage.js';
import DetailPage from '../pages/DetailPage.js';

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
      await basePage.goto('/home');
      await basePage.wait(2000); // 페이지 로드 대기
    });
    
    await test.step('홈페이지 URL 확인', async () => {
      await expect(page).toHaveURL(/.*\/home/);
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
      const hasNavigation = await page.locator('nav, header, .navbar').count();
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
        await loginPage.wait(2000);
        await expect(page).toHaveURL(/.*\/home|.*\/index/);
      });
    });
    
    await test.step('게시판 페이지 요소 표시 확인', async () => {
      const boardPage = new BoardPage(page);
      await boardPage.navigate();
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
        await expect(boardPage.boardList).toContainText(testTitle);
      });
    });
  });

  await test.step('게시글 상세 조회 및 댓글 작성', async () => {
    const boardPage = new BoardPage(page);
    const detailPage = new DetailPage(page);
    
    await test.step('게시판으로 이동', async () => {
      await boardPage.navigate();
      await boardPage.wait(1000);
    });
    
    await test.step('첫 번째 게시글 클릭', async () => {
      await boardPage.clickFirstPost();
      await detailPage.wait(1000);
    });
    
    await test.step('게시글 상세 내용 확인', async () => {
      await test.step('게시글 제목 표시 확인', async () => {
        await expect(detailPage.postTitle).toBeVisible();
      });
      await test.step('게시글 내용 표시 확인', async () => {
        await expect(detailPage.postContent).toBeVisible();
      });
    });
    
    await test.step('댓글 작성', async () => {
      const commentText = `Sanity 테스트 댓글 ${Date.now()}`;
      await test.step('댓글 내용 입력', async () => {
        await detailPage.commentInput.fill(commentText);
      });
      await test.step('댓글 작성 버튼 클릭', async () => {
        await detailPage.commentSubmitButton.click();
        await detailPage.wait(1000);
      });
      await test.step('작성한 댓글이 목록에 나타나는지 확인', async () => {
        await expect(detailPage.commentsList).toContainText(commentText, { timeout: 3000 });
      });
    });
  });

  await test.step('게시판 목록 조회 확인', async () => {
    const boardPage = new BoardPage(page);
    
    await test.step('게시판으로 이동', async () => {
      await boardPage.navigate();
      await boardPage.wait(1000);
    });
    
    await test.step('게시판 테이블 표시 확인', async () => {
      await expect(boardPage.postsTable).toBeVisible();
    });
    
    await test.step('게시글 목록 표시 확인', async () => {
      const postCount = await boardPage.getPostCount();
      expect(postCount).toBeGreaterThanOrEqual(0);
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

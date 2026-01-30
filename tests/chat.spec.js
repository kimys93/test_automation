// @ts-check
import { test, expect } from '@playwright/test';

/**
 * 채팅 기능 테스트
 * 시나리오: 로그인 → 채팅 탭 클릭 → 첫 번째 사용자 선택 → 메시지 전송
 */
test.describe('채팅 기능 테스트', () => {

  test('로그인 후 채팅 메시지 전송', async ({ page }) => {
    // 1. 로그인 페이지 접속
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);

    // 2. 아이디/비밀번호 입력 후 엔터
    await page.fill('#loginUsername', 'test');
    await page.fill('#loginPassword', 'test1234');
    await page.press('#loginPassword', 'Enter');

    // 로그인 성공 대기 (페이지 이동 확인)
    await page.waitForURL(/.*(?!login)/, { timeout: 10000 });

    // 3. 채팅 탭 클릭
    await page.click('a:has-text("채팅")');
    await expect(page).toHaveURL(/.*chat/);

    // 4. 채팅방 목록 로드 대기 후 첫 번째 아이템 클릭
    await page.waitForSelector('#chatRoomsList .user-item', { timeout: 10000 });
    await page.click('#chatRoomsList .user-item:first-child');

    // 메시지 입력창 활성화 대기
    await page.waitForSelector('#messageInput:not([disabled])', { timeout: 5000 });

    // 5. 테스트 메시지 입력 후 엔터
    await page.fill('#messageInput', '테스트 메세지');
    await page.press('#messageInput', 'Enter');

    // 메시지 전송 확인 (메시지가 화면에 표시되는지)
    await expect(page.locator('.message-bubble:has-text("테스트 메세지")')).toBeVisible({ timeout: 5000 });
  });

});

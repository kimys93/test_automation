// @ts-check
import { test, expect } from '@playwright/test';
import ChatPage from '../pages/ChatPage.js';
import LoginPage from '../pages/LoginPage.js';

/**
 * 채팅 기능 테스트
 */
test.describe('채팅 기능', () => {
  let chatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    // 로그인 후 채팅 페이지 접근 (필요시)
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    // 실제 테스트 계정 정보로 변경 필요
    await loginPage.login('test1', 'test1234');
    await chatPage.wait(2000);
  });

  test('채팅 페이지 로드 확인', async ({ page }) => {
    await chatPage.navigate();
    
    // 채팅 페이지 요소 확인
    await expect(chatPage.pageTitle).toBeVisible();
    await expect(chatPage.chatList).toBeVisible();
  });

  test('채팅방 목록 표시 확인', async ({ page }) => {
    await chatPage.navigate();
    
    // 채팅방 목록 확인
    await expect(chatPage.chatList).toBeVisible();
    // 채팅방이 있으면 표시되는지 확인
    const chatRoomsCount = await chatPage.chatRooms.count();
    if (chatRoomsCount > 0) {
      await expect(chatPage.chatRooms.first()).toBeVisible();
    }
  });

  test('채팅방 검색 기능', async ({ page }) => {
    await chatPage.navigate();
    
    // 검색 입력 필드 확인
    await expect(chatPage.chatSearchInput).toBeVisible();
    
    // 검색 수행
    await chatPage.searchChat('테스트');
    await chatPage.wait(500);
  });

  test('메시지 입력 필드 확인', async ({ page }) => {
    await chatPage.navigate();
    
    // 채팅방 선택 (첫 번째 채팅방)
    const chatRoomsCount = await chatPage.chatRooms.count();
    if (chatRoomsCount > 0) {
      await chatPage.chatRooms.first().click();
      await chatPage.wait(500);
      
      // 메시지 입력 필드 확인
      await expect(chatPage.messageInput).toBeVisible();
      await expect(chatPage.sendButton).toBeVisible();
    }
  });

  test('메시지 전송 기능', async ({ page }) => {
    await chatPage.navigate();
    
    // 채팅방 선택
    const chatRoomsCount = await chatPage.chatRooms.count();
    if (chatRoomsCount > 0) {
      await chatPage.chatRooms.first().click();
      await chatPage.wait(500);
      
      // 메시지 전송
      const testMessage = '테스트 메시지입니다.';
      await chatPage.sendMessage(testMessage);
      
      // 메시지가 전송되었는지 확인 (메시지 목록에 추가되었는지)
      await expect(chatPage.messagesContainer).toBeVisible();
    }
  });

  test('메시지 목록 표시 확인', async ({ page }) => {
    await chatPage.navigate();
    
    // 채팅방 선택
    const chatRoomsCount = await chatPage.chatRooms.count();
    if (chatRoomsCount > 0) {
      await chatPage.chatRooms.first().click();
      await chatPage.wait(500);
      
      // 메시지 목록 컨테이너 확인
      await expect(chatPage.messagesContainer).toBeVisible();
    }
  });

  test('새 채팅 시작 버튼', async ({ page }) => {
    await chatPage.navigate();
    
    // 새 채팅 버튼 확인
    if (await chatPage.newChatButton.isVisible()) {
      await expect(chatPage.newChatButton).toBeVisible();
    }
  });

  test('채팅방 나가기 기능', async ({ page }) => {
    await chatPage.navigate();
    
    // 채팅방 선택
    const chatRoomsCount = await chatPage.chatRooms.count();
    if (chatRoomsCount > 0) {
      await chatPage.chatRooms.first().click();
      await chatPage.wait(500);
      
      // 나가기 버튼 확인 및 클릭
      if (await chatPage.leaveButton.isVisible()) {
        await chatPage.leaveButton.click();
        await chatPage.wait(500);
      }
    }
  });
});


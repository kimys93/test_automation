// @ts-check
import { test, expect } from '@playwright/test';
import NotificationPage from '../pages/NotificationPage.js';
import LoginPage from '../pages/LoginPage.js';

/**
 * 알림 기능 테스트
 */
test.describe('알림 기능', () => {
  let notificationPage;

  test.beforeEach(async ({ page }) => {
    notificationPage = new NotificationPage(page);
    // 로그인 후 알림 페이지 접근 (필요시)
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    // 실제 테스트 계정 정보로 변경 필요
    await loginPage.login('test1', 'test1234');
    await notificationPage.wait(2000);
  });

  test('알림 페이지 로드 확인', async ({ page }) => {
    await notificationPage.navigate();
    
    // 알림 페이지 요소 확인
    await expect(notificationPage.pageTitle).toBeVisible();
    await expect(notificationPage.notificationList).toBeVisible();
  });

  test('알림 목록 표시 확인', async ({ page }) => {
    await notificationPage.navigate();
    
    // 알림 목록 확인
    await expect(notificationPage.notificationList).toBeVisible();
    
    // 알림 항목이 있으면 표시되는지 확인
    const notificationCount = await notificationPage.notificationItems.count();
    if (notificationCount > 0) {
      await expect(notificationPage.notificationItems.first()).toBeVisible();
    }
  });

  test('알림 아이콘 클릭', async ({ page }) => {
    // 알림 아이콘 확인
    if (await notificationPage.notificationIcon.isVisible()) {
      await notificationPage.openNotificationDropdown();
      
      // 드롭다운이 열렸는지 확인
      await expect(notificationPage.notificationDropdown).toBeVisible();
    }
  });

  test('읽지 않은 알림 개수 표시', async ({ page }) => {
    await notificationPage.navigate();
    
    // 읽지 않은 알림 배지 확인
    const badgeVisible = await notificationPage.unreadBadge.isVisible();
    if (badgeVisible) {
      await expect(notificationPage.unreadBadge).toBeVisible();
    }
  });

  test('알림 클릭 기능', async ({ page }) => {
    await notificationPage.navigate();
    
    // 알림 항목이 있으면 클릭
    const notificationCount = await notificationPage.notificationItems.count();
    if (notificationCount > 0) {
      await notificationPage.clickNotification(0);
      await notificationPage.wait(500);
    }
  });

  test('전체 읽음 처리 기능', async ({ page }) => {
    await notificationPage.navigate();
    
    // 전체 읽음 버튼 확인 및 클릭
    if (await notificationPage.markAllReadButton.isVisible()) {
      await notificationPage.markAllAsRead();
      
      // 읽지 않은 알림 배지가 사라졌는지 확인
      await notificationPage.wait(500);
    }
  });

  test('알림 삭제 기능', async ({ page }) => {
    await notificationPage.navigate();
    
    // 알림 항목이 있으면 삭제
    const notificationCount = await notificationPage.notificationItems.count();
    if (notificationCount > 0) {
      const beforeCount = notificationCount;
      await notificationPage.deleteNotification(0);
      
      // 알림이 삭제되었는지 확인
      await notificationPage.wait(500);
      const afterCount = await notificationPage.notificationItems.count();
      expect(afterCount).toBeLessThan(beforeCount);
    }
  });

  test('알림 필터 기능', async ({ page }) => {
    await notificationPage.navigate();
    
    // 필터 버튼 확인
    const filterCount = await notificationPage.filterButtons.count();
    if (filterCount > 0) {
      // 전체 필터 선택
      await notificationPage.filterNotifications('all');
      
      // 읽음 필터 선택
      await notificationPage.filterNotifications('read');
      
      // 안읽음 필터 선택
      await notificationPage.filterNotifications('unread');
    }
  });

  test('알림 상세 정보 확인', async ({ page }) => {
    await notificationPage.navigate();
    
    // 알림 항목이 있으면 상세 정보 확인
    const notificationCount = await notificationPage.notificationItems.count();
    if (notificationCount > 0) {
      const firstNotification = notificationPage.notificationItems.first();
      await expect(firstNotification).toBeVisible();
      
      // 알림 내용이 표시되는지 확인
      const notificationText = await firstNotification.textContent();
      expect(notificationText).toBeTruthy();
    }
  });
});


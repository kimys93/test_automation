import BasePage from './BasePage.js';

/**
 * 알림 페이지 객체
 */
class NotificationPage extends BasePage {
  constructor(page) {
    super(page);
    // 알림 페이지 제목
    this.pageTitle = this.page.locator('h2, h3, .notification-title');
    // 알림 목록 컨테이너
    this.notificationList = this.page.locator('#notificationList, .notification-list, .notifications');
    // 알림 목록 (notificationsList)
    this.notificationsList = this.page.locator('#notificationsList');
    // 최신 알림 (항상 첫 번째)
    this.latestNotification = this.page.locator('#notificationsList > div:nth-child(1)');
    // 개별 알림 항목
    this.notificationItems = this.page.locator('.notification-item, .notification, .notif-item');
    // 읽지 않은 알림 개수 배지
    this.unreadBadge = this.page.locator('#unreadBadge, .unread-count, .badge');
    // 전체 읽음 처리 버튼
    this.markAllReadButton = this.page.locator('#markAllReadButton, button:has-text("전체 읽음"), button:has-text("모두 읽음")');
    // 알림 삭제 버튼
    this.deleteButton = this.page.locator('#deleteNotificationButton, button:has-text("삭제")');
    // 알림 필터 (전체/읽음/안읽음)
    this.filterButtons = this.page.locator('.filter-button, .notification-filter button');
    // 알림 아이콘 (헤더 등)
    this.notificationIcon = this.page.locator('#notificationIcon, .notification-icon, .bell-icon');
    // 알림 드롭다운
    this.notificationDropdown = this.page.locator('#notificationDropdown, .notification-dropdown');
  }

  // 메서드
  // 알림 페이지로 이동
  async navigate() {
    await this.goto('/notifications');
  }

  // 알림 아이콘 클릭
  async openNotificationDropdown() {
    await this.notificationIcon.click();
    await this.wait(300); // 드롭다운 열림 대기
  }

  // 특정 알림 클릭 (index: 알림 인덱스)
  async clickNotification(index = 0) {
    const notifications = await this.notificationItems.all();
    if (notifications[index]) {
      await notifications[index].click();
    }
  }

  // 최신 알림 클릭 (항상 첫 번째)
  async clickLatestNotification() {
    await this.latestNotification.click();
  }

  // 전체 읽음 처리
  async markAllAsRead() {
    await this.markAllReadButton.click();
    await this.wait(500); // 처리 대기
  }

  // 알림 삭제 (index: 알림 인덱스)
  async deleteNotification(index = 0) {
    const notifications = await this.notificationItems.all();
    if (notifications[index]) {
      const deleteBtn = notifications[index].locator('button:has-text("삭제"), .delete-button');
      await deleteBtn.click();
      await this.wait(300);
    }
  }

  // 알림 필터 선택 (filterType: 'all', 'read', 'unread')
  async filterNotifications(filterType) {
    const filterText = {
      'all': '전체',
      'read': '읽음',
      'unread': '안읽음'
    };
    await this.page.locator(`button:has-text("${filterText[filterType]}")`).click();
    await this.wait(300);
  }
}

export default NotificationPage;


import BasePage from './BasePage.js';

/**
 * 채팅 페이지 객체
 */
class ChatPage extends BasePage {
  constructor(page) {
    super(page);
    // 채팅 페이지 제목
    this.pageTitle = this.page.locator('h2, h3, .chat-title');
    // 채팅 목록 컨테이너
    this.chatList = this.page.locator('#chatList, .chat-list');
    // 채팅방 목록
    this.chatRooms = this.page.locator('.chat-room, .chat-item');
    // 메시지 입력 필드
    this.messageInput = this.page.locator('#messageInput, textarea[placeholder*="메시지"], input[placeholder*="메시지"]');
    // 메시지 전송 버튼
    this.sendButton = this.page.locator('#sendButton, button:has-text("전송"), button[type="submit"]');
    // 메시지 목록 컨테이너
    this.messagesContainer = this.page.locator('#messagesContainer, .messages, .chat-messages');
    // 개별 메시지 요소
    this.messageItems = this.page.locator('.message, .chat-message, .msg-item');
    // 채팅방 검색 입력 필드
    this.chatSearchInput = this.page.locator('#chatSearchInput, input[placeholder*="검색"]');
    // 새 채팅 시작 버튼
    this.newChatButton = this.page.locator('#newChatButton, button:has-text("새 채팅"), button:has-text("채팅 시작")');
    // 채팅방 나가기 버튼
    this.leaveButton = this.page.locator('#leaveButton, button:has-text("나가기")');
    // 상대방 이름 표시
    this.recipientName = this.page.locator('.recipient-name, .chat-partner-name');
    // 사용자 검색 입력 필드 (새 채팅 시작 시)
    this.userSearchInput = this.page.locator('#userSearch, input[placeholder*="사용자"], input[placeholder*="검색"]');
    // 검색된 사용자 목록
    this.userSearchResults = this.page.locator('.user-item, .user-result, .search-result-item');
  }

  // 메서드
  // 채팅 페이지로 이동
  async navigate() {
    await this.goto('/chat');
  }

  // 특정 채팅방으로 이동 (chatRoomId: 채팅방 ID)
  async openChatRoom(chatRoomId) {
    await this.goto(`/chat/${chatRoomId}`);
  }

  // 메시지 전송 (message: 전송할 메시지)
  async sendMessage(message) {
    await this.messageInput.fill(message);
    await this.sendButton.click();
    await this.wait(500); // 메시지 전송 대기
  }

  // 채팅방 검색 (keyword: 검색어)
  async searchChat(keyword) {
    await this.chatSearchInput.fill(keyword);
    await this.wait(500); // 검색 결과 대기
  }

  // 새 채팅 시작
  async startNewChat() {
    await this.newChatButton.click();
  }

  // 채팅방 나가기
  async leaveChatRoom() {
    await this.leaveButton.click();
  }

  // 특정 텍스트의 메시지 찾기
  getMessageByText(text) {
    return this.page.locator(`text=${text}`);
  }

  // 사용자 검색 및 선택 (username: 검색할 사용자명)
  async searchAndSelectUser(username) {
    // 사용자 검색 입력 필드에 검색어 입력
    await this.userSearchInput.fill(username);
    await this.wait(1000); // 검색 결과 대기
    
    // 검색 결과에서 해당 사용자 찾기 및 클릭
    const userResult = this.page.locator(`.user-item:has-text("${username}"), .user-result:has-text("${username}"), .search-result-item:has-text("${username}")`).first();
    await userResult.click();
    await this.wait(500);
  }
}

export default ChatPage;


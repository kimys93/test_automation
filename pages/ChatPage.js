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
    this.messageInput = this.page.locator('#messageInput');
    // 메시지 전송 버튼
    this.sendButton = this.page.locator('#sendBtn');
    // 메시지 목록 컨테이너
    this.messagesContainer = this.page.locator('#messagesContainer, .messages, .chat-messages');
    // 채팅 메시지 컨테이너
    this.chatMessages = this.page.locator('#chatMessages');
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
    // 사용자 검색 입력 필드
    this.userSearchInput = this.page.locator('#userSearch');
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

  // 최근 메시지 가져오기 (가장 높은 nth-child 인덱스)
  async getLatestMessage() {
    const messageCount = await this.chatMessages.locator('> div').count();
    if (messageCount > 0) {
      // 가장 높은 인덱스의 메시지 (최근 메시지)
      return this.chatMessages.locator(`> div:nth-child(${messageCount})`);
    }
    return null;
  }

  // 최근 메시지에 특정 텍스트가 포함되어 있는지 확인
  async verifyLatestMessageContains(text) {
    const latestMessage = await this.getLatestMessage();
    if (latestMessage) {
      const messageText = await latestMessage.textContent();
      return messageText && messageText.includes(text);
    }
    return false;
  }

  // 사용자 검색 및 선택 (username: 검색할 사용자명)
  async searchAndSelectUser(username) {
    // 사용자 검색 입력 필드에 검색어 입력
    await this.userSearchInput.fill(username);
    await this.wait(1000); // 검색 결과 대기
    
    // 검색 결과에서 해당 사용자 찾기 및 클릭
    const userResult = this.page.locator(`.user-item:has-text("${username}"), .user-result:has-text("${username}"), .search-result-item:has-text("${username}")`).first();
    await userResult.click();
    await this.wait(2000); // 채팅방 열림 대기
    
    // 메시지 입력 필드가 보일 때까지 대기 (채팅방이 열렸는지 확인)
    await this.messageInput.waitFor({ state: 'visible', timeout: 5000 });
  }
}

export default ChatPage;


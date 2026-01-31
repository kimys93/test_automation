import BasePage from './BasePage.js';

/**
 * 게시글 상세 페이지 객체
 */
class DetailPage extends BasePage {
  constructor(page) {
    super(page);
    // 게시글 제목
    this.postTitle = this.page.locator('#detailTitle');
    // 게시글 내용
    this.postContent = this.page.locator('#detailContent');
    // 작성자
    this.postAuthor = this.page.locator('#detailAuthor');
    // 작성일
    this.postDate = this.page.locator('#detailDate');
    // 조회수
    this.postViews = this.page.locator('#detailViews');
    // 수정/삭제 버튼 영역
    this.detailActions = this.page.locator('#detailActions');
    // 수정 버튼
    this.editButton = this.page.locator('#detailActions a:has-text("수정"), #detailActions button:has-text("수정")');
    // 삭제 버튼
    this.deleteButton = this.page.locator('#detailActions button:has-text("삭제")');
    // 첨부파일 영역
    this.attachments = this.page.locator('#detailAttachments');
    // 댓글 입력 필드
    this.commentInput = this.page.locator('#commentContent');
    // 댓글 작성 버튼
    this.commentSubmitButton = this.page.locator('#commentForm button[type="submit"]');
    // 댓글 목록
    this.commentsList = this.page.locator('#commentsList');
    // 댓글 폼
    this.commentForm = this.page.locator('#commentForm');
  }

  /**
   * 게시글 상세 페이지로 이동
   * @param {number} postId - 게시글 ID
   */
  async navigate(postId) {
    await this.goto(`/detail/${postId}`);
  }

  /**
   * 댓글 작성
   * @param {string} content - 댓글 내용
   */
  async writeComment(content) {
    await this.commentInput.fill(content);
    await this.commentSubmitButton.click();
    await this.waitForPageTransition();
    await this.wait(500);
  }

  /**
   * 댓글 개수 가져오기
   */
  async getCommentCount() {
    const commentItems = this.page.locator('#commentsList .card, #commentsList .comment-item');
    return await commentItems.count();
  }

  /**
   * 게시글 수정 버튼 클릭
   */
  async clickEditButton() {
    await this.editButton.click();
    await this.waitForPageTransition();
  }

  /**
   * 게시글 삭제 버튼 클릭
   */
  async clickDeleteButton() {
    await this.deleteButton.click();
    await this.waitForPageTransition();
  }

  /**
   * 삭제 확인 다이얼로그 처리
   */
  async confirmDelete() {
    this.page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await this.clickDeleteButton();
    await this.wait(1000);
  }
}

export default DetailPage;

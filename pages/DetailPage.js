import BasePage from './BasePage.js';

/**
 * 게시글 상세 페이지 객체체
 */
class DetailPage extends BasePage {
  constructor(page) {
    super(page);
    // 게시글 제목
    this.postTitle = this.page.locator('.post-title, h1, h2');
    // 게시글 내용
    this.postContent = this.page.locator('.post-content, #postContent');
    // 게시글 작성자
    this.postAuthor = this.page.locator('.post-author, .author');
    // 수정 버튼
    this.editButton = this.page.locator('button:has-text("수정"), a:has-text("수정")');
    // 삭제 버튼
    this.deleteButton = this.page.locator('button:has-text("삭제"), a:has-text("삭제")');
    // 댓글 입력 필드
    this.commentInput = this.page.locator('#commentInput, textarea[placeholder*="댓글"]');
    // 댓글 작성 버튼
    this.commentSubmitButton = this.page.locator('button:has-text("댓글"), button[type="submit"]');
  }

  // 메서드
  // 게시글 상세 페이지로 이동 (postId: 게시글 ID)
  async navigate(postId) {
    await this.goto(`/posts/${postId}`);
  }

  // 댓글 작성 (comment: 댓글 내용)
  async writeComment(comment) {
    await this.commentInput.fill(comment);
    await this.commentSubmitButton.click();
    await this.wait(1000); // 댓글 작성 완료 대기
  }
}

export default DetailPage;


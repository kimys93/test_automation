import BasePage from './BasePage.js';

/**
 * 게시글 상세 페이지 객체
 */
class DetailPage extends BasePage {
  constructor(page) {
    super(page);
    // 게시글 제목
    this.postTitle = this.page.locator('#postTitle');
    // 게시글 내용
    this.postContent = this.page.locator('#postContent');
    // 게시글 메타 정보 (작성자, 작성일 등)
    this.postMeta = this.page.locator('#postMeta');
    // 수정 버튼
    this.editButton = this.page.locator('#editButton');
    // 삭제 버튼
    this.deleteButton = this.page.locator('#deleteButton');
    // 게시글 액션 영역
    this.postActions = this.page.locator('#postActions');
    // 댓글 입력 필드
    this.commentInput = this.page.locator('#commentInput, textarea[name="content"], #commentContent');
    // 댓글 작성 버튼
    this.commentSubmitButton = this.page.locator('button:has-text("댓글 작성"), button:has-text("등록"), #commentSubmit');
    // 댓글 목록
    this.commentsList = this.page.locator('#commentsList, .comment-item, .comment');
    // 첨부 파일 목록
    this.attachedFiles = this.page.locator('.list-group-item a[download]');
  }

  /**
   * 게시글 상세 페이지로 이동
   * @param {number} postId - 게시글 ID
   */
  async navigate(postId) {
    await this.goto(`/post/${postId}`);
    await this.wait(1000);
  }

  /**
   * 댓글 작성
   * @param {string} content - 댓글 내용
   */
  async writeComment(content) {
    await this.commentInput.fill(content);
    await this.commentSubmitButton.click();
    await this.wait(1000);
  }

  /**
   * 댓글 개수 가져오기
   */
  async getCommentCount() {
    return await this.commentsList.count();
  }

  /**
   * 게시글 수정 버튼 클릭
   */
  async clickEditButton() {
    await this.editButton.click();
    await this.wait(1000);
  }

  /**
   * 게시글 삭제 버튼 클릭
   */
  async clickDeleteButton() {
    await this.deleteButton.click();
    await this.wait(1000);
  }

  /**
   * 삭제 확인 다이얼로그 처리
   */
  async confirmDelete() {
    this.page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await this.clickDeleteButton();
    await this.wait(2000);
  }
}

export default DetailPage;

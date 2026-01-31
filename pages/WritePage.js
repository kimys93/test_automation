import BasePage from './BasePage.js';

/**
 * 글쓰기 페이지 객체
 */
class WritePage extends BasePage {
  constructor(page) {
    super(page);
    // 제목 입력 필드
    this.postTitleInput = this.page.locator('#postTitle');
    // 내용 입력 필드
    this.postContentInput = this.page.locator('#postContent');
    // 파일 업로드 입력
    this.fileInput = this.page.locator('#fileInput');
    // 작성 완료 버튼
    this.submitButton = this.page.locator('button[type="submit"]');
    // 취소 버튼
    this.cancelButton = this.page.locator('button.btn-secondary');
    // 글쓰기 폼
    this.writeForm = this.page.locator('#writeForm');
  }

  /**
   * 글쓰기 페이지로 이동
   */
  async navigate() {
    await this.goto('/write');
  }

  /**
   * 게시글 작성
   * @param {string} title - 게시글 제목
   * @param {string} content - 게시글 내용
   * @param {string[]} filePaths - 첨부할 파일 경로 배열
   */
  async writePost(title, content, filePaths = []) {
    await this.postTitleInput.fill(title);
    await this.postContentInput.fill(content);

    if (filePaths.length > 0) {
      await this.fileInput.setInputFiles(filePaths);
    }

    await this.submitButton.click();
    await this.waitForPageTransition();
    await this.wait(1000); // 게시글 작성 완료 대기
  }
}

export default WritePage;

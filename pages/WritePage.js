import BasePage from './BasePage.js';

/**
 * 글쓰기 페이지 객체
 */
class WritePage extends BasePage {
  constructor(page) {
    super(page);
    // 페이지 제목
    this.pageTitle = this.page.locator('h4');
    // 게시글 제목 입력 필드
    this.postTitleInput = this.page.locator('#postTitle');
    // 게시글 내용 입력 필드
    this.postContentInput = this.page.locator('#postContent');
    // 파일 업로드 입력 필드
    this.fileInput = this.page.locator('#fileInput');
    // 제목 글자 수 카운터
    this.titleCount = this.page.locator('#titleCount');
    // 내용 글자 수 카운터
    this.contentCount = this.page.locator('#contentCount');
    // 작성 완료 버튼
    this.submitButton = this.page.locator('button[type="submit"]');
    // 취소 버튼
    this.cancelButton = this.page.locator('button:has-text("취소")');
    // 글쓰기 폼 컨테이너
    this.writeForm = this.page.locator('#writeForm');
  }

  // 메서드
  /**
   * 글쓰기 페이지로 이동
   */
  async navigate() {
    await this.goto('/write');
  }

  // 게시글 작성 (title: 제목, content: 내용, filePaths: 파일 경로 선택사항)
  async writePost(title, content, filePaths = null) {
    await this.postTitleInput.fill(title);
    await this.postContentInput.fill(content);
    if (filePaths) {
      await this.fileInput.setInputFiles(filePaths);
    }
    await this.submitButton.click();
  }
}

export default WritePage;


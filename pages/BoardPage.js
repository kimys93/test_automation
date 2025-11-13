import BasePage from './BasePage.js';

/**
 * 게시판 페이지 객체
 */
class BoardPage extends BasePage {
  constructor(page) {
    super(page);
    // 페이지 제목
    this.pageTitle = this.page.locator('h2');
    // 글쓰기 버튼
    this.writeButton = this.page.locator('#writeBtn');
    // 검색 입력 필드
    this.searchInput = this.page.locator('#searchInput');
    // 검색 타입 선택 드롭다운 (제목/내용/작성자)
    this.searchType = this.page.locator('#searchType');
    // 검색 버튼
    this.searchButton = this.page.locator('#searchBtn');
    // 게시글 목록 테이블
    this.postsTable = this.page.locator('table');
    // 게시글 목록 컨테이너
    this.postsList = this.page.locator('#postsList');
    // 테이블 헤더 (번호, 제목, 작성자 등)
    this.tableHeader = this.page.locator('thead');
    // 게시글 개수 표시
    this.postCount = this.page.locator('#postCount');
    // 페이지네이션 (이전/다음 페이지 버튼)
    this.pagination = this.page.locator('#pagination');
  }

  // 메서드
  /**
   * 게시판 페이지로 이동
   */
  async navigate() {
    await this.goto('/board');
  }

  // 검색 수행 (keyword: 검색어, type: 검색 타입 선택사항)
  async search(keyword, type = null) {
    if (type) {
      await this.searchType.selectOption(type);
    }
    await this.searchInput.fill(keyword);
    await this.searchButton.click();
    await this.wait(1000); // 검색 결과 대기
  }

  async boardList() {
    if (await this.postTable.isVisible()) {
    await expect(this.postTable).toBeVisible();
    await expect(this.tableHeader).toContainText('번호');
    await expect(this.tableHeader).toContainText('제목');
    await expect(this.tableHeader).toContainText('작성자');
    } else {
      await expect(this.searchType).toBeVisible();
    }
  }
}

export default BoardPage;


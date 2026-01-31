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
    // 게시글 목록 테이블
    this.postsTable = this.page.locator('table');
    // 게시글 목록 tbody
    this.boardList = this.page.locator('#postsList');
    // 테이블 헤더
    this.tableHeader = this.page.locator('thead');
    // 페이지네이션
    this.pagination = this.page.locator('#pagination');
    // 게시글 행들
    this.postRows = this.page.locator('#postsList tr');
    // 검색 입력
    this.searchInput = this.page.locator('#searchInput');
    // 검색 버튼
    this.searchButton = this.page.locator('#searchBtn');
    // 검색 타입 선택
    this.searchType = this.page.locator('#searchType');
  }

  /**
   * 게시판 페이지로 이동
   */
  async navigate() {
    await this.goto('/board');
  }

  /**
   * 특정 제목의 게시글 찾기
   * @param {string} title - 게시글 제목
   */
  getPostByTitle(title) {
    return this.page.locator(`text=${title}`).first();
  }

  /**
   * 게시글 클릭 (제목으로)
   * @param {string} title - 게시글 제목
   */
  async clickPostByTitle(title) {
    const postLink = this.getPostByTitle(title);
    await postLink.click();
    await this.waitForPageTransition();
  }

  /**
   * 첫 번째 게시글 클릭
   */
  async clickFirstPost() {
    const firstPost = this.postRows.first().locator('td:nth-child(2) a, td:nth-child(2)');
    await firstPost.click();
    await this.waitForPageTransition();
  }

  /**
   * 게시글 개수 가져오기
   */
  async getPostCount() {
    return await this.postRows.count();
  }

  /**
   * 글쓰기 버튼 클릭
   */
  async clickWriteButton() {
    await this.writeButton.click();
    await this.waitForPageTransition();
  }
}

export default BoardPage;

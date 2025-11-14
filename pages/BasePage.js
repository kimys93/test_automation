import dotenv from 'dotenv';

// .env 파일에서 환경 변수 로드
dotenv.config();

/**
 * 기본 페이지 클래스
 * 모든 페이지 객체의 부모 클래스
 */
class BasePage {
  constructor(page) {
    this.page = page;
    this.baseURL = process.env.BASE_URL || 'http://localhost:3000';

  }

  // 페이지로 이동 (path: 이동할 경로)
  async goto(path) {
    await this.page.goto(path);
  }

  // 대기 (ms: 대기 시간 밀리초)
  async wait(ms) {
    await this.page.waitForTimeout(ms);
  }
  
}

export default BasePage;
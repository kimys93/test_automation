import BasePage from './BasePage.js';

/**
 * 회의실 예약 페이지 객체
 */
class ReservationPage extends BasePage {
  constructor(page) {
    super(page);
    // FullCalendar 컨테이너
    this.calendar = this.page.locator('#calendar');
    // 예약 모달
    this.reservationModal = this.page.locator('#reservationModal, .modal');
    // 회의실 선택 드롭다운
    this.roomSelect = this.page.locator('#roomSelect, select[name="room_id"]');
    // 시작 시간 선택
    this.startTimeSelect = this.page.locator('#startTimeSelect, select[name="start_time"]');
    // 종료 시간 선택
    this.endTimeSelect = this.page.locator('#endTimeSelect, select[name="end_time"]');
    // 예약 목적 입력
    this.purposeInput = this.page.locator('#reservationPurpose, input[name="reservationPurpose"], textarea[name="reservationPurpose"]');
    // 예약 버튼
    this.reserveButton = this.page.locator('button:has-text("예약"), #reserveBtn, button[type="submit"]');
    // 예약 취소 버튼
    this.cancelButton = this.page.locator('button:has-text("취소"), .btn-secondary');
    // 예약 목록
    this.reservationsList = this.page.locator('.fc-event, .reservation-item');
  }

  /**
   * 회의실 예약 페이지로 이동
   */
  async navigate() {
    await this.goto('/reservation_status');
    await this.wait(2000); // FullCalendar 로드 대기
  }

  /**
   * 예약 생성
   * @param {object} reservationData - 예약 정보
   */
  async createReservation(reservationData) {
    if (reservationData.roomId) {
      await this.roomSelect.selectOption(reservationData.roomId.toString());
    }
    if (reservationData.startTime) {
      await this.startTimeSelect.selectOption(reservationData.startTime);
    }
    if (reservationData.endTime) {
      await this.endTimeSelect.selectOption(reservationData.endTime);
    }
    if (reservationData.purpose) {
      await this.purposeInput.fill(reservationData.purpose);
    }
    await this.reserveButton.click();
    await this.wait(2000);
  }

  /**
   * 캘린더에서 날짜 클릭
   * @param {string} date - 날짜 (YYYY-MM-DD 형식)
   */
  async clickDate(date) {
    const dateCell = this.page.locator(`[data-date="${date}"], .fc-day[data-date="${date}"]`);
    await dateCell.click();
    await this.wait(1000);
  }

  /**
   * 예약 개수 가져오기
   */
  async getReservationCount() {
    return await this.reservationsList.count();
  }
}

export default ReservationPage;


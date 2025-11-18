-- Allure Report 테스트 히스토리 저장을 위한 DB 스키마
-- PostgreSQL 사용

-- 테스트 실행 정보 테이블
CREATE TABLE IF NOT EXISTS test_runs (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) UNIQUE NOT NULL,
    test_type VARCHAR(50) NOT NULL, -- sanity, regression, functional
    environment VARCHAR(50) NOT NULL, -- CI, local
    browser VARCHAR(50) NOT NULL, -- chromium, firefox, webkit
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    status VARCHAR(20) NOT NULL, -- PASSED, FAILED, SKIPPED
    total_tests INTEGER DEFAULT 0,
    passed_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    skipped_tests INTEGER DEFAULT 0,
    duration_ms BIGINT,
    build_number VARCHAR(100),
    commit_hash VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 테스트 케이스 정보 테이블
CREATE TABLE IF NOT EXISTS test_cases (
    id SERIAL PRIMARY KEY,
    test_run_id INTEGER REFERENCES test_runs(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    test_full_name TEXT NOT NULL,
    suite_name VARCHAR(255),
    status VARCHAR(20) NOT NULL, -- PASSED, FAILED, SKIPPED, BROKEN
    duration_ms BIGINT,
    error_message TEXT,
    error_stack TEXT,
    attachments JSONB, -- 스크린샷, 비디오 등 첨부파일 정보
    steps JSONB, -- 테스트 단계 정보
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 테스트 히스토리 통계 테이블 (빠른 조회를 위한 집계 테이블)
CREATE TABLE IF NOT EXISTS test_statistics (
    id SERIAL PRIMARY KEY,
    test_name TEXT NOT NULL,
    test_full_name TEXT NOT NULL,
    suite_name VARCHAR(255),
    total_runs INTEGER DEFAULT 0,
    passed_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    skipped_runs INTEGER DEFAULT 0,
    last_run_at TIMESTAMP,
    last_status VARCHAR(20),
    failure_rate DECIMAL(5, 2) DEFAULT 0.00, -- 실패율 (%)
    avg_duration_ms BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(test_full_name)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_test_runs_test_type ON test_runs(test_type);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_started_at ON test_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_cases_test_run_id ON test_cases(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_test_name ON test_cases(test_name);
CREATE INDEX IF NOT EXISTS idx_test_cases_status ON test_cases(status);
CREATE INDEX IF NOT EXISTS idx_test_statistics_test_name ON test_statistics(test_name);
CREATE INDEX IF NOT EXISTS idx_test_statistics_failure_rate ON test_statistics(failure_rate DESC);

-- 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_test_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO test_statistics (
        test_name, test_full_name, suite_name,
        total_runs, passed_runs, failed_runs, skipped_runs,
        last_run_at, last_status, failure_rate, avg_duration_ms, updated_at
    )
    VALUES (
        NEW.test_name, NEW.test_full_name, NEW.suite_name,
        1,
        CASE WHEN NEW.status = 'PASSED' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'FAILED' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'SKIPPED' THEN 1 ELSE 0 END,
        NEW.created_at, NEW.status,
        CASE WHEN NEW.status = 'FAILED' THEN 100.00 ELSE 0.00 END,
        NEW.duration_ms, CURRENT_TIMESTAMP
    )
    ON CONFLICT (test_full_name) DO UPDATE SET
        total_runs = test_statistics.total_runs + 1,
        passed_runs = test_statistics.passed_runs + CASE WHEN NEW.status = 'PASSED' THEN 1 ELSE 0 END,
        failed_runs = test_statistics.failed_runs + CASE WHEN NEW.status = 'FAILED' THEN 1 ELSE 0 END,
        skipped_runs = test_statistics.skipped_runs + CASE WHEN NEW.status = 'SKIPPED' THEN 1 ELSE 0 END,
        last_run_at = NEW.created_at,
        last_status = NEW.status,
        failure_rate = (test_statistics.failed_runs + CASE WHEN NEW.status = 'FAILED' THEN 1 ELSE 0 END)::DECIMAL / 
                       (test_statistics.total_runs + 1)::DECIMAL * 100,
        avg_duration_ms = (test_statistics.avg_duration_ms * test_statistics.total_runs + NEW.duration_ms) / 
                          (test_statistics.total_runs + 1),
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_test_statistics ON test_cases;
CREATE TRIGGER trigger_update_test_statistics
    AFTER INSERT ON test_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_test_statistics();


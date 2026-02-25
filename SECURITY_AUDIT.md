# 🛡️ Mycelium Security Audit Report

**감사 일시**: 2026-02-25 (업데이트)
**감사 대상**: Backend (Rust/Axum) + Frontend (React/Vite)

---

## 📊 전체 보안 등급: A- (우수)

| 영역 | 등급 | 상태 |
|------|------|------|
| 인증 (Authentication) | A | ✅ 우수 |
| 인가 (Authorization) | A- | ✅ 우수 |
| 데이터 보호 | B+ | ✅ 양호 |
| API 보안 | A- | ✅ 우수 |
| 파일 시스템 보안 | A | ✅ 우수 |
| 세션 관리 | A | ✅ 우수 |
| 감사/로깅 | A | ✅ 우수 |

---

## ✅ 완료된 보안 조치 (Recently Fixed)

### 1. [CRITICAL-1] 미디어 파일 서빙: 경로 순회(Path Traversal) 방어

- **조치**: `std::path::Path::new(&filename).file_name()`을 사용하여 파일명만 추출하고, `..`이나 경로 구분자가 포함된 요청을 즉시 차단하도록 로직 강화.
- **파일**: `backend/src/commands/production/media.rs`

### 2. [MEDIUM-7] 세션 토큰 해시 구현 (Revocation 지원)

- **조치**: 플레이스홀더를 제거하고, JWT 토큰의 SHA-256 해시를 DB(`user_sessions.token_hash`)에 저장.
- **인증 강화**: `auth_middleware`에서 모든 요청마다 JWT 서명 확인뿐만 아니라 DB의 토큰 해시 존재 여부를 확인하여, 로그아웃된 세션을 즉시 무효화함.
- **파일**: `backend/src/commands/config.rs`, `backend/src/middleware/auth.rs`

### 3. [HIGH-3] 사용자 관리 API: Admin 권한 검증 강화

- **조치**: `get_all_users`, `create_user`, `update_user`, `delete_user` 모든 사용자 관리 엔드포인트에 `claims.is_admin()` 검증 로직 추가 완료.
- **파일**: `backend/src/commands/config.rs`

### 4. [HIGH-4] `verify_admin_password`: 보안 취약점 해결

- **조치**: 세션이 없을 때 하드코딩된 관리자로 폴백하는 위험한 로직 제거. 현재 JWT의 `claims`를 기반으로 실제 요청자의 비밀번호를 DB에서 확인하도록 변경.
- **파일**: `backend/src/commands/config.rs`

### 5. [MEDIUM-6] 파일 업로드 제약 사항 강화

- **조치**: 허용되는 파일 확장자(jpg, jpeg, png, webp, gif, bmp) 화이트리스트 검증 도입.
- **파일**: `backend/src/commands/production/media.rs`

---

## ⚠️ 남은 보안 권장 조치

### [LOW-5] CORS 정책: `allow_origin(Any)`

- **현황**: LAN 환경의 모바일 접속을 위해 모든 오리진 허용 중.
- **권장**: 프로덕션 배포 시 환경 변수(`ALLOWED_ORIGINS`)를 통해 특정 IP/도메인만 허용하도록 제한 권장.

### [LOW-8] API 요청 로깅: 민감 정보 마스킹

- **현황**: `api_requests.log`에 전체 URI 기록 중.
- **권장**: `/api/auth/login` 등 민감한 요청의 경우 쿼리 파라미터를 마스킹 처리하는 로직 추가 권장.

---

## ✅ 기존 보안 강점 유지 사항

### 1. 브루트포스 공격 방어

- ✅ 5회 실패 시 15분 계정 잠금 및 백그라운드 자동 해제 시스템 정상 작동.

### 2. 감사 로깅 (Audit Trail)

- ✅ 모든 중요 액션(CUD, Auth)에 대해 IP, User-Agent를 포함한 상세 로그 기록 유지.

### 3. 데이터베이스 정합성

- ✅ SQL Injection 방지를 위한 바인딩 파라미터 전용 사용.
- ✅ 백업/복구 시 트랜잭션 처리 원칙 준수.

---

## 📝 향후 계획

- [ ] HTTPS 적용 (운영 환경 필수)
- [ ] API 속도 제한(Rate Limiting) 도입 고려
- [ ] 정기적인 종속성(Dependencies) 보안 업데이트 체크

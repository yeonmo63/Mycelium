# 🛡️ Mycelium Security Audit Report

**감사 일시**: 2026-02-24  
**감사 대상**: Backend (Rust/Axum) + Frontend (React/Vite)

---

## 📊 전체 보안 등급: B+ (양호)

| 영역 | 등급 | 상태 |
|------|------|------|
| 인증 (Authentication) | A- | ✅ 양호 |
| 인가 (Authorization) | B | ⚠️ 일부 보완 필요 |
| 데이터 보호 | B+ | ✅ 양호 |
| API 보안 | B | ⚠️ 일부 보완 필요 |
| 파일 시스템 보안 | C+ | 🔴 보완 필요 |
| 세션 관리 | A- | ✅ 양호 |
| 감사/로깅 | A | ✅ 우수 |

---

## ✅ 잘 구현된 보안 사항

### 1. JWT 인증 시스템

- ✅ `auth_middleware`를 통한 모든 API 요청의 JWT 검증
- ✅ Bearer 토큰 방식 구현
- ✅ 토큰 만료 시간 설정 (1일)
- ✅ 환경변수(`JWT_SECRET`)를 통한 시크릿 키 관리
- ✅ 시크릿 키 미설정 시 경고 로그 출력

### 2. 브루트포스 공격 방어

- ✅ `login_attempts` 테이블을 통한 시도 횟수 추적
- ✅ 5회 실패 시 계정 15분 잠금 (`is_blocked`, `blocked_until`)
- ✅ 성공 로그인 시 시도 횟수 초기화
- ✅ 백그라운드 태스크로 만료된 잠금 자동 해제 (1시간 주기)

### 3. 세션 관리

- ✅ DB 기반 세션 저장 (`user_sessions` 테이블)
- ✅ 세션 ID를 JWT 클레임에 포함 (`sid` 필드)
- ✅ 로그아웃 시 DB에서 세션 삭제
- ✅ 관리자의 세션 조회 및 강제 폐기 (revoke) 기능
- ✅ 만료된 세션 자동 정리 (1시간 주기)

### 4. 감사 로깅 (Audit Trail)

- ✅ `system_audit_logs` 테이블로 중요 활동 기록
- ✅ 로그인 성공/실패 기록
- ✅ 사용자 생성/수정/삭제 기록
- ✅ IP 주소, User-Agent 기록
- ✅ 관리자 감사 로그 조회 API

### 5. 비밀번호 보안

- ✅ bcrypt 해싱 사용 (`DEFAULT_COST`)
- ✅ 평문 비밀번호 로그 미노출 확인

### 6. SQL Injection 방어

- ✅ 전체적으로 sqlx 바인딩 파라미터 (`$1, $2...`) 사용
- ✅ `format!`으로 직접 SQL 조립하는 경우는 백업 로직의 내부 테이블명(하드코딩)뿐으로, 사용자 입력이 아님

---

## 🔴 발견된 보안 취약점 및 권장 조치

### [CRITICAL-1] 미디어 파일 서빙: 경로 순회(Path Traversal) 취약점

**파일**: `backend/src/commands/production/media.rs:127`
**위험도**: 🔴 높음

```rust
let path = config_dir.join("media").join(&filename);
```

공격자가 `filename`에 `../../.env` 같은 값을 보내면 `.env` 파일(DB 비밀번호, JWT 시크릿 포함)이 유출될 수 있습니다.

**해결 방안**:

```rust
// filename에서 경로 구분자를 제거하여 디렉터리 탈출 방지
let safe_filename = std::path::Path::new(&filename)
    .file_name()
    .ok_or_else(|| /* 에러 */)?
    .to_string_lossy()
    .to_string();
let path = config_dir.join("media").join(&safe_filename);
```

### [CRITICAL-2] 미디어 엔드포인트 인증 우회

**파일**: `backend/src/middleware/auth.rs:61`
**위험도**: 🟡 중간

```rust
|| path.starts_with("/api/production/media/")
```

미디어 파일은 인증 없이 접근 가능합니다. `<img>` 태그 호환을 위한 의도적 설정이지만, 모든 업로드 파일이 공개되는 것은 보안 위험입니다.

**해결 방안**: 파일명에 예측 불가능한 UUID를 포함(현재 구현됨), 또는 토큰을 쿼리 파라미터로 전달하는 방식 검토

### [HIGH-3] 사용자 관리 API: Admin 권한 검증 누락

**파일**: `backend/src/commands/config.rs`
**위험도**: 🔴 높음

`create_user`, `update_user`, `delete_user` 함수에서 `Extension(claims)`를 받지만 **`claims.is_admin()` 검증이 없습니다**. 인증된 일반 사용자도 사용자를 생성/삭제할 수 있습니다.

**현재 코드** (create_user, line 717):

```rust
pub async fn create_user(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>, // claims는 받지만
    Json(payload): Json<CreateUserRequest>,
) -> MyceliumResult<Json<Value>> {
    // ⚠️ is_admin() 검증 없음!
    let hashed = hash(payload.password, DEFAULT_COST)...
```

**해결 방안**: 모든 사용자 관리 함수 시작 부분에 추가:

```rust
if !claims.is_admin() {
    return Err(MyceliumError::Validation("Admin access required".to_string()));
}
```

### [HIGH-4] `verify_admin_password`: 정보 유출 + 세션 기반 확인의 취약점

**파일**: `backend/src/commands/config.rs:865`
**위험도**: 🟡 중간

- 세션이 없으면 admin 사용자의 비밀번호로 폴백하여 확인 → 이것은 사실상 어떤 사용자든 admin 비밀번호만 알면 admin 검증을 통과할 수 있음
- `eprintln!`으로 사용자명 출력 → 프로덕션에서 제거 필요

### [MEDIUM-5] CORS 정책: `allow_origin(Any)`

**파일**: `backend/src/main.rs:308`
**위험도**: 🟡 중간

```rust
CorsLayer::new()
    .allow_origin(Any)
    .allow_methods(Any)
    .allow_headers(Any),
```

모든 오리진에서의 요청을 허용합니다. LAN 내 모바일 접속을 위한 의도적 설정이지만, 공격자가 악성 사이트에서 API를 호출할 수 있습니다. JWT가 있으므로 직접적 위험은 제한적이나, CSRF 공격과 결합될 가능성이 있습니다.

**해결 방안**: 프로덕션에서는 허용된 오리진 목록을 환경변수로 관리

### [MEDIUM-6] 파일 업로드: 타입/크기 검증 부족

**파일**: `backend/src/commands/production/media.rs:72`
**위험도**: 🟡 중간

- 업로드 파일의 MIME 타입 검증 없음 (이미지 외 파일 업로드 가능)
- 파일 확장자만으로 저장 (악성 파일 확장자 그대로 저장됨)
- 개별 파일 크기 제한은 Body Limit(10MB, `main.rs:296`)에만 의존

**해결 방안**:

```rust
let allowed_extensions = ["jpg", "jpeg", "png", "webp", "gif"];
if !allowed_extensions.contains(&extension.to_lowercase().as_str()) {
    return Err(MyceliumError::Validation("Unsupported file type".to_string()));
}
```

### [MEDIUM-7] 토큰 해시 미구현

**파일**: `backend/src/commands/config.rs:311`
**위험도**: 🟡 중간

```rust
.bind("HashedTokenPlaceholder")
```

`user_sessions.token_hash` 필드에 실제 토큰 해시 대신 플레이스홀더 문자열이 저장됩니다. 세션 무효화 시 토큰 검증을 할 수 없어, 로그아웃 후에도 토큰이 만료까지 유효할 수 있습니다.

**해결 방안**: SHA-256으로 JWT 토큰을 해싱하여 저장하고, 요청 시 해시 비교로 세션 유효성을 검증

### [LOW-8] API 요청 로깅: 민감 정보 포함 가능성

**파일**: `backend/src/main.rs:32-69`
**위험도**: 🟢 낮음

`log_requests` 미들웨어가 모든 요청의 URI를 파일(`api_requests.log`)에 기록합니다. GET 요청의 쿼리 파라미터에 민감 정보가 포함될 수 있습니다.

**해결 방안**: 민감 경로(`/api/auth/login` 등)는 파라미터 마스킹 적용

### [LOW-9] 에러 메시지 상세 노출

**파일**: `backend/src/error.rs:62-66`
**위험도**: 🟢 낮음

`debug_assertions` 모드에서는 DB 에러 전문을 클라이언트에 반환합니다. 릴리스 빌드에서는 제네릭 메시지로 변환됩니다.

```rust
if cfg!(debug_assertions) {
    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()) // ⚠️ 개발 모드에서 DB 에러 노출
}
```

현재 릴리스 빌드에서는 제네릭 메시지를 사용하므로 큰 문제 없음.

---

## 📋 우선순위별 조치 권장표

| 순위 | 항목 | 예상 작업량 |
|------|------|------------|
| 1 | **[CRITICAL-1]** 미디어 파일 경로 순회 방어 | 5분 |
| 2 | **[HIGH-3]** 사용자 관리 API Admin 검증 추가 | 10분 |
| 3 | **[MEDIUM-7]** 세션 토큰 해시 구현 | 30분 |
| 4 | **[MEDIUM-6]** 파일 업로드 타입 검증 | 10분 |
| 5 | **[MEDIUM-5]** CORS 정책 강화 | 15분 |
| 6 | **[HIGH-4]** verify_admin 로직 개선 | 15분 |
| 7 | **[CRITICAL-2]** 미디어 접근 제어 강화 | 20분 |

---

## ✅ 백업/복구 보안

- ✅ 모든 백업 API에 `claims.is_admin()` 검증 존재
- ✅ 복구 시 트랜잭션 사용으로 데이터 정합성 보장
- ✅ 백업 취소 기능 존재

## ✅ 프론트엔드 보안

- ✅ localStorage에 JWT 토큰 저장 (XSS 주의 필요하나, PWA 환경에서 일반적)
- ✅ API 호출 시 Authorization 헤더에 토큰 포함
- ✅ 관리자 페이지 접근 시 비밀번호 재인증 요구 (SettingsBackup 등)

# mottool — Supabase 셋업 가이드

## 1. Supabase 프로젝트 생성

1. https://supabase.com/dashboard 로그인
2. **New project** 클릭
3. 설정:
   - **Name**: `mottool`
   - **Database Password**: 강력한 비밀번호 (저장해둘 것)
   - **Region**: `Northeast Asia (Seoul)` (ap-northeast-2)
   - **Pricing Plan**: Free
4. 생성 완료까지 대기 (~2분)

## 2. 스키마 적용

1. 좌측 메뉴 **SQL Editor** → **+ New query**
2. `SUPABASE_SETUP.sql` 파일 전체 복사 → 붙여넣기
3. **Run** (Cmd+Enter)
4. "Success. No rows returned" 확인

## 3. Storage 버킷 생성

1. 좌측 **Storage** → **New bucket**
2. 이름: `book-images`
3. **Public bucket** 체크 ✅
4. **Create bucket**

## 4. 관리자 계정 생성

1. 좌측 **Authentication** → **Users** → **Add user** → **Create new user**
2. Email: 본인 이메일
3. Password: 강력한 비밀번호
4. **Auto Confirm User** 체크 ✅
5. **Create user**

## 5. API 키 복사

1. 좌측 **Project Settings** (⚙️) → **API**
2. **Project URL** 복사
3. **Project API keys** → `anon` `public` 키 복사
4. `supabase-config.js` 파일 열어서 값 입력:

```js
window.SUPABASE_CONFIG = {
  url:     'https://xxxxx.supabase.co',
  anonKey: 'eyJhbGciOi...'
};
```

> 💡 anon key 는 공개되어도 안전합니다 (RLS 가 데이터를 보호). 그대로 git push 해도 됩니다.

## 6. 첫 데이터 시드

1. 사이트 띄우고 `/admin.html` 접속
2. 위에서 만든 이메일/비번으로 로그인
3. 우측 상단 **books.json 시드** 버튼 → 확인
4. 18권 자동 삽입됨

## 7. 배포

```
git add .
git commit -m "Supabase integration"
git push
```

Vercel 이 자동으로 재배포. mottool.art 에 반영됨.

---

## 운영 워크플로

### 책 추가 / 편집 / 재고 조정
- `/admin.html` 로그인 → **책** 탭
- 좌측 목록에서 클릭 → 우측 폼 편집 → 저장
- 재고는 **+/−** 버튼으로 빠르게 조정 (0 되면 자동 품절)

### Instagram DM 으로 들어온 문의 기록
- **문의** 탭 → **+ 문의 추가**
- 누락 없이 처리하려면 **상태**를 `replied → reserved → done` 으로 옮겨가며 관리

### 사업자 등록 후 직접 결제 활성화
1. 통신판매업 신고 완료
2. 결제 PG 연동 (토스페이먼츠 권장)
3. **사이트 설정** 탭 → `shop_open` 을 `true` 로 변경
4. index.html 의 buy CTA 가 `shop_open === true` 일 때 결제 모달을 띄우도록 수정
   (현재는 항상 Instagram 으로 유도)

### 매출 / 통계
- **주문** 탭에서 상태별 필터링
- 추후 Supabase Edge Function 으로 일일/월간 집계 가능

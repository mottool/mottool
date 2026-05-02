-- ============================================================
-- Automatic RLS 활성화 (생성 시 체크 못 한 경우 사후 적용)
-- ============================================================
-- 이걸 실행하면 앞으로 public 스키마에 만들어지는 모든 새 테이블이
-- 자동으로 row level security 가 켜진 채로 생성됨.
-- 기존 테이블엔 영향 없음 (앞으로 생기는 것에만 적용).
--
-- SUPABASE_SETUP.sql 실행 *전* 에 먼저 한 번 돌려두면 좋음.
-- 단, 본 SUPABASE_SETUP.sql 도 모든 테이블에 명시적으로 RLS 를
-- 켜고 정책을 만들기 때문에, 이 파일 실행 여부와 무관하게 안전.
-- ============================================================

-- 1) 새 테이블에 RLS 를 자동으로 켜는 함수
create or replace function public.auto_enable_rls()
returns event_trigger
language plpgsql
security definer
as $$
declare
  obj record;
begin
  for obj in
    select * from pg_event_trigger_ddl_commands()
    where command_tag = 'CREATE TABLE'
  loop
    if obj.schema_name = 'public' then
      execute format('alter table %s enable row level security', obj.object_identity);
    end if;
  end loop;
end;
$$;

-- 2) DDL 후크로 등록 (이미 있으면 무시)
do $$
begin
  if not exists (
    select 1 from pg_event_trigger where evtname = 'auto_enable_rls_trigger'
  ) then
    create event trigger auto_enable_rls_trigger
      on ddl_command_end
      when tag in ('CREATE TABLE')
      execute function public.auto_enable_rls();
  end if;
end $$;

-- 확인:
--   select * from pg_event_trigger;
-- 결과에 'auto_enable_rls_trigger' 가 보이면 성공.

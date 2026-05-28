// ============================================================
// config.js — Supabase 설정
// 아래 두 값을 Supabase 프로젝트의 값으로 교체하세요
// ============================================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// Supabase SQL (프로젝트 SQL Editor에서 한 번만 실행하세요)
// ============================================================
/*

-- 기도제목 테이블
create table prayers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  category text default 'personal',
  status text default 'ongoing',
  content text,
  scripture text,
  start_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 기도 이력 테이블
create table prayer_logs (
  id uuid default gen_random_uuid() primary key,
  prayer_id uuid references prayers on delete cascade not null,
  user_id uuid references auth.users not null,
  date date default current_date,
  content text,
  scripture text,
  created_at timestamptz default now()
);

-- RLS 활성화
alter table prayers enable row level security;
alter table prayer_logs enable row level security;

-- 본인 데이터만 접근 가능
create policy "own prayers" on prayers for all using (auth.uid() = user_id);
create policy "own logs" on prayer_logs for all using (auth.uid() = user_id);

*/

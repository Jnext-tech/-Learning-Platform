-- ============================================================
-- Learning Platform — Supabase PostgreSQL Schema + RLS
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------
do $$ begin
  create type user_role as enum ('manager', 'teacher', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type course_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type registration_status as enum ('active', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type room_status as enum ('scheduled', 'live', 'ended', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_status as enum ('PRESENT', 'ABSENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_event_type as enum ('JOIN', 'LEAVE');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- PROFILES  (1:1 with auth.users)
-- ------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on profiles(role);

-- ------------------------------------------------------------
-- COURSES
-- ------------------------------------------------------------
create table if not exists courses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  teacher_id uuid not null references profiles(id) on delete cascade,
  status course_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_courses_teacher on courses(teacher_id);
create index if not exists idx_courses_status on courses(status);

-- ------------------------------------------------------------
-- COURSE REGISTRATIONS  (many-to-many students <-> courses)
-- ------------------------------------------------------------
create table if not exists course_registrations (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  status registration_status not null default 'active',
  registered_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create index if not exists idx_registrations_student on course_registrations(student_id);
create index if not exists idx_registrations_course on course_registrations(course_id);

-- ------------------------------------------------------------
-- ROOMS  (class sessions)
-- ------------------------------------------------------------
create table if not exists rooms (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  start_date date not null,
  start_time time not null,
  end_time time not null,
  status room_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rooms_course on rooms(course_id);
create index if not exists idx_rooms_status on rooms(status);

-- ------------------------------------------------------------
-- ATTENDANCE  (exactly one row per student per room)
-- ------------------------------------------------------------
create table if not exists attendance (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references profiles(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  status attendance_status not null default 'ABSENT',
  first_joined_at timestamptz,
  last_left_at timestamptz,
  finalized_at timestamptz,
  unique (student_id, room_id)
);

create index if not exists idx_attendance_room on attendance(room_id);
create index if not exists idx_attendance_student on attendance(student_id);

-- ------------------------------------------------------------
-- ROOM ACTIVITY LOGS  (every JOIN / LEAVE event)
-- ------------------------------------------------------------
create table if not exists room_activity_logs (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  event_type activity_event_type not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_room on room_activity_logs(room_id);
create index if not exists idx_activity_user on room_activity_logs(user_id);

-- ------------------------------------------------------------
-- MESSAGES  (chat, per room)
-- ------------------------------------------------------------
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_room on messages(room_id, created_at);

-- ============================================================
-- HELPER FUNCTIONS (used inside RLS policies)
-- ============================================================

create or replace function current_role_is(target_role user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = target_role
  );
$$;

create or replace function is_registered_for_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from course_registrations cr
    where cr.course_id = p_course_id
      and cr.student_id = auth.uid()
      and cr.status = 'active'
  );
$$;

create or replace function is_room_accessible(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when current_role_is('manager') then true
    when current_role_is('teacher') then exists (
      select 1 from rooms r join courses c on c.id = r.course_id
      where r.id = p_room_id and c.teacher_id = auth.uid()
    )
    when current_role_is('student') then exists (
      select 1 from rooms r
      where r.id = p_room_id and is_registered_for_course(r.course_id)
    )
    else false
  end;
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================
alter table profiles enable row level security;
alter table courses enable row level security;
alter table course_registrations enable row level security;
alter table rooms enable row level security;
alter table attendance enable row level security;
alter table room_activity_logs enable row level security;
alter table messages enable row level security;

-- ------------------------------------------------------------
-- PROFILES policies
-- ------------------------------------------------------------
create policy "profiles_select_own_or_manager"
  on profiles for select
  using (id = auth.uid() or current_role_is('manager'));

create policy "profiles_select_teacher_of_registered_course"
  on profiles for select
  using (
    current_role_is('teacher') and exists (
      select 1 from course_registrations cr
      join courses c on c.id = cr.course_id
      where cr.student_id = profiles.id and c.teacher_id = auth.uid()
    )
  );

create policy "profiles_update_own"
  on profiles for update
  using (id = auth.uid());

-- ------------------------------------------------------------
-- COURSES policies
-- ------------------------------------------------------------
create policy "courses_select_all_authenticated"
  on courses for select
  using (auth.role() = 'authenticated');

create policy "courses_insert_manager_or_teacher"
  on courses for insert
  with check (
    current_role_is('manager')
    or (current_role_is('teacher') and teacher_id = auth.uid())
  );

create policy "courses_update_owner_or_manager"
  on courses for update
  using (current_role_is('manager') or teacher_id = auth.uid());

create policy "courses_delete_owner_or_manager"
  on courses for delete
  using (current_role_is('manager') or teacher_id = auth.uid());

-- ------------------------------------------------------------
-- COURSE_REGISTRATIONS policies
-- ------------------------------------------------------------
create policy "registrations_select_own_teacher_or_manager"
  on course_registrations for select
  using (
    student_id = auth.uid()
    or current_role_is('manager')
    or exists (
      select 1 from courses c
      where c.id = course_registrations.course_id and c.teacher_id = auth.uid()
    )
  );

create policy "registrations_insert_self_student"
  on course_registrations for insert
  with check (current_role_is('student') and student_id = auth.uid());

create policy "registrations_delete_self_or_manager"
  on course_registrations for delete
  using (student_id = auth.uid() or current_role_is('manager'));

-- ------------------------------------------------------------
-- ROOMS policies
-- ------------------------------------------------------------
create policy "rooms_select_accessible"
  on rooms for select
  using (is_room_accessible(id));

create policy "rooms_insert_manager_or_owning_teacher"
  on rooms for insert
  with check (
    current_role_is('manager')
    or (
      current_role_is('teacher') and exists (
        select 1 from courses c where c.id = course_id and c.teacher_id = auth.uid()
      )
    )
  );

create policy "rooms_update_manager_or_owning_teacher"
  on rooms for update
  using (
    current_role_is('manager')
    or exists (select 1 from courses c where c.id = course_id and c.teacher_id = auth.uid())
  );

-- ------------------------------------------------------------
-- ATTENDANCE policies
-- ------------------------------------------------------------
create policy "attendance_select_own_teacher_or_manager"
  on attendance for select
  using (
    student_id = auth.uid()
    or current_role_is('manager')
    or exists (
      select 1 from rooms r join courses c on c.id = r.course_id
      where r.id = attendance.room_id and c.teacher_id = auth.uid()
    )
  );

-- Attendance rows are written exclusively by the backend service role
-- (bypasses RLS). No direct client insert/update policy is defined.

-- ------------------------------------------------------------
-- ROOM_ACTIVITY_LOGS policies
-- ------------------------------------------------------------
create policy "activity_logs_select_teacher_or_manager"
  on room_activity_logs for select
  using (
    user_id = auth.uid()
    or current_role_is('manager')
    or exists (
      select 1 from rooms r join courses c on c.id = r.course_id
      where r.id = room_activity_logs.room_id and c.teacher_id = auth.uid()
    )
  );

-- Activity log rows are written exclusively by the backend service role.

-- ------------------------------------------------------------
-- MESSAGES policies
-- ------------------------------------------------------------
create policy "messages_select_room_accessible"
  on messages for select
  using (is_room_accessible(room_id));

create policy "messages_insert_room_accessible"
  on messages for insert
  with check (sender_id = auth.uid() and is_room_accessible(room_id));

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_courses_updated on courses;
create trigger trg_courses_updated before update on courses
  for each row execute function set_updated_at();

drop trigger if exists trg_rooms_updated on rooms;
create trigger trg_rooms_updated before update on rooms
  for each row execute function set_updated_at();

-- ============================================================
-- Auto-create profile row when a new auth user signs up
-- (role defaults to 'student'; promote via Manager dashboard / SQL)
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

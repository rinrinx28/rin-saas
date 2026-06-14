-- 0008 — Quản lý nhân viên (RPC) + RBAC. Phase 3.
-- Thêm/sửa/xóa thành viên qua RPC security definer (kiểm tra role owner/admin).

-- Vai trò của user hiện tại trong org
create or replace function public.my_role(p_org uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.memberships where org_id = p_org and user_id = auth.uid();
$$;

-- Liệt kê thành viên kèm email (chỉ thành viên org mới xem được)
create or replace function public.list_members(p_org uuid)
returns table (id uuid, user_id uuid, role text, email text)
language sql
security definer
stable
set search_path = public
as $$
  select m.id, m.user_id, m.role, u.email::text
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.org_id = p_org and public.is_org_member(p_org)
  order by m.created_at;
$$;

-- Thêm thành viên theo email đã có tài khoản
create or replace function public.add_member(p_org uuid, p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  if public.my_role(p_org) not in ('owner', 'admin') then raise exception 'Không có quyền'; end if;
  if p_role not in ('owner', 'admin', 'staff') then raise exception 'Vai trò không hợp lệ'; end if;

  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then raise exception 'Email chưa có tài khoản trên hệ thống'; end if;
  if exists (select 1 from public.memberships where org_id = p_org and user_id = v_uid) then
    raise exception 'Người này đã là thành viên';
  end if;

  insert into public.memberships (user_id, org_id, role) values (v_uid, p_org, p_role);
end;
$$;

-- Đổi vai trò (không hạ cấp owner cuối cùng)
create or replace function public.update_member_role(p_membership uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_old text;
begin
  select org_id, role into v_org, v_old from public.memberships where id = p_membership;
  if v_org is null then raise exception 'Không tồn tại'; end if;
  if public.my_role(v_org) not in ('owner', 'admin') then raise exception 'Không có quyền'; end if;
  if p_role not in ('owner', 'admin', 'staff') then raise exception 'Vai trò không hợp lệ'; end if;

  if v_old = 'owner' and p_role <> 'owner'
     and (select count(*) from public.memberships where org_id = v_org and role = 'owner') <= 1 then
    raise exception 'Phải còn ít nhất một chủ sở hữu';
  end if;

  update public.memberships set role = p_role where id = p_membership;
end;
$$;

-- Xóa thành viên (không xóa owner cuối cùng)
create or replace function public.remove_member(p_membership uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_role text;
begin
  select org_id, role into v_org, v_role from public.memberships where id = p_membership;
  if v_org is null then raise exception 'Không tồn tại'; end if;
  if public.my_role(v_org) not in ('owner', 'admin') then raise exception 'Không có quyền'; end if;
  if v_role = 'owner'
     and (select count(*) from public.memberships where org_id = v_org and role = 'owner') <= 1 then
    raise exception 'Phải còn ít nhất một chủ sở hữu';
  end if;

  delete from public.memberships where id = p_membership;
end;
$$;

grant execute on function public.my_role(uuid) to authenticated;
grant execute on function public.list_members(uuid) to authenticated;
grant execute on function public.add_member(uuid, text, text) to authenticated;
grant execute on function public.update_member_role(uuid, text) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;

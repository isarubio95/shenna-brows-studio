-- Vincular pedidos históricos con cuentas registradas por email
update public.orders o
set user_id = u.id
from auth.users u
where o.user_id is null
  and lower(trim(o.email)) = lower(trim(u.email::text));

drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders"
  on public.orders
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and (auth.jwt() ->> 'email') is not null
      and lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
    )
  );

drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and (
          orders.user_id = auth.uid()
          or (
            orders.user_id is null
            and (auth.jwt() ->> 'email') is not null
            and lower(trim(orders.email)) = lower(trim(auth.jwt() ->> 'email'))
          )
        )
    )
  );

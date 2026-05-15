-- Permite a administradores eliminar pedidos y líneas (el panel Admin ya lo intentaba sin política DELETE).

drop policy if exists "Admins delete orders" on public.orders;
create policy "Admins delete orders"
  on public.orders
  for delete
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins delete order items" on public.order_items;
create policy "Admins delete order items"
  on public.order_items
  for delete
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

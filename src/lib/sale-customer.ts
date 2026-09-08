type Customer = { id: string; full_name: string };

// Empty select events occur while options mount. Clearing a customer must be explicit.
export function selectSaleCustomer<T extends { manual_customer_name?: string | null }>(
  sale: T,
  selectedId: string,
  customers: Customer[],
) {
  if (!selectedId) return sale;
  const customer = customers.find((item) => item.id === selectedId);
  return {
    ...sale,
    customer_id: selectedId === "_none" ? null : selectedId,
    customer: selectedId === "_none" ? null : (customer ?? null),
    manual_customer_name: selectedId === "_none" ? sale.manual_customer_name : "",
  };
}

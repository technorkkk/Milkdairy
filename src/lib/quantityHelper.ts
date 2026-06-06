import { Customer } from '../types';

/**
 * Returns the base quantity of milk for a customer on a specific date,
 * based on their quantity history timeline.
 * If no timeline matches or is empty, falls back to their default dailyQuantity.
 */
export function getBaseQuantityForDate(customer: any, dateStr: string): number {
  if (!customer) return 1;
  
  const dailyQty = Number(customer.dailyQuantity || 1);
  const history = customer.quantityHistory as { date: string; quantity: number }[] | undefined;
  
  if (!history || history.length === 0) {
    return dailyQty;
  }
  
  // Sort history entries by date ascending
  const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date));
  
  // Find the latest entry that is less than or equal to our target date
  let applicableQty = dailyQty;
  let exactMatch = false;
  
  for (const entry of sortedHistory) {
    if (entry.date <= dateStr) {
      applicableQty = Number(entry.quantity);
      exactMatch = true;
    }
  }
  
  return applicableQty;
}

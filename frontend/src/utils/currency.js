/**
 * Shared currency formatting utility for KhanaHub.
 * Formats numbers into standard Indian Rupee currency format (e.g. 1250 -> "₹1,250").
 * Safely handles numeric values, numeric strings, zero, and empty values.
 *
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted price with the Indian Rupee symbol (₹)
 */
export const formatPrice = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatCurrency = formatPrice;
export default formatPrice;

// Minimal local types to avoid dependency on a global `@/types` module
type Order = { orderNumber: string; totalAmount: number }
type Design = { name?: string | null }

export function renderBuyerEmail(order: Order) {
  return {
    subject: `Your purchase was successful! Order #${order.orderNumber}`,
    text: `Thank you for your purchase!\nOrder ID: ${order.orderNumber}\nTotal: $${order.totalAmount}\nYou can view your order details in your account.`,
    html: `<h2>Thank you for your purchase!</h2><p>Order ID: <b>${order.orderNumber}</b></p><p>Total: <b>$${order.totalAmount}</b></p><p>You can view your order details in your account.</p>`
  };
}

export function renderSellerEmail(design: unknown, price: number, type: string) {
  const name = (design && typeof design === 'object' && 'name' in design) ? (design as any).name ?? 'your design' : 'your design'
  return {
    subject: `Your design has been sold!`,
    text: `Congratulations! Your design "${name}" has been bought.\nPrice: $${price}\nType: ${type}`,
    html: `<h2>Congratulations!</h2><p>Your design <b>${name}</b> has been bought.</p><p>Price: <b>$${price}</b></p><p>Type: <b>${type}</b></p>`
  };
}

import { Design, Order } from '@/types';

export function renderBuyerEmail(order: Order) {
  return {
    subject: `Your purchase was successful! Order #${order.orderNumber}`,
    text: `Thank you for your purchase!\nOrder ID: ${order.orderNumber}\nTotal: $${order.totalAmount}\nYou can view your order details in your account.`,
    html: `<h2>Thank you for your purchase!</h2><p>Order ID: <b>${order.orderNumber}</b></p><p>Total: <b>$${order.totalAmount}</b></p><p>You can view your order details in your account.</p>`
  };
}

export function renderSellerEmail(design: Design, price: number, type: string) {
  return {
    subject: `Your design has been sold!`,
    text: `Congratulations! Your design "${design.name}" has been bought.\nPrice: $${price}\nType: ${type}`,
    html: `<h2>Congratulations!</h2><p>Your design <b>${design.name}</b> has been bought.</p><p>Price: <b>$${price}</b></p><p>Type: <b>${type}</b></p>`
  };
}

export function renderBuyerEmail(order: unknown) {
  const ord = (order && typeof order === 'object') ? order as Record<string, unknown> : {}
  const orderNumber = (ord['orderNumber'] as string | undefined) ?? '—'
  const rawTotal = ord['totalAmount']
  const totalAmount = typeof rawTotal === 'number' ? rawTotal : (typeof rawTotal === 'string' ? parseFloat(rawTotal) : 0)
  return {
    subject: `Your purchase was successful! Order #${orderNumber}`,
    text: `Thank you for your purchase!\nOrder ID: ${orderNumber}\nTotal: $${totalAmount}\nYou can view your order details in your account.`,
    html: `<h2>Thank you for your purchase!</h2><p>Order ID: <b>${orderNumber}</b></p><p>Total: <b>$${totalAmount}</b></p><p>You can view your order details in your account.</p>`
  };
}

export function renderSellerEmail(design: unknown, price: number, type: string) {
  const maybeDesign = (design && typeof design === 'object') ? design as { name?: string | null } : { name: null }
  const name = maybeDesign.name ?? 'your design'
  return {
    subject: `Your design has been sold!`,
    text: `Congratulations! Your design "${name}" has been bought.\nPrice: $${price}\nType: ${type}`,
    html: `<h2>Congratulations!</h2><p>Your design <b>${name}</b> has been bought.</p><p>Price: <b>$${price}</b></p><p>Type: <b>${type}</b></p>`
  };
}

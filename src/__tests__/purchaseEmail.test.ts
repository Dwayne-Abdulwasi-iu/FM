import { renderBuyerEmail, renderSellerEmail } from '@/lib/purchaseEmailTemplates';

describe('Purchase Email Templates', () => {
  it('renders buyer email correctly', () => {
    const order: { orderNumber: string; totalAmount: number } = {
      orderNumber: 'FM-123456',
      totalAmount: 99.99,
    };
    const result = renderBuyerEmail(order);
    expect(result.subject).toContain(order.orderNumber);
    expect(result.text).toContain('Order ID: FM-123456');
    expect(result.html).toContain('<b>FM-123456</b>');
  });

  it('renders seller email correctly for regular', () => {
    const design: { name: string } = { name: 'Summer Dress' };
    const result = renderSellerEmail(design, 49.99, 'Regular');
    expect(result.subject).toContain('sold');
    expect(result.text).toContain('Summer Dress');
    expect(result.text).toContain('Regular');
    expect(result.html).toContain('<b>Summer Dress</b>');
  });

  it('renders seller email correctly for exclusive', () => {
    const design: { name: string } = { name: 'Winter Coat' };
    const result = renderSellerEmail(design, 199.99, 'Exclusive');
    expect(result.text).toContain('Exclusive');
    expect(result.html).toContain('Exclusive');
  });
});

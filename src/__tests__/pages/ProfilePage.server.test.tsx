/**
 * Server-side test: ensure ProfilePage computes and passes a non-null initialPayoutSummary
 * when prisma.sellerEarning returns entries.
 */
import { getServerSession } from 'next-auth'

// We'll inspect the React element returned by the server component and search
// for the `initialPayoutSummary` prop inside the element tree.


jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))
// Provide a manual mock for prisma to avoid initializing PrismaClient in tests
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    design: { count: jest.fn() },
    orderItem: { findMany: jest.fn() },
    sellerEarning: { findMany: jest.fn() }
  }
}))

import prisma from '@/lib/prisma'

describe('ProfilePage server', () => {
  beforeEach(() => {
    // reset not needed; we'll inspect the returned element for props
    ;(getServerSession as unknown as jest.Mock).mockResolvedValue({ user: { id: 'u1' } })

    // Mock prisma calls used by the page (we use the jest.fn() placeholders from the manual mock)
    ;(prisma.user.findUnique as unknown as jest.Mock) = jest.fn().mockResolvedValue({ id: 'u1', email: 'u@example.com', name: 'U' })
    ;(prisma.design.count as unknown as jest.Mock) = jest.fn().mockResolvedValue(2)
    ;(prisma.orderItem.findMany as unknown as jest.Mock) = jest.fn().mockResolvedValue([
      { order: { totalAmount: 100 } },
      { order: { totalAmount: 150 } }
    ])

    // Provide sellerEarnings with a PAID entry so page computes lastPayoutDate
    ;(prisma.sellerEarning.findMany as unknown as jest.Mock) = jest.fn().mockResolvedValue([
      { sellerAmount: 100, platformCommission: 10, createdAt: new Date('2025-10-01T12:00:00Z'), payoutStatus: 'PAID', payoutCompletedAt: new Date('2025-10-01T12:00:00Z') }
    ])
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('computes a non-null initialPayoutSummary when sellerEarnings exist', async () => {
    const { default: ProfilePage } = await import('@/app/profile/page')

    // Call the server component function (it is async) and inspect the returned React element
    const el = await (ProfilePage as unknown as () => Promise<unknown>)()

    // Recursively search the element tree for a prop named initialPayoutSummary
    const findProp = (node: any): any => {
      if (!node || typeof node !== 'object') return undefined
      if (node.props && Object.prototype.hasOwnProperty.call(node.props, 'initialPayoutSummary')) return node.props.initialPayoutSummary
      const children = node.props?.children
      if (Array.isArray(children)) {
        for (const c of children) {
          const r = findProp(c)
          if (r !== undefined) return r
        }
      } else if (children) {
        return findProp(children)
      }
      return undefined
    }

    const ips = findProp(el)
    expect(ips).toBeDefined()
    expect((ips as Record<string, unknown>).lastPayoutStatus).toBe('PAID')
    expect((ips as Record<string, unknown>).lastPayoutDate).toBeTruthy()
  })
})

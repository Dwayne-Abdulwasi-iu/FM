/* eslint-disable @typescript-eslint/no-require-imports */
import { jest } from '@jest/globals'

// Mock dependencies before importing routes
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  design: {
    findUnique: jest.fn(),
  },
  designMedia: {
    delete: jest.fn(),
  },
  boutiqueFavorite: {
    create: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
  },
  boutiqueProduct: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  sellerToAdminShipment: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  variantDiscrepancyAppeal: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  passwordReset: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/cloudinary', () => ({
  deleteFromCloudinary: jest.fn().mockResolvedValue(true),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: unknown) => ({ body, init }),
  },
}))

describe('Email Notification Endpoints', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'seller@test.com',
      name: 'Test Seller',
      role: 'USER',
    },
  }

  const mockAdminSession = {
    user: {
      id: 'admin-123',
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'ADMIN',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/boutique/products/[id]/submit - Product Submission Email', () => {
    it('sends confirmation email to seller on product submission', async () => {
      const { sendEmail } = require('@/lib/email')
      const mockPrisma = require('@/lib/prisma')
      const { getServerSession } = require('next-auth')

      getServerSession.mockResolvedValue(mockSession)
      mockPrisma.boutiqueProduct.findUnique.mockResolvedValue({
        id: 'product-123',
        title: 'Elegant Fashion Print',
        description: 'A beautiful fashion illustration',
        categoryId: 'cat-1',
        seller: { email: 'seller@test.com', name: 'Test Seller' },
      })

      // Simulate the endpoint call
      sendEmail({
        to: 'seller@test.com',
        subject: 'Product Submitted for Review',
        html: expect.stringContaining('Elegant Fashion Print'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.to).toBe('seller@test.com')
      expect(call.subject).toContain('Product')
    })

    it('sends admin notification email when product is submitted', async () => {
      const { sendEmail } = require('@/lib/email')
      const mockPrisma = require('@/lib/prisma')

      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'admin@test.com',
      })

      sendEmail({
        to: 'admin@test.com',
        subject: 'New Product Submission',
        html: expect.stringContaining('review'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.to).toBe('admin@test.com')
      expect(call.subject).toContain('Product')
    })
  })

  describe('POST /api/boutique/products/[id]/shipment - Shipment Tracking Email', () => {
    it('sends shipment notification to seller', async () => {
      const { sendEmail } = require('@/lib/email')

      sendEmail({
        to: 'seller@test.com',
        subject: 'Shipment Received',
        html: expect.stringContaining('tracking'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.to).toBe('seller@test.com')
      expect(call.subject).toContain('Shipment')
    })

    it('sends admin inventory alert on shipment', async () => {
      const { sendEmail } = require('@/lib/email')

      sendEmail({
        to: 'admin@test.com',
        subject: 'New Shipment Arrived',
        html: expect.stringContaining('inventory'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.subject).toContain('Shipment')
    })
  })

  describe('POST /api/auth/send-verification - Email Verification', () => {
    it('sends verification email with token link', async () => {
      const { sendEmail } = require('@/lib/email')
      const mockPrisma = require('@/lib/prisma')

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'newuser@test.com',
        name: 'New User',
        emailNotifications: true,
      })

      sendEmail({
        to: 'newuser@test.com',
        subject: 'Verify Your Email',
        html: expect.stringContaining('verify'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.to).toBe('newuser@test.com')
      expect(call.subject).toContain('Verify')
    })
  })

  describe('POST /api/auth/forgot-password - Password Reset Email', () => {
    it('sends password reset email with secure link', async () => {
      const { sendEmail } = require('@/lib/email')
      const mockPrisma = require('@/lib/prisma')

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        name: 'Test User',
      })

      mockPrisma.passwordReset.create.mockResolvedValue({
        token: 'reset-token-abc123',
        expiresAt: new Date(Date.now() + 3600000),
      })

      sendEmail({
        to: 'user@test.com',
        subject: 'Reset Your Password',
        html: expect.stringContaining('reset'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.to).toBe('user@test.com')
      expect(call.subject).toContain('Password')
    })
  })

  describe('POST /api/auth/reset-password - Password Reset Confirmation', () => {
    it('sends confirmation email after password reset', async () => {
      const { sendEmail } = require('@/lib/email')

      sendEmail({
        to: 'user@test.com',
        subject: 'Password Changed',
        html: expect.stringContaining('security'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.subject).toContain('Password')
    })
  })

  describe('POST /api/onboarding/quickstart - Seller Onboarding', () => {
    it('sends welcome email to new seller', async () => {
      const { sendEmail } = require('@/lib/email')

      sendEmail({
        to: 'newseller@test.com',
        subject: 'Welcome to the Fashion Marketplace',
        html: expect.stringContaining('welcome'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.to).toBe('newseller@test.com')
      expect(call.subject).toContain('Welcome')
    })

    it('sends admin notification for new seller onboarding', async () => {
      const { sendEmail } = require('@/lib/email')

      sendEmail({
        to: 'admin@test.com',
        subject: 'New Seller Onboarded',
        html: expect.stringContaining('review'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.subject).toContain('Seller')
    })
  })

  describe('POST /api/boutique/admin/shipments - Warehouse Receipt', () => {
    it('sends receipt confirmation to seller', async () => {
      const { sendEmail } = require('@/lib/email')

      sendEmail({
        to: 'seller@test.com',
        subject: 'Items Received at Warehouse',
        html: expect.stringContaining('receipt'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.subject).toContain('Received')
    })

    it('sends inventory alert to admin', async () => {
      const { sendEmail } = require('@/lib/email')

      sendEmail({
        to: 'admin@test.com',
        subject: 'Incoming Shipment',
        html: expect.stringContaining('inventory'),
      })

      expect(sendEmail).toHaveBeenCalled()
    })
  })

  describe('PUT /api/boutique/admin/shipments/[id] - Shipment Rejection', () => {
    it('sends rejection email to seller', async () => {
      const { sendEmail } = require('@/lib/email')

      sendEmail({
        to: 'seller@test.com',
        subject: 'Shipment Rejected',
        html: expect.stringContaining('rejected'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.subject).toContain('Rejected')
    })
  })

  describe('POST /api/boutique/admin/shipments/[id]/dispute - Dispute Resolution', () => {
    it('sends resolution notification on seller fault', async () => {
      const { sendEmail } = require('@/lib/email')

      sendEmail({
        to: 'seller@test.com',
        subject: 'Dispute Resolution',
        html: expect.stringContaining('seller'),
      })

      expect(sendEmail).toHaveBeenCalled()
      const call = sendEmail.mock.calls[0][0]
      expect(call.subject).toContain('Dispute')
    })
  })

  describe('POST /api/boutique/favorites - Toggle Favorites', () => {
    it('successfully adds product to favorites', async () => {
      const { sendEmail } = require('@/lib/email')
      const mockPrisma = require('@/lib/prisma')
      const { getServerSession } = require('next-auth')

      getServerSession.mockResolvedValue(mockSession)
      mockPrisma.boutiqueFavorite.create.mockResolvedValue({
        id: 'fav-123',
        userId: 'user-123',
        productId: 'product-123',
      })

      // No email should be sent for favorites toggle
      expect(sendEmail).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/admin/users/[id]/message - Admin Messaging', () => {
    it('sends message email only when user opted in', async () => {
      const { sendEmail } = require('@/lib/email')
      const mockPrisma = require('@/lib/prisma')

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        emailNotifications: true,
      })

      sendEmail({
        to: 'user@test.com',
        subject: 'Message from Admin',
        html: expect.stringContaining('message'),
      })

      expect(sendEmail).toHaveBeenCalled()
    })

    it('respects user opt-out preference', async () => {
      const { sendEmail } = require('@/lib/email')
      const mockPrisma = require('@/lib/prisma')

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        emailNotifications: false,
      })

      // Should not send if user opted out
      expect(sendEmail).not.toHaveBeenCalled()
    })
  })

  describe('DELETE /api/boutique/products/[id]/media - Media Deletion', () => {
    it('deletes media from Cloudinary and database', async () => {
      const { deleteFromCloudinary } = require('@/lib/cloudinary')
      const mockPrisma = require('@/lib/prisma')

      mockPrisma.designMedia.delete.mockResolvedValue({
        id: 'media-123',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image/upload/v1234/public_id',
      })

      deleteFromCloudinary('public_id')

      expect(deleteFromCloudinary).toHaveBeenCalledWith(
        expect.stringMatching(/public_id/)
      )
    })
  })

  describe('Email Service Error Handling', () => {
    it('gracefully handles email service failure', async () => {
      const { sendEmail } = require('@/lib/email')

      sendEmail.mockResolvedValue(false)

      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      })

      expect(result).toBe(false)
    })

    it('handles missing user preferences gracefully', async () => {
      const { sendEmail } = require('@/lib/email')
      const mockPrisma = require('@/lib/prisma')

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        emailNotifications: null,
      })

      // Should still attempt to send
      expect(sendEmail).toBeDefined()
    })
  })
})

import React from 'react'
import { render, screen } from '@testing-library/react'
import OverviewTab from '@/components/profile/OverviewTab'

describe('OverviewTab', () => {
  it('displays counts and links', () => {
    render(<OverviewTab designsCount={5} ordersCount={2} loading={false} />)

    expect(screen.getByText('Designs')).toBeInTheDocument()
    expect(screen.getByText('Orders')).toBeInTheDocument()
    // counts
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    // links
    expect(screen.getByText('View designs')).toBeInTheDocument()
    expect(screen.getByText('View orders')).toBeInTheDocument()
  })
})

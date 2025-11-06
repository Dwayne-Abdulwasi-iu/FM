import React from 'react'
import { render, screen } from '@testing-library/react'
import OverviewTab from '@/components/profile/OverviewTab'

describe('OverviewTab edge cases', () => {
  it('shows loading placeholders when loading is true', () => {
    render(<OverviewTab designsCount={null} ordersCount={null} loading={true} />)

    // The component uses an ellipsis '…' when loading
    expect(screen.getAllByText('…').length).toBeGreaterThanOrEqual(1)
  })
})

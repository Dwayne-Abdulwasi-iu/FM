import { slug, labelFromParam } from '@/components/profile/ProfileTabs'

describe('ProfileTabs helpers', () => {
  test('slug produces kebab-case', () => {
    expect(slug('Bank Account')).toBe('bank-account')
    expect(slug('Overview')).toBe('overview')
    expect(slug('My Cool Tab')).toBe('my-cool-tab')
  })

  test('labelFromParam accepts slug or label', () => {
    expect(labelFromParam('bank-account')).toBe('Bank Account')
    expect(labelFromParam('Bank Account')).toBe('Bank Account')
    expect(labelFromParam('overview')).toBe('Overview')
    expect(labelFromParam('OVERVIEW')).toBe('Overview')
    expect(labelFromParam('non-existent')).toBeNull()
    expect(labelFromParam(null)).toBeNull()
    expect(labelFromParam(undefined)).toBeNull()
  })
})

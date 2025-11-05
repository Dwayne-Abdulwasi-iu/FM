import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navbar } from '@/components/layout/navbar'
import { SessionProvider, useSession } from 'next-auth/react'

const mockSession = {
  user: { id: '1', name: 'Tester', email: 't@test.com', role: 'USER' },
  expires: '2100-01-01'
}

const MockSessionProvider = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider session={mockSession}>{children}</SessionProvider>
)

// Simple EventSource mock that allows tests to dispatch messages
class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: ((e?: unknown) => void) | null = null
  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }
  close() {}
  // helper for tests
  sendMessage(data: string) {
    if (this.onmessage) this.onmessage({ data })
  }
}

describe('Notifications dropdown', () => {
  let _origFetch: typeof global.fetch | undefined
  beforeEach(() => {
    // authenticated session
    ;(useSession as unknown as jest.Mock).mockReturnValue({ data: mockSession, status: 'authenticated' })

    // replace EventSource on the global/window object in a type-safe way
    Object.defineProperty(window, 'EventSource', { value: MockEventSource, configurable: true })
    _origFetch = (global as unknown as { fetch?: typeof fetch }).fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
    // clear any created EventSource instances
    MockEventSource.instances = []
    // restore global.fetch if we replaced it
    if (_origFetch !== undefined) (global as unknown as { fetch?: typeof fetch }).fetch = _origFetch
    else delete (global as unknown as { fetch?: typeof fetch }).fetch
  })

  it('shows a spinner while loading preview, renders items, and sends PATCH when marking read; reacts to SSE', async () => {
    // prepare controllable promises for preview fetch
  let previewResolve!: (value: unknown) => void
  const previewPromise = new Promise((res) => { previewResolve = res })

    // mock fetch implementation
    const fetchMock = jest.fn().mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url
      if (url.includes('/api/notifications?limit=5')) {
        return previewPromise
      }
      if (url.endsWith('/api/notifications')) {
        // notifications count endpoint
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ unreadCount: 1, items: [] }), headers: { get: () => null } })
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
    })

    ;(global as unknown as Record<string, unknown>).fetch = fetchMock

    render(
      <MockSessionProvider>
        <Navbar />
      </MockSessionProvider>
    )

    // open the notifications dropdown by clicking the desktop bell (first available)
    const bell = await screen.findAllByLabelText(/open notifications/i)
    const trigger = bell[0]
    await userEvent.click(trigger)

  // Because the preview fetch is pending, the dropdown should be in a busy/loading state
  const dialog = await screen.findByRole('dialog', { name: /notifications/i })
  await waitFor(() => expect(dialog.querySelector('[aria-busy="true"]')).not.toBeNull())

    // now resolve the preview with a single unread item
    previewResolve({ ok: true, status: 200, headers: { get: () => 'etag-1' }, json: async () => ({ items: [{ id: 'n1', title: 'Hello', message: 'You have mail', isRead: false, createdAt: new Date().toISOString() }], unreadCount: 1 }) })

    // wait for the 'Mark read' button to show up for the item
    const markBtn = await screen.findByText(/Mark read/i)
    expect(markBtn).toBeInTheDocument()

    // click mark read and assert a PATCH request was made to /api/notifications
    await userEvent.click(markBtn)
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find((c) => {
        const input = c[0] as string
        const init = c[1] as RequestInit | undefined
        return input.includes('/api/notifications') && init && init.method === 'PATCH'
      })
      expect(patchCall).toBeTruthy()
    })

    // simulate an SSE message arriving — this should trigger fetchNotificationsPreview and fetchNotificationsCount
    expect(MockEventSource.instances.length).toBeGreaterThan(0)
    const es = MockEventSource.instances[0]
    // clear mock call history and send message
    fetchMock.mockClear()
    es.sendMessage(JSON.stringify({ type: 'notification', id: 'n2' }))

    // after SSE, the client should fetch (preview or count) — assert fetch was called
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  })
})

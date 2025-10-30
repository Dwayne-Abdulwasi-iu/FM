/*
 * Lightweight helper to control `global.fetch` behavior in tests.
 * Usage in a test file:
 *   import { mockFetchJson, mockFetchOnce, restoreFetch } from 'test/utils/mockFetch'
 *   beforeEach(() => mockFetchJson({ count: 3 }))
   or: mockFetchOnce({ ok: true, status: 200, body: { count: 3 } })
 */

type FetchMockResponse = {
  ok?: boolean
  status?: number
  body?: unknown
}

const originalFetch = (globalThis as unknown as { fetch?: typeof fetch }).fetch

function makeResponse(obj: FetchMockResponse) {
  const { ok = true, status = 200, body = {} } = obj
  return {
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

export function mockFetchJson(body: unknown, status = 200) {
  ;(global as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue(makeResponse({ ok: status >= 200 && status < 300, status, body }))
}

export function mockFetchOnce(resp: FetchMockResponse) {
  const response = makeResponse(resp)
  ;(global as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValueOnce(response)
}

export function mockFetchErrorOnce(err: unknown) {
  ;(global as unknown as { fetch: unknown }).fetch = jest.fn().mockRejectedValueOnce(err)
}

export function restoreFetch() {
  ;(global as unknown as { fetch: unknown }).fetch = originalFetch ?? (jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }))
}

const mockFetchUtils = {
  mockFetchJson,
  mockFetchOnce,
  mockFetchErrorOnce,
  restoreFetch,
}

export default mockFetchUtils

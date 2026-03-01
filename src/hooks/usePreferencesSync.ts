'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface PreferencesData {
  currency?: string | null
  language?: string | null
}

type PreferencesListener = (data: PreferencesData) => void

// Global singleton to prevent duplicate fetches
let fetchPromise: Promise<PreferencesData> | null = null
let cachedData: PreferencesData | null = null
let lastSessionId: string | null = null
const listeners: Set<PreferencesListener> = new Set()

/**
 * Shared hook for syncing user preferences from database.
 * Fetches once per session and notifies all subscribers.
 * Avoids duplicate API calls from CurrencyProvider and LanguageContext.
 */
export function usePreferencesSync(onSync: PreferencesListener) {
  const { data: session, status } = useSession()
  const hasRegistered = useRef(false)

  // Register listener
  useEffect(() => {
    if (hasRegistered.current) return
    hasRegistered.current = true
    listeners.add(onSync)
    
    return () => {
      listeners.delete(onSync)
    }
  }, [onSync])

  // Fetch preferences when user logs in (once per session)
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      // Reset cache when user logs out
      if (status === 'unauthenticated' && cachedData) {
        cachedData = null
        lastSessionId = null
        fetchPromise = null
      }
      return
    }

    const sessionId = session.user.id

    // If we already have data for this session, notify immediately
    if (cachedData && lastSessionId === sessionId) {
      onSync(cachedData)
      return
    }

    // If a fetch is already in progress for this session, wait for it
    if (fetchPromise && lastSessionId === sessionId) {
      fetchPromise.then((data) => {
        onSync(data)
      })
      return
    }

    // Start a new fetch
    lastSessionId = sessionId
    fetchPromise = fetch('/api/preferences')
      .then((response) => {
        if (response.ok) {
          return response.json()
        }
        return {}
      })
      .then((data: PreferencesData) => {
        cachedData = data
        // Notify all listeners
        listeners.forEach((listener) => {
          listener(data)
        })
        return data
      })
      .catch((error) => {
        console.debug('Failed to fetch preferences:', error)
        return {}
      })
  }, [status, session?.user?.id, onSync])
}

/**
 * Save a preference to the database (fire-and-forget)
 */
export async function savePreference(
  key: 'currency' | 'language',
  value: string
): Promise<void> {
  try {
    const body = key === 'currency' 
      ? { currency: value }
      : { language: value }
    
    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    
    // Update cache
    if (cachedData) {
      cachedData = { ...cachedData, [key]: value }
    }
  } catch (error) {
    console.debug(`Failed to save ${key} preference:`, error)
  }
}


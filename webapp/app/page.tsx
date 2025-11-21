'use client'

import { useState, useEffect } from 'react'

type ViewType = 'input' | 'thankyou'

interface HistoryItem {
  slug: string
  timestamp: number
}

export default function Home() {
  const [view, setView] = useState<ViewType>('input')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('polymarket-history')
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (e) {
        console.error('Failed to parse history:', e)
      }
    }
  }, [])

  // Save to history
  const addToHistory = (slug: string) => {
    const newItem: HistoryItem = {
      slug,
      timestamp: Date.now()
    }
    const updatedHistory = [newItem, ...history.filter(item => item.slug !== slug)].slice(0, 10) // Keep last 10
    setHistory(updatedHistory)
    localStorage.setItem('polymarket-history', JSON.stringify(updatedHistory))
  }

  const downloadSlug = async (slugToDownload: string) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slugToDownload, useCache: true }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch data')
      }

      // Get the file blob
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slugToDownload}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Add to history
      addToHistory(slugToDownload)

      // Show thank you screen
      setLoading(false)
      setView('thankyou')

    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'An error occurred while fetching data')
      setLoading(false)
    }
  }

  const handleFetch = async () => {
    if (!slug.trim()) {
      setError('Please enter a market slug')
      return
    }

    await downloadSlug(slug.trim())
  }

  const handleRedownload = async (slugToRedownload: string) => {
    await downloadSlug(slugToRedownload)
  }

  const handleDownload = () => {
    // Not needed anymore - download happens immediately
  }

  const handleFetchAnother = () => {
    setView('input')
    setSlug('')
    setLoading(false)
    setError('')
  }

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">

        {/* Main Title - Outside Cards */}
        <h1 className="text-8xl font-black text-center mb-12 text-gray-300 tracking-tight drop-shadow-2xl">
          the maximizer 2.0
        </h1>

        {/* Input View */}
        {view === 'input' && (
          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl shadow-2xl p-12 transform transition-all duration-500 hover:scale-[1.02] hover:border-gray-600">

            <div className="space-y-6">
              <div>
                <label htmlFor="slug" className="block text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
                  Enter Polymarket Slug
                </label>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleFetch()}
                  placeholder="e.g., nfl-dal-lv-2025-11-17"
                  disabled={loading}
                  className="w-full px-6 py-4 text-lg bg-gray-800 text-white border-2 border-gray-600 rounded-xl focus:ring-4 focus:ring-gray-600 focus:border-gray-500 outline-none transition-all placeholder-gray-500 disabled:bg-gray-800/30 disabled:cursor-not-allowed"
                />
              </div>

              <button
                onClick={handleFetch}
                disabled={loading}
                className="w-full py-5 px-8 text-xl font-bold text-white bg-gray-700 rounded-xl hover:bg-gray-600 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none uppercase tracking-wider"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fetching...
                  </span>
                ) : (
                  'Fetch'
                )}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl backdrop-blur-sm">
                  <p className="text-red-200 text-center font-medium">{error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thank You View */}
        {view === 'thankyou' && (
          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl shadow-2xl p-12 transform transition-all duration-500">
            <div className="text-center space-y-8">
              <p className="text-5xl font-bold text-gray-300">
                let's make some money
              </p>

              <div className="flex justify-center">
                <img
                  src="/fist-pump.JPG"
                  alt="Celebration"
                  className="w-80 h-auto rounded-2xl shadow-2xl border-2 border-gray-700"
                />
              </div>

              <button
                onClick={handleFetchAnother}
                className="inline-block py-4 px-10 text-lg font-bold text-white bg-gray-800 border-2 border-gray-600 rounded-xl hover:bg-gray-700 hover:border-gray-500 transition-all duration-300 uppercase tracking-wider shadow-lg"
              >
                Fetch Another
              </button>
            </div>
          </div>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <div className="mt-8 bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-300 mb-6">Download History</h2>
            <div className="space-y-3">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all"
                >
                  <div className="flex-1">
                    <p className="text-gray-300 font-mono text-sm">{item.slug}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRedownload(item.slug)}
                    disabled={loading}
                    className="ml-4 px-4 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}


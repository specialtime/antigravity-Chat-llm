import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

const API_BASE_URL = 'http://localhost:8000/api'
const mockUserProfile = {
    email: 'tester@example.com',
    default_top_p: 0.9,
    default_temperature: 0.7,
}

const jsonResponse = (data, ok = true) => Promise.resolve({ ok, json: async () => data })

const defaultFetchImplementation = (url) => {
    if (url === `${API_BASE_URL}/auth/me`) {
        return jsonResponse(mockUserProfile)
    }
    if (url === `${API_BASE_URL}/conversations`) {
        return jsonResponse([])
    }
    if (url.match(/\/api\/conversations\/\d+$/)) {
        return jsonResponse([])
    }
    return jsonResponse({})
}

// Mock fetch globally
global.fetch = vi.fn()

describe('App Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.setItem('authToken', 'test-token')
        global.fetch.mockImplementation(defaultFetchImplementation)
    })

    afterEach(() => {
        localStorage.clear()
    })

    it('renders the app without crashing', async () => {
        render(<App />)
        await screen.findByPlaceholderText(/Ask anything/i)
    })

    it('fetches conversations on mount', async () => {
        render(<App />)

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/conversations`,
                expect.objectContaining({
                    headers: expect.objectContaining({ Authorization: expect.any(String) })
                })
            )
        })
    })

    it('handles sending a message', async () => {
        const user = userEvent.setup()

        // Mock the streaming response
        const mockReadableStream = {
            getReader: () => ({
                read: vi.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"content": "Hello"}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"type": "metadata", "duration_ms": 2000}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    })
            })
        }

        global.fetch.mockImplementation((url) => {
            if (url === `${API_BASE_URL}/auth/me`) {
                return jsonResponse(mockUserProfile)
            }
            if (url === `${API_BASE_URL}/conversations`) {
                return jsonResponse([])
            }
            if (url.includes('/api/chat')) {
                return Promise.resolve({
                    ok: true,
                    body: mockReadableStream
                })
            }
            return jsonResponse({})
        })

        render(<App />)

        const input = await screen.findByPlaceholderText(/Ask anything/i)
        await user.type(input, 'Test message')

        const sendButton = screen.getByRole('button', { name: /send message/i })
        await user.click(sendButton)

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE_URL}/chat`,
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        Authorization: expect.any(String)
                    }),
                    body: expect.stringContaining('Test message')
                })
            )
        })
    })

    it('shows loading state while streaming', async () => {
        const user = userEvent.setup()

        // Create a promise that we can control
        let resolveRead
        const readPromise = new Promise(resolve => { resolveRead = resolve })

        const mockReadableStream = {
            getReader: () => ({
                read: vi.fn().mockReturnValue(readPromise)
            })
        }

        global.fetch.mockImplementation((url) => {
            if (url === `${API_BASE_URL}/auth/me`) {
                return jsonResponse(mockUserProfile)
            }
            if (url === `${API_BASE_URL}/conversations`) {
                return jsonResponse([])
            }
            if (url.includes('/api/chat')) {
                return Promise.resolve({
                    ok: true,
                    body: mockReadableStream
                })
            }
            return jsonResponse({})
        })

        render(<App />)

        const input = await screen.findByPlaceholderText(/Ask anything/i)
        await user.type(input, 'Test')

        const sendButton = screen.getByRole('button', { name: /send message/i })
        await user.click(sendButton)

        // Check for loading spinner
        await waitFor(() => {
            const spinner = document.querySelector('.animate-spin')
            expect(spinner).toBeInTheDocument()
        })

        // Resolve the read to complete streaming
        resolveRead({ done: true, value: undefined })
    })

    it('handles fetch errors gracefully', async () => {
        const user = userEvent.setup()

        global.fetch.mockImplementation((url) => {
            if (url === `${API_BASE_URL}/auth/me`) {
                return jsonResponse(mockUserProfile)
            }
            if (url === `${API_BASE_URL}/conversations`) {
                return jsonResponse([])
            }
            if (url.includes('/api/chat')) {
                return Promise.reject(new Error('Network error'))
            }
            return jsonResponse({})
        })

        render(<App />)

        const input = await screen.findByPlaceholderText(/Ask anything/i)
        await user.type(input, 'Test message')

        const sendButton = screen.getByRole('button', { name: /send message/i })
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText(/Error: Could not connect to the server/i)).toBeInTheDocument()
        })
    })

    it('displays user and assistant messages', async () => {
        const user = userEvent.setup()

        const mockReadableStream = {
            getReader: () => ({
                read: vi.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"content": "Response"}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    })
            })
        }

        global.fetch.mockImplementation((url) => {
            if (url === `${API_BASE_URL}/auth/me`) {
                return jsonResponse(mockUserProfile)
            }
            if (url === `${API_BASE_URL}/conversations`) {
                return jsonResponse([])
            }
            if (url.includes('/api/chat')) {
                return Promise.resolve({
                    ok: true,
                    body: mockReadableStream
                })
            }
            return jsonResponse({})
        })

        render(<App />)

        const input = await screen.findByPlaceholderText(/Ask anything/i)
        await user.type(input, 'User message')

        const sendButton = screen.getByRole('button', { name: /send message/i })
        await user.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText('User message')).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByText('Response')).toBeInTheDocument()
        }, { timeout: 3000 })
    })
})

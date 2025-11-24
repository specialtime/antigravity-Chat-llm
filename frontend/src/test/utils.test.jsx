import { describe, it, expect, vi } from 'vitest'
import { processSSEChunk, flushSSEBuffer } from '../utils/sse'

// Simple utility tests
describe('API Utilities', () => {
    it('should validate message format', () => {
        const message = { role: 'user', content: 'Hello' }
        expect(message).toHaveProperty('role')
        expect(message).toHaveProperty('content')
        expect(message.role).toBe('user')
    })

    it('should handle SSE data parsing', () => {
        const sseData = 'data: {"content": "Hello"}\n\n'
        const dataLine = sseData.trim()

        if (dataLine.startsWith('data: ')) {
            const jsonStr = dataLine.slice(6)
            const parsed = JSON.parse(jsonStr)
            expect(parsed.content).toBe('Hello')
        }
    })

    it('should construct API URLs correctly', () => {
        const baseUrl = 'http://localhost:8000'
        const chatEndpoint = `${baseUrl}/api/chat`
        const conversationsEndpoint = `${baseUrl}/api/conversations`

        expect(chatEndpoint).toBe('http://localhost:8000/api/chat')
        expect(conversationsEndpoint).toBe('http://localhost:8000/api/conversations')
    })

    it('should validate conversation structure', () => {
        const conversation = {
            id: 1,
            title: 'Test Chat',
            created_at: '2024-01-01T00:00:00Z'
        }

        expect(conversation).toHaveProperty('id')
        expect(conversation).toHaveProperty('title')
        expect(conversation).toHaveProperty('created_at')
        expect(typeof conversation.id).toBe('number')
        expect(typeof conversation.title).toBe('string')
    })
})

describe('SSE buffer utilities', () => {
    it('processes fragmented SSE chunks in order', () => {
        const collectedLines = []
        let buffer = ''

        buffer = processSSEChunk(buffer, 'data: {"content": "Hel', (line) => collectedLines.push(line))
        buffer = processSSEChunk(buffer, 'lo"}\n\ndata: {"type": "metadata", "duration_ms": 1200}\n', (line) => collectedLines.push(line))
        buffer = flushSSEBuffer(buffer, (line) => collectedLines.push(line))

        expect(collectedLines).toEqual([
            'data: {"content": "Hello"}',
            'data: {"type": "metadata", "duration_ms": 1200}'
        ])
    })

    it('ignores empty lines while preserving partial buffers', () => {
        const collectedLines = []
        let buffer = ''

        buffer = processSSEChunk(buffer, 'data: {"content": "Fragment"}\r', (line) => collectedLines.push(line))
        expect(collectedLines).toHaveLength(0)

        buffer = processSSEChunk(buffer, '\n', (line) => collectedLines.push(line))
        expect(collectedLines).toEqual(['data: {"content": "Fragment"}'])
    })
})

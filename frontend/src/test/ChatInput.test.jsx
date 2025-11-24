import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatInput from '../components/ChatInput'

describe('ChatInput', () => {
    it('renders the input field and send button', () => {
        const mockOnSend = vi.fn()
        render(<ChatInput onSend={mockOnSend} disabled={false} />)

        expect(screen.getByPlaceholderText('Ask anything...')).toBeInTheDocument()
        expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('calls onSend with the input value when button is clicked', async () => {
        const mockOnSend = vi.fn()
        const user = userEvent.setup()
        render(<ChatInput onSend={mockOnSend} disabled={false} />)

        const input = screen.getByPlaceholderText('Ask anything...')
        await user.type(input, 'Hello, world!')

        const sendButton = screen.getByRole('button')
        await user.click(sendButton)

        expect(mockOnSend).toHaveBeenCalledWith('Hello, world!')
    })

    it('clears the input after sending', async () => {
        const mockOnSend = vi.fn()
        const user = userEvent.setup()
        render(<ChatInput onSend={mockOnSend} disabled={false} />)

        const input = screen.getByPlaceholderText('Ask anything...')
        await user.type(input, 'Test message')

        const sendButton = screen.getByRole('button')
        await user.click(sendButton)

        expect(input.value).toBe('')
    })

    it('submits on Enter key press', async () => {
        const mockOnSend = vi.fn()
        render(<ChatInput onSend={mockOnSend} disabled={false} />)

        const input = screen.getByPlaceholderText('Ask anything...')
        fireEvent.change(input, { target: { value: 'Test message' } })
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

        expect(mockOnSend).toHaveBeenCalledWith('Test message')
    })

    it('does not submit on Shift+Enter', async () => {
        const mockOnSend = vi.fn()
        render(<ChatInput onSend={mockOnSend} disabled={false} />)

        const input = screen.getByPlaceholderText('Ask anything...')
        fireEvent.change(input, { target: { value: 'Test message' } })
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

        expect(mockOnSend).not.toHaveBeenCalled()
    })

    it('does not send empty or whitespace-only messages', async () => {
        const mockOnSend = vi.fn()
        const user = userEvent.setup()
        render(<ChatInput onSend={mockOnSend} disabled={false} />)

        const input = screen.getByPlaceholderText('Ask anything...')
        await user.type(input, '   ')

        const sendButton = screen.getByRole('button')
        await user.click(sendButton)

        expect(mockOnSend).not.toHaveBeenCalled()
    })

    it('disables input and button when disabled prop is true', () => {
        const mockOnSend = vi.fn()
        render(<ChatInput onSend={mockOnSend} disabled={true} />)

        const input = screen.getByPlaceholderText('Ask anything...')
        const sendButton = screen.getByRole('button')

        expect(input).toBeDisabled()
        expect(sendButton).toBeDisabled()
    })

    it('shows loading spinner when disabled', () => {
        const mockOnSend = vi.fn()
        render(<ChatInput onSend={mockOnSend} disabled={true} />)

        const spinner = document.querySelector('.animate-spin')
        expect(spinner).toBeInTheDocument()
    })
})

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MessageBubble from '../components/MessageBubble'

describe('MessageBubble', () => {
    it('renders user message with correct styling', () => {
        render(<MessageBubble role="user" content="Hello!" />)

        const bubble = screen.getByText('Hello!').closest('div')
        expect(bubble).toBeInTheDocument()
    })

    it('renders assistant message with correct styling', () => {
        render(<MessageBubble role="assistant" content="Hi there!" />)

        const bubble = screen.getByText('Hi there!').closest('div')
        expect(bubble).toBeInTheDocument()
    })

    it('renders markdown content correctly', () => {
        const markdownContent = '**Bold text** and *italic text*'
        render(<MessageBubble role="assistant" content={markdownContent} />)

        expect(screen.getByText(/Bold text/)).toBeInTheDocument()
        expect(screen.getByText(/italic text/)).toBeInTheDocument()
    })

    it('displays user icon for user messages', () => {
        const { container } = render(<MessageBubble role="user" content="Test" />)

        // Check for User icon component
        const svg = container.querySelector('svg')
        expect(svg).toBeInTheDocument()
    })

    it('displays bot icon for assistant messages', () => {
        const { container } = render(<MessageBubble role="assistant" content="Test" />)

        // Check for Bot icon component
        const svg = container.querySelector('svg')
        expect(svg).toBeInTheDocument()
    })

    it('handles thought blocks correctly', () => {
        const contentWithThought = 'Regular text <think>This is a thought</think> More text'
        render(<MessageBubble role="assistant" content={contentWithThought} />)

        // Check for "Thought Process" button
        expect(screen.getByText(/Thought Process/i)).toBeInTheDocument()
    })

    it('toggles thought block visibility on click', () => {
        const contentWithThought = 'Text <think>Hidden thought</think> More'
        render(<MessageBubble role="assistant" content={contentWithThought} />)

        const thoughtButton = screen.getByText(/Thought Process/i)

        // Initially collapsed, thought should not be visible
        expect(screen.queryByText('Hidden thought')).not.toBeInTheDocument()

        // Click to expand
        fireEvent.click(thoughtButton)
        expect(screen.getByText('Hidden thought')).toBeInTheDocument()

        // Click to collapse
        fireEvent.click(thoughtButton)
        expect(screen.queryByText('Hidden thought')).not.toBeInTheDocument()
    })

    it('does not show thought blocks for user messages', () => {
        const contentWithThought = 'Text <think>This should not appear</think> More'
        render(<MessageBubble role="user" content={contentWithThought} />)

        // Thought Process button should not exist for user messages
        expect(screen.queryByText(/Thought Process/i)).not.toBeInTheDocument()
        // The think tags should be displayed as plain text
        expect(screen.getByText(/think/)).toBeInTheDocument()
    })

    it('handles multiple thought blocks', () => {
        const content = '<think>Thought 1</think> Text <think>Thought 2</think>'
        render(<MessageBubble role="assistant" content={content} />)

        const thoughtButtons = screen.getAllByText(/Thought Process/i)
        expect(thoughtButtons).toHaveLength(2)
    })

    it('renders code blocks in markdown', () => {
        const codeContent = '```javascript\nconst x = 1;\n```'
        const { container } = render(<MessageBubble role="assistant" content={codeContent} />)

        const codeBlock = container.querySelector('code')
        expect(codeBlock).toBeInTheDocument()
    })
})

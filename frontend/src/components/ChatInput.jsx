import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

const ChatInput = ({ onSend, disabled }) => {
    const [input, setInput] = useState('');
    const textareaRef = useRef(null);

    const handleInput = (e) => {
        setInput(e.target.value);
        adjustHeight();
    };

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        if (!input.trim() || disabled) return;
        onSend(input);
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    return (
        <div className="w-full mx-auto">
            <div className="relative flex items-end gap-2 p-2 bg-surface-color/50 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 focus-within:ring-1 focus-within:ring-primary-color/50 focus-within:border-primary-color/50 transition-all duration-300 backdrop-blur-md">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    disabled={disabled}
                    rows={1}
                    className="flex-1 bg-transparent text-text-primary placeholder-text-secondary/50 text-base p-3 resize-none outline-none max-h-[200px] overflow-y-auto min-h-[52px]"
                />

                <button
                    aria-label="Send message"
                    onClick={handleSubmit}
                    disabled={!input.trim() || disabled}
                    className="p-3 rounded-xl bg-primary-color text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mb-[2px] hover:shadow-lg hover:shadow-primary-color/20 active:scale-95"
                >
                    {disabled ? (
                        <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                        <Send size={20} />
                    )}
                </button>
            </div>
            <div className="text-center mt-3 text-[10px] text-text-secondary/40 flex items-center justify-center gap-1.5 uppercase tracking-widest font-medium">
                <Sparkles size={10} />
                <span>Powered by Local LLM</span>
            </div>
        </div>
    );
};

export default ChatInput;

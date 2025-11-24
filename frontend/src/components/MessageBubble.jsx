import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ChevronRight, Bot, User } from 'lucide-react';
import clsx from 'clsx';

const MessageBubble = ({ role, content }) => {
    const isUser = role === 'user';

    const parts = useMemo(() => {
        if (isUser) return [{ type: 'text', content }];

        const regex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
        const result = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(content)) !== null) {
            if (match.index > lastIndex) {
                result.push({ type: 'text', content: content.substring(lastIndex, match.index) });
            }
            result.push({ type: 'think', content: match[1] });
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < content.length) {
            result.push({ type: 'text', content: content.substring(lastIndex) });
        }

        return result;
    }, [content, isUser]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={clsx(
                "flex w-full mb-6",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            <div className={clsx(
                "flex max-w-[80%] md:max-w-[70%]",
                isUser ? "flex-row-reverse" : "flex-row"
            )}>
                {/* Avatar */}
                <div className={clsx(
                    "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-1",
                    isUser ? "ml-3 bg-primary-color text-white" : "mr-3 bg-surface-color text-accent-color border border-white/10"
                )}>
                    {isUser ? <User size={18} /> : <Bot size={18} />}
                </div>

                {/* Bubble */}
                <div className={clsx(
                    "flex flex-col rounded-2xl px-4 py-3 shadow-md",
                    isUser
                        ? "bg-primary-color text-white rounded-tr-sm"
                        : "bg-surface-color text-text-primary border border-white/10 rounded-tl-sm"
                )}>
                    {parts.map((part, index) => (
                        <React.Fragment key={index}>
                            {part.type === 'think' ? (
                                <ThoughtBlock content={part.content} />
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {part.content}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const ThoughtBlock = ({ content }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="my-2 border border-white/10 rounded-lg bg-black/20 overflow-hidden transition-all duration-300 ease-in-out hover:border-accent-color/30">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center w-full px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            >
                {isOpen ? <ChevronDown size={14} className="mr-2" /> : <ChevronRight size={14} className="mr-2" />}
                <span className="uppercase tracking-wider opacity-80">Thought Process</span>
            </button>

            {isOpen && (
                <div className="px-3 py-2 text-xs text-text-secondary font-mono border-t border-white/10 bg-black/10 whitespace-pre-wrap animate-fade-in">
                    {content}
                </div>
            )}
        </div>
    );
};

export default MessageBubble;

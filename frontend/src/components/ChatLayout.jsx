import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Menu, X, Settings } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import SettingsPanel from './SettingsPanel';
import clsx from 'clsx';

const ChatLayout = ({
    messages,
    onSend,
    isStreaming,
    conversations = [],
    currentConversationId,
    onSelectConversation,
    onNewChat,
    performanceStatus = 'idle', // idle, good, slow, error
    topP,
    setTopP,
    temperature,
    setTemperature,
    isSettingsOpen,
    onToggleSettings,
    currentUser = null,
    onLogout = () => {}
}) => {
    const messagesEndRef = useRef(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isStreaming]);

    const getStatusColor = () => {
        switch (performanceStatus) {
            case 'good': return 'bg-green-500';
            case 'slow': return 'bg-yellow-500';
            case 'error': return 'bg-red-500';
            case 'loading': return 'bg-blue-500 animate-pulse';
            default: return 'bg-gray-500';
        }
    };

    const getStatusText = () => {
        switch (performanceStatus) {
            case 'good': return 'Optimal';
            case 'slow': return 'Slow';
            case 'error': return 'Offline';
            case 'loading': return 'Processing';
            default: return 'Ready';
        }
    };

    return (
        <div className="flex h-screen bg-bg-color text-text-primary overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black">

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                className={clsx(
                    "fixed md:relative z-30 w-64 h-full bg-black/40 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="font-bold text-lg tracking-tight">History</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 hover:bg-white/10 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-3">
                    <button
                        onClick={() => { onNewChat(); setIsSidebarOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-primary-color hover:bg-primary-hover text-white rounded-xl transition-all shadow-lg shadow-primary-color/20 active:scale-95 font-medium"
                    >
                        <Plus size={18} />
                        <span>New Chat</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => { onSelectConversation(conv.id); setIsSidebarOpen(false); }}
                            className={clsx(
                                "w-full text-left px-3 py-3 rounded-lg text-sm transition-colors flex items-center gap-3 group",
                                currentConversationId === conv.id
                                    ? "bg-white/10 text-white"
                                    : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                            )}
                        >
                            <MessageSquare size={16} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                            <span className="truncate">{conv.title}</span>
                        </button>
                    ))}
                </div>
            </motion.aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full w-full relative">
                {/* Header */}
                <motion.header
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="glass-panel p-4 flex items-center justify-between border-b border-white/5 backdrop-blur-xl bg-black/20 z-10"
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-color to-accent-color flex items-center justify-center shadow-lg shadow-primary-color/20">
                            <span className="text-white font-bold text-lg">A</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent hidden sm:block">
                                Antigravity
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap justify-end">
                        {/* Settings Toggle */}
                        <button
                            onClick={onToggleSettings}
                            className={clsx(
                                "p-2 rounded-lg transition-colors",
                                isSettingsOpen ? "bg-white/10 text-white" : "text-text-secondary hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Settings size={20} />
                        </button>

                        {currentUser && (
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white">
                                <span className="max-w-[160px] truncate text-text-secondary">{currentUser.email}</span>
                                <button
                                    onClick={onLogout}
                                    className="text-xs font-semibold text-white/80 hover:text-white"
                                >
                                    Logout
                                </button>
                            </div>
                        )}

                        {/* Traffic Light Status */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/5">
                            <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider mr-1">
                                {getStatusText()}
                            </span>
                            <span className="relative flex h-2.5 w-2.5">
                                {performanceStatus === 'loading' && (
                                    <span className={clsx("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", getStatusColor())}></span>
                                )}
                                <span className={clsx("relative inline-flex rounded-full h-2.5 w-2.5 transition-colors duration-500", getStatusColor())}></span>
                            </span>
                        </div>
                    </div>
                </motion.header>

                {/* Settings Panel */}
                <AnimatePresence>
                    {isSettingsOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-b border-white/5 bg-black/30 backdrop-blur-md"
                        >
                            <div className="container max-w-3xl mx-auto p-4">
                                <SettingsPanel
                                    topP={topP}
                                    setTopP={setTopP}
                                    temperature={temperature}
                                    setTemperature={setTemperature}
                                    isOpen={true}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages Area */}
                <main className="flex-1 overflow-y-auto p-4 scroll-smooth">
                    <div className="container py-4 max-w-3xl mx-auto">
                        <AnimatePresence mode='popLayout'>
                            {messages.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex flex-col items-center justify-center h-[60vh] text-text-secondary opacity-50"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-surface-color flex items-center justify-center mb-4 border border-white/10">
                                        <span className="text-3xl">✨</span>
                                    </div>
                                    <p>Start a conversation...</p>
                                </motion.div>
                            ) : (
                                messages.map((msg, index) => (
                                    <MessageBubble
                                        key={index}
                                        role={msg.role}
                                        content={msg.content}
                                    />
                                ))
                            )}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                    </div>
                </main>

                {/* Input Area */}
                <motion.footer
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-lg"
                >
                    <div className="container max-w-3xl mx-auto">
                        <ChatInput onSend={onSend} disabled={isStreaming} />
                    </div>
                </motion.footer>
            </div>
        </div>
    );
};

export default ChatLayout;

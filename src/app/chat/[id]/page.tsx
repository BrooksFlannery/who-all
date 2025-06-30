'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { ChatData, MsgData } from '~/lib/definitions/types';
import { clientBotAPI } from '~/lib/api';
import Link from 'next/link';

export default function Chat() {
    const api = useMemo(() => new clientBotAPI(), []);

    const { id: chatId } = useParams();
    const [thinking, setThinking] = useState<boolean>(false);
    const [responding, setResponding] = useState<boolean>(false);
    const [chat, setChat] = useState<ChatData | null>(null)

    const [input, setInput] = useState('');
    const [messages, setMsgs] = useState<MsgData[]>([]);

    useEffect(() => {
        if (!chatId || typeof chatId !== "string") return;

        void api.getChat(chatId).then(setChat);
        void api.getMsgs(chatId).then(setMsgs);
    }, [chatId, api]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!chatId || typeof chatId !== "string") {
            console.error('Invalid chat ID');
            return;
        }

        const newUserMsg: MsgData = {
            id: 'temp-user',
            role: 'user',
            content: input,
            createdAt: new Date(),
            chatId: chatId,
            accessedAt: new Date(),
        };
        setMsgs(prev => [...(prev), newUserMsg]);
        setResponding(true);

        try {
            await api.postMsg(
                input,
                chatId,
                setMsgs,
                setThinking,
                setResponding,
            );
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setResponding(false);
            setInput('');
        }
    };

    if (!chatId || typeof chatId !== "string") {
        return <div>Invalid chat ID</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="text-blue-500 hover:text-blue-600 transition-colors"
                        >
                            ← Back to Home
                        </Link>
                        <h1 className="text-lg font-semibold">
                            {chat ? chat.chatName : 'Loading...'}
                        </h1>
                    </div>
                    <Link
                        href="/chat/new"
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                    >
                        New Chat
                    </Link>
                </div>
            </div>

            {/* Chat Container */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="bg-white rounded-lg shadow-sm border min-h-[600px] flex flex-col">
                    {/* Messages */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {!messages && (
                            <div className="text-center text-gray-500">Loading messages...</div>
                        )}

                        {messages?.map((message, i) => (
                            <div
                                key={i}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] px-4 py-2 rounded-lg ${message.role === 'user'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-800'
                                        }`}
                                >
                                    {message.content}
                                </div>
                            </div>
                        ))}

                        {thinking && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                                    <span className="animate-pulse">AI is thinking...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Form */}
                    <div className="border-t p-4">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                value={input}
                                placeholder="Type your message..."
                                onChange={(e) => { setInput(e.target.value) }}
                                disabled={responding}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={responding || !chat || !input.trim()}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { clientBotAPI } from '~/lib/api';

export default function NewChat() {
    const router = useRouter();
    const api = useMemo(() => new clientBotAPI(), []);

    useEffect(() => {
        const createNewChat = async () => {
            try {
                const newChatId = await api.createChat();
                router.push(`/chat/${newChatId}`);
            } catch (error) {
                console.error('Failed to create new chat:', error);
                // Fallback to a simple redirect or error page
                router.push('/');
            }
        };

        void createNewChat();
    }, [router, api]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto text-center">
                <h1 className="text-2xl font-bold mb-4">Creating new chat...</h1>
                <p className="text-gray-600">Please wait while we set up your conversation.</p>
            </div>
        </div>
    );
} 
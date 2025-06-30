import type { ChatData, MsgData } from "~/lib/definitions/types";
import { chatSchema, messageSchema } from "~/lib/definitions/zod";
import { z } from "zod";

export interface chatBotAPI {
    getChats(): Promise<ChatData[]>;
    createChat(): Promise<ChatData['id']>;
    getChat(id: ChatData["id"]): Promise<ChatData>;
    getMsgs(id: ChatData["id"]): Promise<MsgData[]>;
}

const createChatResponseSchema = z.object({
    id: z.string().uuid(),
});

const chatsArraySchema = z.array(chatSchema);
const messagesArraySchema = z.array(messageSchema);

export class clientBotAPI implements chatBotAPI {
    async getChats(): Promise<ChatData[]> {
        try {
            const res = await fetch("/api/chat", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch chats: ${res.status}`);
            }

            const data: unknown = await res.json();
            const validatedData = chatsArraySchema.parse(data);

            return validatedData;

        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('Chat data validation failed:', error.errors);
                throw new Error('Invalid chat data format received from server');
            }
            console.error('Error fetching chats:', error);
            throw error;
        }
    }

    async createChat(): Promise<ChatData["id"]> {
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                throw new Error(`Failed to create chat: ${res.status}`);
            }

            const data: unknown = await res.json();

            const validatedData = createChatResponseSchema.parse(data);
            return validatedData.id;

        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('Create chat response validation failed:', error.errors);
                throw new Error('Invalid response format from server');
            }
            console.error('Error creating chat:', error);
            throw error;
        }
    }

    async getChat(chatId: ChatData['id']): Promise<ChatData> {
        try {
            const res = await fetch(`/api/chat/${chatId}`);

            if (!res.ok) {
                throw new Error(`Failed to fetch chat: ${res.status}`);
            }

            const data: unknown = await res.json();

            // console.log('Raw chat data:', data);
            const validatedData = chatSchema.parse(data);

            // console.log('Validated chat data:', validatedData);
            return validatedData;

        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('Chat validation error:', error.errors);
                throw new Error('Invalid chat data format received from server');
            }
            console.error('Error fetching chat:', error);
            throw error;
        }
    }

    async getMsgs(chatId: ChatData['id']): Promise<MsgData[]> {
        try {
            const res = await fetch(`/api/chat/${chatId}/messages`);

            if (!res.ok) {
                throw new Error(`Failed to fetch messages: ${res.status}`);
            }

            const data: unknown = await res.json();
            const validatedData = messagesArraySchema.parse(data);

            return validatedData;

        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('Messages validation error:', error.errors);
                throw new Error('Invalid messages data format received from server');
            }
            console.error('Error fetching messages:', error);
            throw error;
        }
    }

    async postMsg(
        msg: string,
        chatId: string,
        setMsgs: React.Dispatch<React.SetStateAction<MsgData[]>>,
        setThinking: (value: boolean) => void,
        setResponding: (value: boolean) => void
    ): Promise<void> {
        setResponding(true);
        setThinking(true);
        console.log('post message start')

        try {
            const res = await fetch(`/api/chat/${chatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ msg }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Failed to send message:', errorText);
                return;
            }

            if (!res.body) return;

            setThinking(false);
            const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
            console.log('start streaming ai response')
            const aiMessageId = `ai-${Date.now()}`;
            let aiMessageContent = '';
            let buffer = '';

            try {
                const newAiMessage: MsgData = {
                    id: aiMessageId,
                    role: 'assistant',
                    content: '',
                    createdAt: new Date(),
                    chatId: chatId,
                    accessedAt: new Date(),
                };
                setMsgs(prev => [...prev, newAiMessage]);

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += value;
                    console.log(buffer);
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (line.startsWith('0:')) {
                            try {
                                const parsedContent: unknown = JSON.parse(line.slice(2));
                                if (typeof parsedContent !== 'string') {
                                    console.error('Expected string content, got:', typeof parsedContent);
                                    continue;
                                }

                                aiMessageContent += parsedContent;

                                setMsgs(prev =>
                                    prev.map(msg =>
                                        msg.id === aiMessageId
                                            ? { ...msg, content: aiMessageContent }
                                            : msg
                                    )
                                );
                            } catch (e) {
                                console.error('Failed to parse streaming content:', e);
                            }
                        }
                        if (line.startsWith('3:')) {
                            console.error('Server error:', line.slice(2));
                            continue;
                        }
                    }
                }

                if (aiMessageContent.trim()) {
                    const saveResponse = await fetch(`/api/chat/${chatId}/messages/ai`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            content: aiMessageContent,
                        }),
                    });

                    if (saveResponse.ok) {
                        try {
                            const savedMessageData: unknown = await saveResponse.json();
                            const validatedMessage = messageSchema.parse(savedMessageData);

                            setMsgs(prev =>
                                prev.map(msg =>
                                    msg.id === aiMessageId
                                        ? { ...msg, id: validatedMessage.id }
                                        : msg
                                )
                            );
                        } catch (error) {
                            if (error instanceof z.ZodError) {
                                console.error('Saved message validation failed:', error.errors);
                            } else {
                                console.error('Error parsing saved message:', error);
                            }
                        }
                    } else {
                        console.error('Failed to save AI message');
                    }
                }

            } finally {
                reader.releaseLock();
            }
        } catch (error) {
            console.error('Error in postMsg:', error);
        } finally {
            setResponding(false);
            setThinking(false);
        }
    }
}
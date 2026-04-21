import React, { useState, useRef, useEffect } from 'react';
import { 
    Box, Fab, Paper, Typography, IconButton, TextField, 
    Avatar, CircularProgress, Fade, Zoom 
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ReactMarkdown from 'react-markdown';
import { rawBase } from '../../shared/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export const AiChatBot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '¡Hola Lucas! Soy tu asistente de inventario. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${rawBase.replace(/\/$/, '')}/ai/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ message: userMsg, history: messages }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error en el servidor');
            }

            const data = await response.json();
            setMessages([...newMessages, { role: 'assistant', content: data.response }]);
        } catch (error) {
            console.error('Chat Error:', error);
            setMessages([...newMessages, { role: 'assistant', content: 'Perdón, no pude conectarme con el cerebro central. ¿Podrías intentar de nuevo?' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
            {/* Bubble Button */}
            <Zoom in={!isOpen}>
                <Fab 
                    color="primary" 
                    onClick={() => setIsOpen(true)}
                    sx={{ 
                        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    }}
                >
                    <ChatIcon />
                </Fab>
            </Zoom>

            {/* Chat Panel */}
            <Fade in={isOpen}>
                <Paper
                    elevation={24}
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: { xs: 'calc(100vw - 48px)', sm: 400 },
                        height: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        backdropFilter: 'blur(10px)',
                        background: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    {/* Header */}
                    <Box sx={{ 
                        p: 2, 
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: 'white'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                                <SmartToyIcon fontSize="small" />
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={700}>Asistente IA</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>En línea • Consultas de Inventario</Typography>
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Messages Area */}
                    <Box 
                        ref={scrollRef}
                        sx={{ 
                            flex: 1, 
                            overflowY: 'auto', 
                            p: 2, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 2,
                            '&::-webkit-scrollbar': { width: '4px' },
                            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }
                        }}
                    >
                        {messages.map((msg, i) => (
                            <Box 
                                key={i} 
                                sx={{ 
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                }}
                            >
                                <Paper sx={{ 
                                    p: 1.5, 
                                    borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                    bgcolor: msg.role === 'user' ? 'primary.main' : 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    boxShadow: 'none'
                                }}>
                                    <Box sx={{ 
                                        '& p': { m: 0, fontSize: '0.95rem', lineHeight: 1.5 },
                                        '& ul, & ol': { m: '8px 0', pl: 2 },
                                        '& code': { bgcolor: 'rgba(0,0,0,0.3)', p: '2px 4px', borderRadius: '4px' }
                                    }}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </Box>
                                </Paper>
                            </Box>
                        ))}
                        {isLoading && (
                            <Box sx={{ alignSelf: 'flex-start', p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                <CircularProgress size={16} sx={{ color: '#6366f1' }} />
                            </Box>
                        )}
                    </Box>

                    {/* Input Area */}
                    <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(0,0,0,0.2)' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Preguntame algo..."
                                variant="outlined"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                sx={{ 
                                    '& .MuiOutlinedInput-root': { 
                                        borderRadius: '12px',
                                        color: 'white',
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        '& fieldset': { borderColor: 'transparent' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                    }
                                }}
                            />
                            <IconButton 
                                color="primary" 
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                            >
                                <SendIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                </Paper>
            </Fade>
        </Box>
    );
};

import React, { useState, useEffect, useCallback } from 'react';
import ChatLayout from './components/ChatLayout';
import AuthPanel from './components/AuthPanel';
import { processSSEChunk, flushSSEBuffer } from './utils/sse';

const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [performanceStatus, setPerformanceStatus] = useState('idle'); // idle, loading, good, slow, error
  const [topP, setTopP] = useState(0.9);
  const [temperature, setTemperature] = useState(0.7);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const resetSession = useCallback((message = '') => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setUser(null);
    setConversations([]);
    setMessages([]);
    setCurrentConversationId(null);
    setPerformanceStatus('idle');
    setIsStreaming(false);
    setIsSettingsOpen(false);
    setTopP(0.9);
    setTemperature(0.7);
    setAuthError(message);
    setAuthMode('login');
    setIsBootstrapping(false);
  }, []);

  const handleSessionExpired = useCallback((message = 'Tu sesión expiró. Vuelve a iniciar sesión.') => {
    resetSession(message);
  }, [resetSession]);

  const handleLogout = useCallback(() => {
    resetSession('');
  }, [resetSession]);

  const loginRequest = async (email, password) => {
    const body = new URLSearchParams();
    body.append('username', email.toLowerCase());
    body.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || 'Credenciales incorrectas');
    }

    return data.access_token;
  };

  const handleLogin = async ({ email, password }) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const token = await loginRequest(email, password);
      localStorage.setItem('authToken', token);
      setAuthToken(token);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async ({ email, password, defaultTopP, defaultTemperature }) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          default_top_p: defaultTopP,
          default_temperature: defaultTemperature,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo completar el registro');
      }

      const token = await loginRequest(email, password);
      localStorage.setItem('authToken', token);
      setAuthToken(token);
      setAuthMode('login');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchConversations = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE_URL}/conversations`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await res.json();
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations', error);
    }
  }, [authToken, handleSessionExpired]);

  useEffect(() => {
    if (!authToken) {
      setIsBootstrapping(false);
      return;
    }

    let isMounted = true;
    setIsBootstrapping(true);

    const loadSession = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (res.status === 401) {
          if (isMounted) handleSessionExpired();
          return;
        }

        if (!res.ok) {
          throw new Error('No se pudo obtener el perfil');
        }

        const data = await res.json();
        if (!isMounted) return;
        setUser(data);
        setTopP(data.default_top_p);
        setTemperature(data.default_temperature);
        await fetchConversations();
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to bootstrap session', error);
        handleSessionExpired('No se pudo cargar tu sesión. Inicia sesión nuevamente.');
      } finally {
        if (isMounted) setIsBootstrapping(false);
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [authToken, fetchConversations, handleSessionExpired]);

  const handleSelectConversation = async (id) => {
    if (isStreaming || !authToken) return;
    setCurrentConversationId(id);
    setPerformanceStatus('idle');

    const conversation = conversations.find((c) => c.id === id);
    if (conversation) {
      setTopP(conversation.top_p ?? 0.9);
      setTemperature(conversation.temperature ?? 0.7);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch history', error);
    }
  };

  const handleNewChat = () => {
    if (isStreaming) return;
    setCurrentConversationId(null);
    setMessages([]);
    setPerformanceStatus('idle');
    if (user) {
      setTopP(user.default_top_p);
      setTemperature(user.default_temperature);
    } else {
      setTopP(0.9);
      setTemperature(0.7);
    }
  };

  const handleSend = async (text) => {
    if (!authToken) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);
    setPerformanceStatus('loading');

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: text,
          history,
          conversation_id: currentConversationId,
          top_p: topP,
          temperature,
        }),
      });

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) throw new Error('Network response was not ok');

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let conversationId = currentConversationId;
      let buffer = '';

      const handleLine = (rawLine) => {
        if (!rawLine.startsWith('data: ')) {
          return;
        }

        try {
          const data = JSON.parse(rawLine.slice(6));

          if (data.type === 'metadata') {
            if (data.duration_ms) {
              setPerformanceStatus(data.duration_ms < 3000 ? 'good' : 'slow');
            }
            if (data.conversation_id) {
              conversationId = data.conversation_id;
              if (!currentConversationId) {
                setCurrentConversationId(conversationId);
                fetchConversations();
              }
            }
          } else if (data.content) {
            assistantMessage += data.content;
            setMessages((prev) => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].content = assistantMessage;
              return newMsgs;
            });
          } else if (data.error) {
            console.error('Backend error:', data.error);
            setPerformanceStatus('error');
          }
        } catch (e) {
          console.error('Error parsing SSE data', e);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer = processSSEChunk(buffer, chunk, handleLine);
      }

      buffer = flushSSEBuffer(buffer, handleLine);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Could not connect to the server.' }]);
      setPerformanceStatus('error');
    } finally {
      setIsStreaming(false);
    }
  };

  if (!authToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-color text-text-primary">
        <AuthPanel
          mode={authMode}
          onModeChange={setAuthMode}
          onLogin={handleLogin}
          onRegister={handleRegister}
          loading={authLoading}
          error={authError}
        />
      </div>
    );
  }

  if (isBootstrapping || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-color text-text-primary">
        <div className="text-sm text-text-secondary">Cargando tu experiencia...</div>
      </div>
    );
  }

  return (
    <ChatLayout
      messages={messages}
      onSend={handleSend}
      isStreaming={isStreaming}
      conversations={conversations}
      currentConversationId={currentConversationId}
      onSelectConversation={handleSelectConversation}
      onNewChat={handleNewChat}
      performanceStatus={performanceStatus}
      topP={topP}
      setTopP={setTopP}
      temperature={temperature}
      setTemperature={setTemperature}
      isSettingsOpen={isSettingsOpen}
      onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
      currentUser={user}
      onLogout={handleLogout}
    />
  );
}

export default App;

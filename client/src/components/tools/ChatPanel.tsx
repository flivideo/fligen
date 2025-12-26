import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../hooks/useSocket';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolSuccess?: boolean;
}

interface CompletionInfo {
  sessionId: string;
  usage: { input: number; output: number };
  cost: number;
  duration: number;
}

export function ChatPanel() {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastCompletion, setLastCompletion] = useState<CompletionInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingText, scrollToBottom]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleText = ({ text }: { text: string }) => {
      setCurrentStreamingText(prev => prev + text);
    };

    const handleTool = ({ name }: { name: string; input: unknown }) => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'tool',
        content: `Executing: ${name}`,
        timestamp: new Date(),
        toolName: name,
      }]);
    };

    const handleToolResult = ({ name, success }: { name: string; success: boolean }) => {
      setMessages(prev => {
        const updated = [...prev];
        // Find and update the last tool message with this name
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].role === 'tool' && updated[i].toolName === name) {
            updated[i] = {
              ...updated[i],
              content: success ? `Completed: ${name}` : `Failed: ${name}`,
              toolSuccess: success,
            };
            break;
          }
        }
        return updated;
      });
    };

    const handleComplete = (data: CompletionInfo) => {
      // Finalize the streaming message
      if (currentStreamingText) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: currentStreamingText,
          timestamp: new Date(),
        }]);
      }
      setCurrentStreamingText('');
      setIsProcessing(false);
      setLastCompletion(data);
    };

    const handleError = ({ message }: { message: string; code?: string }) => {
      setError(message);
      setIsProcessing(false);
      setCurrentStreamingText('');
    };

    socket.on('agent:text', handleText);
    socket.on('agent:tool', handleTool);
    socket.on('agent:tool_result', handleToolResult);
    socket.on('agent:complete', handleComplete);
    socket.on('agent:error', handleError);

    return () => {
      socket.off('agent:text', handleText);
      socket.off('agent:tool', handleTool);
      socket.off('agent:tool_result', handleToolResult);
      socket.off('agent:complete', handleComplete);
      socket.off('agent:error', handleError);
    };
  }, [socket, currentStreamingText]);

  const sendMessage = useCallback(() => {
    if (!socket || !input.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    setError(null);
    setLastCompletion(null);

    socket.emit('agent:query', { message: userMessage.content });
  }, [socket, input, isProcessing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !currentStreamingText && (
          <div className="text-center text-slate-500 py-8">
            <p>Send a message to start chatting with Claude</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageDisplay key={msg.id} message={msg} />
        ))}

        {/* Streaming message */}
        {currentStreamingText && (
          <div className="flex gap-2">
            <span className="text-blue-400 font-medium shrink-0">Claude:</span>
            <span className="text-white whitespace-pre-wrap">{currentStreamingText}</span>
            <span className="animate-pulse text-blue-400">|</span>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Completion info */}
      {lastCompletion && (
        <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400 flex gap-4">
          <span>Tokens: {lastCompletion.usage.input + lastCompletion.usage.output}</span>
          <span>Cost: ${lastCompletion.cost.toFixed(4)}</span>
          <span>Time: {(lastCompletion.duration / 1000).toFixed(1)}s</span>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connected ? "Type a message..." : "Connecting..."}
            disabled={!connected || isProcessing}
            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!connected || isProcessing || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {isProcessing ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageDisplay({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex gap-2">
        <span className="text-green-400 font-medium shrink-0">You:</span>
        <span className="text-white">{message.content}</span>
      </div>
    );
  }

  if (message.role === 'tool') {
    const isComplete = message.content.startsWith('Completed:');
    const isFailed = message.content.startsWith('Failed:');
    return (
      <div className={`flex items-center gap-2 text-sm ${
        isFailed ? 'text-red-400' : isComplete ? 'text-green-400' : 'text-amber-400'
      }`}>
        <span className="font-mono">[{isFailed ? '✗' : isComplete ? '✓' : '⚙'}]</span>
        <span>{message.content}</span>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex gap-2">
      <span className="text-blue-400 font-medium shrink-0">Claude:</span>
      <span className="text-white whitespace-pre-wrap">{message.content}</span>
    </div>
  );
}

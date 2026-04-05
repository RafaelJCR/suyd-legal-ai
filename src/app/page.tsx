"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat();

  // Auto-scroll: cuando llega un mensaje nuevo, baja automáticamente
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Encabezado */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">⚖️</span>
        <div>
          <h1 className="text-lg font-bold">SUYD Legal AI</h1>
          <p className="text-xs text-gray-400">
            Asistente legal con IA · Leyes de República Dominicana
          </p>
        </div>
      </header>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-lg">
              <div className="text-6xl mb-4">⚖️</div>
              <h2 className="text-2xl font-bold mb-2">
                Bienvenido a SUYD Legal AI
              </h2>
              <p className="text-gray-400 mb-6">
                Asistente legal especializado en leyes dominicanas.
                Describe tu situación y te oriento basándome en la ley real.
              </p>
              <div className="grid grid-cols-1 gap-2 text-sm max-w-md mx-auto">
                <p className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 text-left">
                  💼 &quot;Me despidieron sin prestaciones&quot;
                </p>
                <p className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 text-left">
                  🏠 &quot;Mi casero quiere subirme el alquiler&quot;
                </p>
                <p className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 text-left">
                  🛒 &quot;Compré un producto defectuoso&quot;
                </p>
                <p className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-gray-300 text-left">
                  👶 &quot;Quiero pedir pensión alimenticia&quot;
                </p>
              </div>
              <div className="mt-6 flex gap-2 justify-center text-xs text-gray-600">
                <span className="bg-gray-900 px-2 py-1 rounded">Constitución RD</span>
                <span className="bg-gray-900 px-2 py-1 rounded">Código de Trabajo</span>
                <span className="bg-gray-900 px-2 py-1 rounded">Código Penal</span>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800/80 text-gray-100 border border-gray-700/50"
              }`}
            >
              <p className="text-xs font-semibold mb-2 opacity-60">
                {message.role === "user" ? "Tú" : "⚖️ SUYD Legal AI"}
              </p>
              {message.role === "user" ? (
                <p className="text-sm leading-relaxed">{message.content}</p>
              ) : (
                <div className="prose prose-sm prose-invert max-w-none prose-headings:text-white prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1 prose-li:my-0 prose-ul:my-1 prose-strong:text-blue-300">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl px-5 py-3">
              <p className="text-xs font-semibold mb-2 opacity-60">
                ⚖️ SUYD Legal AI
              </p>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
                <p className="text-sm text-gray-400">Consultando leyes dominicanas...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="border-t border-gray-800 px-4 py-4 bg-gray-950/80 backdrop-blur">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Describe tu situación legal..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-gray-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {isLoading ? "..." : "Enviar"}
          </button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-2">
          Basado en la Constitución, Código de Trabajo y Código Penal de RD · No sustituye un abogado licenciado
        </p>
      </form>
    </div>
  );
}

"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-100">
      {/* Header minimalista */}
      <header className="px-6 py-3 border-b border-white/5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-sm font-medium text-gray-300">SUYD Legal AI</span>
          </div>
          <span className="text-xs text-gray-600">Leyes de Rep. Dominicana</span>
        </div>
      </header>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <p className="text-gray-500 text-sm mb-8">
                Describe tu situación legal y te oriento basándome en la ley.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {[
                  "Me despidieron sin prestaciones",
                  "Mi casero quiere subirme el alquiler",
                  "Compre un producto defectuoso",
                  "Quiero pedir pension alimenticia",
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      const form = document.querySelector("form");
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype, "value"
                      )?.set;
                      const inputEl = document.querySelector("input");
                      if (nativeInputValueSetter && inputEl) {
                        nativeInputValueSetter.call(inputEl, example);
                        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                      }
                    }}
                    className="text-left text-xs text-gray-500 border border-white/5 rounded-lg px-3 py-3 hover:border-white/15 hover:text-gray-300 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
              <div className="mt-8 flex gap-3 text-[10px] text-gray-700">
                <span>Constitucion RD</span>
                <span>-</span>
                <span>Codigo de Trabajo</span>
                <span>-</span>
                <span>Codigo Penal</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-white/5 rounded-2xl rounded-br-sm px-4 py-3">
                      <p className="text-sm text-gray-200">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="prose prose-sm prose-invert max-w-none prose-headings:text-gray-100 prose-headings:font-semibold prose-headings:text-base prose-headings:mt-4 prose-headings:mb-2 prose-p:text-gray-300 prose-p:my-2 prose-p:text-sm prose-p:leading-relaxed prose-li:text-gray-300 prose-li:text-sm prose-li:my-0.5 prose-ul:my-2 prose-strong:text-gray-100 prose-strong:font-semibold prose-a:text-emerald-400">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
                <p className="text-sm text-gray-500 mt-1">Consultando leyes...</p>
              </div>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus-within:border-white/20 transition-colors">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Escribe tu consulta legal..."
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none py-1"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="text-gray-500 hover:text-gray-200 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors px-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-700 mt-2">
            Basado en leyes de Rep. Dominicana · No sustituye un abogado licenciado
          </p>
        </form>
      </div>
    </div>
  );
}

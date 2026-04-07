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
    <div className="flex flex-col h-screen bg-white text-gray-900">
      {/* Header institucional */}
      <header className="bg-[#002b5c] text-white border-b-4 border-[#ce1126]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-[#002b5c] font-bold text-lg">
              ⚖
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">SUYD Legal AI</h1>
              <p className="text-xs text-blue-200">
                Asistente Legal · República Dominicana
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-blue-200">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>En línea</span>
          </div>
        </div>
      </header>

      {/* Banner de creador */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-2 flex items-center justify-center gap-2 text-xs text-gray-600">
          <span>Creado por</span>
          <a
            href="https://www.linkedin.com/in/rafaelcedanorijo/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#002b5c] hover:underline font-medium"
          >
            Rafael José Cedano Rijo
          </a>
          <span className="text-gray-400">·</span>
          <a
            href="https://github.com/RafaelJCR/suyd-legal-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-[#002b5c] hover:underline"
          >
            Código fuente
          </a>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Asistente Legal Inteligente
                </h2>
                <p className="text-sm text-gray-600 max-w-md">
                  Describa su situación legal y reciba orientación basada en las
                  leyes vigentes de la República Dominicana.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {[
                  "Me despidieron sin prestaciones laborales",
                  "Mi casero quiere subirme el alquiler",
                  "Compré un producto defectuoso",
                  "Quiero solicitar pensión alimenticia",
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype, "value"
                      )?.set;
                      const inputEl = document.querySelector("input");
                      if (nativeInputValueSetter && inputEl) {
                        nativeInputValueSetter.call(inputEl, example);
                        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                      }
                    }}
                    className="text-left text-sm text-gray-700 bg-white border border-gray-200 rounded-md px-4 py-3 hover:border-[#002b5c] hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    {example}
                  </button>
                ))}
              </div>

              <div className="mt-10 pt-6 border-t border-gray-200 w-full max-w-2xl">
                <p className="text-xs text-gray-500 text-center mb-3 uppercase tracking-wider">
                  Base legal consultada
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-700">
                    Constitución de la República
                  </span>
                  <span className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-700">
                    Código de Trabajo
                  </span>
                  <span className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-700">
                    Código Penal
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-[#002b5c] text-white rounded-lg px-4 py-3 shadow-sm">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded bg-[#002b5c] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                      ⚖
                    </div>
                    <div className="min-w-0 flex-1 bg-white border border-gray-200 rounded-lg px-5 py-4 shadow-sm">
                      <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:text-base prose-headings:mt-4 prose-headings:mb-2 prose-p:text-gray-700 prose-p:my-2 prose-p:text-sm prose-p:leading-relaxed prose-li:text-gray-700 prose-li:text-sm prose-li:my-0.5 prose-ul:my-2 prose-strong:text-[#002b5c] prose-strong:font-semibold prose-a:text-[#002b5c]">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded bg-[#002b5c] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                  ⚖
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-[#002b5c] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-1.5 h-1.5 bg-[#002b5c] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-1.5 h-1.5 bg-[#002b5c] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                    <p className="text-sm text-gray-600">Consultando base legal...</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex gap-2 bg-white border border-gray-300 rounded-md px-4 py-2 focus-within:border-[#002b5c] focus-within:ring-1 focus-within:ring-[#002b5c]/20 transition-colors">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Describa su consulta legal..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none py-1"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[#002b5c] hover:bg-[#003a7a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
            >
              Enviar
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-3">
            Este asistente proporciona orientación general y no sustituye la asesoría de un abogado licenciado.
          </p>
        </form>
      </div>
    </div>
  );
}

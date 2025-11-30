"use client";

import { useRef, useEffect } from "react";
import { useChat } from "ai/react";
import va from "@vercel/analytics";
import clsx from "clsx";
import { LoadingCircle, SendIcon } from "./icons";
import { Bot, User, Download, RotateCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Textarea from "react-textarea-autosize";
import { toast } from "sonner";

const examples = [
  "帮我评审设计稿，只需要关注其中的Smartapp Blocks。\n@https://www.figma.com/design/ugzeyhbxSNn8QcBAyWgsfi/智能主页-V1.0?node-id=11285-693729",
  "不要详细分析，告诉我设计稿中体现了前端开发层面哪些潜在的难点或者工作量较大的部分，最多3个。\n@https://www.figma.com/design/ugzeyhbxSNn8QcBAyWgsfi/智能主页-V1.0?node-id=11285-693729",
  "不要详细分析，根据设计稿总结出在开发中需要让大模型注意的提示词，目的是提升我的开发效率，输出为Markdown格式。\n@https://www.figma.com/design/ugzeyhbxSNn8QcBAyWgsfi/智能主页-V1.0?node-id=11285-693729",
];

export default function Chat() {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, input, setInput, handleSubmit, isLoading, setMessages } = useChat({
    onResponse: (response) => {
      if (response.status === 429) {
        toast.error("You have reached your request limit for the day.");
        va.track("Rate limited");
        return;
      } else {
        va.track("Chat initiated");
      }
    },
    onError: (error) => {
      va.track("Chat errored", {
        input,
        error: error.message,
      });
    },
  });

  const disabled = isLoading || input.length === 0;
  const hasAiResponse = messages.some((m) => m.role === "assistant");

  useEffect(() => {
    const savedMessages = localStorage.getItem("chat-messages");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error("Failed to load messages from localStorage:", error);
        localStorage.removeItem("chat-messages");
      }
    }
  }, [setMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chat-messages", JSON.stringify(messages));
    }
  }, [messages]);

  const handleExport = () => {
    const aiContent = messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content)
      .join("\n\n---\n\n");

    if (!aiContent) return;

    const blob = new Blob([aiContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().split("T")[0];
    a.download = `chat-figma-${date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setMessages([]);
    localStorage.removeItem("chat-messages");
  };

  return (
    <main className="flex flex-col items-center justify-between pb-40">
      <div className="absolute top-5 hidden w-full justify-between px-5 sm:flex">
      </div>
      {messages.length > 0 ? (
        messages.map((message, i) => (
          <div
            key={i}
            className={clsx(
              "flex w-full items-center justify-center border-b border-gray-200 py-8",
              message.role === "user" ? "bg-white" : "bg-gray-100",
            )}
          >
            <div className="flex w-full max-w-screen-md items-start space-x-4 px-5 sm:px-0">
              <div
                className={clsx(
                  "p-1.5 text-white",
                  message.role === "assistant" ? "bg-green-500" : "bg-black",
                )}
              >
                {message.role === "user" ? (
                  <User width={20} />
                ) : (
                  <Bot width={20} />
                )}
              </div>
              <ReactMarkdown
                className="prose mt-1 w-full break-words prose-p:leading-relaxed"
                remarkPlugins={[remarkGfm]}
                components={{
                  // open links in new tab
                  a: (props) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))
      ) : (
        <div className="border-gray-200sm:mx-0 mx-5 mt-20 max-w-screen-md rounded-md border sm:w-full">
          <div className="flex flex-col space-y-4 p-7 sm:p-10">
            <h1 className="text-lg font-semibold text-black">
              欢迎使用Figma设计稿评审Agent
            </h1>
            <p className="text-gray-500">
            这是一个前端视角交互 & 逻辑细节的审查助手，聚焦组件多状态、空 / 错 / 加载态、文本溢出、权限差异等开发关键坑点，按结构化清单标记缺失 / 模糊项，输出高优先级问题与可执行建议，助力开发前补齐细节、规避返工。
            </p>
          </div>
          <div className="flex flex-col space-y-4 border-t border-gray-200 bg-gray-50 p-7 sm:p-10">
            {examples.map((example, i) => (
              <button
                key={i}
                className="rounded-md border border-gray-200 bg-white px-5 py-3 text-left text-sm text-gray-500 transition-all duration-75 hover:border-black hover:text-gray-700 active:bg-gray-50"
                style={{
                  wordBreak: 'break-all',
                }}
                onClick={() => {
                  setInput(example);
                  inputRef.current?.focus();
                }}
              >
                {example.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="fixed bottom-0 flex w-full flex-col items-center space-y-3 bg-gradient-to-b from-transparent via-gray-100 to-gray-100 p-5 pb-3 sm:px-0">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="relative w-full max-w-screen-md rounded-xl border border-gray-200 bg-white px-4 pb-2 pt-3 shadow-lg sm:pb-3 sm:pt-4"
        >
          <Textarea
            ref={inputRef}
            tabIndex={0}
            required
            rows={1}
            autoFocus
            placeholder="发消息"
            value={input}
            disabled={isLoading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                formRef.current?.requestSubmit();
                e.preventDefault();
              }
            }}
            spellCheck={false}
            className={clsx(
              "w-full resize-none bg-transparent focus:outline-none",
              hasAiResponse ? "pr-32" : "pr-10",
            )}
          />
          <div className="absolute inset-y-0 right-3 flex items-center space-x-2">
            {hasAiResponse && (
              <>
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 transition-all hover:bg-gray-200"
                  title="新对话"
                >
                  <RotateCw className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 transition-all hover:bg-gray-200"
                  title="导出Markdown"
                >
                  <Download className="h-4 w-4 text-gray-600" />
                </button>
              </>
            )}
            <button
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-md transition-all",
                disabled
                  ? "cursor-not-allowed bg-white"
                  : "bg-green-500 hover:bg-green-600",
              )}
              disabled={disabled}
            >
              {isLoading ? (
                <LoadingCircle />
              ) : (
                <SendIcon
                  className={clsx(
                    "h-4 w-4",
                    input.length === 0 ? "text-gray-300" : "text-white",
                  )}
                />
              )}
            </button>
          </div>
        </form>
        <p className="text-center text-xs text-gray-400">Powered by Towerchen</p>
      </div>
    </main>
  );
}

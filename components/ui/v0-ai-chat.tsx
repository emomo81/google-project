"use client";

import { useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  FileUp,
  Braces,
  MonitorIcon,
  CircleUserRound,
  ArrowUpIcon,
  Paperclip,
  Mic,
  MicOff,
} from "lucide-react";

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) textarea.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

interface V0ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onImageClick: () => void;
  onMicClick: () => void;
  isLoading?: boolean;
  isListening?: boolean;
  hasImage?: boolean;
}

export function V0ChatInput({
  value,
  onChange,
  onSend,
  onImageClick,
  onMicClick,
  isLoading,
  isListening,
  hasImage,
}: V0ChatInputProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  const canSend = (value.trim() || hasImage) && !isLoading;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustHeight();
  };

  return (
    <div className="w-full">
      <div className="relative bg-neutral-900 rounded-xl border border-neutral-800 shadow-lg">
        <div className="overflow-y-auto">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "🎤 Listening…" : "Message Momo AI…"}
            className={cn(
              "w-full px-4 py-3",
              "resize-none bg-transparent border-none",
              "text-white text-sm",
              "focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-neutral-500 placeholder:text-sm",
              "min-h-[60px]"
            )}
            style={{ overflow: "hidden" }}
          />
        </div>

        <div className="flex items-center justify-between px-3 pb-3">
          {/* Left: attach + mic */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onImageClick}
              title="Attach image"
              className={cn(
                "group p-2 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1",
                hasImage && "bg-blue-500/20"
              )}
            >
              <Paperclip className={cn("w-4 h-4", hasImage ? "text-blue-400" : "text-neutral-400")} />
              <span className="text-xs text-zinc-400 hidden group-hover:inline">Attach</span>
            </button>

            <button
              type="button"
              onClick={onMicClick}
              title={isListening ? "Stop listening" : "Voice input"}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isListening
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "hover:bg-neutral-800 text-neutral-400 hover:text-white"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Right: send */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className={cn(
                "px-1.5 py-1.5 rounded-lg text-sm transition-all border border-zinc-700 flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed",
                canSend
                  ? "bg-white text-black hover:bg-zinc-200 border-white"
                  : "hover:bg-zinc-800 text-zinc-400"
              )}
            >
              <ArrowUpIcon className={cn("w-4 h-4", canSend ? "text-black" : "text-zinc-400")} />
              <span className="sr-only">Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick-action chips */}
      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        <ActionButton icon={<ImageIcon className="w-4 h-4" />} label="Analyse Image" onClick={onImageClick} />
        <ActionButton icon={<MonitorIcon className="w-4 h-4" />} label="Explain concept" onClick={() => { onChange("Explain: "); }} />
        <ActionButton icon={<FileUp className="w-4 h-4" />} label="Summarise text" onClick={() => { onChange("Summarise this: "); }} />
        <ActionButton icon={<Braces className="w-4 h-4" />} label="Write code" onClick={() => { onChange("Write code for: "); }} />
        <ActionButton icon={<CircleUserRound className="w-4 h-4" />} label="Just chat" onClick={() => { onChange("Let's chat! "); }} />
      </div>
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}

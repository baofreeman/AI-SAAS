"use client";

import { CommonInput } from "@/components/common-input";
import Empty from "@/components/empty";
import Loader from "@/components/loader";
import { audioSchema } from "@/schema/form-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import LoadMore from "./loadmore";
import useAudio from "@/hooks/use-audio";
import UserMessage from "@/components/dashboard/user-message";
import MarkdownResponse from "@/components/dashboard/markdown-response";
import AiResponse from "@/components/dashboard/ai-response";
import { useToast } from "@/components/ui/use-toast";

type MessageContent = string | { audio: string };

const AudioContent = ({ initialMessages }: { initialMessages: any }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ role: string; content: MessageContent }>
  >(initialMessages || []);

  const { audioId } = useAudio();

  const form = useForm<z.infer<typeof audioSchema>>({
    resolver: zodResolver(audioSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const onSubmit = useCallback(
    async (values: z.infer<typeof audioSchema>) => {
      try {
        setIsLoading(true);

        const newUserMessage = { role: "user", content: values.prompt };
        setMessages((prevMessages) => [...prevMessages, newUserMessage]);

        const response = await fetch(`/api/audio/${audioId}/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          if (response.status === 403) {
            toast({
              variant: "destructive",
              description: "Free trial has expired. Please upgrade to continue",
            });
          } else {
            throw new Error("Failed to fetch AI response");
          }
          return;
        }

        const data = await response.json();
        const newAssistantMessage = { role: "assistant", content: data };
        setMessages((prevMessages) => [...prevMessages, newAssistantMessage]);
      } catch (error: any) {
        console.error("Error fetching AI response:", error);
        toast({
          variant: "destructive",
          description: "An error occurred while fetching the AI response.",
        });
      } finally {
        setIsLoading(false);
        form.reset({ prompt: "" });
      }
    },
    [audioId, form, toast]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const renderMessage = useCallback(
    (
      message: { role: string; content: MessageContent },
      messageIndex: number
    ) => (
      <React.Fragment key={messageIndex}>
        {message.role === "user" ? (
          <UserMessage>
            <MarkdownResponse content={message.content as string} />
          </UserMessage>
        ) : (
          <AiResponse>
            <audio controls className="w-full">
              <source src={(message.content as { audio: string }).audio} />
            </audio>
          </AiResponse>
        )}
      </React.Fragment>
    ),
    []
  );

  return (
    <div className="flex flex-col w-full h-full focus-visible:outline-0">
      <div className="flex items-center bg-background w-full h-20 top-0 p-4 z-50 md:h-14">
        <h1 className="text-lg text-left font-bold">Audio</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        {messages.length === 0 && !isLoading && (
          <Empty label="No conversation started." />
        )}
        <div className="h-full">
          <div className="w-full h-full overflow-y-auto">
            <LoadMore audioId={audioId} />
            {messages.length > 0 && <>{messages.map(renderMessage)}</>}
            <div ref={messagesEndRef} />
            {isLoading && <Loader />}
          </div>
        </div>
      </div>
      <CommonInput
        form={form}
        onSubmit={onSubmit}
        isLoading={isLoading}
        placeholder="Start the audio..."
      />
    </div>
  );
};

AudioContent.displayName = "AudioContent";

export default React.memo(AudioContent);

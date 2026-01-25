"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { StickToBottom } from "use-stick-to-bottom";

export type ChatContainerRootProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export type ChatContainerContentProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export type ChatContainerScrollAnchorProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

function ChatContainerRoot({
  children,
  className,
  ...props
}: ChatContainerRootProps) {
  return (
    <StickToBottom
      className={cn("flex overflow-y-auto", className)}
      resize="smooth"
      initial="instant"
      role="log"
      {...props}
    >
      {children}
    </StickToBottom>
  );
}

function ChatContainerContent({
  children,
  className,
  ...props
}: ChatContainerContentProps) {
  return (
    <StickToBottom.Content
      className={cn("flex w-full flex-col", className)}
      {...props}
    >
      {children}
    </StickToBottom.Content>
  );
}

function ChatContainerScrollAnchor({
  className,
  ...props
}: ChatContainerScrollAnchorProps) {
  return <ChatContainerScrollAnchorImpl className={className} {...props} />;
}

const ChatContainerScrollAnchorImpl = React.forwardRef<
  HTMLDivElement,
  ChatContainerScrollAnchorProps
>(({ className, ...props }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={cn("h-px w-full shrink-0 scroll-mt-4", className)}
      aria-hidden="true"
      {...props}
    />
  );
});

ChatContainerScrollAnchorImpl.displayName = "ChatContainerScrollAnchorImpl";

export { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor };

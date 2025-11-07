import { useState, useRef } from "react";

interface UseDragDropOptions {
  onDrop?: (files: FileList) => void;
}

// Helper function to check if drag contains files from external sources (not internal app drags)
const containsFiles = (dataTransfer: DataTransfer): boolean => {
  // Check if this is an internal app drag (media item)
  if (dataTransfer.types.includes("application/x-media-item")) {
    return false;
  }

  // Only show overlay for external file drags
  return dataTransfer.types.includes("Files");
};

export function useDragDrop(options: UseDragDropOptions = {}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();

    // Only handle external file drags, not internal app element drags
    if (!containsFiles(e.dataTransfer)) {
      return;
    }

    dragCounterRef.current += 1;
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    // Only handle file drags
    if (!containsFiles(e.dataTransfer)) {
      return;
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();

    // Only handle file drags
    if (!containsFiles(e.dataTransfer)) {
      return;
    }

    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    // Only handle file drops
    if (
      options.onDrop &&
      e.dataTransfer.files &&
      containsFiles(e.dataTransfer)
    ) {
      options.onDrop(e.dataTransfer.files);
    }
  };

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  return {
    isDragOver,
    dragProps,
  };
}

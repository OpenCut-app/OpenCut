import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface AudioWaveformProps {
  audioUrl: string;
  height?: number;
  className?: string;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioUrl,
  height = 32,
  className = "",
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    let ws = wavesurfer.current;

    const initWaveSurfer = async () => {
      if (!waveformRef.current || !audioUrl) return;

      try {
        // Clear any existing instance safely
        if (ws) {
          // Instead of immediately destroying, just set to null
          // We'll destroy it outside this function
          wavesurfer.current = null;
        }

        // Create a fresh instance
        const newWaveSurfer = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: "rgba(255, 255, 255, 0.6)",
          progressColor: "rgba(255, 255, 255, 0.9)",
          cursorColor: "transparent",
          barWidth: 2,
          barGap: 1,
          height,
          normalize: true,
          interact: false,
        });

        // Assign to ref only if component is still mounted
        if (mounted) {
          wavesurfer.current = newWaveSurfer;
        } else {
          // Component unmounted during initialization, clean up
          try {
            newWaveSurfer.destroy();
          } catch (e) {
            // Ignore destroy errors
          }
          return;
        }

        // Event listeners
        newWaveSurfer.on("ready", () => {
          if (mounted) {
            setIsLoading(false);
            setError(false);
          }
        });

        newWaveSurfer.on("error", (err) => {
          if (mounted) {
            console.error("WaveSurfer error:", err);
            setError(true);
            setIsLoading(false);
          }
        });

        await newWaveSurfer.load(audioUrl);
      } catch (err) {
        if (mounted) {
          console.error("Failed to initialize WaveSurfer:", err);
          setError(true);
          setIsLoading(false);
        }
      }
    };

    // First safely destroy previous instance if it exists
    if (ws) {
      // Use this pattern to safely destroy the previous instance
      const wsToDestroy = ws;
      // Detach from ref immediately
      wavesurfer.current = null;

      // Wait a tick to destroy so any pending operations can complete
      requestAnimationFrame(() => {
        try {
          wsToDestroy.destroy();
        } catch (e) {
          // Ignore errors during destroy
        }
        // Only initialize new instance after destroying the old one
        if (mounted) {
          initWaveSurfer();
        }
      });
    } else {
      // No previous instance to clean up, initialize directly
      initWaveSurfer();
    }

    return () => {
      // Mark component as unmounted
      mounted = false;

      // Store reference to current wavesurfer instance
      const wsToDestroy = wavesurfer.current;

      // Immediately clear the ref to prevent accessing it after unmount
      wavesurfer.current = null;

      // If we have an instance to clean up, do it safely
      if (wsToDestroy) {
        // Delay destruction to avoid race conditions
        requestAnimationFrame(() => {
          try {
            wsToDestroy.destroy();
          } catch (e) {
            // Ignore destroy errors - they're expected
          }
        });
      }
    };
  }, [audioUrl, height]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <span className="text-xs text-foreground/60">Audio unavailable</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-foreground/60">Loading...</span>
        </div>
      )}
      <div
        ref={waveformRef}
        className={`w-full transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"}`}
        style={{ height }}
      />
    </div>
  );
};

export default AudioWaveform;

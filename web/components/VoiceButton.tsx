"use client";

import { Mic } from "lucide-react";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { VoiceTranscribeResponse } from "@/lib/types";

type Phase = "idle" | "recording" | "processing" | "error";

// Minimal typing for the non-standard SpeechRecognition API used only as a
// fallback when the backend/Sarvam call fails.
interface MinimalSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function VoiceButton({
  onResult,
  onFallbackToSearch,
}: {
  onResult: (data: VoiceTranscribeResponse) => void;
  onFallbackToSearch: (message: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function startRecording() {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        handleClipReady(new Blob(chunksRef.current, { type: "audio/webm" }));
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setPhase("recording");
    } catch {
      setErrorMessage("Microphone access was denied or unavailable.");
      setPhase("error");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  async function handleClipReady(blob: Blob) {
    setPhase("processing");
    try {
      const result = await api.transcribeVoice(blob);
      onResult(result);
      setPhase("idle");
    } catch (err) {
      // Sarvam unavailable (503) -> try the browser's own recognizer instead
      // of just failing. Anything else -> straight to manual-search fallback.
      if (err instanceof ApiError && err.status === 503) {
        tryNativeFallback();
      } else {
        setErrorMessage(err instanceof ApiError ? err.message : "Voice recognition failed.");
        setPhase("error");
        onFallbackToSearch("Voice recognition is unavailable right now — try search or quick add.");
      }
    }
  }

  function tryNativeFallback() {
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => MinimalSpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => MinimalSpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      onFallbackToSearch(
        "Sarvam is unavailable and this browser has no built-in speech recognition — try search or quick add."
      );
      setPhase("idle");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      try {
        const result = await api.submitTranscript(transcript);
        onResult(result);
      } catch {
        onFallbackToSearch("Couldn't process that — try search or quick add.");
      } finally {
        setPhase("idle");
      }
    };
    recognition.onerror = () => {
      onFallbackToSearch("Voice recognition is unavailable right now — try search or quick add.");
      setPhase("idle");
    };
    recognition.onend = () => setPhase((p) => (p === "processing" ? "idle" : p));

    setPhase("processing");
    recognition.start();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={phase === "recording" ? stopRecording : startRecording}
        disabled={phase === "processing"}
        aria-label={phase === "recording" ? "Stop recording" : "Start voice input"}
        className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-elevated transition disabled:opacity-60 ${
          phase === "recording" ? "animate-pulse bg-red-500" : "bg-accent-500 hover:bg-accent-600"
        }`}
      >
        {phase === "processing" ? <span className="text-xs">...</span> : <Mic size={22} />}
      </button>
      {phase === "recording" && (
        <span className="rounded-full bg-white px-2.5 py-1 text-xs text-paper-600 shadow-card">
          Listening... tap to stop
        </span>
      )}
      {errorMessage && (
        <span className="max-w-[12rem] rounded-lg bg-white px-2.5 py-1 text-right text-xs text-red-500 shadow-card">
          {errorMessage}
        </span>
      )}
    </div>
  );
}

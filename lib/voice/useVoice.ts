"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSettings } from "../settings";
import { hasAi } from "../ai/status";
import { transcribe } from "../ai/groq";

export type VoiceState = "idle" | "listening" | "processing" | "unsupported";

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function speechCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const isIOS = () => typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

/** Which engine will actually be used for the current settings and browser. */
export function resolveEngine(): "webspeech" | "whisper" | null {
  const { speechEngine } = getSettings();
  const web = !!speechCtor();
  const whisper = hasAi() && typeof MediaRecorder !== "undefined";
  if (speechEngine === "webspeech") return web ? "webspeech" : null;
  if (speechEngine === "whisper") return whisper ? "whisper" : null;
  // auto: Whisper is far better than iOS Safari's recogniser and for mixed-language speech.
  if (whisper && (isIOS() || !web)) return "whisper";
  return web ? "webspeech" : whisper ? "whisper" : null;
}

/**
 * Hold-to-talk voice capture. `start()` on pointer down, `stop()` on pointer up;
 * `onResult` receives the final transcript. Web Speech gives interim text while talking.
 */
export function useVoice(onResult: (text: string) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const mediaRef = useRef<{ rec: MediaRecorder; chunks: Blob[]; stream: MediaStream } | null>(null);
  const finalRef = useRef("");
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  // Browser support is only knowable on the client; "unsupported" is derived, not stored.
  const engine = useSyncExternalStore(
    () => () => {},
    () => resolveEngine(),
    () => "webspeech" as const,
  );
  const effectiveState: VoiceState = engine === null ? "unsupported" : state;

  const stop = useCallback(() => {
    if (recRef.current) {
      recRef.current.stop();
      return;
    }
    const m = mediaRef.current;
    if (m && m.rec.state !== "inactive") {
      setState("processing");
      m.rec.stop();
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setInterim("");
    finalRef.current = "";
    const chosen = resolveEngine();
    if (!chosen) return;
    const { speechLang } = getSettings();

    if (chosen === "webspeech") {
      const Ctor = speechCtor()!;
      const rec = new Ctor();
      rec.lang = speechLang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        let finalText = "";
        let interimText = "";
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript + " ";
          else interimText += r[0].transcript;
        }
        finalRef.current = finalText.trim();
        setInterim((finalText + interimText).trim());
      };
      rec.onerror = (e) => {
        if (e.error !== "no-speech" && e.error !== "aborted") setError(e.error);
      };
      rec.onend = () => {
        recRef.current = null;
        setState("idle");
        const text = finalRef.current || interim;
        setInterim("");
        if (text) onResultRef.current(text);
      };
      recRef.current = rec;
      try {
        rec.start();
        setState("listening");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start");
        recRef.current = null;
      }
      return;
    }

    // Whisper: record, then upload on stop.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaRef.current = null;
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1000) {
          setState("idle");
          return;
        }
        try {
          const text = await transcribe(blob, {
            language: speechLang.split("-")[0],
            prompt: "Expense note with amounts in rupees, e.g. tea 20, metro 40.",
          });
          if (text) onResultRef.current(text);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Transcription failed");
        } finally {
          setState("idle");
        }
      };
      mediaRef.current = { rec, chunks, stream };
      rec.start();
      setState("listening");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone unavailable");
      setState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    recRef.current?.abort();
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  return { state: effectiveState, interim, error, start, stop, engine };
}

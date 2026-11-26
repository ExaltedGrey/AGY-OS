import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function appendDictatedText(existing: string, spoken: string): string {
  const cleaned = spoken.trim();
  if (!cleaned) return existing;
  if (!existing) return cleaned;
  const needsSpace = !/[\s\n]$/.test(existing);
  return `${existing}${needsSpace ? ' ' : ''}${cleaned}`;
}

export function useDictation(onFinalTranscript: (text: string) => void) {
  const supported = getSpeechRecognitionCtor() !== null;
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onFinalTranscript);
  callbackRef.current = onFinalTranscript;

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
      recognitionRef.current = null;
    }
    setListening(false);
    setInterimText('');
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Voice dictation is not supported in this browser.');
      return;
    }

    stop();
    setError(null);

    try {
      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onresult = (event) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalChunk += text;
          } else {
            interimChunk += text;
          }
        }
        setInterimText(interimChunk.trim());
        if (finalChunk.trim()) {
          callbackRef.current(finalChunk.trim());
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone permission was denied. Allow mic access in browser settings.');
        } else if (event.error === 'no-speech') {
          // Non-fatal; just stop cleanly
        } else if (event.error !== 'aborted') {
          setError(`Dictation error: ${event.error}`);
        }
        setListening(false);
        setInterimText('');
      };

      recognition.onend = () => {
        setListening(false);
        setInterimText('');
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      setError('Could not start microphone dictation.');
      setListening(false);
    }
  }, [stop]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return {
    supported,
    listening,
    interimText,
    error,
    start,
    stop,
    toggle,
  };
}

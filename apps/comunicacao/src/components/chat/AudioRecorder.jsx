import { useEffect, useRef, useState } from 'react';
import { Check, Mic, Square, Trash2 } from 'lucide-react';
import { Button } from '@macom/ui';

const MAX_DURATION_SECONDS = 5 * 60;
const AUDIO_BITS_PER_SECOND = 64000;

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

const EXTENSION_BY_BASE_MIME = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
};

function isRecordingSupported() {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

function pickSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported(mime)) || null;
}

function formatElapsed(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function AudioRecorder({ disabled, onRecorded }) {
  const [status, setStatus] = useState('idle'); // idle | recording | preview
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [level, setLevel] = useState(0); // 0..1, nivel de audio captado (feedback visual)

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordedFileRef = useRef(null);
  const timerRef = useRef(null);
  const previewUrlRef = useRef('');
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const levelFrameRef = useRef(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (levelFrameRef.current) cancelAnimationFrame(levelFrameRef.current);
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopLevelMeter = () => {
    if (levelFrameRef.current) {
      cancelAnimationFrame(levelFrameRef.current);
      levelFrameRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setLevel(0);
  };

  const startLevelMeter = (stream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i += 1) {
        const normalized = (data[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      setLevel(Math.min(1, rms * 4));
      levelFrameRef.current = requestAnimationFrame(tick);
    };
    levelFrameRef.current = requestAnimationFrame(tick);
  };

  const resetToIdle = () => {
    stopTimer();
    stopStream();
    stopLevelMeter();
    chunksRef.current = [];
    recordedFileRef.current = null;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setPreviewUrl('');
    setElapsedSeconds(0);
    setStatus('idle');
  };

  const buildRecordedFile = (mimeType) => {
    const baseMime = mimeType.split(';')[0];
    const blob = new Blob(chunksRef.current, { type: baseMime });
    const extension = EXTENSION_BY_BASE_MIME[baseMime] || 'webm';
    return new File([blob], `audio-${Date.now()}.${extension}`, { type: baseMime });
  };

  const startRecording = async () => {
    setError('');
    const mimeType = pickSupportedMimeType();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: AUDIO_BITS_PER_SECOND })
        : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stopStream();
        stopLevelMeter();
        const file = buildRecordedFile(recorder.mimeType || mimeType || 'audio/webm');
        recordedFileRef.current = file;
        const url = URL.createObjectURL(file);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        setStatus('preview');
      };

      recorderRef.current = recorder;
      recorder.start();
      startLevelMeter(stream);
      setStatus('recording');
      setElapsedSeconds(0);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((current) => {
          const next = current + 1;
          if (next >= MAX_DURATION_SECONDS) {
            recorderRef.current?.stop();
            stopTimer();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      stopStream();
      if (err?.name === 'NotAllowedError') {
        setError('Permissão de microfone negada. Habilite o acesso ao microfone nas configurações do navegador.');
      } else if (err?.name === 'NotFoundError') {
        setError('Nenhum microfone encontrado neste dispositivo.');
      } else {
        setError('Não foi possível iniciar a gravação de áudio.');
      }
    }
  };

  const stopRecording = () => {
    stopTimer();
    recorderRef.current?.stop();
  };

  const cancelRecording = () => {
    stopTimer();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    resetToIdle();
  };

  const discardPreview = () => {
    resetToIdle();
  };

  const confirmSend = () => {
    if (recordedFileRef.current) {
      onRecorded(recordedFileRef.current);
    }
    resetToIdle();
  };

  if (!isRecordingSupported()) {
    return null;
  }

  if (status === 'recording') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1.5 text-xs">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" />
        <span className="tabular-nums text-muted-foreground">{formatElapsed(elapsedSeconds)}</span>
        <span className="flex h-4 w-12 shrink-0 items-center gap-0.5" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((barIndex) => {
            const threshold = barIndex / 5;
            const active = level > threshold;
            return (
              <span
                key={barIndex}
                className={`w-1.5 rounded-sm transition-all ${active ? 'bg-destructive' : 'bg-border'}`}
                style={{ height: `${30 + barIndex * 15}%` }}
              />
            );
          })}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={cancelRecording}
          aria-label="Cancelar gravação"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={stopRecording}
          aria-label="Parar gravação"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (status === 'preview') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1.5 text-xs">
        <audio controls src={previewUrl} className="h-8 max-w-40" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={discardPreview}
          aria-label="Descartar áudio"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={confirmSend}
          aria-label="Anexar áudio"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={startRecording}
        disabled={disabled}
        aria-label="Gravar áudio"
      >
        <Mic className="h-4 w-4" />
      </Button>
      {error ? <p className="ml-2 max-w-48 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

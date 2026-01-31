import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

// Audio configuration constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

export interface LiveSessionConfig {
  systemInstruction: string;
  voiceName: string;
}

export class LiveSession {
  private client: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  
  // Callbacks for UI updates
  public onIsTalking: (isTalking: boolean) => void = () => {};
  public onError: (error: string) => void = () => {};

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(config: LiveSessionConfig) {
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.sessionPromise = this.client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } },
          },
          systemInstruction: config.systemInstruction,
        },
        callbacks: {
          onopen: this.handleOpen.bind(this, stream),
          onmessage: this.handleMessage.bind(this),
          onerror: (e) => { console.error(e); this.onError('Connection error'); },
          onclose: () => { console.log('Session closed'); },
        },
      });

    } catch (err) {
      console.error("Failed to connect to Live API", err);
      this.onError("Microphone access denied or API error.");
    }
  }

  async disconnect() {
    if (this.sessionPromise) {
      const session = await this.sessionPromise;
      // Note: SDK might not expose explicit close on session object yet depending on version,
      // but stopping streams is the critical part for client-side cleanup.
    }
    
    // Stop Audio Contexts
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    
    // Stop Tracks
    if (this.inputSource) {
      this.inputSource.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    this.activeSources.forEach(source => source.stop());
    this.activeSources.clear();
    
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.sessionPromise = null;
    this.nextStartTime = 0;
  }

  private handleOpen(stream: MediaStream) {
    if (!this.inputAudioContext) return;

    console.log("Live Session Opened");
    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    this.processor = this.inputAudioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.floatTo16BitPCM(inputData);
      const base64Data = this.arrayBufferToBase64(pcmData);

      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({
          media: {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Data
          }
        });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    if (!this.outputAudioContext) return;

    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      this.onIsTalking(true);
      
      const pcmData = this.base64ToArrayBuffer(base64Audio);
      const audioBuffer = await this.pcmToAudioBuffer(pcmData, this.outputAudioContext);
      
      // Schedule playback
      this.nextStartTime = Math.max(this.outputAudioContext.currentTime, this.nextStartTime);
      
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);
      
      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
            // Slight delay to ensure animation looks natural
            setTimeout(() => this.onIsTalking(false), 200);
        }
      };

      source.start(this.nextStartTime);
      this.activeSources.add(source);
      
      this.nextStartTime += audioBuffer.duration;
    }

    if (message.serverContent?.interrupted) {
      this.activeSources.forEach(source => source.stop());
      this.activeSources.clear();
      this.nextStartTime = 0;
      this.onIsTalking(false);
    }
  }

  // --- Helpers ---

  // Float32 (Web Audio) -> Int16 (Gemini API)
  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output.buffer;
  }

  // Base64 -> ArrayBuffer
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ArrayBuffer -> Base64
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Raw PCM -> AudioBuffer
  private async pcmToAudioBuffer(pcmData: ArrayBuffer, context: AudioContext): Promise<AudioBuffer> {
    const int16Data = new Int16Array(pcmData);
    const float32Data = new Float32Array(int16Data.length);
    
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }

    const buffer = context.createBuffer(1, float32Data.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(float32Data, 0);
    return buffer;
  }
}
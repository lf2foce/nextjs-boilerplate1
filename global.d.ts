declare global {
    interface Window {
      SpeechRecognition?: {
        new (): ISpeechRecognition;
      };
      webkitSpeechRecognition?: {
        new (): ISpeechRecognition;
      };
    }
  
    interface ISpeechRecognition extends EventTarget {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      start(): void;
      stop(): void;
      abort(): void;
      onaudiostart?: (event: Event) => void;
      onsoundstart?: (event: Event) => void;
      onspeechstart?: (event: Event) => void;
      onspeechend?: (event: Event) => void;
      onsoundend?: (event: Event) => void;
      onaudioend?: (event: Event) => void;
      onresult?: (event: SpeechRecognitionEvent) => void;
      onnomatch?: (event: SpeechRecognitionEvent) => void;
      onerror?: (event: SpeechRecognitionErrorEvent) => void;
      onend?: (event: Event) => void; // ✅ This explicitly declares 'onend'
    }
  }
  
  export {};
  
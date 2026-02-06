import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Backend API URL (USB reverse to localhost)
const API_URL = "http://localhost:3000";

// How long to wait after last speech result before auto-sending (ms)
const SILENCE_TIMEOUT = 2000;

// How long to wait for user response after AI asks a question (ms)
const NO_RESPONSE_TIMEOUT = 5000;

// Session ID for tracking
const SESSION_ID = "interview_" + Date.now();

// Interview duration (seconds)
const INTERVIEW_DURATION = 5 * 60;

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ resumeText?: string }>();
  const resumeTextParam = params.resumeText || '';

  const [displayText, setDisplayText] = useState("Initializing interview...");
  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(INTERVIEW_DURATION);
  const [difficultyLevel, setDifficultyLevel] = useState(1);

  // Refs to track state reliably inside callbacks
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noResponseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef("");
  const hasSentRef = useRef(false);
  const startedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listeningRef = useRef(false);
  const interviewEndedRef = useRef(false);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearNoResponseTimer = useCallback(() => {
    if (noResponseTimerRef.current) {
      clearTimeout(noResponseTimerRef.current);
      noResponseTimerRef.current = null;
    }
  }, []);

  const sendTranscript = useCallback(async () => {
    const text = finalTranscriptRef.current.trim();
    if (!text || hasSentRef.current || isSpeakingRef.current || isProcessingRef.current || interviewEndedRef.current) return;

    hasSentRef.current = true;
    clearSilenceTimer();
    clearNoResponseTimer();

    // Stop recognition before sending
    try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
    setListening(false);
    listeningRef.current = false;

    await sendToAI(text);
  }, [clearSilenceTimer, clearNoResponseTimer]);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      sendTranscript();
    }, SILENCE_TIMEOUT);
  }, [clearSilenceTimer, sendTranscript]);

  function endInterview() {
    interviewEndedRef.current = true;
    clearSilenceTimer();
    clearNoResponseTimer();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    Speech.stop();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
    setListening(false);
    listeningRef.current = false;
    if (!isProcessingRef.current) {
      sendToAI("__end__");
    }
  }

  // Full cleanup — stop all speech, timers, and recognition
  const cleanupAll = useCallback(() => {
    interviewEndedRef.current = true;
    clearSilenceTimer();
    clearNoResponseTimer();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    Speech.stop();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
    setListening(false);
    listeningRef.current = false;
  }, [clearSilenceTimer, clearNoResponseTimer]);

  // Initialize interview on mount
  useEffect(() => {
    setStartTime(Date.now());
    setDisplayText("🎤 Tap 'Speak' to begin your interview");
    setRemainingSeconds(INTERVIEW_DURATION);
  }, []);

  // Start countdown timer
  useEffect(() => {
    if (!startTime) return;
    if (timerRef.current) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          endInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [startTime]);

  // Cleanup on unmount (back button, navigation away)
  useEffect(() => {
    return () => {
      interviewEndedRef.current = true;
      clearSilenceTimer();
      clearNoResponseTimer();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      Speech.stop();
      try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
    };
  }, []);

  // Stop everything when user presses back button
  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      interviewEndedRef.current = true;
      clearSilenceTimer();
      clearNoResponseTimer();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      Speech.stop();
      isSpeakingRef.current = false;
      try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
      listeningRef.current = false;
    });
    return unsubscribe;
  }, [navigation]);

  // Auto-start interview by asking first question
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (!isProcessingRef.current && !listeningRef.current && !isSpeakingRef.current) {
      sendToAI("__start__", resumeTextParam ? { resumeText: resumeTextParam } : undefined);
    }
  }, []);

  // ─── Speech Recognition Events ───
  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    listeningRef.current = true;
    finalTranscriptRef.current = "";
    hasSentRef.current = false;
    clearNoResponseTimer();
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    listeningRef.current = false;
    clearSilenceTimer();

    // If we haven't sent yet, send whatever we collected
    if (!hasSentRef.current && finalTranscriptRef.current.trim()) {
      sendTranscript();
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    if (isSpeakingRef.current || isProcessingRef.current || hasSentRef.current) return;

    const transcript = event.results?.[0]?.transcript;
    if (transcript) {
      finalTranscriptRef.current = transcript;
      setDisplayText(transcript);

      // Reset silence timer on every new word
      resetSilenceTimer();
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.log("Speech error:", event.error, event.message);
    setListening(false);
    clearSilenceTimer();
  });

  // ─── Send to AI Backend ───

  const sendToAI = async (message: string, extraBody?: Record<string, any>) => {
    // Block all messages after interview ended, except __end__ and __start__
    if (interviewEndedRef.current && message !== "__end__" && message !== "__start__") return;
    try {
      isProcessingRef.current = true;
      setIsProcessing(true);
      setDisplayText(`You: "${message}"\n\nAI is thinking...`);

      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          sessionId: SESSION_ID,
          ...extraBody,
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        if (message !== "__start__" && message !== "__end__" && message !== "__timeout__") {
          setQuestionCount((prev) => prev + 1);
        }

        // Update difficulty level from backend
        if (data.answerMeta?.difficultyLevel) {
          setDifficultyLevel(data.answerMeta.difficultyLevel);
        }

        if (data.interviewComplete) {
          interviewEndedRef.current = true;
          clearSilenceTimer();
          clearNoResponseTimer();
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          const dur = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
          // Navigate to results immediately — no more questions
          setDisplayText(data.response || 'Interview complete. Redirecting to results...');
          setTimeout(() => {
            Speech.stop();
            router.push({
              pathname: "/results",
              params: {
                finalScore: data.finalScore,
                passed: data.passed ? "true" : "false",
                questionCount: String(questionCount),
                duration: String(dur),
                sessionId: SESSION_ID,
              },
            });
          }, 1500);
          return;
        }

        if (message === "__end__") {
          interviewEndedRef.current = true;
          Speech.stop();
          const dur = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
          router.push({
            pathname: "/results",
            params: {
              finalScore: "0",
              passed: "false",
              questionCount: String(questionCount),
              duration: String(dur),
              sessionId: SESSION_ID,
            },
          });
          return;
        }

        setDisplayText(data.response);
        speakText(data.response);
      } else {
        setDisplayText("Sorry, I couldn't process that. Please try again.");
      }
    } catch (error) {
      console.error("Error calling AI:", error);
      setDisplayText("Connection error. Make sure the backend server is running.");
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // ─── Start / Stop Listening ───

  const startListening = async () => {
    // If AI is speaking, stop it first
    if (isSpeakingRef.current) {
      stopSpeaking();
    }
    clearNoResponseTimer();

    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        setDisplayText("Permission denied. Please allow microphone access.");
        return;
      }

      finalTranscriptRef.current = "";
      hasSentRef.current = false;

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
      });
    } catch (error) {
      console.error("Start listening error:", error);
      setDisplayText("Could not start speech recognition.");
    }
  };

  const stopListening = () => {
    clearSilenceTimer();
    clearNoResponseTimer();
    try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
    setListening(false);
    listeningRef.current = false;

    // Send what we have so far
    if (!hasSentRef.current && finalTranscriptRef.current.trim()) {
      sendTranscript();
    }
  };

  // ─── Text-to-Speech ───

  const speakText = (text: string) => {
    if (interviewEndedRef.current) return;
    try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
    Speech.stop();
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setListening(false);
    listeningRef.current = false;
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.85,
      onDone: () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        // Don't schedule timeout if interview already ended
        if (interviewEndedRef.current) return;
        clearNoResponseTimer();
        noResponseTimerRef.current = setTimeout(() => {
          if (!listeningRef.current && !isProcessingRef.current && !isSpeakingRef.current && !interviewEndedRef.current) {
            sendToAI("__timeout__");
          }
        }, NO_RESPONSE_TIMEOUT);
      },
      onError: () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
      },
    });
  };

  const stopSpeaking = () => {
    Speech.stop();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const resetInterview = async () => {
    try {
      await fetch(`${API_URL}/api/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: SESSION_ID }),
      });
    } catch (_) {
      // Ignore network errors on reset
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    clearNoResponseTimer();
    setQuestionCount(0);
    setStartTime(Date.now());
    setRemainingSeconds(INTERVIEW_DURATION);
    setDisplayText("Tap 🎤 to start a new interview");
  };

  // ─── UI ───

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🎯</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Interview Session</Text>
          <Text style={styles.headerSubtitle}>Professional AI Interviewer</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Text style={styles.statChipText}>Q: {questionCount}</Text>
        </View>
        <View style={[styles.statChip, {
          backgroundColor: difficultyLevel === 1 ? '#D1F4E0' : difficultyLevel === 2 ? '#FFF3CD' : '#FFE5E5',
        }]}>
          <Text style={styles.statChipText}>
            {difficultyLevel === 1 ? '🟢 Easy' : difficultyLevel === 2 ? '🟡 Medium' : '🔴 Hard'}
          </Text>
        </View>
        {resumeTextParam ? (
          <View style={[styles.statChip, { backgroundColor: '#E8F4FD' }]}>
            <Text style={styles.statChipText}>📄 Resume</Text>
          </View>
        ) : null}
        <View style={styles.statChip}>
          <Text style={styles.statChipText}>⏱ {formatTime(remainingSeconds)}</Text>
        </View>
      </View>

      <View style={styles.textBox}>
        <Text style={styles.textOutput}>{displayText}</Text>
      </View>

      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.processingText}>AI is thinking...</Text>
        </View>
      )}

      {listening && (
        <View style={styles.listeningContainer}>
          <Text style={styles.listeningDot}>🔴</Text>
          <Text style={styles.listeningText}>Listening... speak now</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        {/* Mic button */}
        <TouchableOpacity
          style={[
            styles.micButton,
            listening && styles.micButtonActive,
            (isProcessing) && styles.buttonDisabled,
          ]}
          onPress={listening ? stopListening : startListening}
          disabled={isProcessing}
        >
          <Text style={styles.micText}>{listening ? "⏹️" : "🎤"}</Text>
          <Text style={styles.buttonLabel}>{listening ? "Stop" : "Speak"}</Text>
        </TouchableOpacity>

        {/* Stop AI speech */}
        <TouchableOpacity
          style={[
            styles.micButton,
            styles.speakButton,
            isSpeaking && styles.speakButtonActive,
            !isSpeaking && styles.buttonDisabled,
          ]}
          onPress={stopSpeaking}
          disabled={!isSpeaking}
        >
          <Text style={styles.micText}>{isSpeaking ? "🔇" : "🔊"}</Text>
          <Text style={styles.buttonLabel}>{isSpeaking ? "Mute" : "Speaker"}</Text>
        </TouchableOpacity>
      </View>

      
      <Text style={styles.hint}>
        Tap 🎤 → speak → pause 2s → AI responds automatically
      </Text>

      <TouchableOpacity style={styles.resetButton} onPress={resetInterview}>
        <Text style={styles.resetButtonText}>
          Restart Interview
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    marginBottom: 16,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F4FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logoIcon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "stretch",
    marginBottom: 12,
  },
  statChip: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  statChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  textBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: "100%",
    minHeight: 100,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  textOutput: {
    fontSize: 17,
    textAlign: "center",
    color: "#333",
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 16,
  },
  micButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  micButtonActive: {
    backgroundColor: "#FF3B30",
  },
  speakButton: {
    backgroundColor: "#34C759",
  },
  speakButtonActive: {
    backgroundColor: "#FF9500",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  micText: {
    fontSize: 32,
  },
  buttonLabel: {
    fontSize: 11,
    color: "#fff",
    marginTop: 2,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
  },
  resetButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
  },
  processingContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  processingText: {
    marginTop: 8,
    fontSize: 15,
    color: "#007AFF",
  },
  listeningContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  listeningDot: {
    fontSize: 14,
  },
  listeningText: {
    fontSize: 15,
    color: "#FF3B30",
    fontWeight: "500",
  },
});

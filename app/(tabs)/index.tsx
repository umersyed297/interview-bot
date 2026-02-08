import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Professional color palette
const C = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryBg: '#EEF2FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
};

import { API_BASE_URL } from '../../config';
const API_URL = API_BASE_URL;

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
  const params = useLocalSearchParams<{ resumeText?: string; domain?: string }>();
  const resumeTextParam = params.resumeText || '';
  const domainParam = params.domain || 'general';

  const [displayText, setRawDisplayText] = useState("Initializing interview...");

  // Sanitize text: strip literal \n sequences and clean up whitespace
  const setDisplayText = (text: string) => {
    const cleaned = text
      .replace(/\\n/g, ' ')                    // literal backslash-n in string
      .replace(/(?:^|[^\\])('n)/g, ' ')        // stray 'n from bad encoding
      .replace(/\n{3,}/g, '\n\n')              // collapse excessive newlines
      .replace(/  +/g, ' ')                     // collapse double spaces
      .trim();
    setRawDisplayText(cleaned);
  };
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
    safeStopRecognition();
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
    try { Speech.stop(); } catch (_) {}
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
    try { Speech.stop(); } catch (_) {}
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

  // Safe wrapper for speech recognition stop
  const safeStopRecognition = useCallback(() => {
    try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
  }, []);

  const safeSpeechStop = useCallback(() => {
    try { Speech.stop(); } catch (_) {}
  }, []);

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
      safeSpeechStop();
      safeStopRecognition();
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
      safeSpeechStop();
      isSpeakingRef.current = false;
      safeStopRecognition();
      listeningRef.current = false;
    });
    return unsubscribe;
  }, [navigation]);

  // Auto-start interview by asking first question
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (!isProcessingRef.current && !listeningRef.current && !isSpeakingRef.current) {
      const startPayload: Record<string, any> = {};
      if (resumeTextParam) startPayload.resumeText = resumeTextParam;
      if (domainParam && domainParam !== 'general') startPayload.domain = domainParam;
      sendToAI("__start__", Object.keys(startPayload).length > 0 ? startPayload : undefined);
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
            try { Speech.stop(); } catch (_) {}
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
          try { Speech.stop(); } catch (_) {}
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

      try {
        ExpoSpeechRecognitionModule.start({
          lang: "en-US",
          interimResults: true,
          continuous: false,
        });
      } catch (e) {
        console.log('Speech recognition start error:', e);
        setDisplayText("Speech recognition not available. Please try again.");
        return;
      }
    } catch (error) {
      console.error("Start listening error:", error);
      setDisplayText("Could not start speech recognition.");
    }
  };

  const stopListening = () => {
    clearSilenceTimer();
    clearNoResponseTimer();
    safeStopRecognition();
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
    try { Speech.stop(); } catch (_) {}
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
    try { Speech.stop(); } catch (_) {}
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const resetInterview = async () => {
    // Immediately stop all speech & recognition
    try { Speech.stop(); } catch (_) {}
    try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setListening(false);
    listeningRef.current = false;
    isProcessingRef.current = false;
    setIsProcessing(false);
    interviewEndedRef.current = false;
    hasSentRef.current = false;
    finalTranscriptRef.current = '';
    startedRef.current = false;

    // Clear all timers
    clearSilenceTimer();
    clearNoResponseTimer();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset backend session
    try {
      await fetch(`${API_URL}/api/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: SESSION_ID }),
      });
    } catch (_) {}

    // Reset UI state
    setQuestionCount(0);
    setDifficultyLevel(1);
    setStartTime(Date.now());
    setRemainingSeconds(INTERVIEW_DURATION);
    setDisplayText("Starting new interview...");

    // Re-start the interview
    setTimeout(() => {
      startedRef.current = true;
      const startPayload: Record<string, any> = {};
      if (resumeTextParam) startPayload.resumeText = resumeTextParam;
      if (domainParam && domainParam !== 'general') startPayload.domain = domainParam;
      sendToAI("__start__", Object.keys(startPayload).length > 0 ? startPayload : undefined);
    }, 300);
  };

  // Pulse animation for listening state
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (listening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [listening]);

  // ─── UI ───

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeIn }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🎯</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Interview Session</Text>
          </View>
          <View style={styles.timerChip}>
            <Text style={[styles.timerText, remainingSeconds < 60 && { color: C.danger }]}>⏱ {formatTime(remainingSeconds)}</Text>
          </View>
        </View>

        {/* Status bar */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statChipLabel}>Questions</Text>
            <Text style={styles.statChipValue}>{questionCount}</Text>
          </View>
          <View style={[styles.statChip, {
            backgroundColor: difficultyLevel === 1 ? C.successLight : difficultyLevel === 2 ? C.warningLight : C.dangerLight,
          }]}>
            <Text style={styles.statChipLabel}>Level</Text>
            <Text style={styles.statChipValue}>
              {difficultyLevel === 1 ? 'Easy' : difficultyLevel === 2 ? 'Medium' : 'Hard'}
            </Text>
          </View>
          {resumeTextParam ? (
            <View style={[styles.statChip, { backgroundColor: C.primaryBg }]}>
              <Text style={styles.statChipLabel}>Mode</Text>
              <Text style={styles.statChipValue}>Resume</Text>
            </View>
          ) : null}
          {domainParam && domainParam !== 'general' ? (
            <View style={[styles.statChip, { backgroundColor: '#F3E8FF' }]}>
              <Text style={styles.statChipLabel}>Domain</Text>
              <Text style={styles.statChipValue}>{domainParam.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()).split(' ').slice(0, 2).join(' ')}</Text>
            </View>
          ) : null}
        </View>

        {/* AI Text Box */}
        <View style={styles.textBox}>
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={styles.processingText}>AI is thinking...</Text>
            </View>
          ) : (
            <Text style={styles.textOutput}>{displayText}</Text>
          )}
        </View>

        {/* Listening Indicator */}
        {listening && (
          <View style={styles.listeningContainer}>
            <View style={styles.listeningDotBg}>
              <View style={styles.listeningDotInner} />
            </View>
            <Text style={styles.listeningText}>Listening... speak now</Text>
          </View>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Mic Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.hint}>
            Tap mic to speak · Pauses auto-send after 2s
          </Text>
          <View style={styles.buttonRow}>
            {/* Mute AI */}
            <TouchableOpacity
              style={[
                styles.sideButton,
                !isSpeaking && styles.sideButtonDisabled,
              ]}
              onPress={stopSpeaking}
              disabled={!isSpeaking}
              activeOpacity={0.7}
            >
              <Text style={styles.sideButtonIcon}>{isSpeaking ? '🔇' : '🔊'}</Text>
              <Text style={styles.sideButtonLabel}>{isSpeaking ? 'Mute' : 'Speaker'}</Text>
            </TouchableOpacity>

            {/* Main Mic Button */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.micButton,
                  listening && styles.micButtonActive,
                  isProcessing && styles.buttonDisabled,
                ]}
                onPress={listening ? stopListening : startListening}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                <Text style={styles.micText}>{listening ? '⏹️' : '🎤'}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Restart */}
            <TouchableOpacity
              style={styles.sideButton}
              onPress={resetInterview}
              activeOpacity={0.7}
            >
              <Text style={styles.sideButtonIcon}>🔄</Text>
              <Text style={styles.sideButtonLabel}>Restart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  logoCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoIcon: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
  },
  timerChip: {
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  statChip: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statChipLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statChipValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
  },
  textBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    minHeight: 120,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
  },
  textOutput: {
    fontSize: 16,
    textAlign: 'center',
    color: C.textPrimary,
    lineHeight: 24,
  },
  processingContainer: {
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '500',
  },
  listeningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  listeningDotBg: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.danger,
  },
  listeningText: {
    fontSize: 14,
    color: C.danger,
    fontWeight: '600',
  },
  controlsSection: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  hint: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  micButtonActive: {
    backgroundColor: C.danger,
    shadowColor: C.danger,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  micText: {
    fontSize: 30,
  },
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  sideButtonDisabled: {
    opacity: 0.35,
  },
  sideButtonIcon: {
    fontSize: 20,
  },
  sideButtonLabel: {
    fontSize: 9,
    color: C.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
});

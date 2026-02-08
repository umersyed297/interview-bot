import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const loaderWidth = useRef(new Animated.Value(0)).current;
  const copyrightOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  // Dot animations for loader
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // Orbiting particles
  const orbit1 = useRef(new Animated.Value(0)).current;
  const orbit2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Orbiting particles animation
    Animated.loop(
      Animated.timing(orbit1, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(orbit2, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.8,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Main animation sequence
    Animated.sequence([
      // 1. Logo appears with spring + rotation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),

      // 2. Pulse the logo
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),

      // 3. Title slides in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // small delay
      Animated.delay(150),

      // 4. Subtitle fades in
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),

      // 5. Loader appears & progresses
      Animated.parallel([
        Animated.timing(loaderOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(copyrightOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 6. Loading bar fills
      Animated.timing(loaderWidth, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),

      // Brief hold
      Animated.delay(300),
    ]).start(() => {
      router.replace('/welcome');
    });

    // Bouncing dots animation
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -8,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, []);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  const orbit1Rotate = orbit1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const orbit2Rotate = orbit2.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.bgGradient1} />
      <View style={styles.bgGradient2} />

      {/* Logo area */}
      <View style={styles.logoContainer}>
        {/* Orbiting ring 1 */}
        <Animated.View
          style={[
            styles.orbitRing,
            styles.orbitRing1,
            { transform: [{ rotate: orbit1Rotate }] },
          ]}
        >
          <View style={styles.orbitDot} />
        </Animated.View>

        {/* Orbiting ring 2 */}
        <Animated.View
          style={[
            styles.orbitRing,
            styles.orbitRing2,
            { transform: [{ rotate: orbit2Rotate }] },
          ]}
        >
          <View style={[styles.orbitDot, styles.orbitDot2]} />
        </Animated.View>

        {/* Glow effect */}
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

        {/* Main logo */}
        <Animated.View
          style={[
            styles.logoCircle,
            {
              transform: [
                { scale: Animated.multiply(logoScale, pulseAnim) },
                { rotate: spin },
              ],
            },
          ]}
        >
          {/* AI Brain Icon using View-based graphics */}
          <View style={styles.brainIcon}>
            <View style={styles.brainHead}>
              <View style={styles.circuitCenter} />
              <View style={styles.circuitRing} />
              <View style={styles.circuitLine1} />
              <View style={styles.circuitLine2} />
              <View style={styles.circuitLine3} />
              <View style={styles.circuitDot1} />
              <View style={styles.circuitDot2} />
            </View>
            <View style={styles.brainBase}>
              <View style={styles.baseLine1} />
              <View style={styles.baseLine2} />
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Title */}
      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleSlide }],
        }}
      >
        <Text style={styles.title}>AI Interviewer</Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={{ opacity: subtitleOpacity }}>
        <Text style={styles.subtitle}>Your Smart Interview Coach</Text>
      </Animated.View>

      {/* Loading section */}
      <Animated.View style={[styles.loaderSection, { opacity: loaderOpacity }]}>
        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: loaderWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Loading dots */}
        <View style={styles.dotsContainer}>
          <Text style={styles.loadingText}>Loading</Text>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.Text
              key={i}
              style={[styles.dot, { transform: [{ translateY: dot }] }]}
            >
              .
            </Animated.Text>
          ))}
        </View>
      </Animated.View>

      {/* Copyright */}
      <Animated.View style={[styles.copyright, { opacity: copyrightOpacity }]}>
        <Text style={styles.copyrightText}>
          {'\u00A9'} 2026 All Rights Reserved
        </Text>
        <Text style={styles.copyrightName}>Syed Umer</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgGradient1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#4F46E5',
    opacity: 0.08,
  },
  bgGradient2: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#818CF8',
    opacity: 0.06,
  },
  logoContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  orbitRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  orbitRing1: {
    width: 150,
    height: 150,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  orbitRing2: {
    width: 130,
    height: 130,
    borderColor: 'rgba(129, 140, 248, 0.15)',
  },
  orbitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#818CF8',
    marginLeft: -3,
  },
  orbitDot2: {
    backgroundColor: '#6366F1',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: -2.5,
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  brainIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brainHead: {
    width: 40,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circuitCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
    position: 'absolute',
    top: 12,
  },
  circuitRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    position: 'absolute',
    top: 7,
    opacity: 0.6,
  },
  circuitLine1: {
    width: 1.5,
    height: 12,
    backgroundColor: '#6366F1',
    position: 'absolute',
    top: 22,
    opacity: 0.5,
  },
  circuitLine2: {
    width: 12,
    height: 1.5,
    backgroundColor: '#6366F1',
    position: 'absolute',
    top: 16,
    left: 4,
    opacity: 0.5,
  },
  circuitLine3: {
    width: 10,
    height: 1.5,
    backgroundColor: '#6366F1',
    position: 'absolute',
    top: 12,
    right: 4,
    transform: [{ rotate: '35deg' }],
    opacity: 0.5,
  },
  circuitDot1: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366F1',
    position: 'absolute',
    top: 16,
    left: 3,
    opacity: 0.7,
  },
  circuitDot2: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366F1',
    position: 'absolute',
    top: 10,
    right: 3,
    opacity: 0.7,
  },
  brainBase: {
    width: 28,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  baseLine1: {
    width: 16,
    height: 1.2,
    backgroundColor: '#4F46E5',
    opacity: 0.3,
    position: 'absolute',
    top: 3,
  },
  baseLine2: {
    width: 12,
    height: 1.2,
    backgroundColor: '#4F46E5',
    opacity: 0.3,
    position: 'absolute',
    top: 6,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 48,
  },
  loaderSection: {
    alignItems: 'center',
    width: width * 0.55,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 1,
  },
  dot: {
    fontSize: 18,
    color: '#6366F1',
    fontWeight: '700',
    marginLeft: 1,
  },
  copyright: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: '#475569',
    letterSpacing: 0.5,
  },
  copyrightName: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});

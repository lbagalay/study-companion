import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';

import { AssistantComposer } from './AssistantComposer';
import { AssistantHistoryList } from './AssistantHistoryList';
import { AssistantMessages } from './AssistantMessages';
import { useAssistant } from './AssistantProvider';
import { BearAvatar } from './BearAvatar';
import { SuggestedPrompts } from './SuggestedPrompts';

type SheetView = 'chat' | 'history';

const DEFAULT_PROMPTS = [
  "What's important today?",
  'Explain what I’m viewing',
  'What is due this week?',
];

/** Per-screen prompts so the welcome view feels relevant instead of generic everywhere. */
const PROMPTS_BY_CONTEXT: Partial<Record<string, string[]>> = {
  home: ["What's important today?", 'What is due next?', 'Do I have anything urgent?'],
  schedule: ['What do I have tomorrow?', 'When is my next free period?', "What's my busiest day?"],
  task: ['Which should I do first?', 'What is overdue?', "What's due this week?"],
  assessment: ['What should I study first?', 'How much time until this?', 'Quiz me on this'],
  pdf: ['Explain this page.', 'Summarize this section.', 'Quiz me from this.'],
  note: ['Summarize these notes.', 'Make flashcards.', 'Create practice questions.'],
};

const KNOWN_ROUTE_LABELS: Record<string, string> = {
  '/home': 'Home',
  '/schedule': 'Schedule',
  '/tasks': 'Tasks',
  '/study': 'Study',
  '/profile': 'Profile',
};

function friendlyRouteLabel(pathname: string) {
  if (KNOWN_ROUTE_LABELS[pathname]) return KNOWN_ROUTE_LABELS[pathname];

  const first = pathname.split('/').filter(Boolean)[0];
  if (!first) return 'Study Companion';

  return first.charAt(0).toUpperCase() + first.slice(1).replace(/-/g, ' ');
}

export function AssistantSheet() {
  const {
    closeSheet,
    messages,
    open,
    openConversation,
    route,
    screenContext,
    send,
    sending,
    startNewChat,
  } = useAssistant();
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [slide] = useState(() => new Animated.Value(0));
  const [view, setView] = useState<SheetView>('chat');

  useEffect(() => {
    if (!open) return;

    Animated.timing(slide, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [open, slide]);

  useEffect(() => {
    if (!open) slide.setValue(0);
  }, [open, slide]);

  useEffect(() => {
    if (open && view === 'chat')
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length, open, view]);

  if (!open) return null;

  const selectConversation = async (id: string) => {
    try {
      await openConversation(id);
      setView('chat');
    } catch (error) {
      Alert.alert('Could not open conversation', getErrorMessage(error));
    }
  };

  const handleClose = () => {
    setView('chat');
    closeSheet();
  };

  const subtitle =
    view === 'history'
      ? 'Conversation history'
      : `Viewing: ${screenContext?.label ?? friendlyRouteLabel(route)}`;

  const welcomePrompts =
    (screenContext?.type ? PROMPTS_BY_CONTEXT[screenContext.type] : undefined) ?? DEFAULT_PROMPTS;

  return (
    <View style={styles.overlay}>
      <Pressable
        accessibilityLabel="Close Study Assistant"
        onPress={handleClose}
        style={styles.backdrop}
      />

      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
            paddingBottom: Math.max(spacing.md, insets.bottom),
            transform: [
              {
                translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }),
              },
            ],
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <BearAvatar size={36} variant="avatar" />

            <View style={styles.headerCopy}>
              <Text style={[styles.headerTitle, { color: palette.text }]}>Study Assistant</Text>
              <Text numberOfLines={1} style={[styles.headerSubtitle, { color: palette.textMuted }]}>
                {subtitle}
              </Text>
            </View>

            {view === 'history' ? (
              <Pressable accessibilityLabel="Back to chat" onPress={() => setView('chat')}>
                <Ionicons color={palette.textMuted} name="arrow-back" size={22} />
              </Pressable>
            ) : (
              <Pressable
                accessibilityLabel="View conversation history"
                onPress={() => setView('history')}
              >
                <Ionicons color={palette.textMuted} name="time-outline" size={22} />
              </Pressable>
            )}

            {view === 'chat' && messages.length ? (
              <Pressable accessibilityLabel="Start a new chat" onPress={startNewChat}>
                <Ionicons color={palette.textMuted} name="add-circle-outline" size={22} />
              </Pressable>
            ) : null}

            <Pressable accessibilityLabel="Close" onPress={handleClose}>
              <Ionicons color={palette.textMuted} name="close" size={22} />
            </Pressable>
          </View>

          {view === 'chat' && screenContext ? (
            <View style={styles.chipRow}>
              <View style={[styles.chip, { backgroundColor: palette.accentSoft }]}>
                <Text style={[styles.chipText, { color: palette.text }]} numberOfLines={1}>
                  {screenContext.label ?? friendlyRouteLabel(route)}
                </Text>
              </View>

              {screenContext.page ? (
                <View style={[styles.chip, { backgroundColor: palette.accentSoft }]}>
                  <Text style={[styles.chipText, { color: palette.text }]}>
                    {`Page ${screenContext.page}`}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.messagesContent}
            ref={scrollRef}
            style={styles.messages}
          >
            {view === 'history' ? (
              <AssistantHistoryList onSelect={(id) => void selectConversation(id)} />
            ) : messages.length ? (
              <AssistantMessages messages={messages} />
            ) : (
              <View style={styles.welcome}>
                <BearAvatar size={64} variant="full" />

                <Text style={[styles.welcomeText, { color: palette.text }]}>
                  Hi! What can I help you with?
                </Text>

                <SuggestedPrompts onSelect={send} prompts={welcomePrompts} />
              </View>
            )}
          </ScrollView>

          {view === 'chat' ? (
            <View style={styles.composerWrap}>
              <AssistantComposer onSend={send} sending={sending} />
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  backdrop: {
    backgroundColor: 'rgba(14, 27, 72, 0.32)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  panel: {
    alignSelf: 'center',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    boxShadow: '0 -12px 32px rgba(14, 27, 72, 0.22)',
    bottom: 0,
    maxHeight: '82%',
    maxWidth: 640,
    overflow: 'hidden',
    position: 'absolute',
    width: '100%',
  },
  keyboardView: {
    flexShrink: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    lineHeight: 20,
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 11,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: {
    ...typography.caption,
    fontSize: 11,
  },
  messages: {
    flexGrow: 0,
  },
  messagesContent: {
    gap: spacing.md,
    padding: spacing.md,
  },
  welcome: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  welcomeText: {
    ...typography.sectionTitle,
    fontSize: 16,
    textAlign: 'center',
  },
  composerWrap: {
    borderTopColor: 'rgba(0,0,0,0.06)',
    borderTopWidth: 1,
    padding: spacing.md,
  },
});

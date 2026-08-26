import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

import { AssistantActionCard } from './AssistantActionCard';
import { BearAvatar } from './BearAvatar';
import type { ChatMessage } from './AssistantProvider';

const DOT_STAGGER_MS = 150;
const DOT_BOUNCE_MS = 300;

/**
 * Splits a line on `**bold**` and `*italic*` spans so they render as actual
 * styling instead of literal asterisks. The bold pattern is tried first in
 * the alternation so `**text**` matches as one bold span rather than being
 * torn into stray single asterisks around an italic match.
 */
function renderInline(line: string, color: string) {
  const segments = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);

  return segments.map((segment, index) => {
    const bold = segment.match(/^\*\*([^*]+)\*\*$/);
    const italic = !bold ? segment.match(/^\*([^*]+)\*$/) : null;

    return (
      <Text
        key={index}
        style={[
          styles.bubbleText,
          { color },
          bold ? styles.bold : null,
          italic ? styles.italic : null,
        ]}
      >
        {bold ? bold[1] : italic ? italic[1] : segment}
      </Text>
    );
  });
}

/**
 * Gemini writes in markdown (bold, `-`/`*` bullets, numbered lists), but
 * chat bubbles are plain <Text> — without this, the student sees literal
 * asterisks instead of formatting. Handles the handful of constructs the
 * assistant actually uses; not a general markdown renderer.
 */
function FormattedText({ content, color }: { content: string; color: string }) {
  const lines = content.split('\n');

  return (
    <>
      {lines.map((line, index) => {
        const bullet = line.match(/^\s*[-*]\s+(.*)$/);
        const numbered = line.match(/^\s*(\d+[.)])\s+(.*)$/);

        if (bullet) {
          return (
            <View key={index} style={styles.listRow}>
              <Text style={[styles.bubbleText, { color }]}>{'• '}</Text>
              <Text style={[styles.bubbleText, styles.listContent]}>
                {renderInline(bullet[1], color)}
              </Text>
            </View>
          );
        }

        if (numbered) {
          return (
            <View key={index} style={styles.listRow}>
              <Text style={[styles.bubbleText, { color }]}>{`${numbered[1]} `}</Text>
              <Text style={[styles.bubbleText, styles.listContent]}>
                {renderInline(numbered[2], color)}
              </Text>
            </View>
          );
        }

        if (!line.trim()) {
          return <View key={index} style={styles.blankLine} />;
        }

        return (
          <Text key={index} style={styles.bubbleText}>
            {renderInline(line, color)}
          </Text>
        );
      })}
    </>
  );
}

function ThinkingDots({ color }: { color: string }) {
  const [dots] = useState(() => [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  useEffect(() => {
    const loops = dots.map((dot) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: DOT_BOUNCE_MS, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: DOT_BOUNCE_MS, useNativeDriver: true }),
        ]),
      ),
    );

    // Same period per dot, just started at staggered times, keeps a steady
    // wave instead of drifting the way per-loop delays would.
    const timers = loops.map((loop, index) =>
      setTimeout(() => loop.start(), index * DOT_STAGGER_MS),
    );

    return () => {
      timers.forEach(clearTimeout);
      loops.forEach((loop) => loop.stop());
    };
  }, [dots]);

  return (
    <View style={styles.dotsRow}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: color,
              opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [
                { translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function AssistantMessages({ messages }: { messages: ChatMessage[] }) {
  const palette = useAppTheme();

  return (
    <View style={styles.list}>
      {messages.map((item) => {
        const isUser = item.role === 'user';
        const isThinking = !isUser && !item.content && !item.failed;

        return (
          <View key={item.id} style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
            {isUser ? null : <BearAvatar size={26} variant="avatar" />}

            <View
              style={[
                styles.bubble,
                isUser
                  ? { backgroundColor: palette.accentSolid }
                  : {
                      backgroundColor: item.failed ? palette.accentSoft : palette.surface,
                      borderColor: palette.border,
                      borderWidth: 1,
                    },
              ]}
            >
              {isThinking ? (
                <ThinkingDots color={palette.textMuted} />
              ) : isUser || item.failed ? (
                <Text style={[styles.bubbleText, { color: isUser ? '#FFFFFF' : palette.danger }]}>
                  {item.content}
                </Text>
              ) : (
                <FormattedText content={item.content} color={palette.text} />
              )}

              {item.action ? (
                <AssistantActionCard action={item.action} messageId={item.id} />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  bubble: {
    borderRadius: radii.lg,
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  listRow: {
    flexDirection: 'row',
  },
  listContent: {
    flex: 1,
  },
  blankLine: {
    height: spacing.xs,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 3,
  },
  dot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
});

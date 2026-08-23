'use client';

import { Body, Row, SectionTitle, Text, YStack } from '@gymos/ui';
import { parseMarkdownSubset, type ParsedSegment } from './markdown-subset';

const Segments = ({ segments }: { segments: ParsedSegment[] }) => (
  <Text>
    {segments.map((seg, i) => (
      <Text
        key={i}
        fontWeight={seg.bold ? '700' : undefined}
        fontStyle={seg.italic ? 'italic' : undefined}
      >
        {seg.text}
      </Text>
    ))}
  </Text>
);

/** Live preview — renders the markdown subset with existing Tamagui primitives, not a DOM/HTML pipeline. */
export const MarkdownSubsetPreview = ({ text }: { text: string }) => {
  const lines = parseMarkdownSubset(text);
  return (
    <YStack gap="$2">
      {lines.map((line, i) => {
        if (line.kind === 'blank') return <YStack key={i} height={8} />;
        if (line.kind === 'heading') {
          return (
            <SectionTitle key={i}>
              <Segments segments={line.segments} />
            </SectionTitle>
          );
        }
        if (line.kind === 'bullet') {
          return (
            <Row key={i} gap="$2" justifyContent="flex-start">
              <Body>•</Body>
              <Body flex={1}>
                <Segments segments={line.segments} />
              </Body>
            </Row>
          );
        }
        return (
          <Body key={i}>
            <Segments segments={line.segments} />
          </Body>
        );
      })}
    </YStack>
  );
};

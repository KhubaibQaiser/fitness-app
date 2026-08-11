'use client';

import { useCallback, useRef, useState, type ComponentType, type Ref } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import RNWebView from 'react-native-webview';
import { GhostButton, Muted, XStack, YStack } from '@gymos/ui';

type SignaturePadProps = {
  onChange: (pngBase64: string | null) => void;
};

type WebViewMessageEvent = { nativeEvent: { data: string } };

type WebViewProps = {
  key?: number;
  ref?: Ref<unknown>;
  originWhitelist?: string[];
  source?: { html: string };
  onMessage?: (event: WebViewMessageEvent) => void;
  style?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  javaScriptEnabled?: boolean;
  androidLayerType?: string;
};

/** RN WebView typings are `never` under some version pairs — cast for Metro native only. */
const WebView = RNWebView as unknown as ComponentType<WebViewProps>;

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; background: #fff; overflow: hidden; }
  canvas { display: block; width: 100%; height: 140px; touch-action: none; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 320;
    const height = 140;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };
  resize();
  const point = (e) => {
    const t = e.touches && e.touches[0] ? e.touches[0] : e;
    const rect = canvas.getBoundingClientRect();
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };
  const emit = () => {
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1] || '';
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stroke', base64 }));
  };
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    drawing = true;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }, { passive: false });
  canvas.addEventListener('touchend', () => {
    if (!drawing) return;
    drawing = false;
    emit();
  });
  window.clearPad = () => {
    resize();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'clear' }));
  };
</script>
</body>
</html>`;

/** Native signature pad via WebView canvas — same PNG base64 contract as web. */
export const SignaturePad = ({ onChange }: SignaturePadProps) => {
  const webRef = useRef<unknown>(null);
  const [key, setKey] = useState(0);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as {
          type: string;
          base64?: string;
        };
        if (payload.type === 'clear') {
          onChange(null);
          return;
        }
        if (payload.type === 'stroke') {
          onChange(payload.base64 && payload.base64.length > 0 ? payload.base64 : null);
        }
      } catch {
        // ignore malformed messages
      }
    },
    [onChange],
  );

  const clear = () => {
    setKey((k) => k + 1);
    onChange(null);
  };

  return (
    <YStack gap="$2" width="100%">
      <Muted>Sign below with finger</Muted>
      <YStack
        height={140}
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius={12}
        overflow="hidden"
        backgroundColor="#ffffff"
      >
        <WebView
          key={key}
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: HTML }}
          onMessage={onMessage}
          style={styles.web}
          scrollEnabled={false}
          javaScriptEnabled
          androidLayerType="hardware"
        />
      </YStack>
      <XStack justifyContent="flex-end">
        <GhostButton onPress={clear}>Clear</GhostButton>
      </XStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#ffffff' },
});

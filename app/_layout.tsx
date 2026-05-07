import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { initDB } from '../db/database';
import '../i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
      } catch (e) {
        console.error('DB init error:', e);
      } finally {
        setReady(true);
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

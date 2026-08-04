import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.body}>Do not enter patient-identifiable or protected health information (PHI) into this app.</Text>
        <Text style={styles.body}>The default repository implementation does not include third-party analytics or crash reporting SDKs.</Text>
        <Text style={styles.body}>This app is intended for informational code lookup and administrative workflows.</Text>
        <Text style={styles.body}>Canonical legal text: PRIVACY_POLICY.md in the repository root.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f7f9' },
  page: { padding: 16, gap: 12 },
  backBtn: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  backBtnText: { color: '#0f172a', fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  body: { fontSize: 13, color: '#334155', lineHeight: 20 },
});

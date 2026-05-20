import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.body}>Informational use only. This app does not provide medical advice, diagnosis, treatment recommendations, or prescribing guidance.</Text>
        <Text style={styles.body}>No warranty is provided regarding accuracy, completeness, or timeliness.</Text>
        <Text style={styles.body}>To the maximum extent permitted by law, maintainers and contributors are not liable for losses from use or reliance.</Text>
        <Text style={styles.body}>Prohibited use includes PHI entry, unsupervised clinical decision-making, and redistribution of restricted terminology content.</Text>
        <Text style={styles.body}>Canonical legal text: TERMS_OF_SERVICE.md in the repository root.</Text>
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

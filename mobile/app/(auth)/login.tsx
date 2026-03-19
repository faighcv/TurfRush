import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { C } from '@/lib/colors';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.login(email.trim(), password);
      setAuth(token, user);
      router.replace('/(tabs)/map');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('faig@demo.com');
    setPassword('demo1234');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.title}>TurfRush</Text>
          <Text style={styles.subtitle}>Own your city, block by block</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={C.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={C.textDim}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={loading}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            {loading
              ? <ActivityIndicator color={C.bg} />
              : <Text style={styles.primaryText}>Sign In</Text>
            }
          </Pressable>

          <Pressable
            onPress={fillDemo}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.secondaryText}>Use Demo Account</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>No account? </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable>
                <Text style={[styles.footerText, { color: C.accent }]}>Sign up free</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.accent + '20',
    borderWidth: 1, borderColor: C.accent + '50',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 8,
  },
  logoIcon: { fontSize: 36 },
  title: { fontSize: 36, fontWeight: '900', color: C.text, letterSpacing: -1 },
  subtitle: { color: C.textMuted, marginTop: 6, fontSize: 14 },
  form: { gap: 4 },
  label: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  input: {
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 16,
    color: C.text, fontSize: 16,
  },
  error: {
    color: C.red, fontSize: 13, marginTop: 12,
    backgroundColor: C.red + '15',
    padding: 12, borderRadius: 10,
  },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 24,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 6,
  },
  primaryText: { color: C.bg, fontWeight: '800', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 16, padding: 16,
    alignItems: 'center', marginTop: 10,
    borderWidth: 1, borderColor: C.border,
  },
  secondaryText: { color: C.textMuted, fontWeight: '600', fontSize: 15 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: C.textMuted, fontSize: 14 },
});

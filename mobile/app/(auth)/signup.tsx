import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { C } from '@/lib/colors';

export default function SignupScreen() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.register(form.username.trim(), form.email.trim(), form.password);
      setAuth(token, user);
      router.replace('/(tabs)/map');
    } catch (e: any) {
      const msgs = e.response?.data?.errors;
      setError(msgs ? msgs.map((m: any) => m.msg).join(', ') : (e.response?.data?.error || 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoBox}><Text style={styles.logoIcon}>⚡</Text></View>
          <Text style={styles.title}>Join TurfRush</Text>
          <Text style={styles.subtitle}>Stake your claim on the city</Text>
        </View>

        <View style={styles.form}>
          {(['username', 'email', 'password'] as const).map(field => (
            <View key={field} style={{ marginBottom: 16 }}>
              <Text style={styles.label}>{field.toUpperCase()}</Text>
              <TextInput
                style={styles.input}
                value={form[field]}
                onChangeText={set(field)}
                placeholder={field === 'username' ? 'coolrunner' : field === 'email' ? 'you@example.com' : '••••••••'}
                placeholderTextColor={C.textDim}
                secureTextEntry={field === 'password'}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={field === 'email' ? 'email-address' : 'default'}
              />
            </View>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={loading}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            {loading
              ? <ActivityIndicator color={C.bg} />
              : <Text style={styles.primaryText}>Create Account</Text>
            }
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already playing? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable><Text style={[styles.footerText, { color: C.accent }]}>Sign in</Text></Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: C.accent + '20', borderWidth: 1, borderColor: C.accent + '50',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoIcon: { fontSize: 32 },
  title: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  subtitle: { color: C.textMuted, marginTop: 6, fontSize: 14 },
  form: {},
  label: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  input: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 16, color: C.text, fontSize: 16,
  },
  error: {
    color: C.red, fontSize: 13, marginBottom: 12,
    backgroundColor: C.red + '15', padding: 12, borderRadius: 10,
  },
  primaryBtn: {
    backgroundColor: C.accent, borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 8,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 6,
  },
  primaryText: { color: C.bg, fontWeight: '800', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: C.textMuted, fontSize: 14 },
});

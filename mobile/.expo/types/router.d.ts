/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)/login` | `/(auth)/signup` | `/(tabs)` | `/(tabs)/dashboard` | `/(tabs)/leaderboard` | `/(tabs)/map` | `/(tabs)/profile` | `/_sitemap` | `/dashboard` | `/leaderboard` | `/login` | `/map` | `/profile` | `/signup`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}

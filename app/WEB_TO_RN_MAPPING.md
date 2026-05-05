# Phase 2 — Web → React Native mapping

Reference for migrating `@client` patterns to the `@app` mobile codebase.

## Layout & primitives

| Web (React DOM) | React Native | Notes |
|-----------------|--------------|--------|
| `div`, `section`, `main`, `article`, `header`, `footer` | `View` | Non-text containers only. |
| `span`, `p`, `h1`–`h6`, `label`, list text | `Text` | All visible strings must be inside `Text`. |
| `img` | `Image` (RN) or `expo-image` `Image` | Use `source={{ uri }}` or `require()`. |
| `button`, `a` (click) | `Pressable` or `TouchableOpacity` | Prefer `Pressable` for hitSlop/accessibility. |
| `input`, `textarea` | `TextInput` | Use `multiline` for textarea. |
| `select` | `Picker` / `@react-native-picker/picker` or custom modal | Not used yet in `app`. |
| `form` | `View` + submit handler | No native `<form>`; validate in JS. |

## Styling

| Web | React Native |
|-----|----------------|
| CSS / SCSS / Tailwind | `StyleSheet.create()` / inline `style` objects |
| `className` | No — use `style={styles.x}` |
| `flex`, `margin`, `padding` | Same concept; no shorthand gaps on older RN (use `gap` on RN 0.71+). |
| `position: fixed` | Often `position: 'absolute'` + `SafeAreaView` / headers |
| `hover`, `:focus` | Use `Pressable` `pressed` state or `Platform` |

## Navigation

| Web (`react-router-dom`) | Mobile (`@react-navigation/*`) |
|--------------------------|----------------------------------|
| `<BrowserRouter>` | `NavigationContainer` (in `src/App.tsx`) |
| `<Routes>` / `<Route>` | Stack / Tab / Drawer navigators |
| `<Navigate to="…">` | `navigation.navigate`, `navigation.replace`, conditional render in `RootNavigator` |
| `useNavigate()` | `useNavigation()` → `navigate`, `goBack`, `replace` |
| `useParams()` / `useSearchParams()` | `useRoute().params` + linking config if needed |
| `/seller/orders/:id` | Stack screen with `orderId` in params (e.g. seller `orderDetail`) |

### Route parity (this repo)

| Web path (client `App.tsx`) | RN screen / navigator |
|-----------------------------|------------------------|
| `/` … buyer storefront | `Shop` → `BuyerTabs` → `Home` |
| `/auth`, `/login` | Modal `AuthModal` → `AuthNavigator` → `Auth` |
| `/checkout` | `BuyerNavigator` → `Checkout` |
| `/seller/*` | `SellerNavigator` (drawer) |
| `/admin/*` | `AdminNavigator` (drawer) |

## State & data

| Web | Mobile (`app`) |
|-----|------------------|
| `localStorage` | `@react-native-async-storage/async-storage` |
| `sessionStorage` | AsyncStorage or in-memory (e.g. unpaid order ids) |
| `window.location` / redirects | `Linking`, `expo-web-browser`, `navigation.replace` |
| `document`, `window` | Avoid — use RN/Expo APIs |

## APIs (unchanged contract)

- **Axios** (`src/services/api.ts`): products, orders, shipping, payments — same paths as `client/src/services/api.ts`.
- **Fetch** (`src/lib/api.ts`): profile, auth, admin — same as `client/src/lib/api.ts`; auth header via `authMemory` + AsyncStorage hydration.

## Assets & env

| Web (`import.meta.env`) | Mobile |
|-------------------------|--------|
| `VITE_API_URL` | `EXPO_PUBLIC_API_URL` → `src/lib/config.ts` |
| `VITE_SERVER_URL` | `EXPO_PUBLIC_SERVER_URL` |
| `VITE_WS_URL` | `EXPO_PUBLIC_WS_URL` (optional) |

## Files in this app using this mapping

- UI: `src/screens/**`, `src/components/**`
- Navigation: `src/navigation/**`
- API: `src/services/api.ts`, `src/lib/api.ts`

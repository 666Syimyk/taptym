# Табылды · Flutter

Русский и кыргызский интерфейсы, Android/iOS и веб-сборка для проверки.

Локальный сервер: localhost:3001, Android Emulator: 10.0.2.2:3001.

```sh
flutter pub get
flutter gen-l10n
flutter run --dart-define=API_BASE_URL=https://api.example.kg
flutter analyze
flutter test
flutter build web --release --dart-define=API_BASE_URL=https://api.example.kg
```

Для release Android настройте android/key.properties по примеру. Для iOS нужны macOS, Xcode и собственная Apple Team. Полная инструкция и ограничения — в [основном README](../README.md) и [deployment.md](../docs/deployment.md).

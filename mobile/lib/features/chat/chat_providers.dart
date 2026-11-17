import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models.dart';
import '../../core/repositories.dart';
import '../../core/session.dart';

final conversationsProvider = FutureProvider.autoDispose<List<Conversation>>((
  ref,
) async {
  if (!ref.watch(isSignedInProvider)) return [];
  return ref.watch(messagingRepositoryProvider).list();
});

/// Unread chat counter for the tab badge; refreshed periodically and on demand.
final unreadMessagesProvider = StreamProvider.autoDispose<int>((ref) async* {
  if (!ref.watch(isSignedInProvider)) {
    yield 0;
    return;
  }
  final repo = ref.watch(messagingRepositoryProvider);
  while (true) {
    try {
      yield await repo.unread();
    } catch (_) {
      yield 0;
    }
    await Future<void>.delayed(const Duration(seconds: 20));
  }
});

/// Unread in-app notifications for the home header badge (PRD §5.1).
final unreadNotificationsProvider = StreamProvider.autoDispose<int>((ref) async* {
  if (!ref.watch(isSignedInProvider)) {
    yield 0;
    return;
  }
  final repo = ref.watch(accountRepositoryProvider);
  while (true) {
    try {
      yield await repo.unreadNotifications();
    } catch (_) {
      yield 0;
    }
    await Future<void>.delayed(const Duration(seconds: 30));
  }
});

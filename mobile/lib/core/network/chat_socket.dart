import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../config.dart';
import '../models.dart';
import 'api_client.dart';

/// Connection state exposed to the UI (PRD §8.12 shows it in the chat header).
enum SocketState { disconnected, connecting, connected }

/// WebSocket transport for chat (PRD §22.5). The server authenticates the token on
/// connect, re-checks the session on every frame and pushes `message` frames for all
/// conversations the user participates in. Sending still goes through REST (which
/// is idempotent via clientMessageId) so a dropped socket never loses a message.
class ChatSocket {
  ChatSocket(this._tokenStore);
  final dynamic _tokenStore;

  final _messages = StreamController<Message>.broadcast();
  final _state = ValueNotifier<SocketState>(SocketState.disconnected);
  WebSocketChannel? _channel;
  StreamSubscription? _sub;
  Timer? _reconnect;
  Timer? _ping;
  int _attempt = 0;
  int _listeners = 0;
  bool _disposed = false;

  Stream<Message> get messages => _messages.stream;
  ValueListenable<SocketState> get state => _state;

  /// Reference-counted: the first chat screen opens the socket, the last closes it.
  void acquire() {
    _listeners++;
    if (_listeners == 1) _connect();
  }

  void release() {
    _listeners = max(0, _listeners - 1);
    if (_listeners == 0) _close();
  }

  Future<void> _connect() async {
    if (_disposed || _listeners == 0) return;
    _state.value = SocketState.connecting;
    final token = await _tokenStore.accessToken() as String?;
    if (token == null) {
      _state.value = SocketState.disconnected;
      return;
    }
    try {
      final uri = Uri.parse('${AppConfig.wsUrl}?token=$token');
      final channel = WebSocketChannel.connect(uri);
      await channel.ready;
      _channel = channel;
      _attempt = 0;
      _state.value = SocketState.connected;
      _sub = channel.stream.listen(_onFrame, onDone: _onClosed, onError: (_) => _onClosed());
      _ping?.cancel();
      _ping = Timer.periodic(const Duration(seconds: 25), (_) => _send({'type': 'ping'}));
    } catch (_) {
      _onClosed();
    }
  }

  void _onFrame(dynamic raw) {
    try {
      final frame = jsonDecode(raw.toString()) as Map<String, dynamic>;
      if (frame['type'] == 'message' && frame['message'] is Map) {
        _messages.add(Message.fromJson(Map<String, dynamic>.from(frame['message'] as Map)));
      }
    } catch (_) {
      // Ignore malformed frames; REST history remains the source of truth.
    }
  }

  void _onClosed() {
    _sub?.cancel();
    _sub = null;
    _ping?.cancel();
    _channel = null;
    if (_disposed || _listeners == 0) {
      _state.value = SocketState.disconnected;
      return;
    }
    _state.value = SocketState.connecting;
    // Exponential backoff with jitter: 1s, 2s, 4s … capped at 30s.
    final delay = min(30, 1 << min(_attempt, 5)) + Random().nextInt(2);
    _attempt++;
    _reconnect?.cancel();
    _reconnect = Timer(Duration(seconds: delay), _connect);
  }

  void _send(Map<String, dynamic> frame) {
    try {
      _channel?.sink.add(jsonEncode(frame));
    } catch (_) {}
  }

  void _close() {
    _reconnect?.cancel();
    _ping?.cancel();
    _sub?.cancel();
    _channel?.sink.close();
    _channel = null;
    _state.value = SocketState.disconnected;
  }

  void dispose() {
    _disposed = true;
    _close();
    _messages.close();
    _state.dispose();
  }
}

final chatSocketProvider = Provider<ChatSocket>((ref) {
  final socket = ChatSocket(ref.watch(tokenStoreProvider));
  ref.onDispose(socket.dispose);
  return socket;
});

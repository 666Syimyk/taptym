import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Motion helpers that make the UI feel alive. Every effect switches itself off when
/// the system asks for reduced motion (accessibility settings).
bool motionEnabled(BuildContext context) =>
    !(MediaQuery.maybeOf(context)?.disableAnimations ?? false);

/// Fades and slides its child in, after [delay]. Use [FadeSlideIn.stagger] for lists.
class FadeSlideIn extends StatefulWidget {
  const FadeSlideIn({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.offset = const Offset(0, 24),
    this.duration = const Duration(milliseconds: 650),
  });

  /// Delay for the [index]-th element of a list; capped so long lists don't lag.
  FadeSlideIn.stagger({
    super.key,
    required this.child,
    required int index,
    Duration step = const Duration(milliseconds: 70),
    this.offset = const Offset(0, 24),
    this.duration = const Duration(milliseconds: 650),
  }) : delay = step * math.min(index, 8);

  final Widget child;
  final Duration delay, duration;
  final Offset offset;

  @override
  State<FadeSlideIn> createState() => _FadeSlideInState();
}

class _FadeSlideInState extends State<FadeSlideIn>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.duration,
  );
  late final Animation<double> _t = CurvedAnimation(
    parent: _c,
    curve: Curves.easeOutCubic,
  );
  Timer? _timer;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_c.isAnimating || _c.isCompleted || _timer != null) return;
    if (!motionEnabled(context)) {
      _c.value = 1;
    } else if (widget.delay == Duration.zero) {
      _c.forward();
    } else {
      _timer = Timer(widget.delay, () {
        if (mounted) _c.forward();
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _t,
    child: widget.child,
    builder: (_, child) => Opacity(
      opacity: _t.value,
      child: Transform.translate(
        offset: widget.offset * (1 - _t.value),
        child: Transform.scale(scale: 0.97 + 0.03 * _t.value, child: child),
      ),
    ),
  );
}

/// Wraps each child of a list in a staggered [FadeSlideIn].
List<Widget> staggered(List<Widget> children) => [
  for (final (i, c) in children.indexed) FadeSlideIn.stagger(index: i, child: c),
];

/// Soft expanding rings behind the child — draws the eye to the main action.
class PulseRings extends StatefulWidget {
  const PulseRings({
    super.key,
    required this.child,
    required this.color,
    this.size = 58,
  });
  final Widget child;
  final Color color;
  final double size;

  @override
  State<PulseRings> createState() => _PulseRingsState();
}

class _PulseRingsState extends State<PulseRings>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2400),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (motionEnabled(context)) {
      if (!_c.isAnimating) _c.repeat();
    } else {
      _c.stop();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.center,
      children: [
        for (final phase in const [0.0, 0.5])
          AnimatedBuilder(
            animation: _c,
            builder: (_, _) {
              final t = (_c.value + phase) % 1.0;
              return IgnorePointer(
                child: Container(
                  width: s,
                  height: s,
                  transform: Matrix4.diagonal3Values(1 + t * 0.55, 1 + t * 0.55, 1),
                  transformAlignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: widget.color.withValues(alpha: (1 - t) * 0.5),
                      width: 2,
                    ),
                  ),
                ),
              );
            },
          ),
        widget.child,
      ],
    );
  }
}

/// A diagonal light sweep that glides across the child every few seconds.
class ShineSweep extends StatefulWidget {
  const ShineSweep({
    super.key,
    required this.child,
    this.radius = 24,
    this.period = const Duration(milliseconds: 4200),
    this.delay = Duration.zero,
  });
  final Widget child;
  final double radius;
  final Duration period, delay;

  @override
  State<ShineSweep> createState() => _ShineSweepState();
}

class _ShineSweepState extends State<ShineSweep>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.period,
  );
  Timer? _timer;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!motionEnabled(context)) {
      _timer?.cancel();
      _c.stop();
      return;
    }
    if (_c.isAnimating || _timer != null) return;
    _timer = Timer(widget.delay, () {
      if (mounted) _c.repeat();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(widget.radius),
    child: Stack(
      children: [
        widget.child,
        Positioned.fill(
          child: IgnorePointer(
            child: AnimatedBuilder(
              animation: _c,
              builder: (_, _) {
                // Sweep happens during the first 35% of the period, then rests.
                final p = (_c.value / 0.35).clamp(0.0, 1.0);
                if (p == 0 || p == 1) return const SizedBox.shrink();
                return FractionalTranslation(
                  translation: Offset(-1.2 + 2.4 * p, 0),
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: const Alignment(-1, -0.4),
                        end: const Alignment(1, 0.4),
                        colors: [
                          Colors.white.withValues(alpha: 0),
                          Colors.white.withValues(alpha: 0.28),
                          Colors.white.withValues(alpha: 0),
                        ],
                        stops: const [0.3, 0.5, 0.7],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    ),
  );
}

/// Gentle up-and-down floating, for icons and illustrations.
class Bob extends StatefulWidget {
  const Bob({
    super.key,
    required this.child,
    this.amplitude = 4,
    this.period = const Duration(milliseconds: 2800),
  });
  final Widget child;
  final double amplitude;
  final Duration period;

  @override
  State<Bob> createState() => _BobState();
}

class _BobState extends State<Bob> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.period,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (motionEnabled(context)) {
      if (!_c.isAnimating) _c.repeat();
    } else {
      _c.stop();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    child: widget.child,
    builder: (_, child) {
      final a = _c.value * 2 * math.pi;
      return Transform.translate(
        offset: Offset(0, math.sin(a) * widget.amplitude),
        child: Transform.rotate(angle: math.sin(a + 1) * 0.05, child: child),
      );
    },
  );
}

/// Shrinks a little under the finger — tactile feedback for custom cards.
class PressScale extends StatefulWidget {
  const PressScale({super.key, required this.child, this.scale = 0.96});
  final Widget child;
  final double scale;

  @override
  State<PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<PressScale> {
  bool _down = false;

  void _set(bool v) {
    if (_down != v) setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) => Listener(
    onPointerDown: (_) => _set(true),
    onPointerUp: (_) => _set(false),
    onPointerCancel: (_) => _set(false),
    child: AnimatedScale(
      scale: _down ? widget.scale : 1,
      duration: const Duration(milliseconds: 160),
      curve: Curves.easeOutBack,
      child: widget.child,
    ),
  );
}

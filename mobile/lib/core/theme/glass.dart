import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import 'tokens.dart';

/// Whether to render real blur. Disabled on web (expensive) and when the system asks
/// for reduced motion/transparency; a semi-opaque fill is used instead (PRD §6.3).
bool glassBlurEnabled(BuildContext context) {
  if (kIsWeb) return false;
  final mq = MediaQuery.maybeOf(context);
  if (mq == null) return true;
  return !mq.disableAnimations && !mq.highContrast;
}

/// Glass panel: translucent fill, soft blur, light border, small shadow, subtle inner highlight.
class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.radius = Radii.card,
    this.padding = const EdgeInsets.all(Space.l),
    this.margin,
    this.tint,
  });

  final Widget child;
  final double radius;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final blur = glassBlurEnabled(context);
    final fill = tint ?? (dark ? Glass.darkFill : Glass.lightFill);
    final border = dark ? Glass.darkBorder : Glass.lightBorder;
    // A gradient in the same BoxDecoration would replace the fill colour entirely and
    // leave the panel see-through, so the fill and the hairline border stand alone.
    final body = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: blur ? fill : fill.withValues(alpha: dark ? 0.96 : 0.98),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: border),
      ),
      child: child,
    );
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: dark ? 0.3 : 0.06),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: blur
            ? BackdropFilter(
                filter: ImageFilter.blur(
                  sigmaX: Glass.blurSigma,
                  sigmaY: Glass.blurSigma,
                ),
                child: body,
              )
            : body,
      ),
    );
  }
}

/// Living topographic background: thin contour lines, like a relief map of the
/// mountains, that slowly change shape. Gives the glass something to sit on without
/// the neon glow. Drawn about 12 times a second; still when motion is reduced.
class SoftBackground extends StatefulWidget {
  const SoftBackground({super.key, required this.child});
  final Widget child;

  @override
  State<SoftBackground> createState() => _SoftBackgroundState();
}

class _SoftBackgroundState extends State<SoftBackground>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_tick);
  final ValueNotifier<double> _time = ValueNotifier(
    (DateTime.now().millisecondsSinceEpoch / 1000) % 100000,
  );
  Duration _last = Duration.zero;
  late final double _start = _time.value;

  void _tick(Duration elapsed) {
    if (elapsed - _last < const Duration(milliseconds: 80)) return;
    _last = elapsed;
    _time.value = _start + elapsed.inMilliseconds / 1000;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final still = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (still) {
      if (_ticker.isActive) _ticker.stop();
    } else if (!_ticker.isActive) {
      _ticker.start();
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    _time.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final ink = dark ? Colors.white : TabyldyColors.mainText;
    return Stack(
      children: [
        Positioned.fill(
          child: ColoredBox(color: Theme.of(context).scaffoldBackgroundColor),
        ),
        Positioned.fill(
          child: IgnorePointer(
            child: RepaintBoundary(
              child: CustomPaint(
                painter: _TopoPainter(
                  time: _time,
                  minor: ink.withValues(alpha: dark ? 0.055 : 0.07),
                  major: ink.withValues(alpha: dark ? 0.11 : 0.14),
                ),
              ),
            ),
          ),
        ),
        Positioned.fill(child: widget.child),
      ],
    );
  }
}

/// Contour lines of a slowly drifting noise field (marching squares). Every fifth
/// line is a little stronger, like index contours on a real map.
class _TopoPainter extends CustomPainter {
  _TopoPainter({required this.time, required this.minor, required this.major})
    : super(repaint: time);
  final ValueNotifier<double> time;
  final Color minor, major;

  static const _step = 0.085;
  // Edges crossed by the contour for each corner case: 0 top, 1 right, 2 bottom, 3 left.
  static const _edges = <List<int>>[
    [], [3, 2], [2, 1], [3, 1], [0, 1], [0, 1, 3, 2], [0, 2], [3, 0],
    [3, 0], [0, 2], [0, 3, 2, 1], [0, 1], [3, 1], [2, 1], [3, 2], [],
  ];

  // Three noise layers drifting in different directions, so lines change shape instead of sliding.
  static double _relief(double x, double y, double t) =>
      _noise(x * 0.0019 + t * 0.010, y * 0.0019) * 0.6 +
      _noise(x * 0.0043, y * 0.0043 - t * 0.016) * 0.28 +
      _noise(x * 0.0102 - t * 0.021, y * 0.0102 + t * 0.012) * 0.12;

  @override
  void paint(Canvas canvas, Size size) {
    final cell = size.width < 640 ? 14.0 : 12.0;
    final cols = (size.width / cell).ceil(), rows = (size.height / cell).ceil();
    final w = cols + 1;
    final t = time.value;
    final v = List<double>.filled(w * (rows + 1), 0);
    for (var j = 0; j <= rows; j++) {
      for (var i = 0; i <= cols; i++) {
        v[j * w + i] = _relief(i * cell, j * cell, t);
      }
    }
    final thin = Path(), bold = Path();
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        final k = j * w + i;
        final a = v[k], b = v[k + 1], c = v[k + w + 1], d = v[k + w];
        final lo = math.min(math.min(a, b), math.min(c, d));
        final hi = math.max(math.max(a, b), math.max(c, d));
        final x0 = i * cell, y0 = j * cell;
        for (var n = (lo / _step).ceil(); n * _step <= hi; n++) {
          final lv = n * _step;
          final e = _edges[(a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0)];
          final path = n % 5 == 0 ? bold : thin;
          Offset at(int edge) => switch (edge) {
            0 => Offset(x0 + cell * (lv - a) / (b - a), y0),
            1 => Offset(x0 + cell, y0 + cell * (lv - b) / (c - b)),
            2 => Offset(x0 + cell * (lv - d) / (c - d), y0 + cell),
            _ => Offset(x0, y0 + cell * (lv - a) / (d - a)),
          };
          for (var s = 0; s < e.length; s += 2) {
            final p = at(e[s]), q = at(e[s + 1]);
            path
              ..moveTo(p.dx, p.dy)
              ..lineTo(q.dx, q.dy);
          }
        }
      }
    }
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..isAntiAlias = true;
    canvas.drawPath(thin, paint..color = minor..strokeWidth = 1);
    canvas.drawPath(bold, paint..color = major..strokeWidth = 1.3);
  }

  @override
  bool shouldRepaint(_TopoPainter old) => old.minor != minor || old.major != major;

  // 2D simplex noise (Stefan Gustavson, public domain).
  static final List<int> _perm = () {
    final p = List<int>.generate(256, (i) => i);
    var seed = 20240917;
    double rnd() => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (var i = 255; i > 0; i--) {
      final j = (rnd() * (i + 1)).floor();
      final tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    return List<int>.generate(512, (i) => p[i & 255]);
  }();
  static const _grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  static final double _f2 = 0.5 * (math.sqrt(3) - 1), _g2 = (3 - math.sqrt(3)) / 6;

  static double _noise(double xin, double yin) {
    final s = (xin + yin) * _f2;
    final i = (xin + s).floor(), j = (yin + s).floor();
    final t = (i + j) * _g2;
    final x0 = xin - (i - t), y0 = yin - (j - t);
    final i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    final x1 = x0 - i1 + _g2, y1 = y0 - j1 + _g2;
    final x2 = x0 - 1 + 2 * _g2, y2 = y0 - 1 + 2 * _g2;
    final ii = i & 255, jj = j & 255;
    var n = 0.0;
    var t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      final g = _grad[_perm[ii + _perm[jj]] & 7];
      t0 *= t0;
      n += t0 * t0 * (g[0] * x0 + g[1] * y0);
    }
    var t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      final g = _grad[_perm[ii + i1 + _perm[jj + j1]] & 7];
      t1 *= t1;
      n += t1 * t1 * (g[0] * x1 + g[1] * y1);
    }
    var t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      final g = _grad[_perm[ii + 1 + _perm[jj + 1]] & 7];
      t2 *= t2;
      n += t2 * t2 * (g[0] * x2 + g[1] * y2);
    }
    return 70 * n;
  }
}

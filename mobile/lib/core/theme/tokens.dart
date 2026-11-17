import 'package:flutter/material.dart';

/// Design tokens from PRD §6.2 — centralized and replaceable.
class TabyldyColors {
  static const primary = Color(0xFF2378F7);
  static const primaryDeep = Color(0xFF174BB6);
  static const accentMint = Color(0xFF35C8A1);
  static const lightBackground = Color(0xFFF4F8FF);
  static const lightSurface = Color(0xFFFFFFFF);
  static const mainText = Color(0xFF17233B);
  static const secondaryText = Color(0xFF69788F);
  static const darkBackground = Color(0xFF091321);
  static const darkSurface = Color(0xFF172437);
  static const success = Color(0xFF19A875);
  static const warning = Color(0xFFE6A23C);
  static const error = Color(0xFFD94B59);
}

/// Geometry (PRD §6.4). Base grid 4dp.
class Space {
  static const xs = 4.0;
  static const s = 8.0;
  static const m = 12.0;
  static const l = 16.0;
  static const xl = 20.0;
  static const xxl = 24.0;
  static const xxxl = 32.0;
}

class Radii {
  static const button = 16.0;
  static const card = 24.0;
  static const sheet = 28.0;
  static const chip = 12.0;
}

/// Motion (PRD §6.6).
class Motion {
  static const tap = Duration(milliseconds: 140);
  static const card = Duration(milliseconds: 220);
  static const screen = Duration(milliseconds: 300);
  static const sheet = Duration(milliseconds: 320);
  static const spring = Curves.easeOutCubic;
}

/// Glass surface parameters, simplified automatically on low-end devices (see GlassPanel).
class Glass {
  static const blurSigma = 18.0;
  static const lightFill = Color(0xCCFFFFFF);
  static const darkFill = Color(0xB3172437);
  static const lightBorder = Color(0x66FFFFFF);
  static const darkBorder = Color(0x33FFFFFF);
}

import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

/// Service that:
/// 1. Captures an image via camera or gallery
/// 2. Runs Google ML Kit on-device OCR (works offline)
/// 3. Parses the extracted text to identify vital sign values
/// 4. Returns a map of field-name → extracted value (string)
class OcrVitalParserService {
  static final ImagePicker _picker = ImagePicker();

  // ─────────────────────────────────────────────────────────────────────
  // Public: pick image from camera or gallery, return bytes + temp path
  // ─────────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>?> pickImageForScan(
    BuildContext context, {
    required ImageSource source,
  }) async {
    try {
      final XFile? picked = await _picker.pickImage(
        source: source,
        imageQuality: 90,
        maxWidth: 2000,
        maxHeight: 2000,
      );
      if (picked == null) return null;

      final Uint8List bytes = await picked.readAsBytes();
      return {'path': picked.path, 'bytes': bytes};
    } catch (e) {
      debugPrint('[OCR] Error picking image: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not capture image: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Public: Run OCR on a file path, return parsed vitals map
  // Returns a map with keys matching the vital field names.
  // Any field that could not be parsed is absent from the map.
  // ─────────────────────────────────────────────────────────────────────
  static Future<Map<String, String>> extractVitalsFromImagePath(
    String imagePath,
  ) async {
    final textRecognizer = TextRecognizer(
      script: TextRecognitionScript.latin,
    );

    try {
      final inputImage = InputImage.fromFilePath(imagePath);
      final RecognizedText result =
          await textRecognizer.processImage(inputImage);

      final String rawText = result.blocks
          .map((b) => b.lines.map((l) => l.text).join('\n'))
          .join('\n');

      debugPrint('[OCR] Raw extracted text:\n$rawText');
      return _parseVitalsFromText(rawText);
    } catch (e) {
      debugPrint('[OCR] Recognition error: $e');
      return {};
    } finally {
      textRecognizer.close();
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Internal: Parse the raw OCR text into vital sign field values
  // ─────────────────────────────────────────────────────────────────────
  static Map<String, String> _parseVitalsFromText(String text) {
    final Map<String, String> result = {};
    // Normalize: lowercase, collapse whitespace
    final String t = text.toLowerCase().replaceAll(RegExp(r'\s+'), ' ');

    // ── Blood Pressure ──
    // Handles: "120/80", "BP: 120/80", "S:120 D:80", "120 / 80"
    final bpSlash = RegExp(r'(?:bp|blood\s*pressure|b\.p\.?)?\s*:?\s*(\d{2,3})\s*/\s*(\d{2,3})');
    final bpMatch = bpSlash.firstMatch(t);
    if (bpMatch != null) {
      result['systolic'] = bpMatch.group(1)!;
      result['diastolic'] = bpMatch.group(2)!;
    } else {
      // Try separate systolic / diastolic labels
      final sysMatch = RegExp(r'(?:sys|systolic|s\b)\s*:?\s*(\d{2,3})').firstMatch(t);
      final diasMatch = RegExp(r'(?:dia|diastolic|d\b)\s*:?\s*(\d{2,3})').firstMatch(t);
      if (sysMatch != null) result['systolic'] = sysMatch.group(1)!;
      if (diasMatch != null) result['diastolic'] = diasMatch.group(1)!;
    }

    // ── Pulse Rate ──
    // Handles: "Pulse: 72", "HR: 72", "P-72", "Heart Rate 72 bpm"
    final pulseMatch = RegExp(
      r'(?:pulse|pr|p\b|hr\b|heart\s*rate|bpm)\s*:?-?\s*(\d{2,3})',
    ).firstMatch(t);
    if (pulseMatch != null) result['pulse'] = pulseMatch.group(1)!;

    // ── SpO2 / Oxygen Saturation ──
    // Handles: "SpO2: 98", "O2 Sat 98%", "Oxygen 98", "spo2 98%"
    final spo2Match = RegExp(
      r'(?:spo2|sp\s*o2|o2\s*sat|oxygen\s*sat|oxygen)\s*:?\s*(\d{2,3})\s*%?',
    ).firstMatch(t);
    if (spo2Match != null) result['spo2'] = spo2Match.group(1)!;

    // ── Temperature ──
    // Handles: "Temp: 98.6", "T: 37.2°C", "Temperature 98.4"
    final tempMatch = RegExp(
      r'(?:temp|temperature|t\b)\s*:?\s*(\d{2,3}(?:\.\d)?)\s*°?\s*(?:f|c)?',
    ).firstMatch(t);
    if (tempMatch != null) result['temperature'] = tempMatch.group(1)!;

    // ── Respiratory Rate ──
    // Handles: "RR: 18", "Resp Rate: 18", "Respiratory 18"
    final rrMatch = RegExp(
      r'(?:rr\b|resp(?:iratory)?\s*rate|resp\.?\s*r\.?)\s*:?\s*(\d{1,2})',
    ).firstMatch(t);
    if (rrMatch != null) result['rr'] = rrMatch.group(1)!;

    // ── Blood Sugar Fasting ──
    // Handles: "BSF: 95", "FBS: 95", "Fasting Sugar 95", "Fasting: 95"
    final bsfMatch = RegExp(
      r'(?:bsf|fbs|fasting\s*(?:blood\s*)?(?:sugar|glucose)?|bs\s*f)\s*:?\s*(\d{2,3})',
    ).firstMatch(t);
    if (bsfMatch != null) result['bsf'] = bsfMatch.group(1)!;

    // ── Blood Sugar Post-Prandial ──
    // Handles: "BSPP: 140", "PP Sugar: 140", "Post Prandial: 140", "PPBS: 140"
    final bsppMatch = RegExp(
      r'(?:bspp|ppbs|pp\s*sugar|post[-\s]?prandial|bs\s*pp)\s*:?\s*(\d{2,3})',
    ).firstMatch(t);
    if (bsppMatch != null) result['bspp'] = bsppMatch.group(1)!;

    // ── Clinical Notes fallback ──
    // If nothing was parsed yet, capture any sentence-like text as notes hint
    if (result.isEmpty) {
      // Trim and use full text as notes suggestion (truncated to 200 chars)
      final cleaned = text.trim().replaceAll(RegExp(r'\s+'), ' ');
      if (cleaned.isNotEmpty) {
        result['notes_hint'] = cleaned.length > 200
            ? '${cleaned.substring(0, 200)}…'
            : cleaned;
      }
    }

    debugPrint('[OCR] Parsed vitals: $result');
    return result;
  }
}

# T7 HealthVault — Flutter Application

**Developer & Author:** M M Bharath  
**Version:** 2.2.0 (OCR Clinical Scanner & Cloud Sync Edition)  
**Platform:** Flutter (Android, Windows, Linux, macOS)  
**APK Artifact:** `build/app/outputs/flutter-apk/app-release.apk`

---

## 🌟 Overview

T7 HealthVault is an offline-first Community Electronic Health Record (EHR) and Clinical Decision Support application for healthcare workers.

### Key Capabilities
* **📷 On-Device OCR Handwritten Paper Scanner:** Instant camera/gallery capture of paper vitals records using Google ML Kit (`google_mlkit_text_recognition`). Regex clinical parser automatically extracts BP (systolic/diastolic), pulse rate, SpO₂, temperature, respiratory rate, blood sugar (fasting/PP), and clinical notes entirely on-device without cloud dependence.
* **✍️ Review & Edit Verification Flow:** After OCR extraction, ASHA workers can review, verify, and fine-tune parsed values before saving to local SQLite (`medical_records`), tagged with `entry_source: 'scan'`.
* **🧠 PhysioNet Sepsis Predictor (ONNX):** **0.9085 AUC-ROC** on 39,179 ICU patients; **96.0% accuracy**; 0.29 MB model footprint; < 5 ms inference time on 9 vital channels.
* **📊 NEWS2 & DELTA Scoring:** UK Royal College of Physicians standard (0–20 score) + vital sign trend variations for early deterioration detection.
* **🌐 22 Scheduled Indian Languages:** 11 pre-installed core languages + 11 on-demand downloadable language packs.
* **🤖 On-Device Qwen3 Generative LLM:** Downloadable ~1.05 GB GGUF for full offline medical reasoning and doctor chat.
* **💾 Local SQLite Database:** Offline-first architecture storing households, members, and clinical records with `is_synced` tracking.
* **☁️ Two-Way Cloud Synchronization:** Seamless synchronization with Supabase via `fetch-worker-data` edge function, tracking `entry_source` across mobile and PHC admin dashboard.

---

## 🧪 Verification Commands

```bash
flutter analyze   # Checks for syntax, linter, and static analysis issues
flutter test      # Runs all widget and unit tests
flutter build apk --release # Generates release APK
```

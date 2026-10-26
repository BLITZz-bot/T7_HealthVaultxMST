# T7 HealthVault — Assessment and Implementation Priorities

## Overall assessment

T7 HealthVault is a promising prototype/hackathon project with a compelling goal: provide offline-first health records and decision support for ASHA workers, connect them to PHC workflows, and create tamper-evident records. The repository includes a Flutter app, FastAPI relay, Solidity contracts, an ML pipeline, and a React/Vite PHC admin panel.

The main opportunity is to make the project’s claims match what is implemented and to deliver one safe, reliable end-to-end workflow. It should be presented as a prototype—not a production-ready clinical system—until security, clinical validation, and operational review are complete.

## Important gaps to address

### Security and privacy

- Local SQLite currently stores passwords, creates a default `admin` / `admin` account, and includes a hardcoded worker password. Remove defaults, use proper password hashing, and require first-run credential setup.
- The local database is not encrypted, despite documentation describing encrypted storage. Encrypt sensitive local data and backups, protect credentials/tokens with platform secure storage, and document device-loss handling.
- The mobile app sends vitals to the relay for hashing and contains cloud-sync functionality. Update privacy claims and data-flow documentation to clearly state what data leaves the device, where it goes, and why. Minimize or avoid sending raw patient data.
- Relay write endpoints such as `/anchor`, `/visit`, and `/consent` lack worker authentication/authorization. Add authenticated requests, bind each request to an authorized worker, validate all fields and limits, and add rate limiting and audit logging.
- Restrict the relay’s permissive CORS configuration to known application origins.
- Worker private keys are held in a local JSON keystore encrypted with a key derived from `RELAY_SECRET`. Treat this as demo-only. For a real deployment, use a managed KMS/HSM or a carefully reviewed custody design with key rotation, access controls, backups, and incident procedures.
- The mobile blockchain sync code uses a predictable per-member salt. Generate a cryptographically random per-family salt and store it securely; do not rely on member IDs or public information to protect commitments.

### Blockchain and rewards

- The `/visit` relay handler submits a visit and then immediately calls batch attestation. This bypasses the hospital review described in the product flow. Make the approval authority explicit and require the intended independent verifier before payment.
- The relay documentation says it pays gas for workers, while some relay transactions are signed by worker accounts. Define and implement gas handling consistently, or use a reviewed relayer/meta-transaction design.
- `ConsentRegistry.revoke` should verify that the caller is the worker who granted that specific consent, not merely any active worker.
- Validate transaction authorization, replay prevention, task type, visit period, duplicate visits, rate limits, and vault funding. Add tests for unauthorized callers and failure/retry cases.
- Clearly state that CareCoin on a testnet is a demonstration token, not a real stipend or settlement rail.

### Clinical decision support and ML

- Documentation claims 48 features and cross-validated performance, while the current training pipeline defines 62 features and appears to report training-set performance rather than executing cross-validation. Reconcile the model, metadata, app feature vector, and documentation.
- The model builds several windows from each patient. Evaluate with patient-grouped splits so windows from one patient cannot appear in both training and test data; use hospital-held-out evaluation where possible.
- Review target construction: some windows include or approach the sepsis-onset row, which can overstate early-warning performance.
- ICU training data may not generalize to community health settings. Obtain clinical review and independent validation in the intended population before presenting the model as clinically dependable.
- Report sensitivity, specificity, precision, PR-AUC, calibration, confidence intervals, and false-negative performance—not only accuracy and ROC-AUC.
- The NEWS2 implementation scores five parameters and should not be represented as a complete standard NEWS2 assessment. Review against the current RCP standard, including consciousness and supplemental oxygen, and support applicable oxygen scale/context.
- Fixed confidence values and estimated “hours to onset” are not validated model outputs. Remove them or support them with appropriate calibration and time-to-event evaluation.
- Present the model and generated text as experimental decision support, not diagnosis or a substitute for clinician judgment. Use clinician-reviewed escalation wording and include limitations in the app.

### Integration and documentation

- `complete-setup-guide.md` describes creating a Django/PostgreSQL backend, but the repository contains a FastAPI relay and a SQLite mobile database. Replace the guide with instructions for the actual components.
- `ARCHITECTURE.md` describes a Next.js portal, while `phc_admin` is React/Vite. Align component names, data flows, and deployment instructions across documentation.
- The PHC admin README says the panel is currently a mock-data skeleton and Supabase is not connected. Label it clearly as a demo until the real backend and authentication are configured and tested.
- `LanguageService.downloadLanguagePack()` simulates a download rather than fetching a real language pack. Either implement verified downloads and actual translations or describe this as a demo placeholder.
- Android release configuration uses a placeholder application ID and debug signing. Set a unique application ID, configure protected release signing, and test a release build before distribution.
- Confirm the proprietary license is compatible with competition/submission rules and clearly document licenses for dependencies, model weights, and datasets.

## Suggested implementation order

### P0 — Make the demo truthful and safe

1. Correct README, architecture, security policy, and setup instructions so they match the code.
2. Remove default and hardcoded passwords; add a secure first-run setup and proper authentication.
3. Disable public relay write access until authentication and authorization are implemented.
4. Remove automatic visit attestation unless that is explicitly the intended approval policy.
5. Label clinical predictions and generated explanations as experimental decision support; remove unsupported confidence and onset-time claims.
6. Confirm that no real patient data is used in public demos, testnets, or unapproved cloud services.

### P1 — Deliver one reliable end-to-end flow

1. Record a visit offline and show the saved record after app restart.
2. Display reviewed vital-score calculations and clear referral guidance.
3. Sync when connectivity returns, with retries and visible pending/success/failure state.
4. Have a PHC user review and approve the visit through an authenticated workflow.
5. Anchor only the required integrity proof and show a working verification result.
6. Demonstrate offline behavior, duplicate handling, failure recovery, and low-end Android performance.

### P2 — Add evidence and harden engineering

1. Add Flutter tests for database migrations, login, offline persistence, synchronization, and clinical score boundaries.
2. Add FastAPI tests for authentication, validation, authorization, error handling, and chain failures.
3. Expand smart-contract tests for consent ownership, unauthorized approval, replay, duplicates, and insufficient vault funds.
4. Add CI for Flutter analyze/tests, Python tests, Hardhat tests, and PHC admin typecheck/build.
5. Validate model metrics with patient-grouped and hospital-held-out splits; version datasets, features, thresholds, and artifacts.
6. Add release signing, app identity, dependency review, and a documented backup/recovery process.

### P3 — Complete user-facing features

1. Connect the admin panel to a real backend and replace demo login/data before claiming production readiness.
2. Implement genuine language-pack download, integrity checks, and human-reviewed translations—or remove the download claims.
3. Improve accessibility, low-connectivity usability, readable risk communication, and localization review with ASHA workers.
4. Record a short demo video and prepare a concise architecture/data-flow diagram with honest limitations.

## How to run on Windows

Run commands from the indicated component directory. Install the required tools first: Flutter/Dart and Android SDK for the app, Python for the relay and model pipeline, and Node.js/npm for the admin panel and contracts.

### Flutter app

The app declares Dart SDK `^3.12.2` in `flutter_app/pubspec.yaml`.

```powershell
cd "C:\Coding\Final year project\latest\T7_HealthVaultxMST\flutter_app"
flutter pub get
flutter analyze
flutter test
flutter run
```

Select an Android emulator or connected device when prompted. The default local admin account is for demonstration only; do not use it with real patient records.

### PHC admin demo

```powershell
cd "C:\Coding\Final year project\latest\T7_HealthVaultxMST\phc_admin"
npm install
npm run dev
```

Open the local URL printed by Vite. This currently runs with mock data and demo login; it is not a connected PHC deployment.

### FastAPI relay

```powershell
cd "C:\Coding\Final year project\latest\T7_HealthVaultxMST\backend"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The relay requires valid environment variables and blockchain configuration for chain operations. It may start in offline mode without them. Do not expose it publicly until endpoint authentication, authorization, and deployment security are addressed.

### Smart contracts

```powershell
cd "C:\Coding\Final year project\latest\T7_HealthVaultxMST\blockchain"
npm install
npx hardhat compile
npm test
```

Testnet deployment requires a configured deployer private key and testnet funds. Use a test wallet only; never commit private keys or `.env` files.

### Model pipeline

```powershell
cd "C:\Coding\Final year project\latest\T7_HealthVaultxMST\model_pipeline"
pip install -r requirements.txt
python smoke_test.py
```

Full training is optional, downloads a large dataset, and can take hours. It is not required to launch the Flutter app.

## Competition positioning

Lead with the practical value: reliable offline workflows for community health workers, clear referral support, and an auditable connection to PHC teams. Show one complete working workflow with honest evidence and limitations. Avoid relying on “AI,” “blockchain,” or “hospital-grade” labels as proof of quality; demonstrate usability, safety, privacy, and measurable results instead.

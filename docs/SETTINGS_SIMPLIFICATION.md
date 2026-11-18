# Settings inventory and simplification — v0.3.0

## A — Learner essentials

Home/mode/exercise, optional guide, input source/status/response test, Góc người lái and head look, wind/rain sliders before practice, prepare/start/pause/resume/landing/finish/retry. Candidate name is entered per session. Guidance is labelled optional training assistance. There is no implemented sound system, so no nonfunctional sound preference was added.

Custom advanced practice values survive navigation to training and are restored after mock/reference views during the same app session. They are labelled Tùy chỉnh bởi giảng viên. Reload restores the named simple convenience preset; numerical advanced edits are not silently saved as assessment defaults.

Convenience keys: `uav-show-guide`, `uav-preferred-profile`, `uav-input-source`, `uav-display-quality`, `uav-practice-wind-level`, `uav-practice-rain-level` (legacy keys read for migration). Preferences are optional if storage is unavailable; records use their existing IndexedDB flow. Graphics labels map to existing Low=Ưu tiên mượt, Medium=Cân bằng, High=Ưu tiên hình ảnh, Ultra=Chi tiết tối đa · máy mạnh. No automatic quality change occurs during assessment; existing startup software-renderer fallback remains and an explicit saved display choice is restored before any attempt.

## B — Instructor controls

Giảng viên selects assessment weather before the next mock attempt (`uav-assessment-wind-level`, `uav-assessment-rain-level`). Learners see its summary, with no weather editor in Mock. Training conditions cannot change live from candidate UI; instructor numerical changes require pause. Profile/task/rule versions, live pause/end, plan and actual trajectory, errors, replay, metrics, notes and exports are preserved. Pilot station is configurable before an attempt under advanced configuration; no live move. Reference missions are explicitly automatic demonstrations, outside candidate attempt evidence.

This local workflow distinction is not password authentication or protection against edited JavaScript/developer tools. Instructor choices and convenience defaults are separate; historical evidence never reads current UI preferences to reinterpret its result.

## C — Advanced technical controls

Expandable calibration preserves source slot, device/raw/button diagnostics, axis assignment, min/center/max, inversion/deadzone, range sweep, neutral capture, named save/load and hardware-unverified status. Simple stick-response bars remain accessible without learning axis numbers. Existing `uav-controller` and `uav-controller-profiles` data are preserved.

Cài đặt nâng cao holds original weather scenarios, all eight numeric weather parameters, setback/eye/FOV, station provenance, display calibration explanation, optional PILOT/direction and marker/collider engineering overlays, renderer statistics and future read-only field-log boundary. Original reference desk retains its advanced airframe/weather/renderer controls. No PID, motor, dynamics, contact, scoring or geometry knobs were changed or removed.

## Wind/rain levels: physical mapping (latest task-centered iteration)

Native sliders accept integers0–10. `weatherAtLevels` is the single mapping and uses existing `Weather.target`; equations, two-second blending and continuous renderer are unchanged. For wind level **n**, base wind=**0.9n m/s**, gust coefficient=**0.4n m/s**, turbulence=**0.07n**; existing direction is preserved. Level0 zeros all three and level10 matches the existing strongest scenario's9/4/.7 amplitudes. This linear teaching progression is monotonic and bounded; it is not an official/operational limit. Gust amplitude does not bound total instantaneous wind including turbulence.

Rain level **r**, normalized q=r/10: rain=q, cloud=.12+.88q, visibility=650−555q metres, timeOfDay=15.5−2.5q hours. This interpolates the existing clear/heavy-rain environment range. Current renderer already varies rain segment count/opacity continuously, and wetness retains its visual lag. There is no rainfall-force effect or calibrated mm/hour conversion. Changing wind does not change rain/environment; changing rain does not change wind/direction. Reset explicitly applies both0. Advanced controls/scenarios remain accessible separately.

New keys: `uav-{practice,assessment}-{wind-level,rain-level}`. Old named wind convenience preferences migrate to nearest simple levels: calm0/light2/medium4/strong10; rain sky migrates to3, other sky to0. Archived records are never migrated. Advanced numeric edits remain actual in memory and are described as custom when outside the scale; simple stored levels are restored on reload. Instructor assessment levels are separate and apply only to the next Mock entry. All four World weather APIs share the existing authorization guard, rejecting Mock before/during attempts and unauthorized live changes. Preparation copies selected target to actual initial weather and records it.

## Persistence and examination integrity

World methods reject simple/numeric weather edits in Mock and during unauthorized live phases; station/camera/overlay/workspace restrictions remain. Strict mode cannot navigate to instructor/settings or enable PILOT/route/trace/labels/debug. Begin freezes station, controller, weather, rules, geometry and software as before. Human notes remain separate; JSON checksum and immutable finalized payload behavior remain intact. Archived v0.2 station data stays importable. UI translation never mutates profile labels or source metadata in records.

## Training ground guide

`uav-ground-guide` is an optional convenience preference (default on). The user toggle lives in Hỗ trợ luyện tập. Runtime visibility also requires Training workspace, no Mock attempt (including a final archived Mock still selected), no replay, sufficient height, and enabled preference. Setters refuse outside that context. Workspace/replay/attempt changes immediately hide the group, and the per-frame guard prevents preference/hidden-state leakage. Instructor/review/reference never display it. It is never recorded or scored; no keyboard shortcut enables it. Strict Mock retains its original aid restrictions.

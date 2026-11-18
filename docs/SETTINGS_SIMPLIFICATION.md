# Settings inventory and simplification — v0.3.0

## A — Learner essentials

Home/mode/exercise, optional guide, input source/status/response test, Góc người lái and head look, simple wind/sky before practice, prepare/start/pause/resume/landing/finish/retry. Candidate name is entered per session. Guidance is labelled optional training assistance. There is no implemented sound system, so no nonfunctional sound preference was added.

Custom advanced practice values survive navigation to training and are restored after mock/reference views during the same app session. They are labelled Tùy chỉnh bởi giảng viên. Reload restores the named simple convenience preset; numerical advanced edits are not silently saved as assessment defaults.

Convenience keys: `uav-show-guide`, `uav-preferred-profile`, `uav-input-source`, `uav-display-quality`, `uav-practice-wind`, `uav-practice-sky`. Preferences are optional if storage is unavailable; records use their existing IndexedDB flow. Graphics labels map to existing Low=Ưu tiên mượt, Medium=Cân bằng, High=Ưu tiên hình ảnh, Ultra=Chi tiết tối đa · máy mạnh. No automatic quality change occurs during assessment; existing startup software-renderer fallback remains and an explicit saved display choice is restored before any attempt.

## B — Instructor controls

Giảng viên selects assessment weather before the next mock attempt (`uav-assessment-wind`, `uav-assessment-sky`). Learners see its summary, with no weather editor in Mock. Training conditions cannot change live from candidate UI; instructor numerical changes require pause. Profile/task/rule versions, live pause/end, plan and actual trajectory, errors, replay, metrics, notes and exports are preserved. Pilot station is configurable before an attempt under advanced configuration; no live move. Reference missions are explicitly automatic demonstrations, outside candidate attempt evidence.

This local workflow distinction is not password authentication or protection against edited JavaScript/developer tools. Instructor choices and convenience defaults are separate; historical evidence never reads current UI preferences to reinterpret its result.

## C — Advanced technical controls

Expandable calibration preserves source slot, device/raw/button diagnostics, axis assignment, min/center/max, inversion/deadzone, range sweep, neutral capture, named save/load and hardware-unverified status. Simple stick-response bars remain accessible without learning axis numbers. Existing `uav-controller` and `uav-controller-profiles` data are preserved.

Cài đặt nâng cao holds original weather scenarios, all eight numeric weather parameters, setback/eye/FOV, station provenance, display calibration explanation, optional PILOT/direction and marker/collider engineering overlays, renderer statistics and future read-only field-log boundary. Original reference desk retains its advanced airframe/weather/renderer controls. No PID, motor, dynamics, contact, scoring or geometry knobs were changed or removed.

## Wind presets: explicit physical mapping

Single implementation: `src/training/weatherPresets.ts`, writing the existing `Weather.target`; `Weather.step` and `windAt` are unchanged. Each row lists base wind m/s, gust coefficient m/s, turbulence parameter and direction **toward** world +X=0°, +Z=90°:

- Không gió: **0 / 0 / 0 / 65°**. Direction is immaterial when all wind terms are zero.
- Gió nhẹ: **1.8 / 0.6 / 0.15 / 65°**, copied from existing Clear skies.
- Gió trung bình: **3.8 / 1.8 / 0.30 / 110°**, copied from existing Overcast.
- Gió mạnh: **9 / 4 / 0.70 / 80°**, copied from existing Wind & gusts.

These preserve established scenario values, not official thresholds or recommendations for safe real flights. The model's gust term is bounded by its coefficient; turbulence adds separate horizontal components and vertical `0.32*turbulence`, so base+gust is not a bound on total instantaneous vector magnitude. The UI describes gust amplitude rather than a regulatory limit.

Sky choices copy existing Clear skies / Overcast / Light rain cloud/rain/visibility/time values independently of the selected wind. Clear: cloud .12/rain0/visibility650m/time15.5h; cloudy: .92/0/260/13; rain: .85/.30/180/14. Existing two-second exponential blending remains for setup/live paused instructor edits. On attempt preparation, the selected target becomes the initial current condition and is copied into attempt.initialWeather; each recorded frame retains actual weather. Wetness retains the existing slower visual response. No separate weather engine, rain-force model or exam wind rule is introduced.

## Persistence and examination integrity

World methods reject simple/numeric weather edits in Mock and during unauthorized live phases; station/camera/overlay/workspace restrictions remain. Strict mode cannot navigate to instructor/settings or enable PILOT/route/trace/labels/debug. Begin freezes station, controller, weather, rules, geometry and software as before. Human notes remain separate; JSON checksum and immutable finalized payload behavior remain intact. Archived v0.2 station data stays importable. UI translation never mutates profile labels or source metadata in records.

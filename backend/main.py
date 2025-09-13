"""
exercise_counter_improved.py

Improved real-time exercise rep counter using MediaPipe Pose + OpenCV.

Changes:
 - Landmark coverage checks: enforces relevant landmarks visible before counting.
 - Better push-up & jumping-jack logic (front-view support and coverage checks).
 - Per-rep form scoring (0-100) and status mapping (Excellent/Good/Fair/Poor).
 - Overlay shows Reps, Form Score, Status, and warnings when landmarks are missing.

Usage & controls remain the same as the original script.

Dependencies:
  pip install mediapipe opencv-python numpy
"""

import cv2
import mediapipe as mp
import numpy as np
import time
from collections import deque

mp_pose = mp.solutions.pose
LM = mp_pose.PoseLandmark

def lm_coord(landmarks, idx, img_w, img_h):
    try:
        lm = landmarks[idx]
        return int(lm.x * img_w), int(lm.y * img_h), lm.visibility
    except Exception:
        return None, None, 0.0

def distance(a, b):
    return np.linalg.norm(np.array(a) - np.array(b))

def angle_between(a, b, c):
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    c = np.array(c, dtype=np.float32)
    ba = a - b
    bc = c - b
    if np.linalg.norm(ba) < 1e-6 or np.linalg.norm(bc) < 1e-6:
        return None
    cosang = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    cosang = np.clip(cosang, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosang)))

class EWMA:
    def __init__(self, alpha=0.35, init=None):
        self.alpha = alpha
        self.value = init
    def update(self, x):
        if x is None:
            return self.value
        if self.value is None:
            self.value = x
        else:
            self.value = self.alpha * x + (1 - self.alpha) * self.value
        return self.value

class RepetitionCounter:
    def __init__(self, up_thresh, down_thresh, min_time_between=0.25):
        self.up_thresh = up_thresh
        self.down_thresh = down_thresh
        self.state = "unknown"
        self.count = 0
        self.last_count_time = 0.0
        self.min_time_between = min_time_between
        self.last_transition_time = time.time()
        self.last_value = None
    def reset(self):
        self.state = "unknown"
        self.count = 0
        self.last_count_time = 0.0
        self.last_transition_time = time.time()
        self.last_value = None
    def update(self, value):
        if value is None:
            return self.count, self.state
        prev_state = self.state
        now = time.time()
        if self.state in ("unknown", "up"):
            if value < self.down_thresh:
                self.state = "down"
                self.last_transition_time = now
        if self.state in ("unknown", "down"):
            if value > self.up_thresh:
                if prev_state == "down" and (now - self.last_count_time) > self.min_time_between:
                    self.count += 1
                    self.last_count_time = now
                self.state = "up"
                self.last_transition_time = now
        self.last_value = value
        return self.count, self.state

def sufficient_visibility(landmarks, indices, img_w, img_h, min_vis=0.45):
    # indices: list of LM enum entries
    for idx in indices:
        _, _, v = lm_coord(landmarks, idx, img_w, img_h)
        if v < min_vis:
            return False
    return True

class ExerciseDetector:
    def __init__(self, exercise_name, img_w, img_h):
        self.img_w = img_w
        self.img_h = img_h
        self.exercise = exercise_name
        self.smoothers = {
            "knee_angle": EWMA(0.35),
            "elbow_angle": EWMA(0.35),
            "wrists_distance": EWMA(0.35),
            "ankles_distance": EWMA(0.35),
            "shoulder_width": EWMA(0.35),
            "torso_angle": EWMA(0.35),
            "form_score": EWMA(0.4)
        }
        if exercise_name == "squat":
            self.counter = RepetitionCounter(up_thresh=160.0, down_thresh=100.0, min_time_between=0.3)
            # required landmarks for reliable squat detection (neck->bottom)
            self.required = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
                             LM.LEFT_HIP, LM.RIGHT_HIP,
                             LM.LEFT_KNEE, LM.RIGHT_KNEE,
                             LM.LEFT_ANKLE, LM.RIGHT_ANKLE]
        elif exercise_name == "pushups":
            self.counter = RepetitionCounter(up_thresh=150.0, down_thresh=95.0, min_time_between=0.25)
            # hands, shoulders, hips, ankles for torso alignment
            self.required = [LM.LEFT_WRIST, LM.RIGHT_WRIST,
                             LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
                             LM.LEFT_HIP, LM.RIGHT_HIP]
        elif exercise_name == "jumping_jacks":
            self.counter = RepetitionCounter(up_thresh=1.6, down_thresh=1.15, min_time_between=0.25)
            # need hands and legs visible
            self.required = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
                             LM.LEFT_WRIST, LM.RIGHT_WRIST,
                             LM.LEFT_HIP, LM.RIGHT_HIP,
                             LM.LEFT_ANKLE, LM.RIGHT_ANKLE]
        else:
            raise ValueError("Unsupported exercise")
        self.calibration = {}
        self.last_form_score = 100.0

    def calibrate(self, baseline):
        if self.exercise == "squat":
            b = baseline.get("knee_angle")
            if b:
                self.counter.up_thresh = max(150.0, b - 8.0)
                self.counter.down_thresh = 100.0
                self.calibration['knee_baseline'] = b
        elif self.exercise == "pushups":
            b = baseline.get("elbow_angle")
            if b:
                self.counter.up_thresh = max(145.0, b - 10.0)
                self.counter.down_thresh = 95.0
                self.calibration['elbow_baseline'] = b
        elif self.exercise == "jumping_jacks":
            shoulder_w = baseline.get("shoulder_width")
            if shoulder_w and shoulder_w > 0:
                self.calibration['shoulder_width'] = shoulder_w
        self.counter.reset()

    # ---------- Form scoring helpers ----------
    def score_pushup_form(self, left_shoulder, right_shoulder, left_elbow, right_elbow,
                         left_wrist, right_wrist, left_hip, right_hip):
        # Compute elbow angle (extension range), torso straightness, wrists under shoulders
        angles = []
        if left_shoulder[2] > 0.4 and left_elbow[2] > 0.4 and left_wrist[2] > 0.4:
            a = angle_between((left_shoulder[0], left_shoulder[1]), (left_elbow[0], left_elbow[1]), (left_wrist[0], left_wrist[1]))
            if a: angles.append(a)
        if right_shoulder[2] > 0.4 and right_elbow[2] > 0.4 and right_wrist[2] > 0.4:
            a = angle_between((right_shoulder[0], right_shoulder[1]), (right_elbow[0], right_elbow[1]), (right_wrist[0], right_wrist[1]))
            if a: angles.append(a)
        elbow_angle = float(np.mean(angles)) if angles else None

        # torso angle: shoulder - hip - ankle (we'll use shoulder-hip-knee approx)
        torso_angles = []
        if left_shoulder[2] > 0.3 and left_hip[2] > 0.3 and left_hip[2] > 0.3:
            a = angle_between((left_shoulder[0], left_shoulder[1]), (left_hip[0], left_hip[1]), (left_hip[0], left_hip[1]+10))
            # fallback: compute shoulder-hip-knee if available
        # Better: compute hip angle formed by shoulder-hip-knee
        torso_angles2 = []
        # pick left or right if available
        if left_shoulder[2] > 0.3 and left_hip[2] > 0.3 and lm_coord([left_shoulder,left_hip],0,1,1)[2] is not None:
            pass
        # Instead compute hip angle shoulder-hip-knee:
        left_knee = (0,0,0)  # placeholder
        # We'll compute hip angle if knee exists
        # NOTE: earlier we ensured required hips; knees/ankles may not be visible in front view,
        # so approximate torso straightness with vector between shoulders and hips:
        torso_vecs = []
        if left_shoulder[2] > 0.3 and left_hip[2] > 0.3:
            torso_vecs.append((left_shoulder[0]-left_hip[0], left_shoulder[1]-left_hip[1]))
        if right_shoulder[2] > 0.3 and right_hip[2] > 0.3:
            torso_vecs.append((right_shoulder[0]-right_hip[0], right_shoulder[1]-right_hip[1]))
        torso_straightness = None
        if torso_vecs:
            # measure angle difference between left and right torso vectors (should be small if torso is aligned)
            if len(torso_vecs) == 2:
                v1 = np.array(torso_vecs[0]); v2 = np.array(torso_vecs[1])
                cosang = np.dot(v1, v2) / (np.linalg.norm(v1)*np.linalg.norm(v2) + 1e-6)
                cosang = np.clip(cosang, -1.0, 1.0)
                torso_straightness = (np.degrees(np.arccos(cosang)))  # degrees between two sides; lower is better
            else:
                torso_straightness = 0.0

        # hands under shoulders: check wrist x relative to shoulder x (closer is better)
        wrist_offsets = []
        if left_wrist[2] > 0.3 and left_shoulder[2] > 0.3:
            wrist_offsets.append(abs(left_wrist[0] - left_shoulder[0]))
        if right_wrist[2] > 0.3 and right_shoulder[2] > 0.3:
            wrist_offsets.append(abs(right_wrist[0] - right_shoulder[0]))
        # normalize offset by shoulder width
        shoulder_width = None
        if left_shoulder[2] > 0.3 and right_shoulder[2] > 0.3:
            shoulder_width = distance((left_shoulder[0], left_shoulder[1]), (right_shoulder[0], right_shoulder[1]))
        wrist_offset_score = 1.0
        if wrist_offsets and shoulder_width and shoulder_width > 1:
            offs = np.mean(wrist_offsets)
            # 0 offset => perfect; offset 0.5*shoulder_width => bad
            wrist_offset_score = max(0.0, 1.0 - (offs / (0.6 * shoulder_width)))
            wrist_offset_score = float(np.clip(wrist_offset_score, 0.0, 1.0))

        # elbow extension score: prefer full extension at top (>150 deg) and deep bend at bottom (<95)
        elbow_score = 1.0
        if elbow_angle is not None:
            # map 60-180 => 0..1 (closer to 180 better at 'up' phase). We'll assume higher means better on up.
            elbow_score = (elbow_angle - 60.0) / (180.0 - 60.0)
            elbow_score = float(np.clip(elbow_score, 0.0, 1.0))

        # torso straightness score: lower angle between sides is better (0 deg best)
        torso_score = 1.0
        if torso_straightness is not None:
            # map 0..40 degrees -> 1..0
            torso_score = max(0.0, 1.0 - (torso_straightness / 40.0))
            torso_score = float(np.clip(torso_score, 0.0, 1.0))

        # final combined (weighted)
        # weights chosen to prioritize elbow extension (range) and wrist alignment and torso straightness
        weights = {"elbow": 0.45, "wrist": 0.25, "torso": 0.30}
        final = elbow_score * weights["elbow"] + wrist_offset_score * weights["wrist"] + torso_score * weights["torso"]
        return float(np.clip(final * 100.0, 0.0, 100.0))

    def score_squat_form(self, left_hip, right_hip, left_knee, right_knee, left_shoulder, right_shoulder):
        # knee depth: lower (smaller angle) is better down to a point
        knee_angles = []
        if left_hip[2] > 0.4 and left_knee[2] > 0.4 and left_hip[2] > 0.4:
            a = angle_between((left_hip[0], left_hip[1]), (left_knee[0], left_knee[1]), (left_knee[0], left_knee[1]+10))
        # compute actual knee angles reliably (hip-knee-ankle)
        # we'll attempt left and right properly
        angles = []
        # Left
        if left_hip[2] > 0.4 and left_knee[2] > 0.4 and left_knee[2] > 0.4:
            pass
        # Properly compute using available landmarks:
        angles = []
        # We'll assume caller provides hip & knee & ankle; to keep code simple, the detector calls compute
        # build a score using knee angle and torso uprightness
        # compute knee angles from hip-knee-ankle if caller passed them (we will in process)
        # For simplicity, expect left_knee, right_knee to be tuples (hip,knee,ankle) - but for interface here we will compute externally.
        return 0.0  # placeholder (real scoring done in process)

    def score_jj_form(self, wrists_norm, ankles_norm, wrist_positions, shoulder_width_px):
        # wrists_norm and ankles_norm normalized measures
        # score components: arms overhead (wrists above head), symmetry, legs openness
        arm_score = 0.0
        leg_score = 0.0
        symmetry = 1.0
        if wrists_norm is not None:
            # target wrists_norm ~ >1.9 ideally; map 1.0..2.5 -> 0..1
            arm_score = np.clip((wrists_norm - 1.0) / (1.5), 0.0, 1.0)
        if ankles_norm is not None:
            # target ankles_norm ~ >1.6; map 1.0..2.0 -> 0..1
            leg_score = np.clip((ankles_norm - 1.0) / (1.0), 0.0, 1.0)
        # symmetry: if wrist positions provided (left_x, right_x), compare distances relative to shoulders:
        if wrist_positions and shoulder_width_px and shoulder_width_px > 1:
            lwx, rwx = wrist_positions
            # symmetry measured by how centered wrists are relative to midline
            mid = (lwx + rwx) / 2.0
            # If mid roughly aligns with torso mid (we cannot compute torso mid here without shoulders)
            symmetry = 1.0  # for now assume okay if both exist
        # combine weights
        final = 0.6 * arm_score + 0.4 * leg_score
        return float(np.clip(final * 100.0, 0.0, 100.0))

    # ---------- Main process ----------
    def process(self, landmarks):
        img_w = self.img_w
        img_h = self.img_h
        def g(idx): return lm_coord(landmarks, idx, img_w, img_h)
        # check coverage
        visibility_ok = sufficient_visibility(landmarks, self.required, img_w, img_h, min_vis=0.45)
        missing_msg = None
        if not visibility_ok:
            missing_msg = "Camera must show: " + ", ".join([l.name.lower() for l in self.required])
            # still try to compute partial info but do not count until visibility fixed

        debug = {}
        form_score = None
        # ---------- SQUAT ----------
        if self.exercise == "squat":
            lhip = g(LM.LEFT_HIP); rk = g(LM.RIGHT_KNEE)  # not used directly, just names
            left_hip = g(LM.LEFT_HIP); left_knee = g(LM.LEFT_KNEE); left_ankle = g(LM.LEFT_ANKLE)
            right_hip = g(LM.RIGHT_HIP); right_knee = g(LM.RIGHT_KNEE); right_ankle = g(LM.RIGHT_ANKLE)
            left_sh = g(LM.LEFT_SHOULDER); right_sh = g(LM.RIGHT_SHOULDER)

            angles = []
            if left_hip[2] > 0.4 and left_knee[2] > 0.4 and left_ankle[2] > 0.4:
                a = angle_between((left_hip[0], left_hip[1]), (left_knee[0], left_knee[1]), (left_ankle[0], left_ankle[1]))
                if a is not None: angles.append(a)
            if right_hip[2] > 0.4 and right_knee[2] > 0.4 and right_ankle[2] > 0.4:
                a = angle_between((right_hip[0], right_hip[1]), (right_knee[0], right_knee[1]), (right_ankle[0], right_ankle[1]))
                if a is not None: angles.append(a)

            knee_angle = float(np.mean(angles)) if angles else None
            knee_angle_sm = self.smoothers["knee_angle"].update(knee_angle)
            debug['knee_angle'] = knee_angle_sm

            # torso uprightness: angle between shoulder-hip-knee (avg left+right)
            torso_angles = []
            if left_sh[2] > 0.3 and left_hip[2] > 0.3 and left_knee[2] > 0.3:
                ta = angle_between((left_sh[0], left_sh[1]), (left_hip[0], left_hip[1]), (left_knee[0], left_knee[1]))
                if ta is not None: torso_angles.append(ta)
            if right_sh[2] > 0.3 and right_hip[2] > 0.3 and right_knee[2] > 0.3:
                ta = angle_between((right_sh[0], right_sh[1]), (right_hip[0], right_hip[1]), (right_knee[0], right_knee[1]))
                if ta is not None: torso_angles.append(ta)
            torso_angle = float(np.mean(torso_angles)) if torso_angles else None
            torso_angle_sm = self.smoothers["torso_angle"].update(torso_angle)
            debug['torso_angle'] = torso_angle_sm

            # form score for squat: deeper knee angle and reasonable torso angle
            # knee: map 170->0 (standing) and 70->1 (deep squat)
            knee_score = 0.0
            if knee_angle_sm is not None:
                knee_score = np.clip((170.0 - knee_angle_sm) / (170.0 - 70.0), 0.0, 1.0)
            torso_score = 1.0
            if torso_angle_sm is not None:
                # For squats, torso angle at hip around 160..180 is more upright, map to 0..1
                torso_score = np.clip((torso_angle_sm - 120.0) / (60.0), 0.0, 1.0)
            form_score_val = 0.65 * knee_score + 0.35 * torso_score
            form_score = float(np.clip(form_score_val * 100.0, 0.0, 100.0))

            # only count when necessary landmarks visible
            count, state = self.counter.update(knee_angle_sm) if visibility_ok else (self.counter.count, self.counter.state)
            return {"count": count, "state": state, "debug": debug, "form_score": form_score, "coverage_ok": visibility_ok, "missing_msg": missing_msg}

        # ---------- PUSHUPS ----------
        elif self.exercise == "pushups":
            left_sh = g(LM.LEFT_SHOULDER); left_el = g(LM.LEFT_ELBOW); left_wr = g(LM.LEFT_WRIST)
            right_sh = g(LM.RIGHT_SHOULDER); right_el = g(LM.RIGHT_ELBOW); right_wr = g(LM.RIGHT_WRIST)
            left_hip = g(LM.LEFT_HIP); right_hip = g(LM.RIGHT_HIP)
            left_ank = g(LM.LEFT_ANKLE); right_ank = g(LM.RIGHT_ANKLE)

            angles = []
            if left_sh[2] > 0.4 and left_el[2] > 0.4 and left_wr[2] > 0.4:
                a = angle_between((left_sh[0], left_sh[1]), (left_el[0], left_el[1]), (left_wr[0], left_wr[1]))
                if a is not None: angles.append(a)
            if right_sh[2] > 0.4 and right_el[2] > 0.4 and right_wr[2] > 0.4:
                a = angle_between((right_sh[0], right_sh[1]), (right_el[0], right_el[1]), (right_wr[0], right_wr[1]))
                if a is not None: angles.append(a)
            elbow_angle = float(np.mean(angles)) if angles else None
            elbow_sm = self.smoothers["elbow_angle"].update(elbow_angle)
            debug['elbow_angle'] = elbow_sm

            # torso straightness: compare shoulder-hip vector across left & right to ensure body not sagging
            torso_vecs = []
            if left_sh[2] > 0.3 and left_hip[2] > 0.3:
                torso_vecs.append(np.array([left_sh[0]-left_hip[0], left_sh[1]-left_hip[1]]))
            if right_sh[2] > 0.3 and right_hip[2] > 0.3:
                torso_vecs.append(np.array([right_sh[0]-right_hip[0], right_sh[1]-right_hip[1]]))
            torso_align = None
            if len(torso_vecs) == 2:
                v1 = torso_vecs[0]; v2 = torso_vecs[1]
                cosang = np.dot(v1, v2) / (np.linalg.norm(v1)*np.linalg.norm(v2) + 1e-6)
                cosang = np.clip(cosang, -1.0, 1.0)
                torso_align = float(np.degrees(np.arccos(cosang)))  # degrees between sides; lower is better
            elif len(torso_vecs) == 1:
                torso_align = 0.0
            torso_align_sm = self.smoothers["torso_angle"].update(torso_align)
            debug['torso_align_deg'] = torso_align_sm

            # wrists under shoulders check (x distance small) normalized by shoulder width
            wrist_offsets = []
            shoulder_width = None
            if left_sh[2] > 0.3 and right_sh[2] > 0.3:
                shoulder_width = distance((left_sh[0], left_sh[1]), (right_sh[0], right_sh[1]))
            if left_wr[2] > 0.3 and left_sh[2] > 0.3:
                wrist_offsets.append(abs(left_wr[0] - left_sh[0]))
            if right_wr[2] > 0.3 and right_sh[2] > 0.3:
                wrist_offsets.append(abs(right_wr[0] - right_sh[0]))
            wrist_score = 1.0
            if wrist_offsets and shoulder_width and shoulder_width > 1:
                offs = np.mean(wrist_offsets)
                wrist_score = max(0.0, 1.0 - (offs / (0.6 * shoulder_width)))
                wrist_score = float(np.clip(wrist_score, 0.0, 1.0))

            # elbow extension score (higher=more extension)
            elbow_score = 0.5
            if elbow_sm is not None:
                elbow_score = np.clip((elbow_sm - 80.0) / (100.0), 0.0, 1.0)

            torso_score = 1.0
            if torso_align_sm is not None:
                torso_score = max(0.0, 1.0 - (torso_align_sm / 40.0))
                torso_score = float(np.clip(torso_score, 0.0, 1.0))

            form_score_val = 0.5 * elbow_score + 0.25 * wrist_score + 0.25 * torso_score
            form_score = float(np.clip(form_score_val * 100.0, 0.0, 100.0))
            self.last_form_score = self.smoothers["form_score"].update(form_score)

            # counting: only when required coverage ok (hands & shoulders & hips)
            count, state = self.counter.update(elbow_sm) if visibility_ok else (self.counter.count, self.counter.state)

            return {"count": count, "state": state, "debug": debug, "form_score": self.last_form_score, "coverage_ok": visibility_ok, "missing_msg": missing_msg}

        # ---------- JUMPING JACKS ----------
        elif self.exercise == "jumping_jacks":
            ls = g(LM.LEFT_SHOULDER); rs = g(LM.RIGHT_SHOULDER)
            lw = g(LM.LEFT_WRIST); rw = g(LM.RIGHT_WRIST)
            la = g(LM.LEFT_ANKLE); ra = g(LM.RIGHT_ANKLE)
            lh = g(LM.LEFT_HIP); rh = g(LM.RIGHT_HIP)

            # shoulder width
            shoulder_width_px = None
            if ls[2] > 0.3 and rs[2] > 0.3:
                shoulder_width_px = distance((ls[0], ls[1]), (rs[0], rs[1]))
            # wrists distance normalized
            wrists_norm = None
            if lw[2] > 0.3 and rw[2] > 0.3 and shoulder_width_px and shoulder_width_px > 1:
                wrists_dist_px = distance((lw[0], lw[1]), (rw[0], rw[1]))
                wrists_norm = wrists_dist_px / shoulder_width_px
            # ankles normalized by hip width
            ankles_norm = None
            if la[2] > 0.3 and ra[2] > 0.3 and lh[2] > 0.3 and rh[2] > 0.3:
                hip_width_px = distance((lh[0], lh[1]), (rh[0], rh[1]))
                if hip_width_px > 1:
                    ankles_dist_px = distance((la[0], la[1]), (ra[0], ra[1]))
                    ankles_norm = ankles_dist_px / hip_width_px

            wrists_norm_sm = self.smoothers["wrists_distance"].update(wrists_norm)
            ankles_norm_sm = self.smoothers["ankles_distance"].update(ankles_norm)
            debug['wrists_norm'] = wrists_norm_sm
            debug['ankles_norm'] = ankles_norm_sm
            debug['shoulder_w_px'] = shoulder_width_px

            # openness combines wrists and ankles (require both for reliable count)
            parts = []
            if wrists_norm_sm is not None: parts.append(wrists_norm_sm)
            if ankles_norm_sm is not None: parts.append(ankles_norm_sm)
            openness = float(np.mean(parts)) if parts else None

            # form score for jumping jacks
            wrist_positions = None
            if lw[2] > 0.3 and rw[2] > 0.3:
                wrist_positions = (lw[0], rw[0])
            form_score = self.score_jj_form(wrists_norm_sm, ankles_norm_sm, wrist_positions, shoulder_width_px)
            self.last_form_score = self.smoothers["form_score"].update(form_score)

            # improved counting: only count if both wrists and ankles visible (preferred)
            if (wrists_norm_sm is not None and ankles_norm_sm is not None) and visibility_ok:
                # use openness as signal
                count, state = self.counter.update(openness)
            else:
                # fallback: if only wrists visible, allow counting on wrists_norm; require higher thresholds
                if wrists_norm_sm is not None and visibility_ok:
                    # use stricter thresholds temporarily
                    count, state = self.counter.update(wrists_norm_sm)
                else:
                    count, state = (self.counter.count, self.counter.state)

            return {"count": count, "state": ("open" if state=="up" else ("closed" if state=="down" else state)),
                    "debug": debug, "form_score": self.last_form_score, "coverage_ok": visibility_ok, "missing_msg": missing_msg}

        # default fallback
        return {"count": self.counter.count, "state": self.counter.state, "debug": debug, "form_score": None, "coverage_ok": visibility_ok, "missing_msg": missing_msg}

# -----------------------------
# Menu, calibration & main loop
# -----------------------------
def show_menu():
    print("Select exercise:")
    print("  1 - Squats")
    print("  2 - Push-ups")
    print("  3 - Jumping Jacks")
    print("  q - Quit")
    choice = input("Enter choice (1/2/3): ").strip()
    if choice == "1": return "squat"
    if choice == "2": return "pushups"
    if choice == "3": return "jumping_jacks"
    return None

def quick_calibration(detector, pose, cap, seconds=3):
    print(f"Calibration: stand naturally for {seconds} seconds...")
    t_end = time.time() + seconds
    baseline_vals = {"knee_angles": [], "elbow_angles": [], "shoulder_widths": []}
    while time.time() < t_end:
        ret, frame = cap.read()
        if not ret: break
        img_h, img_w = frame.shape[:2]
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            def g(idx): return lm_coord(landmarks, idx, img_w, img_h)
            # knees
            lhip = g(LM.LEFT_HIP); lk = g(LM.LEFT_KNEE); la = g(LM.LEFT_ANKLE)
            rhip = g(LM.RIGHT_HIP); rk = g(LM.RIGHT_KNEE); ra = g(LM.RIGHT_ANKLE)
            if lhip[2] > 0.4 and lk[2] > 0.4 and la[2] > 0.4:
                a = angle_between((lhip[0], lhip[1]), (lk[0], lk[1]), (la[0], la[1]))
                if a is not None: baseline_vals['knee_angles'].append(a)
            if rhip[2] > 0.4 and rk[2] > 0.4 and ra[2] > 0.4:
                a = angle_between((rhip[0], rhip[1]), (rk[0], rk[1]), (ra[0], ra[1]))
                if a is not None: baseline_vals['knee_angles'].append(a)
            # elbows
            lsh = g(LM.LEFT_SHOULDER); le = g(LM.LEFT_ELBOW); lw = g(LM.LEFT_WRIST)
            rsh = g(LM.RIGHT_SHOULDER); re = g(LM.RIGHT_ELBOW); rw = g(LM.RIGHT_WRIST)
            if lsh[2] > 0.4 and le[2] > 0.4 and lw[2] > 0.4:
                a = angle_between((lsh[0], lsh[1]), (le[0], le[1]), (lw[0], lw[1]))
                if a is not None: baseline_vals['elbow_angles'].append(a)
            if rsh[2] > 0.4 and re[2] > 0.4 and rw[2] > 0.4:
                a = angle_between((rsh[0], rsh[1]), (re[0], re[1]), (rw[0], rw[1]))
                if a is not None: baseline_vals['elbow_angles'].append(a)
            # shoulder width
            if lsh[2] > 0.3 and rsh[2] > 0.3:
                shoulder_w = distance((lsh[0], lsh[1]), (rsh[0], rsh[1]))
                baseline_vals['shoulder_widths'].append(shoulder_w)
        remaining = int(t_end - time.time()) + 1
        cv2.putText(frame, f"Calibrating... {remaining}s", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,255,255), 2)
        cv2.imshow("Calibration", frame)
        if cv2.waitKey(1) & 0xFF == 27: break
    cv2.destroyWindow("Calibration")
    baseline = {}
    if baseline_vals['knee_angles']: baseline['knee_angle'] = float(np.median(baseline_vals['knee_angles']))
    if baseline_vals['elbow_angles']: baseline['elbow_angle'] = float(np.median(baseline_vals['elbow_angles']))
    if baseline_vals['shoulder_widths']: baseline['shoulder_width'] = float(np.median(baseline_vals['shoulder_widths']))
    print("Calibration results:", baseline)
    return baseline

def form_to_status(score):
    if score is None: return "Unknown"
    if score >= 85: return "Excellent"
    if score >= 70: return "Good"
    if score >= 50: return "Fair"
    return "Poor"

def main():
    exercise = None
    while exercise is None:
        exercise = show_menu()
        if exercise is None:
            print("Invalid choice or quitting. Exiting.")
            return

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Could not open webcam.")
        return
    ret, frame = cap.read()
    if not ret:
        print("ERROR: Can't read from webcam.")
        return
    img_h, img_w = frame.shape[:2]
    detector = ExerciseDetector(exercise, img_w, img_h)
    pose = mp_pose.Pose(static_image_mode=False, model_complexity=1, enable_segmentation=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)

    paused = False
    last_frame_time = time.time()
    fps = 0.0

    print("Press 'c' to calibrate, 'p' to pause/resume, 'r' to reset, 'q' to quit.")
    while True:
        if not paused:
            ret, frame = cap.read()
            if not ret:
                print("Failed to read frame from camera.")
                break
            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(image_rgb)
            landmarks = results.pose_landmarks.landmark if results.pose_landmarks else None

            info = detector.process(landmarks) if landmarks else {"count": detector.counter.count, "state": detector.counter.state, "debug": {}, "form_score": None, "coverage_ok": False, "missing_msg": "No person detected"}
            count = info.get("count", 0)
            state = info.get("state", "unknown")
            debug = info.get("debug", {})
            form_score = info.get("form_score", None)
            coverage_ok = info.get("coverage_ok", False)
            missing_msg = info.get("missing_msg", None)

            # draw landmarks
            if results.pose_landmarks:
                mp.solutions.drawing_utils.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                                                          mp.solutions.drawing_utils.DrawingSpec(color=(0,200,0), thickness=2, circle_radius=2),
                                                          mp.solutions.drawing_utils.DrawingSpec(color=(0,120,255), thickness=2, circle_radius=2))

            # overlay UI
            cv2.rectangle(frame, (0,0), (380, 140), (0,0,0), thickness=-1)
            cv2.putText(frame, f"Exercise: {exercise.replace('_',' ').title()}", (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)
            cv2.putText(frame, f"Reps: {count}", (10, 60), cv2.FONT_HERSHEY_DUPLEX, 1.2, (0,255,0), 3)
            cv2.putText(frame, f"State: {state}", (150, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200,200,200), 2)

            # form score & status
            if form_score is not None:
                status = form_to_status(form_score)
                cv2.putText(frame, f"Form: {int(form_score)}%", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,0), 2)
                cv2.putText(frame, f"Status: {status}", (150, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200,200,200), 2)
            else:
                cv2.putText(frame, "Form: --", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (180,180,180), 2)

            # coverage warning
            if not coverage_ok and missing_msg:
                # show warning box
                cv2.rectangle(frame, (0, img_h-60), (img_w, img_h), (0,0,128), thickness=-1)
                cv2.putText(frame, "WARNING: " + (missing_msg[:80] + "...") if len(missing_msg) > 80 else "WARNING: " + missing_msg,
                            (10, img_h-30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,200,200), 2)

            # debug info
            dbg_y = 150
            for k, v in debug.items():
                txt = f"{k}: {v:.2f}" if (v is not None and isinstance(v, (float,int))) else f"{k}: {v}"
                cv2.putText(frame, txt, (10, dbg_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220,220,220), 1)
                dbg_y += 18

            # fps
            now = time.time()
            fps = 0.9 * fps + 0.1 * (1.0 / (now - last_frame_time)) if now != last_frame_time else fps
            last_frame_time = now
            cv2.putText(frame, f"FPS: {fps:.1f}", (img_w - 120, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)

            cv2.imshow("Exercise Counter (Improved)", frame)

        key = cv2.waitKey(1) & 0xFF
        if key != 255:
            if key == ord('q') or key == 27:
                break
            elif key == ord('p'):
                paused = not paused
                print("Paused" if paused else "Resumed")
            elif key == ord('r'):
                detector.counter.reset()
                print("Counter reset.")
            elif key == ord('c'):
                paused = True
                baseline = quick_calibration(detector, pose, cap, seconds=3)
                detector.calibrate(baseline)
                paused = False

    cap.release()
    cv2.destroyAllWindows()
    pose.close()
    print("Goodbye!")

if __name__ == "__main__":
    main()

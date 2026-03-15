/**
 * MediaPipe Hands — Live Hand Gesture Control
 * Gesture classification and action mapping (no jQuery in this file for timing; use global jQuery for modal)
 */
(function () {
  'use strict';

  var video = document.getElementById('gesture-video');
  var canvas = document.getElementById('gesture-canvas');
  var ctx = canvas.getContext('2d');
  var toggleBtn = document.getElementById('gesture-toggle-btn');
  var placeholder = document.getElementById('gesture-placeholder');
  var gestureDisplayName = document.getElementById('gesture-display-name');
  var confidenceBar = document.getElementById('gesture-confidence-bar');
  var stream = null;
  var gestureCooldown = false;
  var COOLDOWN_MS = 1500;

  // MediaPipe Hands landmark indices
  var WRIST = 0, THUMB_TIP = 4, INDEX_TIP = 8, INDEX_PIP = 6, MIDDLE_TIP = 12, MIDDLE_PIP = 10;
  var RING_TIP = 16, RING_PIP = 14, PINKY_TIP = 20, PINKY_PIP = 18;

  function isExtended(landmarks, tipIdx, pipIdx) {
    if (!landmarks[tipIdx] || !landmarks[pipIdx]) return false;
    return landmarks[tipIdx].y < landmarks[pipIdx].y;
  }

  function classifyGesture(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;
    var indexUp = isExtended(landmarks, INDEX_TIP, INDEX_PIP);
    var middleUp = isExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP);
    var ringUp = isExtended(landmarks, RING_TIP, RING_PIP);
    var pinkyUp = isExtended(landmarks, PINKY_TIP, PINKY_PIP);
    var thumbUp = landmarks[THUMB_TIP].y < landmarks[2].y;

    var fingersUp = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
    if (fingersUp === 0 && !thumbUp) return 'fist';
    if (indexUp && !middleUp && !ringUp && !pinkyUp) return 'pointing';
    if (indexUp && middleUp && !ringUp && !pinkyUp) return 'peace';
    if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) return 'thumbsup';
    if (fingersUp >= 4 || (fingersUp >= 3 && thumbUp)) return 'openpalm';
    return null;
  }

  var gestureActions = {
    fist: function () {
      document.body.classList.add('ai-mode');
      setTimeout(function () { document.body.classList.remove('ai-mode'); }, 2000);
    },
    peace: function () { showAIFactToast(); },
    thumbsup: function () {
      if (window.jQuery && window.jQuery('#hireModal').length) {
        window.jQuery('#hireModal').modal('show');
      }
    },
    openpalm: function () {
      if (typeof window.floatSkillTags === 'function') window.floatSkillTags();
    },
    pointing: function () {
      if (window.jQuery) {
        window.jQuery('html, body').animate({ scrollTop: 0 }, 600);
      }
    }
  };

  var aiFacts = [
    'GPT-4 has ~1.8 trillion parameters across 120 expert layers.',
    'YOLOv8 can detect objects in under 2ms on modern GPUs.',
    'RAG reduces LLM hallucinations by grounding answers in retrieved context.',
    'MediaPipe runs on-device — zero data leaves your browser.',
    'ElevenLabs can clone a voice from just 1 minute of audio.'
  ];

  function showAIFactToast() {
    var toast = document.createElement('div');
    toast.className = 'ai-fact-toast';
    toast.textContent = aiFacts[Math.floor(Math.random() * aiFacts.length)];
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3500);
  }

  var lastGesture = null;
  var hands = null;
  var detectionPaused = false;

  function drawLandmarksFallback(ctx, landmarks, width, height) {
    if (!landmarks || !landmarks.length) return;
    ctx.strokeStyle = '#00d4ff';
    ctx.fillStyle = '#7c3aed';
    for (var i = 0; i < landmarks.length; i++) {
      var x = landmarks[i].x * width;
      var y = landmarks[i].y * height;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  }

  function onResults(results) {
    if (!ctx || !canvas) return;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      var landmarks = results.multiHandLandmarks[0];
      if (typeof window.drawConnectors === 'function' && typeof window.drawLandmarks === 'function' && window.HAND_CONNECTIONS) {
        try {
          window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#00d4ff', lineWidth: 2 });
          window.drawLandmarks(ctx, landmarks, { color: '#7c3aed', lineWidth: 1 });
        } catch (e) {
          drawLandmarksFallback(ctx, landmarks, canvas.width, canvas.height);
        }
      } else {
        drawLandmarksFallback(ctx, landmarks, canvas.width, canvas.height);
      }
      var gesture = classifyGesture(landmarks);
      var confidence = 0.9;
      confidenceBar.style.width = (confidence * 100) + '%';
      confidenceBar.setAttribute('aria-valuenow', Math.round(confidence * 100));
      if (gesture) {
        gestureDisplayName.textContent = gesture;
        if (!gestureCooldown && gestureActions[gesture]) {
          gestureCooldown = true;
          gestureActions[gesture]();
          setTimeout(function () { gestureCooldown = false; }, COOLDOWN_MS);
        }
        lastGesture = gesture;
      } else {
        lastGesture = null;
        gestureDisplayName.textContent = '—';
      }
    } else {
      lastGesture = null;
      gestureDisplayName.textContent = '—';
      confidenceBar.style.width = '0%';
    }
    ctx.restore();
  }

  function detectLoop() {
    if (!hands || !stream || !video.srcObject || video.readyState < 2) return;
    if (detectionPaused) return;
    hands.send({ image: video }).then(function () {
      if (!detectionPaused) requestAnimationFrame(detectLoop);
    }).catch(function () {
      if (!detectionPaused) requestAnimationFrame(detectLoop);
    });
  }

  function startCamera() {
    if (stream) return;
    if (placeholder) placeholder.classList.add('hidden');
    navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } }).then(function (s) {
      stream = s;
      video.srcObject = stream;
      video.play();
      toggleBtn.textContent = 'Disable Webcam';
      video.onloadeddata = function () {
        if (hands) detectLoop();
      };
    }).catch(function () {
      gestureDisplayName.textContent = 'Camera access denied';
      if (placeholder) placeholder.classList.remove('hidden');
    });
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    video.srcObject = null;
    toggleBtn.textContent = 'Enable Webcam';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gestureDisplayName.textContent = '—';
    confidenceBar.style.width = '0%';
    if (placeholder) placeholder.classList.remove('hidden');
  }

  toggleBtn.addEventListener('click', function () {
    if (stream) stopCamera(); else startCamera();
  });

  // Pause detection when gesture section is out of view — prevents lag when navigating/scrolling
  var gestureSection = document.getElementById('gesture-section');
  if (gestureSection && typeof IntersectionObserver !== 'undefined') {
    var observer = new IntersectionObserver(
      function (entries) {
        var ent = entries[0];
        if (!ent) return;
        detectionPaused = !ent.isIntersecting;
        if (ent.isIntersecting && stream && video.srcObject && hands) {
          detectLoop();
        }
      },
      { root: null, rootMargin: '0px', threshold: 0.1 }
    );
    observer.observe(gestureSection);
  }

  function initHands() {
    if (typeof Hands === 'undefined') {
      setTimeout(initHands, 100);
      return;
    }
    hands = new Hands({
      locateFile: function (file) {
        return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + file;
      }
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });
    hands.onResults(onResults);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHands);
  } else {
    initHands();
  }
})();

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, XCircle, AlertCircle, Sparkles, Shield } from 'lucide-react';
import { VerificationResult } from '@/types/attendance';
import { useAuth } from '@/context/AuthContext';
import { buildDemoFaceResult } from '@/lib/attendance/demoFace';

interface FaceCapturePanelProps {
  employeeName: string;
  employeeCode: string;
  isOffline: boolean;
  onVerificationComplete: (result: VerificationResult) => void;
  onReset: () => void;
  overrideSimulate?: 'pass' | 'fail_biometric' | 'camera_denied' | 'camera_unavailable';
}

export function FaceCapturePanel({
  employeeName,
  employeeCode,
  isOffline,
  onVerificationComplete,
  onReset,
  overrideSimulate = 'pass',
}: FaceCapturePanelProps) {
  const { isMockMode } = useAuth();
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'>('idle');
  const [captureProgress, setCaptureProgress] = useState<'idle' | 'capturing' | 'analyzing' | 'complete'>('idle');
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [result, setResult] = useState<VerificationResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = async () => {
    setCameraState('requesting');

    if (overrideSimulate === 'camera_denied') {
      setTimeout(() => setCameraState('denied'), 600);
      return;
    }
    if (overrideSimulate === 'camera_unavailable') {
      setTimeout(() => setCameraState('unavailable'), 600);
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('unavailable');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraState('active');
    } catch (err: unknown) {
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setCameraState('denied');
      } else {
        setCameraState('unavailable');
      }
    }
  };

  const handleCaptureAndVerify = async () => {
    setCaptureProgress('capturing');
    setAnalysisStep(isMockMode ? 'Aligning facial landmarks in capture frame...' : 'Capturing image...');

    await new Promise((r) => setTimeout(r, 600));
    setCaptureProgress('analyzing');
    setAnalysisStep(
      isMockMode ? 'Analyzing biometric confidence & illumination quality...' : 'Recording face capture...'
    );

    await new Promise((r) => setTimeout(r, isMockMode ? 700 : 300));

    // Determine result
    let verification: VerificationResult;

    if (!isMockMode) {
      verification = buildDemoFaceResult(isOffline);
    } else if (overrideSimulate === 'fail_biometric') {
      verification = {
        isVerified: false,
        score: 0.44,
        mode: isOffline ? 'offline_sync' : 'face_facility',
        faceMatch: false,
        facilityMatch: true,
        message: 'Biometric confidence threshold not met (0.44 < 0.85). Face match could not be confirmed.',
        timestamp: new Date().toISOString(),
      };
    } else {
      const score = 0.96;
      verification = {
        isVerified: true,
        score,
        mode: isOffline ? 'offline_sync' : 'face_facility',
        faceMatch: true,
        facilityMatch: true,
        gpsDistanceMeters: 38,
        message: isOffline
          ? 'Biometric verified against cached enrollment. Attendance buffered for offline sync.'
          : 'Identity verified with 96% confidence score.',
        timestamp: new Date().toISOString(),
      };
    }

    setResult(verification);
    setCaptureProgress('complete');
    stopCamera();
    onVerificationComplete(verification);
  };

  const handleRetry = () => {
    setResult(null);
    setCaptureProgress('idle');
    setCameraState('idle');
    onReset();
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-border-subtle p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-brand-primary">Facial Verification</h2>
          <p className="text-xs text-brand-muted">
            Confirm identity for {employeeName} ({employeeCode})
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-ivory text-brand-primary border border-brand-border-subtle text-xs font-medium">
          <Shield className="w-3.5 h-3.5 text-brand-secondary" />
          <span>Biometric Safeguards</span>
        </div>
      </div>

      {/* Main Camera Viewport Area */}
      <div className="relative w-full aspect-[4/3] max-w-md mx-auto rounded-2xl overflow-hidden bg-brand-charcoal flex items-center justify-center border-2 border-brand-border">
        {cameraState === 'idle' && (
          <div className="text-center p-6 text-white space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-brand-mint">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-sm">Face Verification Ready</p>
              <p className="text-xs text-brand-mint/70 mt-1 max-w-xs">
                To respect employee privacy, camera access only begins when explicitly initiated.
              </p>
            </div>
            <button
              onClick={startCamera}
              className="px-5 py-2.5 bg-brand-secondary hover:bg-brand-secondary-hover text-white rounded-xl text-xs font-semibold shadow-subtle transition inline-flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera Preview</span>
            </button>
          </div>
        )}

        {cameraState === 'requesting' && (
          <div className="text-center p-6 text-white space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-mint" />
            <p className="text-xs font-medium">Requesting camera device permission...</p>
          </div>
        )}

        {cameraState === 'denied' && (
          <div className="text-center p-6 text-white space-y-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-rose-300">Camera Permission Denied</p>
            <p className="text-xs text-white/70 max-w-xs">
              Browser camera access was blocked. Please enable camera permissions in your browser settings to proceed.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={startCamera}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium"
              >
                Retry Camera Permission
              </button>
              {!isMockMode && (
                <button
                  onClick={handleCaptureAndVerify}
                  className="px-4 py-1.5 bg-brand-secondary text-white rounded-lg text-xs font-semibold"
                >
                  Continue Without Camera (Demo)
                </button>
              )}
            </div>
          </div>
        )}

        {cameraState === 'unavailable' && (
          <div className="text-center p-6 text-white space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-amber-200">Camera Device Unavailable</p>
            {isMockMode ? (
              <>
                <p className="text-xs text-white/70 max-w-xs">
                  No physical camera was detected on this device. You can simulate face capture in demo mode.
                </p>
                <button
                  onClick={handleCaptureAndVerify}
                  className="px-4 py-2 bg-brand-secondary text-white rounded-lg text-xs font-semibold"
                >
                  Simulate Face Capture
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-white/70 max-w-xs">
                  No camera was detected on this device. Face matching is demo-only for now, so you can continue without it.
                </p>
                <button
                  onClick={handleCaptureAndVerify}
                  className="px-4 py-2 bg-brand-secondary text-white rounded-lg text-xs font-semibold"
                >
                  Continue Without Camera (Demo)
                </button>
              </>
            )}
          </div>
        )}

        {cameraState === 'active' && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />

            {/* Oval Face Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-48 h-64 sm:w-56 sm:h-72 border-2 rounded-[50%] transition-colors duration-300 ${
                  captureProgress === 'analyzing'
                    ? 'border-brand-mint animate-pulse ring-4 ring-brand-mint/40'
                    : 'border-white/80 border-dashed'
                }`}
              />
            </div>

            {/* Live Instruction Pill */}
            <div className="absolute top-3 inset-x-4 flex justify-center pointer-events-none">
              <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-medium px-3 py-1 rounded-full border border-white/20">
                {captureProgress === 'analyzing'
                  ? analysisStep
                  : 'Center your face within the oval guide'}
              </span>
            </div>
          </>
        )}

        {/* Verification Result Overlay */}
        {captureProgress === 'complete' && result && (
          <div className="absolute inset-0 bg-brand-charcoal/90 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center text-white animate-fade-in">
            {result.isVerified ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base text-emerald-300">
                  {result.faceMatch ? 'Verification Successful' : 'Face Captured (Demo)'}
                </h3>
                <p className="text-xs text-white/80 mt-1 max-w-xs">{result.message}</p>
                {result.faceMatch && (
                  <div className="mt-3 px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                    Match Score: {Math.round(result.score * 100)}%
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base text-rose-300">Verification Failed</h3>
                <p className="text-xs text-white/80 mt-1 max-w-xs">{result.message}</p>
                <button
                  onClick={handleRetry}
                  className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold transition"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action Controls */}
      {cameraState === 'active' && captureProgress !== 'complete' && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={stopCamera}
            className="px-4 py-2 text-xs font-medium text-brand-muted hover:text-brand-charcoal transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCaptureAndVerify}
            disabled={captureProgress !== 'idle'}
            className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-bold shadow-card transition inline-flex items-center gap-2 disabled:opacity-50"
          >
            {captureProgress === 'analyzing' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-brand-mint" />
                <span>Verifying Face...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 text-brand-mint" />
                <span>Capture & Verify</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Security Disclaimer */}
      <div className="text-[11px] text-brand-muted bg-brand-ivory p-3 rounded-xl border border-brand-border-subtle flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" />
        <div>
          {isMockMode ? (
            <>
              <strong className="text-brand-charcoal font-semibold">Simulated Biometric Processing:</strong> Real facial recognition and liveness detection will be executed securely server-side in the Go backend. No raw images or biometric templates are stored in client storage.
            </>
          ) : (
            <>
              <strong className="text-brand-charcoal font-semibold">Demo face check:</strong> Face matching is not connected yet, so any capture is accepted and your location check decides the check-in. The camera preview stays on this device and no image is uploaded or stored.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

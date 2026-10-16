'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Facility } from '@/types/facility';
import { useAuth } from '@/context/AuthContext';
import {
  MapPin,
  Wifi,
  CheckCircle2,
  XCircle,
  Navigation,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

// Testing only: lets check-ins pass the location check on devices without real GPS
// (laptops locate by IP, often hundreds of km off). Never enable in production.
const SKIP_GEOFENCE = process.env.NEXT_PUBLIC_SKIP_GEOFENCE === 'true';

interface FacilityVerificationPanelProps {
  facility: Facility;
  onVerificationComplete: (result: {
    passed: boolean;
    distanceMeters: number;
    networkMatch: boolean;
    details: string;
    isSimulated: boolean;
  }) => void;
  simulateState?: 'pass' | 'fail_geofence' | 'fail_network' | 'location_denied';
}

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in meters.
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function FacilityVerificationPanel({
  facility,
  onVerificationComplete,
  simulateState,
}: FacilityVerificationPanelProps) {
  const { isMockMode } = useAuth();

  const [gpsStatus, setGpsStatus] = useState<
    'checking' | 'granted' | 'denied' | 'unavailable' | 'low_accuracy' | 'simulated'
  >('checking');
  const [distance, setDistance] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [networkMatched, setNetworkMatched] = useState<boolean>(true);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Verifying facility proximity...');

  const evaluatePresence = useCallback(() => {
    // 0. Test switch: skip the location requirement entirely
    if (SKIP_GEOFENCE) {
      setGpsStatus('simulated');
      setIsSimulated(true);
      setDistance(0);
      setNetworkMatched(true);
      const details = 'Location check skipped: test mode is on (NEXT_PUBLIC_SKIP_GEOFENCE=true).';
      setStatusMessage(details);
      onVerificationComplete({
        passed: true,
        distanceMeters: 0,
        networkMatch: true,
        details,
        isSimulated: true,
      });
      return;
    }

    // 1. Explicit simulation overrides (useful for demo/testing states)
    if (simulateState === 'location_denied') {
      setGpsStatus('denied');
      setIsSimulated(true);
      const details = 'Location permission was denied. Facility verification could not be validated.';
      setStatusMessage(details);
      onVerificationComplete({
        passed: false,
        distanceMeters: 0,
        networkMatch: false,
        details,
        isSimulated: true,
      });
      return;
    }

    if (simulateState === 'fail_geofence') {
      setGpsStatus('simulated');
      setIsSimulated(true);
      const simulatedDist = facility.geofenceRadiusMeters + 320;
      setDistance(simulatedDist);
      setNetworkMatched(true);
      const details = `Simulated GPS coordinates indicate ${simulatedDist}m distance, which exceeds the permitted ${facility.geofenceRadiusMeters}m geofence radius.`;
      setStatusMessage(details);
      onVerificationComplete({
        passed: false,
        distanceMeters: simulatedDist,
        networkMatch: true,
        details,
        isSimulated: true,
      });
      return;
    }

    if (simulateState === 'fail_network') {
      setGpsStatus('simulated');
      setIsSimulated(true);
      const simulatedDist = 42;
      setDistance(simulatedDist);
      setNetworkMatched(false);
      const details = `Connected IP/network subnet does not match required facility policy (${facility.networkPolicy.allowedIpRanges.join(', ')}).`;
      setStatusMessage(details);
      onVerificationComplete({
        passed: false,
        distanceMeters: simulatedDist,
        networkMatch: false,
        details,
        isSimulated: true,
      });
      return;
    }

    // 2. Real Geolocation Acquisition
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setGpsStatus('checking');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;
          const userAcc = position.coords.accuracy;
          setAccuracy(Math.round(userAcc));

          const calculatedDist = calculateDistanceMeters(
            userLat,
            userLon,
            facility.coordinates.latitude,
            facility.coordinates.longitude
          );

          setDistance(calculatedDist);
          setIsSimulated(false);

          const withinGeofence = calculatedDist <= facility.geofenceRadiusMeters;
          const isAccurate = userAcc <= 250;

          if (!isAccurate) {
            setGpsStatus('low_accuracy');
          } else {
            setGpsStatus('granted');
          }

          // Network match logic: browsers cannot read Wi-Fi SSID for security reasons.
          // In real API mode, network policy is verified server-side via client IP.
          const netMatch = !facility.networkPolicy.requireNetworkMatch || isMockMode;
          setNetworkMatched(netMatch);

          const passed = withinGeofence && netMatch;
          const details = passed
            ? `Real GPS: ${calculatedDist}m from ${facility.name} center (accuracy ±${Math.round(userAcc)}m, allowed radius ${facility.geofenceRadiusMeters}m).`
            : `GPS outside boundary: you are ${calculatedDist}m from ${facility.name}, but the allowed radius is ${facility.geofenceRadiusMeters}m (GPS accuracy ±${Math.round(userAcc)}m).`;

          setStatusMessage(details);
          onVerificationComplete({
            passed,
            distanceMeters: calculatedDist,
            networkMatch: netMatch,
            details,
            isSimulated: false,
          });
        },
        (error) => {
          // If real GPS fails or permission denied:
          if (error.code === error.PERMISSION_DENIED) {
            setGpsStatus('denied');
            const details = 'GPS permission denied. Enable location services in your browser to verify on-site presence.';
            setStatusMessage(details);
            onVerificationComplete({
              passed: false,
              distanceMeters: 0,
              networkMatch: false,
              details,
              isSimulated: false,
            });
          } else {
            // Geolocation unavailable or timeout
            if (isMockMode) {
              // Graceful demo simulation fallback
              setGpsStatus('simulated');
              setIsSimulated(true);
              const fallbackDist = 38;
              setDistance(fallbackDist);
              setNetworkMatched(true);
              const details = `Simulated GPS fallback: ${fallbackDist}m from ${facility.name} (device GPS unavailable).`;
              setStatusMessage(details);
              onVerificationComplete({
                passed: true,
                distanceMeters: fallbackDist,
                networkMatch: true,
                details,
                isSimulated: true,
              });
            } else {
              setGpsStatus('unavailable');
              setIsSimulated(false);
              const details = `GPS acquisition failed: ${error.message}. Real API mode requires verifiable location coordinates.`;
              setStatusMessage(details);
              onVerificationComplete({
                passed: false,
                distanceMeters: 0,
                networkMatch: false,
                details,
                isSimulated: false,
              });
            }
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      // Browser does not support geolocation
      if (isMockMode) {
        setGpsStatus('simulated');
        setIsSimulated(true);
        const fallbackDist = 38;
        setDistance(fallbackDist);
        setNetworkMatched(true);
        const details = `Simulated GPS: ${fallbackDist}m (navigator.geolocation not supported).`;
        setStatusMessage(details);
        onVerificationComplete({
          passed: true,
          distanceMeters: fallbackDist,
          networkMatch: true,
          details,
          isSimulated: true,
        });
      } else {
        setGpsStatus('unavailable');
        setIsSimulated(false);
        const details = 'Geolocation API not supported by browser environment.';
        setStatusMessage(details);
        onVerificationComplete({
          passed: false,
          distanceMeters: 0,
          networkMatch: false,
          details,
          isSimulated: false,
        });
      }
    }
  }, [facility, isMockMode, onVerificationComplete, simulateState]);

  useEffect(() => {
    evaluatePresence();
  }, [evaluatePresence]);

  const isWithinRadius = distance <= facility.geofenceRadiusMeters;
  const isFacilityVerified =
    (gpsStatus === 'granted' || gpsStatus === 'simulated') &&
    isWithinRadius &&
    (!facility.networkPolicy.requireNetworkMatch || networkMatched);

  return (
    <div className="bg-white rounded-2xl border border-brand-border-subtle p-5 shadow-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2.5 rounded-xl ${
              isFacilityVerified
                ? 'bg-brand-success/15 text-brand-success'
                : 'bg-brand-warning/15 text-brand-warning'
            }`}
          >
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-brand-primary">Facility Verification</h2>
              {isSimulated && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-mint text-brand-primary border border-brand-primary/10">
                  <Sparkles className="w-2.5 h-2.5 text-brand-secondary" />
                  Simulated
                </span>
              )}
            </div>
            <p className="text-xs text-brand-muted">{facility.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={evaluatePresence}
            title="Refresh GPS location"
            className="p-1.5 rounded-lg border border-brand-border hover:bg-brand-ivory text-brand-muted hover:text-brand-charcoal transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${gpsStatus === 'checking' ? 'animate-spin' : ''}`} />
          </button>
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              isFacilityVerified
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {isFacilityVerified ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified On-Site</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Verification Pending</span>
              </>
            )}
          </span>
        </div>
      </div>

      {SKIP_GEOFENCE && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs">
          <strong className="font-semibold">Test mode:</strong> the location check is switched off, so check-ins
          are accepted from anywhere. Set NEXT_PUBLIC_SKIP_GEOFENCE=false before real use.
        </div>
      )}

      {/* Geofence & Network status boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-brand-border-subtle text-xs">
        {/* Geofence check */}
        <div className="p-3 rounded-xl bg-brand-ivory border border-brand-border-subtle flex items-start gap-2.5">
          <Navigation
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              isWithinRadius && gpsStatus !== 'denied' && gpsStatus !== 'unavailable'
                ? 'text-brand-success'
                : 'text-brand-danger'
            }`}
          />
          <div>
            <div className="font-semibold text-brand-charcoal flex items-center gap-1.5">
              <span>Geofence Perimeter</span>
              {gpsStatus === 'checking' && (
                <span className="text-[10px] text-brand-muted font-normal animate-pulse">
                  Acquiring GPS...
                </span>
              )}
              {gpsStatus === 'denied' && (
                <span className="text-[10px] text-brand-danger font-bold">Permission Denied</span>
              )}
              {gpsStatus === 'unavailable' && (
                <span className="text-[10px] text-amber-700 font-bold">Signal Unavailable</span>
              )}
              {gpsStatus === 'low_accuracy' && (
                <span className="text-[10px] text-amber-700 font-bold">
                  Low Accuracy (±{accuracy}m)
                </span>
              )}
              {(gpsStatus === 'granted' || gpsStatus === 'simulated') &&
                (isWithinRadius ? (
                  <span className="text-[10px] text-brand-success font-bold">
                    Inside ({distance}m)
                  </span>
                ) : (
                  <span className="text-[10px] text-brand-danger font-bold">
                    Outside ({distance}m)
                  </span>
                ))}
            </div>
            <p className="text-[11px] text-brand-muted mt-0.5">
              Target radius: {facility.geofenceRadiusMeters}m from center ({facility.coordinates.latitude.toFixed(4)}, {facility.coordinates.longitude.toFixed(4)}).
            </p>
          </div>
        </div>

        {/* Network check */}
        <div className="p-3 rounded-xl bg-brand-ivory border border-brand-border-subtle flex items-start gap-2.5">
          <Wifi
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              networkMatched ? 'text-brand-success' : 'text-brand-warning'
            }`}
          />
          <div>
            <div className="font-semibold text-brand-charcoal flex items-center gap-1.5">
              <span>Network Policy</span>
              {isMockMode ? (
                <span className="text-[10px] text-brand-success font-bold">Simulated SSID Match</span>
              ) : (
                <span className="text-[10px] text-brand-secondary font-bold">Server Subnet Verification</span>
              )}
            </div>
            <p className="text-[11px] text-brand-muted mt-0.5">
              {isMockMode
                ? `SSID: ${facility.networkPolicy.allowedSsidPrefixes[0] || 'Facility_WiFi'}`
                : `Subnet check: ${facility.networkPolicy.allowedIpRanges[0] || '10.0.0.0/16'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Advisory Security Notice */}
      <div className="text-[11px] text-brand-muted flex items-start gap-1.5 bg-brand-mint/40 text-brand-mint-dark p-2.5 rounded-xl border border-brand-mint-dark/15">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <span>{statusMessage}</span>
          <span className="block mt-0.5 text-[10px] text-brand-muted font-normal">
            Note: Web browsers cannot read hardware Wi-Fi SSIDs directly. True network presence and
            anti-spoofing authorization are validated server-side by the backend attendance service.
          </span>
        </div>
      </div>
    </div>
  );
}

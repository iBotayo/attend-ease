package tests

import (
	"testing"

	"attendease/internal/verification"
)

func TestHaversineDistance_IdenticalCoordinates(t *testing.T) {
	lat := 37.7749
	lon := -122.4194

	dist := verification.HaversineDistance(lat, lon, lat, lon)
	if dist != 0 {
		t.Errorf("Expected 0 distance for identical coordinates, got %f", dist)
	}
}

func TestHaversineDistance_KnownPoints(t *testing.T) {
	// San Francisco (37.7749, -122.4194) to Oakland (37.8044, -122.2712)
	// Expected great-circle distance is approx 13.5 km (13,500m ± 500m)
	dist := verification.HaversineDistance(37.7749, -122.4194, 37.8044, -122.2712)

	if dist < 12500 || dist > 14500 {
		t.Errorf("Expected distance between SF and Oakland ~13,500m, got %f", dist)
	}
}

func TestHaversineDistance_InvalidCoordinates(t *testing.T) {
	// Out of bounds latitude (> 90)
	dist := verification.HaversineDistance(95.0, 0.0, 10.0, 10.0)
	if dist != -1 {
		t.Errorf("Expected -1 for invalid latitude, got %f", dist)
	}

	// Out of bounds longitude (> 180)
	dist = verification.HaversineDistance(0.0, 195.0, 10.0, 10.0)
	if dist != -1 {
		t.Errorf("Expected -1 for invalid longitude, got %f", dist)
	}
}

func TestEvaluateProximity_WithinAndOutsideGeofence(t *testing.T) {
	facLat := 6.5244  // Lagos Island
	facLon := 3.3792
	facRadius := 150 // 150 meters

	// Coordinate approx 30 meters away
	clientLatWithin := 6.5246
	clientLonWithin := 3.3792

	res, err := verification.EvaluateProximity(clientLatWithin, clientLonWithin, facLat, facLon, facRadius, "10.0.0.5", nil, false)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if !res.WithinRadius {
		t.Errorf("Expected client to be within geofence, but got distance: %dm", res.DistanceMeters)
	}

	// Coordinate approx 2 km away
	clientLatOutside := 6.5400
	clientLonOutside := 3.3792

	resOut, err := verification.EvaluateProximity(clientLatOutside, clientLonOutside, facLat, facLon, facRadius, "10.0.0.5", nil, false)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if resOut.WithinRadius {
		t.Errorf("Expected client to be outside geofence, but got withinRadius: true")
	}
	if resOut.DistanceMeters <= facRadius {
		t.Errorf("Expected distance > %dm, got %dm", facRadius, resOut.DistanceMeters)
	}
}

func TestCheckIPInSubnets(t *testing.T) {
	allowed := []string{"192.168.1.0/24", "10.180.0.0/16"}

	// Valid IPs in range
	if !verification.CheckIPInSubnets("192.168.1.50", allowed) {
		t.Errorf("Expected 192.168.1.50 to match allowed subnet")
	}
	if !verification.CheckIPInSubnets("10.180.5.21", allowed) {
		t.Errorf("Expected 10.180.5.21 to match allowed subnet")
	}

	// IPs outside range
	if verification.CheckIPInSubnets("192.168.2.50", allowed) {
		t.Errorf("Expected 192.168.2.50 to NOT match allowed subnets")
	}
	if verification.CheckIPInSubnets("8.8.8.8", allowed) {
		t.Errorf("Expected 8.8.8.8 to NOT match allowed subnets")
	}
	if verification.CheckIPInSubnets("invalid-ip", allowed) {
		t.Errorf("Expected invalid-ip to return false")
	}
}

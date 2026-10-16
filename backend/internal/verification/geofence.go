package verification

import (
	"errors"
	"fmt"
	"math"
	"net"
	"strings"
)

const EarthRadiusMeters = 6371000.0

var (
	ErrInvalidCoordinates = errors.New("latitude must be between -90 and 90, longitude between -180 and 180")
	ErrGeofenceExceeded   = errors.New("location is outside the permitted facility geofence")
)

type GeofenceResult struct {
	DistanceMeters int
	WithinRadius   bool
	NetworkMatch   bool
	Message        string
}

// HaversineDistance computes great-circle distance in meters between two GPS points
func HaversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	if lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 ||
		lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180 {
		return -1
	}

	phi1 := lat1 * math.Pi / 180.0
	phi2 := lat2 * math.Pi / 180.0
	deltaPhi := (lat2 - lat1) * math.Pi / 180.0
	deltaLambda := (lon2 - lon1) * math.Pi / 180.0

	a := math.Sin(deltaPhi/2.0)*math.Sin(deltaPhi/2.0) +
		math.Cos(phi1)*math.Cos(phi2)*
			math.Sin(deltaLambda/2.0)*math.Sin(deltaLambda/2.0)

	c := 2.0 * math.Atan2(math.Sqrt(a), math.Sqrt(1.0-a))

	return EarthRadiusMeters * c
}

// EvaluateProximity checks GPS distance against facility radius and client IP against CIDR subnets
func EvaluateProximity(
	clientLat, clientLon float64,
	facilityLat, facilityLon float64,
	radiusMeters int,
	clientIP string,
	allowedCIDRs []string,
	requireNetwork bool,
) (*GeofenceResult, error) {
	dist := HaversineDistance(clientLat, clientLon, facilityLat, facilityLon)
	if dist < 0 {
		return nil, ErrInvalidCoordinates
	}

	roundedDist := int(math.Round(dist))
	withinRadius := roundedDist <= radiusMeters

	networkMatch := true
	if requireNetwork && len(allowedCIDRs) > 0 {
		networkMatch = CheckIPInSubnets(clientIP, allowedCIDRs)
	}

	msg := fmt.Sprintf("Distance: %dm (allowed: %dm)", roundedDist, radiusMeters)
	if !withinRadius {
		msg = fmt.Sprintf("Location is %dm outside permitted %dm facility geofence radius.", roundedDist-radiusMeters, radiusMeters)
	}

	return &GeofenceResult{
		DistanceMeters: roundedDist,
		WithinRadius:   withinRadius,
		NetworkMatch:   networkMatch,
		Message:        msg,
	}, nil
}

// CheckIPInSubnets tests if a client IP belongs to any allowed CIDR block
func CheckIPInSubnets(clientIP string, cidrList []string) bool {
	parsedIP := net.ParseIP(strings.TrimSpace(clientIP))
	if parsedIP == nil {
		return false
	}

	for _, cidr := range cidrList {
		trimmed := strings.TrimSpace(cidr)
		if trimmed == "" {
			continue
		}
		_, subnet, err := net.ParseCIDR(trimmed)
		if err == nil && subnet.Contains(parsedIP) {
			return true
		}
	}
	return false
}

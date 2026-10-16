package verification

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

var (
	ErrServiceUnavailable   = errors.New("biometric verification service is offline or unreachable")
	ErrEmployeeNotEnrolled  = errors.New("employee does not have an active biometric enrollment template")
	ErrBiometricScoreTooLow = errors.New("biometric match score is below required threshold")
	ErrSpoofDetected        = errors.New("potential spoof detected: liveness confidence check failed")
)

type EnrollmentResult struct {
	TemplateID string
	Algorithm  string
	EnrolledAt time.Time
}

type BiometricMatchResult struct {
	Matched         bool    `json:"matched"`
	ConfidenceScore float64 `json:"confidenceScore"`
	Threshold       float64 `json:"threshold"`
	LivenessPassed  bool    `json:"livenessPassed"`
	LivenessScore   float64 `json:"livenessScore"`
	Algorithm       string  `json:"algorithm"`
	ExecutionTimeMs int64   `json:"executionTimeMs"`
	Message         string  `json:"message"`
}

type BiometricVerifier interface {
	Verify(ctx context.Context, employeeID string, faceImageBase64 string) (*BiometricMatchResult, error)
	Enroll(ctx context.Context, employeeID string, faceImageBase64 string) (*EnrollmentResult, error)
}

type HTTPBiometricClient struct {
	baseURL         string
	httpClient      *http.Client
	threshold       float64
	requireLiveness bool
}

func NewHTTPBiometricClient(baseURL string, timeout time.Duration, threshold float64, requireLiveness bool) *HTTPBiometricClient {
	return &HTTPBiometricClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		threshold:       threshold,
		requireLiveness: requireLiveness,
	}
}

type verifyRequest struct {
	EmployeeID      string  `json:"employeeId"`
	FaceImageBase64 string  `json:"faceImageBase64"`
	Threshold       float64 `json:"threshold"`
	CheckLiveness   bool    `json:"checkLiveness"`
}

type verifyResponse struct {
	Success         bool    `json:"success"`
	Matched         bool    `json:"matched"`
	ConfidenceScore float64 `json:"confidenceScore"`
	LivenessPassed  bool    `json:"livenessPassed"`
	LivenessScore   float64 `json:"livenessScore"`
	Algorithm       string  `json:"algorithm"`
	ExecutionTimeMs int64   `json:"executionTimeMs"`
	Message         string  `json:"message"`
}

func (c *HTTPBiometricClient) Verify(ctx context.Context, employeeID string, faceImageBase64 string) (*BiometricMatchResult, error) {
	if c.baseURL == "" {
		return nil, ErrServiceUnavailable
	}

	reqBody, err := json.Marshal(verifyRequest{
		EmployeeID:      employeeID,
		FaceImageBase64: faceImageBase64,
		Threshold:       c.threshold,
		CheckLiveness:   c.requireLiveness,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to encode verification payload: %w", err)
	}

	url := fmt.Sprintf("%s/api/v1/verify", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrServiceUnavailable, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrEmployeeNotEnrolled
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("biometric microservice returned status %d", resp.StatusCode)
	}

	var res verifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, fmt.Errorf("failed to parse biometric microservice response: %w", err)
	}

	result := &BiometricMatchResult{
		Matched:         res.Matched,
		ConfidenceScore: res.ConfidenceScore,
		Threshold:       c.threshold,
		LivenessPassed:  res.LivenessPassed,
		LivenessScore:   res.LivenessScore,
		Algorithm:       res.Algorithm,
		ExecutionTimeMs: res.ExecutionTimeMs,
		Message:         res.Message,
	}

	if c.requireLiveness && !res.LivenessPassed {
		return result, ErrSpoofDetected
	}

	if !res.Matched || res.ConfidenceScore < c.threshold {
		return result, ErrBiometricScoreTooLow
	}

	return result, nil
}

func (c *HTTPBiometricClient) Enroll(ctx context.Context, employeeID string, faceImageBase64 string) (*EnrollmentResult, error) {
	if c.baseURL == "" {
		return nil, ErrServiceUnavailable
	}
	return &EnrollmentResult{
		TemplateID: fmt.Sprintf("tmpl-%s-%d", employeeID, time.Now().Unix()),
		Algorithm:  "FaceNet-ONNX-512",
		EnrolledAt: time.Now().UTC(),
	}, nil
}

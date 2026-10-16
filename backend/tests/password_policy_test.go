package tests

import (
	"errors"
	"testing"

	"attendease/internal/auth"
)

func TestValidatePasswordStrength(t *testing.T) {
	cases := []struct {
		name     string
		password string
		wantErr  error
	}{
		{"valid", "Sunrise2026", nil},
		{"valid with symbols", "N3w-Passw0rd!", nil},
		{"too short", "Ab1defg", auth.ErrPasswordTooShort},
		{"no uppercase", "lowercase123", auth.ErrPasswordNoUpper},
		{"no lowercase", "UPPERCASE123", auth.ErrPasswordNoLower},
		{"no digit", "NoDigitsHere", auth.ErrPasswordNoDigit},
		{"setup invite default rejected", auth.DefaultSetupInvitePassword, auth.ErrPasswordIsTemporary},
		{"new employee default rejected", auth.DefaultNewEmployeePassword, auth.ErrPasswordIsTemporary},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := auth.ValidatePasswordStrength(tc.password)
			if !errors.Is(err, tc.wantErr) {
				t.Errorf("ValidatePasswordStrength(%q) = %v, want %v", tc.password, err, tc.wantErr)
			}
		})
	}
}

func TestValidatePasswordStrength_TooLong(t *testing.T) {
	long := "Aa1"
	for len(long) <= 128 {
		long += "x"
	}
	if err := auth.ValidatePasswordStrength(long); !errors.Is(err, auth.ErrPasswordTooLong) {
		t.Errorf("Expected ErrPasswordTooLong for %d-char password, got %v", len(long), err)
	}
}

func TestGenerateTemporaryPassword_AlwaysValidAndUnique(t *testing.T) {
	seen := make(map[string]bool)
	for i := 0; i < 500; i++ {
		pw, err := auth.GenerateTemporaryPassword()
		if err != nil {
			t.Fatalf("GenerateTemporaryPassword failed: %v", err)
		}
		if len(pw) != 12 {
			t.Fatalf("Expected 12 characters, got %d (%q)", len(pw), pw)
		}
		if err := auth.ValidatePasswordStrength(pw); err != nil {
			t.Fatalf("Generated password %q fails policy: %v", pw, err)
		}
		if seen[pw] {
			t.Fatalf("Duplicate temporary password generated: %q", pw)
		}
		seen[pw] = true
	}
}

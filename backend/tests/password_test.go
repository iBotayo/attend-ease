package tests

import (
	"strings"
	"testing"

	"attendease/internal/auth"
)

func TestPasswordHasher_Argon2id(t *testing.T) {
	hasher := auth.NewPasswordHasher()
	password := "SecretP@ssword2026!"

	encodedHash, err := hasher.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if !strings.HasPrefix(encodedHash, "$argon2id$") {
		t.Errorf("Expected hash to start with $argon2id$, got: %s", encodedHash)
	}

	// Verify correct password
	matched, err := hasher.VerifyPassword(password, encodedHash)
	if err != nil {
		t.Fatalf("Failed to verify password: %v", err)
	}
	if !matched {
		t.Errorf("Expected password verification to succeed for correct password")
	}

	// Verify wrong password
	matchedWrong, err := hasher.VerifyPassword("WrongPassword123!", encodedHash)
	if err != nil {
		t.Fatalf("Unexpected error verifying wrong password: %v", err)
	}
	if matchedWrong {
		t.Errorf("Expected password verification to fail for incorrect password")
	}
}

func TestPasswordHasher_InvalidHashFormat(t *testing.T) {
	hasher := auth.NewPasswordHasher()

	_, err := hasher.VerifyPassword("password", "invalid_hash_string")
	if err == nil {
		t.Errorf("Expected error verifying invalid hash string, got nil")
	}
}

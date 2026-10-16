package tests

import (
	"testing"

	"attendease/internal/http/handlers"
)

func TestSanitizeCSVCell_FormulaInjectionDefense(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"=cmd|' /C calc'!A0", "'=cmd|' /C calc'!A0"},
		{"+12345", "'+12345"},
		{"-SUM(A1:A10)", "'-SUM(A1:A10)"},
		{"@SUM(A1:A10)", "'@SUM(A1:A10)"},
		{"\tmalicious", "'\tmalicious"},
		{"\rmalicious", "'\rmalicious"},
		{"Normal Text", "Normal Text"},
		{"EMP-1001", "EMP-1001"},
		{"", ""},
	}

	for _, tc := range tests {
		actual := handlers.SanitizeCSVCell(tc.input)
		if actual != tc.expected {
			t.Errorf("For input '%s', expected '%s', got '%s'", tc.input, tc.expected, actual)
		}
	}
}

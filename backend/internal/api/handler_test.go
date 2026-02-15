package api

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type testDecoder struct {
	calledMax int
}

func (d *testDecoder) DecodeRawBytes(_ []byte, _ string, maxDimension int) (*DecodedResult, error) {
	d.calledMax = maxDimension
	return &DecodedResult{}, nil
}

func TestHealthz(t *testing.T) {
	h := NewHandler(&testDecoder{})
	req := httptest.NewRequest(http.MethodGet, "/api/healthz", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d", rec.Code)
	}
	if strings.TrimSpace(rec.Body.String()) != "ok" {
		t.Fatalf("unexpected body: %q", rec.Body.String())
	}
}

func TestDecodeMethodNotAllowed(t *testing.T) {
	h := NewHandler(&testDecoder{})
	req := httptest.NewRequest(http.MethodGet, "/api/decode", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("unexpected status: %d", rec.Code)
	}
}

func TestDecodePassesMaxDimension(t *testing.T) {
	dec := &testDecoder{}
	h := NewHandler(dec)
	req := httptest.NewRequest(http.MethodPost, "/api/decode", bytes.NewReader([]byte{1, 2, 3}))
	req.Header.Set("X-Max-Dimension", "2048")
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if dec.calledMax != 2048 {
		t.Fatalf("unexpected max dimension: %d", dec.calledMax)
	}
}

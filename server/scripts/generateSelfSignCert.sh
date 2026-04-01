#!/bin/bash
set -e

# ==============================
# Configuration
# ==============================
CERT_NAME="cert-pf-001"
SUBJECT="/CN=cert-pf-001"
VALID_DAYS=730
KEY_SIZE=2048
OUT_DIR="./azuread-cert"

# Files
KEY_FILE="$OUT_DIR/$CERT_NAME.key"
CRT_FILE="$OUT_DIR/$CERT_NAME.crt"
CER_FILE="$OUT_DIR/$CERT_NAME.cer"
PFX_FILE="$OUT_DIR/$CERT_NAME.pfx"
CSR_FILE="$OUT_DIR/$CERT_NAME.csr"

# ==============================
# Create output directory
# ==============================
mkdir -p "$OUT_DIR"

echo "Output directory: $OUT_DIR"

# ==============================
# Generate private key (NO password)
# ==============================
openssl genrsa -out "$KEY_FILE" $KEY_SIZE

# ==============================
# Create CSR
# ==============================
openssl req -new \
  -key "$KEY_FILE" \
  -out "$CSR_FILE" \
  -subj "$SUBJECT"

# ==============================
# Self-sign certificate
# ==============================
openssl x509 -req \
  -in "$CSR_FILE" \
  -signkey "$KEY_FILE" \
  -out "$CRT_FILE" \
  -days $VALID_DAYS \
  -sha256

# ==============================
# Create Azure-friendly .cer
# ==============================
cp "$CRT_FILE" "$CER_FILE"

# ==============================
# Create PFX WITHOUT password
# ==============================
openssl pkcs12 -export \
  -out "$PFX_FILE" \
  -inkey "$KEY_FILE" \
  -in "$CRT_FILE" \
  -passout pass:

# ==============================
# Display results
# ==============================
echo "===================================="
echo "Certificate generation completed"
echo "===================================="
echo "Private Key : $KEY_FILE (KEEP IN YOUR APP)"
echo "Public Cert : $CER_FILE  (UPLOAD TO AZURE)"
echo "PFX (no pwd): $PFX_FILE"
echo
echo "Certificate Details:"
openssl x509 -in "$CRT_FILE" -noout -subject -dates -fingerprint

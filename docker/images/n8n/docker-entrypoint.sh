#!/bin/sh
if [ -d /opt/custom-certificates ]; then
  echo "Trusting custom certificates from /opt/custom-certificates."
  export NODE_OPTIONS="--use-openssl-ca $NODE_OPTIONS"
  export SSL_CERT_DIR=/opt/custom-certificates
  c_rehash /opt/custom-certificates
fi

# Start SSH server for Azure App Service
/usr/sbin/sshd

if [ "$#" -gt 0 ]; then
  # Got started with arguments
  exec su-exec node n8n "$@"
else
  # Got started without arguments
  exec su-exec node n8n
fi

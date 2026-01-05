#!/bin/sh
node /app/run-migrations.mjs
exec node dist/server.js

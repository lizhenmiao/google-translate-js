#!/bin/bash

export PORT=8080
export ACCESS_TOKEN=123456

LOG_FILE="runtime.log"

nohup deno run --allow-net --allow-read --allow-env --allow-write --unstable --reload index.js > "$LOG_FILE" 2>&1 &

echo "Deno 服务已启动，日志文件：$LOG_FILE"

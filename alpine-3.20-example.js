import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  logger,
  createCorsMiddleware,
  healthCheckHandler,
  handleTranslateRequest,
  getApiDoc
} from "https://raw.githubusercontent.com/lizhenmiao/google-translate-js/refs/heads/main/index.js";

const app = new Hono();

const ACCESS_TOKEN = Deno.env.get("ACCESS_TOKEN") || "";
const PORT = Number(Deno.env.get("PORT") || "8080");

// 日志文件固定写入 runtime.log，追加写入
const LOG_FILE = "runtime.log";

logger.on((level, ...args) => {
  const logLine = `[翻译日志] [${level.toUpperCase()}]: ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(" ")}\n`;
  // 异步追加写入日志文件
  Deno.writeTextFile(LOG_FILE, logLine, { append: true }).catch(console.error);
});

// 跨域中间件
app.use("*", createCorsMiddleware());

// 健康检查接口
app.get("/health", healthCheckHandler());

// 翻译接口
app.route("/translate")
  .get(async (c) => handleTranslateRequest(c, ACCESS_TOKEN, {
    verbose: true,
    randomizeAll: true
  }))
  .post(async (c) => handleTranslateRequest(c, ACCESS_TOKEN, {
    verbose: true,
    randomizeAll: true
  }));

// API 文档首页
app.get("/", getApiDoc("基于 Cloudflare Worker + Hono 的 Google 翻译服务", "1.0.0"));

// 404 处理
app.all("*", (c) => c.json({
  success: false,
  error: "接口不存在",
  message: "请访问 / 查看可用的 API 接口",
}, 404));

console.log(`Server running on port ${PORT}`);

await serve(app.fetch, { port: PORT });

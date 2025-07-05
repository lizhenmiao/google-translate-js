import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
// https://fastly.jsdelivr.net/gh/lizhenmiao/google-translate-js@main/index.js
// https://cdn.jsdelivr.net/gh/lizhenmiao/google-translate-js@main/index.js
// https://gcore.jsdelivr.net/gh/lizhenmiao/google-translate-js@main/index.js
// https://cdn.statically.io/gh/lizhenmiao/google-translate-js/main/index.js
import { logger, createCorsMiddleware, healthCheckHandler, handleTranslateRequest, getApiDoc } from "https://raw.githubusercontent.com/lizhenmiao/google-translate-js/refs/heads/main/index.js";

const app = new Hono();
const ACCESS_TOKEN = Deno.env.get("ACCESS_TOKEN") || "";

// 日志监听
logger.on((message, level) => {
  console.log(`[翻译日志] ${level}: ${message}`);
});

// CORS 中间件
app.use("*", createCorsMiddleware());

// 健康检查
app.get("/health", healthCheckHandler());

// 翻译接口
app.route("/translate")
  .get(async (c) => handleTranslateRequest(c, ACCESS_TOKEN))
  .post(async (c) => handleTranslateRequest(c, ACCESS_TOKEN));

// API 文档
app.get("/", getApiDoc("基于 Cloudflare Worker + Hono 的 Google 翻译服务", "1.0.0"));

// 404 处理
app.all("*", (c) => c.json({
  success: false,
  error: "接口不存在",
  message: "请访问 / 查看可用的 API 接口",
}, 404));

export default app;

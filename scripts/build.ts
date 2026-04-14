#!/usr/bin/env bun

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { $ } from "bun"

async function clean() {
  console.log("🧹 Cleaning build directories...")
  if (existsSync("dist")) {
    rmSync("dist", { recursive: true, force: true })
  }
}

async function createDirectories() {
  console.log("📁 Creating directory structure...")
  mkdirSync("dist/esm", { recursive: true })
  mkdirSync("dist/cjs", { recursive: true })
  mkdirSync("dist/types", { recursive: true })
  mkdirSync("dist/browser", { recursive: true })
}

async function buildTypes() {
  console.log("🏗️  Building TypeScript declarations...")
  await $`bunx tsc -p tsconfig.build.json`
}

async function buildESM() {
  console.log("📦 Building ESM version...")
  const result = await Bun.build({
    entrypoints: ["src/index.ts"],
    outdir: "dist/esm",
    format: "esm",
    target: "node",
    minify: false,
    sourcemap: "external",
  })
  if (!result.success) {
    console.error("❌ ESM build failed:")
    for (const log of result.logs) console.error(log)
    process.exit(1)
  }
}

async function buildCJS() {
  console.log("📦 Building CJS version...")
  const result = await Bun.build({
    entrypoints: ["src/index.ts"],
    outdir: "dist/cjs",
    format: "cjs",
    target: "node",
    minify: false,
    sourcemap: "external",
  })
  if (!result.success) {
    console.error("❌ CJS build failed:")
    for (const log of result.logs) console.error(log)
    process.exit(1)
  }
}

async function buildBrowser() {
  console.log("🌐 Building browser IIFE bundle...")
  const result = await Bun.build({
    entrypoints: ["src/index.ts"],
    outdir: "dist/browser",
    format: "iife",
    target: "browser",
    minify: true,
    naming: "squel.min.js",
  })
  if (!result.success) {
    console.error("❌ Browser build failed:")
    for (const log of result.logs) console.error(log)
    process.exit(1)
  }
}

function writeModuleMarkers() {
  console.log("📝 Writing module-type marker package.json files...")
  writeFileSync("dist/esm/package.json", JSON.stringify({ type: "module" }))
  writeFileSync("dist/cjs/package.json", JSON.stringify({ type: "commonjs" }))
}

async function build() {
  console.log("🚀 Starting build process...\n")
  await clean()
  await createDirectories()
  try {
    await Promise.all([buildTypes(), buildESM(), buildCJS(), buildBrowser()])
    writeModuleMarkers()
    console.log("\n✅ Build completed successfully!")
    console.log("📁 Output:")
    console.log("  - dist/esm/                 (ES modules)")
    console.log("  - dist/cjs/                 (CommonJS)")
    console.log("  - dist/types/               (TypeScript declarations)")
    console.log("  - dist/browser/squel.min.js (minified IIFE for CDN)")
  } catch (error) {
    console.error("\n❌ Build failed:", error)
    process.exit(1)
  }
}

await build()

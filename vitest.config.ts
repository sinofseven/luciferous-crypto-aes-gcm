import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // `cloudflareTest()` は Vite プラグインとして pool / runner / snapshot 環境を
  // まとめて差し替える。vitest 3 までの `test.poolOptions.workers` は廃止された。
  plugins: [
    cloudflareTest({
      miniflare: {
        // 同梱の workerd が受け付ける上限日。これより新しい日付を指定すると
        // ランタイムが起動しない。pool を上げたときに合わせて引き上げる。
        compatibilityDate: "2026-08-22",
      },
    }),
  ],
  test: {
    // vitest のヘルパーは明示 import する運用のため globals は常に false。
    globals: false,
    include: ["test/**/*.test.ts"],
  },
});

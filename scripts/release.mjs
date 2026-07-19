#!/usr/bin/env node
/**
 * 一键按依赖序发布三包:主 → vue → nuxt(nuxt 依赖 vue,vue 依赖主)。
 * - 版本含 prerelease(如 1.0.0-alpha.0)时自动推导 --tag alpha,stable 版本不带 tag(即 latest)
 * - 透传额外参数给每个 pnpm publish,如:pnpm release -- --dry-run
 * - 必须用 pnpm publish:只有 pnpm 会把 workspace:* 转成实体版本号(npm 会原样打包)
 * - registry 显式锁官方源:本地 npm 配置可能指向镜像(npmmirror),发布必须打到 npmjs
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// pnpm 会把用户输入的 "--" 原样传进 argv,过滤掉避免再透传给 publish
const args = process.argv.slice(2).filter(a => a !== '--');

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
// 1.0.0-alpha.0 → alpha;stable 无 prerelease 段则不 tag
const preId = version.includes('-') ? version.split('-')[1].split('.')[0] : null;
const tagArgs = preId && !args.includes('--tag') ? ['--tag', preId] : [];

const PACKAGES = ['.', 'packages/vue', 'packages/nuxt'];
for (const dir of PACKAGES) {
  console.log(`\n=== pnpm publish ${dir} ${tagArgs.join(' ')} ${args.join(' ')} ===`);
  const result = spawnSync(
    'pnpm',
    ['publish', '--registry', 'https://registry.npmjs.org', '--no-git-checks', ...tagArgs, ...args],
    { cwd: fileURLToPath(new URL(`../${dir}/`, import.meta.url)), stdio: 'inherit' }
  );
  if (result.status !== 0) {
    console.error(`\n发布中止:${dir} 失败(已发布的包不会回滚,修复后重跑即可)`);
    process.exit(result.status ?? 1);
  }
}
console.log(`\n三包发布完成 @ ${version}${preId ? `(dist-tag: ${preId})` : ''}`);

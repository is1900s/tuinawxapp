#!/usr/bin/env node

/**
 * 底部导航栏图标生成脚本
 *
 * 使用说明：
 * 1. 安装依赖：npm install canvas
 * 2. 运行脚本：node scripts/generate-icons.js
 *
 * 此脚本将生成基本的底部导航栏图标文件
 */

const fs = require('fs');
const path = require('path');

// 图标配置
const icons = [
  { name: 'tab-home', text: '🏠' },
  { name: 'tab-technician', text: '👨‍💼' },
  { name: 'tab-order', text: '📋' },
  { name: 'tab-user', text: '👤' }
];

// 颜色配置
const colors = {
  normal: '#8E8E93',    // 未选中状态（灰色）
  active: '#007AFF'     // 选中状态（蓝色）
};

/**
 * 生成图标占位符文件
 * 实际项目中需要用设计工具替换为真实图标
 */
function generateIconPlaceholders() {
  const imagesDir = path.join(__dirname, '../miniprogram/assets/images');

  // 确保目录存在
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  console.log('🎨 生成底部导航栏图标占位符文件...\n');

  icons.forEach(icon => {
    // 生成未选中状态图标
    const normalIcon = createIconPlaceholder(icon.name, icon.text, colors.normal);
    fs.writeFileSync(
      path.join(imagesDir, `${icon.name}.png`),
      normalIcon
    );

    // 生成选中状态图标
    const activeIcon = createIconPlaceholder(`${icon.name}-active`, icon.text, colors.active);
    fs.writeFileSync(
      path.join(imagesDir, `${icon.name}-active.png`),
      activeIcon
    );

    console.log(`✅ ${icon.name}.png - 未选中状态`);
    console.log(`✅ ${icon.name}-active.png - 选中状态`);
  });

  console.log('\n🎉 图标占位符文件生成完成！');
  console.log('\n📝 注意：这些是占位符文件，请使用设计工具创建真实的图标文件');
  console.log('   推荐尺寸：81x81px，PNG格式，支持透明背景');
}

/**
 * 创建图标占位符（简单文本图标）
 */
function createIconPlaceholder(name, text, color) {
  // 这里应该使用canvas库生成真实图像
  // 由于环境限制，我们创建一个二进制占位符
  const placeholder = Buffer.from(`ICON_PLACEHOLDER:${name}:${color}:${text}`);
  return placeholder;
}

/**
 * 生成图标配置文件
 */
function generateIconConfig() {
  const config = {
    icons: icons.map(icon => ({
      name: icon.name,
      text: icon.text,
      normalColor: colors.normal,
      activeColor: colors.active,
      size: '81x81px',
      format: 'PNG',
      description: `${icon.text} 图标`
    })),
    designGuidelines: {
      style: '扁平化设计',
      strokeWidth: '2px',
      cornerRadius: '4px',
      spacing: '适中'
    }
  };

  const configPath = path.join(__dirname, '../miniprogram/assets/icons-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log('📄 图标配置文件已生成：assets/icons-config.json');
}

/**
 * 生成SVG格式的图标（可转换为PNG）
 */
function generateSVGIcons() {
  const svgDir = path.join(__dirname, '../miniprogram/assets/svg');

  if (!fs.existsSync(svgDir)) {
    fs.mkdirSync(svgDir, { recursive: true });
  }

  icons.forEach(icon => {
    // 生成简单的SVG图标
    const svg = createSVGIcon(icon.text, colors.normal);
    fs.writeFileSync(
      path.join(svgDir, `${icon.name}.svg`),
      svg
    );

    const svgActive = createSVGIcon(icon.text, colors.active);
    fs.writeFileSync(
      path.join(svgDir, `${icon.name}-active.svg`),
      svgActive
    );
  });

  console.log('📄 SVG图标文件已生成：assets/svg/ 目录');
}

/**
 * 创建简单的SVG图标
 */
function createSVGIcon(text, color) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="81" height="81" viewBox="0 0 81 81" xmlns="http://www.w3.org/2000/svg">
  <rect width="81" height="81" fill="${color}" opacity="0.1" rx="12"/>
  <text x="40.5" y="45" text-anchor="middle" font-size="32" fill="${color}">${text}</text>
</svg>`;
}

// 主函数
function main() {
  console.log('🚀 开始生成底部导航栏图标...\n');

  try {
    generateIconPlaceholders();
    generateIconConfig();
    generateSVGIcons();

    console.log('\n✨ 所有图标文件生成完成！');
    console.log('\n📋 下一步操作：');
    console.log('1. 使用设计工具打开 assets/svg/ 目录中的SVG文件');
    console.log('2. 根据设计规范优化图标样式');
    console.log('3. 导出为PNG格式，保存到 assets/images/ 目录');
    console.log('4. 取消 app.json 中图标路径的注释');

  } catch (error) {
    console.error('❌ 生成图标时出错：', error.message);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateIconPlaceholders,
  generateSVGIcons,
  generateIconConfig
};
#!/usr/bin/env node

/**
 * WXML文件标签验证脚本
 * 检查WXML文件中的标签是否正确闭合
 */

const fs = require('fs');
const path = require('path');

/**
 * 验证WXML文件的标签闭合
 */
function validateWXML(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const tags = [];
    const selfClosingTags = new Set([
      'image', 'input', 'textarea', 'button', 'checkbox', 'radio',
      'progress', 'slider', 'switch', 'navigator', 'audio', 'video',
      'camera', 'live-player', 'live-pusher', 'map', 'canvas', 'web-view'
    ]);

    let lineNum = 0;
    let hasError = false;

    for (const line of lines) {
      lineNum++;

      // 跳过注释和空行
      if (line.trim().startsWith('<!--') || line.trim() === '') {
        continue;
      }

      // 查找标签
      const tagMatches = line.match(/<\/?[\w-]+[^>]*>/g);
      if (!tagMatches) continue;

      for (const tag of tagMatches) {
        if (tag.includes('<!--')) continue; // 跳过注释标签

        if (tag.startsWith('</')) {
          // 闭合标签
          const tagName = tag.match(/<\/([\w-]+)>/)?.[1];
          if (!tagName) continue;

          const lastOpenIndex = tags.map(t => t.name).lastIndexOf(tagName);
          if (lastOpenIndex === -1) {
            console.error(`❌ ${filePath}:${lineNum} - 未匹配的闭合标签: ${tagName}`);
            hasError = true;
          } else {
            tags.splice(lastOpenIndex, 1);
          }
        } else if (tag.endsWith('/>')) {
          // 自闭合标签，不需要处理
          continue;
        } else {
          // 开始标签
          const tagName = tag.match(/<([\w-]+)[^>]*>/)?.[1];
          if (!tagName) continue;

          if (!selfClosingTags.has(tagName)) {
            tags.push({
              name: tagName,
              line: lineNum,
              tag: tag.trim()
            });
          }
        }
      }
    }

    // 检查未闭合的标签
    if (tags.length > 0) {
      console.error(`❌ ${filePath} - 未闭合的标签:`);
      tags.forEach(tag => {
        console.error(`   第${tag.line}行: ${tag.name} (${tag.tag})`);
      });
      hasError = true;
    }

    if (!hasError) {
      console.log(`✅ ${filePath} - 标签结构正确`);
    }

    return !hasError;

  } catch (error) {
    console.error(`❌ 验证 ${filePath} 时出错:`, error.message);
    return false;
  }
}

/**
 * 查找所有WXML文件
 */
function findWXMLFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.wxml')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * 主函数
 */
function main() {
  const pagesDir = path.join(__dirname, '../miniprogram/pages');

  if (!fs.existsSync(pagesDir)) {
    console.error('❌ pages目录不存在');
    process.exit(1);
  }

  console.log('🔍 开始验证WXML文件标签结构...\n');

  const wxmlFiles = findWXMLFiles(pagesDir);
  let allValid = true;

  if (wxmlFiles.length === 0) {
    console.log('⚠️  未找到任何WXML文件');
    return;
  }

  console.log(`找到 ${wxmlFiles.length} 个WXML文件:\n`);

  for (const file of wxmlFiles) {
    const relativePath = path.relative(pagesDir, file);
    const isValid = validateWXML(file);
    if (!isValid) {
      allValid = false;
    }
  }

  console.log('\n' + '='.repeat(50));

  if (allValid) {
    console.log('🎉 所有WXML文件验证通过！');
    console.log('✅ 标签结构完整，可以正常编译');
  } else {
    console.log('❌ 发现WXML标签错误，请修复后重试');
    console.log('💡 常见问题：');
    console.log('   - 缺少闭合标签');
    console.log('   - 标签嵌套错误');
    console.log('   - 特殊字符未转义');
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  validateWXML,
  findWXMLFiles
};
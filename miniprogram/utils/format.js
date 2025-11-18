// 数据格式化工具

/**
 * 格式化日期时间
 */
class DateTimeFormatter {
  /**
   * 格式化日期
   * @param {Date|string|number} date - 日期
   * @param {string} format - 格式化字符串
   * @returns {string} 格式化后的日期
   */
  static formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const second = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second);
  }

  /**
   * 获取相对时间
   * @param {Date|string|number} date - 日期
   * @returns {string} 相对时间描述
   */
  static getRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diff = now.getTime() - target.getTime();

    if (diff < 0) return '未来时间';

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  }

  /**
   * 获取友好时间显示
   * @param {Date|string|number} date - 日期
   * @returns {string} 友好时间显示
   */
  static getFriendlyTime(date) {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === d.toDateString();

    if (isToday) {
      return `今天 ${this.formatDate(d, 'HH:mm')}`;
    } else if (isYesterday) {
      return `昨天 ${this.formatDate(d, 'HH:mm')}`;
    } else {
      return this.formatDate(d, 'MM-DD HH:mm');
    }
  }

  /**
   * 格式化时间区间
   * @param {Date|string|number} startTime - 开始时间
   * @param {Date|string|number} endTime - 结束时间
   * @returns {string} 时间区间
   */
  static formatTimeRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start.toDateString() === end.toDateString()) {
      return `${this.formatDate(start, 'MM-DD HH:mm')} - ${this.formatDate(end, 'HH:mm')}`;
    } else {
      return `${this.formatDate(start, 'MM-DD HH:mm')} - ${this.formatDate(end, 'MM-DD HH:mm')}`;
    }
  }
}

/**
 * 数字格式化
 */
class NumberFormatter {
  /**
   * 格式化金额
   * @param {number} amount - 金额
   * @param {number} decimals - 小数位数
   * @param {string} currency - 货币符号
   * @returns {string} 格式化后的金额
   */
  static formatCurrency(amount, decimals = 2, currency = '¥') {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return `${currency}0.00`;
    }

    const formattedAmount = amount.toFixed(decimals);
    const parts = formattedAmount.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return currency + parts.join('.');
  }

  /**
   * 格式化大数字
   * @param {number} num - 数字
   * @param {number} decimals - 小数位数
   * @returns {string} 格式化后的数字
   */
  static formatLargeNumber(num, decimals = 1) {
    if (typeof num !== 'number' || isNaN(num)) {
      return '0';
    }

    if (num >= 100000000) {
      return (num / 100000000).toFixed(decimals) + '亿';
    } else if (num >= 10000) {
      return (num / 10000).toFixed(decimals) + '万';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(decimals) + 'k';
    }

    return num.toString();
  }

  /**
   * 格式化百分比
   * @param {number} value - 数值
   * @param {number} decimals - 小数位数
   * @returns {string} 百分比
   */
  static formatPercentage(value, decimals = 1) {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0%';
    }

    return (value * 100).toFixed(decimals) + '%';
  }

  /**
   * 格式化评分
   * @param {number} rating - 评分
   * @param {number} maxRating - 最高评分
   * @param {number} decimals - 小数位数
   * @returns {string} 格式化后的评分
   */
  static formatRating(rating, maxRating = 5, decimals = 1) {
    if (typeof rating !== 'number' || isNaN(rating)) {
      return `0.0/${maxRating}`;
    }

    const normalizedRating = Math.min(Math.max(rating, 0), maxRating);
    return `${normalizedRating.toFixed(decimals)}/${maxRating}`;
  }

  /**
   * 格式化距离
   * @param {number} meters - 距离（米）
   * @returns {string} 格式化后的距离
   */
  static formatDistance(meters) {
    if (typeof meters !== 'number' || isNaN(meters) || meters < 0) {
      return '0m';
    }

    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else if (meters < 100000) {
      return `${(meters / 1000).toFixed(1)}km`;
    } else {
      return `>100km`;
    }
  }

  /**
   * 格式化持续时间
   * @param {number} minutes - 分钟数
   * @returns {string} 格式化后的时间
   */
  static formatDuration(minutes) {
    if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) {
      return '0分钟';
    }

    if (minutes < 60) {
      return `${Math.round(minutes)}分钟`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;

      if (mins === 0) {
        return `${hours}小时`;
      } else {
        return `${hours}小时${mins}分钟`;
      }
    }
  }
}

/**
 * 字符串格式化
 */
class StringFormatter {
  /**
   * 手机号脱敏
   * @param {string} phone - 手机号
   * @returns {string} 脱敏后的手机号
   */
  static maskPhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  /**
   * 身份证号脱敏
   * @param {string} idCard - 身份证号
   * @returns {string} 脱敏后的身份证号
   */
  static maskIdCard(idCard) {
    if (!idCard || typeof idCard !== 'string') {
      return '';
    }

    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  }

  /**
   * 姓名脱敏
   * @param {string} name - 姓名
   * @returns {string} 脱敏后的姓名
   */
  static maskName(name) {
    if (!name || typeof name !== 'string') {
      return '';
    }

    if (name.length === 2) {
      return name[0] + '*';
    } else if (name.length > 2) {
      return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
    }

    return name;
  }

  /**
   * 截断字符串
   * @param {string} str - 字符串
   * @param {number} maxLength - 最大长度
   * @param {string} suffix - 后缀
   * @returns {string} 截断后的字符串
   */
  static truncate(str, maxLength = 20, suffix = '...') {
    if (!str || typeof str !== 'string') {
      return '';
    }

    if (str.length <= maxLength) {
      return str;
    }

    return str.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * 首字母大写
   * @param {string} str - 字符串
   * @returns {string} 首字母大写的字符串
   */
  static capitalize(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }

    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * 驼峰转下划线
   * @param {string} str - 驼峰字符串
   * @returns {string} 下划线字符串
   */
  static camelToSnake(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }

    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * 下划线转驼峰
   * @param {string} str - 下划线字符串
   * @returns {string} 驼峰字符串
   */
  static snakeToCamel(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }

    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * 生成随机字符串
   * @param {number} length - 长度
   * @param {string} chars - 字符集
   * @returns {string} 随机字符串
   */
  static randomString(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * 数组格式化
 */
class ArrayFormatter {
  /**
   * 数组分组
   * @param {Array} array - 数组
   * @param {string|Function} key - 分组键
   * @returns {Object} 分组后的对象
   */
  static groupBy(array, key) {
    if (!Array.isArray(array)) {
      return {};
    }

    return array.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : item[key];
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {});
  }

  /**
   * 数组去重
   * @param {Array} array - 数组
   * @param {string|Function} key - 去重键
   * @returns {Array} 去重后的数组
   */
  static unique(array, key) {
    if (!Array.isArray(array)) {
      return [];
    }

    if (!key) {
      return [...new Set(array)];
    }

    const seen = new Set();
    return array.filter(item => {
      const itemKey = typeof key === 'function' ? key(item) : item[key];
      if (seen.has(itemKey)) {
        return false;
      }
      seen.add(itemKey);
      return true;
    });
  }

  /**
   * 数组分页
   * @param {Array} array - 数组
   * @param {number} page - 页码（从1开始）
   * @param {number} pageSize - 每页大小
   * @returns {Object} 分页结果
   */
  static paginate(array, page = 1, pageSize = 10) {
    if (!Array.isArray(array)) {
      return {
        data: [],
        page: 1,
        pageSize,
        total: 0,
        totalPages: 0
      };
    }

    const total = array.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      data: array.slice(startIndex, endIndex),
      page,
      pageSize,
      total,
      totalPages
    };
  }

  /**
   * 数组排序
   * @param {Array} array - 数组
   * @param {string|Function} key - 排序键
   * @param {string} order - 排序顺序 'asc' | 'desc'
   * @returns {Array} 排序后的数组
   */
  static sortBy(array, key, order = 'asc') {
    if (!Array.isArray(array)) {
      return [];
    }

    return [...array].sort((a, b) => {
      const valueA = typeof key === 'function' ? key(a) : a[key];
      const valueB = typeof key === 'function' ? key(b) : b[key];

      if (valueA < valueB) {
        return order === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
}

/**
 * 文件大小格式化
 */
class FileFormatter {
  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @param {number} decimals - 小数位数
   * @returns {string} 格式化后的文件大小
   */
  static formatFileSize(bytes, decimals = 2) {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
      return '0 B';
    }

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    if (i === 0) {
      return `${bytes} ${sizes[i]}`;
    }

    return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${sizes[i]}`;
  }

  /**
   * 获取文件扩展名
   * @param {string} filename - 文件名
   * @returns {string} 文件扩展名
   */
  static getFileExtension(filename) {
    if (!filename || typeof filename !== 'string') {
      return '';
    }

    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
      return '';
    }

    return filename.substring(lastDotIndex + 1).toLowerCase();
  }

  /**
   * 格式化文件名
   * @param {string} filename - 文件名
   * @param {number} maxLength - 最大长度
   * @returns {string} 格式化后的文件名
   */
  static formatFileName(filename, maxLength = 20) {
    if (!filename || typeof filename !== 'string') {
      return '';
    }

    const extension = this.getFileExtension(filename);
    const nameWithoutExt = filename.substring(0, filename.length - extension.length - (extension ? 1 : 0));

    if (filename.length <= maxLength) {
      return filename;
    }

    const maxNameLength = maxLength - extension.length - 4; // 4 for "..."
    if (maxNameLength <= 0) {
      return filename.substring(0, maxLength);
    }

    const truncatedName = nameWithoutExt.substring(0, maxNameLength) + '...';
    return extension ? `${truncatedName}.${extension}` : truncatedName;
  }
}

module.exports = {
  DateTimeFormatter,
  NumberFormatter,
  StringFormatter,
  ArrayFormatter,
  FileFormatter
};
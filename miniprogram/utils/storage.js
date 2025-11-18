// 本地存储工具
const app = getApp();

/**
 * 存储键名常量
 */
const STORAGE_KEYS = {
  // 用户相关
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER_INFO: 'userInfo',
  LOGIN_HISTORY: 'loginHistory',

  // 地址相关
  USER_ADDRESSES: 'userAddresses',
  DEFAULT_ADDRESS: 'defaultAddress',
  LOCATION_CACHE: 'locationCache',

  // 订单相关
  RECENT_ORDERS: 'recentOrders',
  ORDER_DRAFT: 'orderDraft',
  SERVICE_HISTORY: 'serviceHistory',

  // 技师相关
  FAVORITE_TECHNICIANS: 'favoriteTechnicians',
  TECHNICIAN_CACHE: 'technicianCache',
  TECHNICIAN_RATINGS: 'technicianRatings',

  // 应用设置
  APP_SETTINGS: 'appSettings',
  THEME_MODE: 'themeMode',
  LANGUAGE: 'language',
  PUSH_SETTINGS: 'pushSettings',

  // 缓存数据
  SERVICE_CATEGORIES: 'serviceCategories',
  COUPONS: 'coupons',
  BANNER_CACHE: 'bannerCache',

  // 临时数据
  TEMP_DATA: 'tempData',
  UPLOAD_QUEUE: 'uploadQueue'
};

/**
 * 存储配置
 */
const STORAGE_CONFIG = {
  // 默认过期时间（毫秒）
  DEFAULT_EXPIRE_TIME: 24 * 60 * 60 * 1000, // 24小时

  // 最大存储大小（字符数）
  MAX_STORAGE_SIZE: 10 * 1024 * 1024, // 10MB

  // 缓存清理阈值
  CLEANUP_THRESHOLD: 0.9 // 90%时触发清理
};

/**
 * 本地存储管理器
 */
class StorageManager {
  constructor() {
    this.memoryCache = new Map();
    this.expiryMap = new Map();
    this.init();
  }

  /**
   * 初始化存储管理器
   */
  async init() {
    // 加载过期时间映射
    await this.loadExpiryMap();

    // 清理过期数据
    await this.cleanExpiredData();

    // 检查存储空间
    await this.checkStorageSpace();

    console.log('存储管理器初始化完成');
  }

  /**
   * 设置存储项
   * @param {string} key - 存储键
   * @param {any} value - 存储值
   * @param {number} expireTime - 过期时间（毫秒）
   * @param {boolean} sync - 是否同步存储
   * @returns {Promise<boolean>} 是否设置成功
   */
  async setItem(key, value, expireTime = null, sync = false) {
    try {
      // 数据序列化
      const serializedValue = this.serialize(value);
      const expireTimeKey = this.getExpireKey(key);

      // 设置过期时间
      if (expireTime && expireTime > 0) {
        const expiryTime = Date.now() + expireTime;
        this.expiryMap.set(key, expiryTime);

        if (sync) {
          wx.setStorageSync(expireTimeKey, expiryTime.toString());
        } else {
          await this.setStorage(expireTimeKey, expiryTime.toString());
        }
      } else {
        this.expiryMap.delete(key);
        if (sync) {
          wx.removeStorageSync(expireTimeKey);
        } else {
          await this.removeStorage(expireTimeKey);
        }
      }

      // 存储数据
      const storageKey = this.getStorageKey(key);
      if (sync) {
        wx.setStorageSync(storageKey, serializedValue);
      } else {
        await this.setStorage(storageKey, serializedValue);
      }

      // 更新内存缓存
      this.memoryCache.set(key, value);

      console.log(`存储设置成功: ${key}`);
      return true;
    } catch (error) {
      console.error(`存储设置失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 获取存储项
   * @param {string} key - 存储键
   * @param {boolean} sync - 是否同步读取
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>} 存储值
   */
  async getItem(key, sync = false, defaultValue = null) {
    try {
      // 检查内存缓存
      if (this.memoryCache.has(key)) {
        return this.memoryCache.get(key);
      }

      // 检查是否过期
      if (await this.isExpired(key)) {
        await this.removeItem(key);
        return defaultValue;
      }

      // 从存储中读取
      const storageKey = this.getStorageKey(key);
      let serializedValue;

      if (sync) {
        serializedValue = wx.getStorageSync(storageKey);
      } else {
        serializedValue = await this.getStorage(storageKey);
      }

      if (serializedValue === '' || serializedValue === null || serializedValue === undefined) {
        return defaultValue;
      }

      // 数据反序列化
      const value = this.deserialize(serializedValue);

      // 更新内存缓存
      this.memoryCache.set(key, value);

      return value;
    } catch (error) {
      console.error(`存储读取失败: ${key}`, error);
      return defaultValue;
    }
  }

  /**
   * 移除存储项
   * @param {string} key - 存储键
   * @param {boolean} sync - 是否同步操作
   * @returns {Promise<boolean>} 是否移除成功
   */
  async removeItem(key, sync = false) {
    try {
      const storageKey = this.getStorageKey(key);
      const expireTimeKey = this.getExpireKey(key);

      // 清除内存缓存
      this.memoryCache.delete(key);
      this.expiryMap.delete(key);

      if (sync) {
        wx.removeStorageSync(storageKey);
        wx.removeStorageSync(expireTimeKey);
      } else {
        await Promise.all([
          this.removeStorage(storageKey),
          this.removeStorage(expireTimeKey)
        ]);
      }

      console.log(`存储移除成功: ${key}`);
      return true;
    } catch (error) {
      console.error(`存储移除失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 清空存储
   * @param {boolean} sync - 是否同步操作
   * @returns {Promise<boolean>} 是否清空成功
   */
  async clear(sync = false) {
    try {
      // 清除内存缓存
      this.memoryCache.clear();
      this.expiryMap.clear();

      if (sync) {
        wx.clearStorageSync();
      } else {
        await this.clearStorage();
      }

      console.log('存储清空成功');
      return true;
    } catch (error) {
      console.error('存储清空失败', error);
      return false;
    }
  }

  /**
   * 获取存储信息
   * @returns {Promise<Object>} 存储信息
   */
  async getStorageInfo() {
    return new Promise((resolve, reject) => {
      wx.getStorageInfo({
        success: resolve,
        fail: reject
      });
    });
  }

  /**
   * 检查数据是否过期
   * @param {string} key - 存储键
   * @returns {Promise<boolean>} 是否过期
   */
  async isExpired(key) {
    const expiryTime = this.expiryMap.get(key);
    if (!expiryTime) {
      return false;
    }

    return Date.now() > expiryTime;
  }

  /**
   * 设置带过期时间的存储
   * @param {string} key - 存储键
   * @param {any} value - 存储值
   * @param {string} expireUnit - 过期单位 'minutes', 'hours', 'days'
   * @param {number} expireValue - 过期数值
   * @returns {Promise<boolean>} 是否设置成功
   */
  async setItemWithExpire(key, value, expireUnit = 'hours', expireValue = 24) {
    const expireTimeMap = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000
    };

    const expireTime = expireTimeMap[expireUnit] * expireValue;
    return await this.setItem(key, value, expireTime);
  }

  /**
   * 获取所有键
   * @returns {Array<string>} 键列表
   */
  getAllKeys() {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * 批量设置
   * @param {Object} items - 存储项对象
   * @param {number} expireTime - 过期时间
   * @returns {Promise<boolean>} 是否全部设置成功
   */
  async setItems(items, expireTime = null) {
    const results = await Promise.all(
      Object.entries(items).map(([key, value]) => this.setItem(key, value, expireTime))
    );

    return results.every(result => result === true);
  }

  /**
   * 批量获取
   * @param {Array<string>} keys - 键列表
   * @returns {Promise<Object>} 获取结果
   */
  async getItems(keys) {
    const results = await Promise.all(
      keys.map(key => this.getItem(key).then(value => ({ key, value })))
    );

    return results.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  /**
   * 数据序列化
   * @param {any} value - 要序列化的值
   * @returns {string} 序列化后的字符串
   */
  serialize(value) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('数据序列化失败', error);
      return '';
    }
  }

  /**
   * 数据反序列化
   * @param {string} serializedValue - 序列化的字符串
   * @returns {any} 反序列化后的值
   */
  deserialize(serializedValue) {
    try {
      return JSON.parse(serializedValue);
    } catch (error) {
      console.error('数据反序列化失败', error);
      return serializedValue;
    }
  }

  /**
   * 获取存储键
   * @param {string} key - 原始键
   * @returns {string} 存储键
   */
  getStorageKey(key) {
    return `app_${key}`;
  }

  /**
   * 获取过期时间键
   * @param {string} key - 原始键
   * @returns {string} 过期时间键
   */
  getExpireKey(key) {
    return `${key}_expire`;
  }

  /**
   * 异步设置存储
   * @param {string} key - 存储键
   * @param {string} data - 数据
   * @returns {Promise<void>}
   */
  setStorage(key, data) {
    return new Promise((resolve, reject) => {
      wx.setStorage({
        key,
        data,
        success: resolve,
        fail: reject
      });
    });
  }

  /**
   * 异步获取存储
   * @param {string} key - 存储键
   * @returns {Promise<string>} 数据
   */
  getStorage(key) {
    return new Promise((resolve, reject) => {
      wx.getStorage({
        key,
        success: (res) => resolve(res.data),
        fail: (error) => {
          if (error.errMsg.includes('data not found')) {
            resolve(null);
          } else {
            reject(error);
          }
        }
      });
    });
  }

  /**
   * 异步移除存储
   * @param {string} key - 存储键
   * @returns {Promise<void>}
   */
  removeStorage(key) {
    return new Promise((resolve, reject) => {
      wx.removeStorage({
        key,
        success: resolve,
        fail: reject
      });
    });
  }

  /**
   * 异步清空存储
   * @returns {Promise<void>}
   */
  clearStorage() {
    return new Promise((resolve, reject) => {
      wx.clearStorage({
        success: resolve,
        fail: reject
      });
    });
  }

  /**
   * 加载过期时间映射
   */
  async loadExpiryMap() {
    try {
      const storageInfo = await this.getStorageInfo();
      const expireKeys = storageInfo.keys.filter(key => key.endsWith('_expire'));

      for (const expireKey of expireKeys) {
        const key = expireKey.replace('_expire', '');
        const expiryTime = await this.getStorage(expireKey);

        if (expiryTime) {
          this.expiryMap.set(key, parseInt(expiryTime));
        }
      }

      console.log(`加载了 ${this.expiryMap.size} 个过期时间记录`);
    } catch (error) {
      console.error('加载过期时间映射失败', error);
    }
  }

  /**
   * 清理过期数据
   */
  async cleanExpiredData() {
    const expiredKeys = [];

    for (const [key, expiryTime] of this.expiryMap) {
      if (Date.now() > expiryTime) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      await Promise.all(expiredKeys.map(key => this.removeItem(key)));
      console.log(`清理了 ${expiredKeys.length} 个过期数据项`);
    }
  }

  /**
   * 检查存储空间
   */
  async checkStorageSpace() {
    try {
      const storageInfo = await this.getStorageInfo();
      const usedSize = storageInfo.currentSize;
      const limitSize = storageInfo.limitSize;

      const usageRatio = usedSize / limitSize;

      if (usageRatio > STORAGE_CONFIG.CLEANUP_THRESHOLD) {
        console.warn(`存储空间使用率过高: ${(usageRatio * 100).toFixed(2)}%`);
        await this.optimizeStorage();
      }
    } catch (error) {
      console.error('检查存储空间失败', error);
    }
  }

  /**
   * 优化存储空间
   */
  async optimizeStorage() {
    try {
      // 清理过期数据
      await this.cleanExpiredData();

      // 清理临时数据
      await this.removeItem(STORAGE_KEYS.TEMP_DATA);
      await this.removeItem(STORAGE_KEYS.UPLOAD_QUEUE);

      // 清理过期的缓存数据
      await this.removeItem(STORAGE_KEYS.BANNER_CACHE);
      await this.removeItem(STORAGE_KEYS.TECHNICIAN_CACHE);

      console.log('存储空间优化完成');
    } catch (error) {
      console.error('存储空间优化失败', error);
    }
  }
}

// 创建存储管理器实例
const storageManager = new StorageManager();

/**
 * 便捷的存储操作函数
 */
const Storage = {
  /**
   * 设置存储
   */
  set: (key, value, expireTime) => storageManager.setItem(key, value, expireTime),

  /**
   * 获取存储
   */
  get: (key, defaultValue) => storageManager.getItem(key, false, defaultValue),

  /**
   * 移除存储
   */
  remove: (key) => storageManager.removeItem(key),

  /**
   * 清空存储
   */
  clear: () => storageManager.clear(),

  /**
   * 设置带过期时间的存储
   */
  setWithExpire: (key, value, expireUnit, expireValue) =>
    storageManager.setItemWithExpire(key, value, expireUnit, expireValue),

  /**
   * 批量设置
   */
  setItems: (items, expireTime) => storageManager.setItems(items, expireTime),

  /**
   * 批量获取
   */
  getItems: (keys) => storageManager.getItems(keys),

  /**
   * 同步操作
   */
  setSync: (key, value) => storageManager.setItem(key, value, null, true),
  getSync: (key, defaultValue) => storageManager.getItem(key, true, defaultValue),
  removeSync: (key) => storageManager.removeItem(key, true),

  /**
   * 获取存储信息
   */
  getInfo: () => storageManager.getStorageInfo(),

  /**
   * 检查是否过期
   */
  isExpired: (key) => storageManager.isExpired(key)
};

module.exports = {
  Storage,
  STORAGE_KEYS,
  STORAGE_CONFIG,
  StorageManager
};
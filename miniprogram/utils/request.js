// 网络请求工具
const app = getApp();

/**
 * 请求配置
 */
const CONFIG = {
  baseURL: app.globalData?.config?.apiBaseUrl || 'https://api.tuinawxapp.com',
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000
};

/**
 * 请求队列管理
 */
const requestQueue = [];
let isRefreshing = false;
let failedQueue = [];

/**
 * 错误类型枚举
 */
const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  BUSINESS_ERROR: 'BUSINESS_ERROR'
};

/**
 * HTTP状态码对应错误类型
 */
const STATUS_ERROR_MAP = {
  400: ERROR_TYPES.BUSINESS_ERROR,
  401: ERROR_TYPES.AUTH_ERROR,
  403: ERROR_TYPES.AUTH_ERROR,
  404: ERROR_TYPES.BUSINESS_ERROR,
  408: ERROR_TYPES.TIMEOUT_ERROR,
  429: ERROR_TYPES.NETWORK_ERROR,
  500: ERROR_TYPES.SERVER_ERROR,
  502: ERROR_TYPES.SERVER_ERROR,
  503: ERROR_TYPES.SERVER_ERROR,
  504: ERROR_TYPES.TIMEOUT_ERROR
};

/**
 * 创建请求实例
 */
class Request {
  constructor() {
    this.baseURL = CONFIG.baseURL;
    this.timeout = CONFIG.timeout;
    this.interceptors = {
      request: [],
      response: []
    };

    // 添加默认拦截器
    this.addDefaultInterceptors();
  }

  /**
   * 添加默认拦截器
   */
  addDefaultInterceptors() {
    // 请求拦截器
    this.interceptors.request.push({
      fulfilled: (config) => {
        // 添加公共headers
        config.header = {
          'Content-Type': 'application/json',
          'X-Client-Version': app.globalData?.config?.version || '1.0.0',
          'X-Timestamp': Date.now(),
          ...config.header
        };

        // 添加认证token
        const token = this.getToken();
        if (token) {
          config.header.Authorization = `Bearer ${token}`;
        }

        // 添加请求ID
        config.header['X-Request-ID'] = this.generateRequestId();

        console.log(`[Request] ${config.method} ${config.url}`, config);
        return config;
      },
      rejected: (error) => {
        console.error('[Request] 请求拦截器错误', error);
        return Promise.reject(error);
      }
    });

    // 响应拦截器
    this.interceptors.response.push({
      fulfilled: (response) => {
        console.log(`[Response] ${response.statusCode}`, response.data);

        // 处理HTTP状态码
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return response.data;
        } else {
          return this.handleHttpError(response);
        }
      },
      rejected: (error) => {
        console.error('[Response] 响应错误', error);
        return this.handleNetworkError(error);
      }
    });
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取token
   */
  getToken() {
    return app.globalData?.token || wx.getStorageSync('token');
  }

  /**
   * 设置token
   */
  setToken(token) {
    if (app.globalData) {
      app.globalData.token = token;
    }
    wx.setStorageSync('token', token);
  }

  /**
   * 处理HTTP错误
   */
  async handleHttpError(response) {
    const error = new Error(this.getErrorMessage(response));
    error.type = STATUS_ERROR_MAP[response.statusCode] || ERROR_TYPES.SERVER_ERROR;
    error.statusCode = response.statusCode;
    error.response = response;

    // 处理认证错误
    if (response.statusCode === 401) {
      return this.handleAuthError(error);
    }

    return Promise.reject(error);
  }

  /**
   * 处理网络错误
   */
  handleNetworkError(error) {
    const networkError = new Error(this.getNetworkErrorMessage(error));
    networkError.type = ERROR_TYPES.NETWORK_ERROR;
    networkError.originalError = error;

    return Promise.reject(networkError);
  }

  /**
   * 处理认证错误
   */
  async handleAuthError(error) {
    // 如果正在刷新token，将请求加入队列
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        // token刷新成功后重新发起请求
        return this.request(error.config);
      }).catch((err) => {
        return Promise.reject(err);
      });
    }

    isRefreshing = true;

    try {
      // 尝试刷新token
      const newToken = await this.refreshToken();

      // 处理队列中的请求
      failedQueue.forEach(({ resolve }) => {
        resolve(newToken);
      });
      failedQueue = [];

      // 重新发起原请求
      return this.request(error.config);
    } catch (refreshError) {
      // token刷新失败，处理登出逻辑
      this.handleLogout();

      // 拒绝队列中的请求
      failedQueue.forEach(({ reject }) => {
        reject(refreshError);
      });
      failedQueue = [];

      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }

  /**
   * 刷新token
   */
  async refreshToken() {
    const refreshToken = wx.getStorageSync('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await wx.request({
      url: `${this.baseURL}/auth/refresh`,
      method: 'POST',
      data: { refreshToken },
      header: {
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode === 200 && response.data.code === 200) {
      const { token, refreshToken: newRefreshToken } = response.data.data;
      this.setToken(token);
      wx.setStorageSync('refreshToken', newRefreshToken);
      return token;
    } else {
      throw new Error('Token refresh failed');
    }
  }

  /**
   * 处理登出逻辑
   */
  handleLogout() {
    // 清除本地存储
    this.setToken(null);
    wx.removeStorageSync('refreshToken');

    // 清除全局状态
    if (app.globalData) {
      app.globalData.token = null;
      app.globalData.userInfo = null;
    }

    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/user/login/index'
    });
  }

  /**
   * 获取错误信息
   */
  getErrorMessage(response) {
    if (response.data && response.data.message) {
      return response.data.message;
    }

    const statusMessages = {
      400: '请求参数错误',
      401: '未授权，请重新登录',
      403: '拒绝访问',
      404: '请求的资源不存在',
      408: '请求超时',
      429: '请求过于频繁',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务不可用',
      504: '网关超时'
    };

    return statusMessages[response.statusCode] || `请求失败 (${response.statusCode})`;
  }

  /**
   * 获取网络错误信息
   */
  getNetworkErrorMessage(error) {
    if (error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        return '请求超时，请检查网络连接';
      } else if (error.errMsg.includes('fail')) {
        return '网络连接失败，请检查网络设置';
      }
    }
    return '网络请求失败';
  }

  /**
   * 核心请求方法
   */
  async request(config) {
    try {
      // 执行请求拦截器
      let processedConfig = { ...config };
      for (const interceptor of this.interceptors.request) {
        if (interceptor.fulfilled) {
          processedConfig = await interceptor.fulfilled(processedConfig);
        }
      }

      // 构建完整URL
      const url = this.buildURL(processedConfig.url);

      // 发起请求
      const response = await this.makeRequest(url, processedConfig);

      // 执行响应拦截器
      let processedResponse = response;
      for (const interceptor of this.interceptors.response) {
        if (interceptor.fulfilled) {
          processedResponse = await interceptor.fulfilled(processedResponse);
        }
      }

      return processedResponse;
    } catch (error) {
      // 执行错误拦截器
      for (const interceptor of this.interceptors.response) {
        if (interceptor.rejected) {
          try {
            await interceptor.rejected(error);
          } catch (interceptorError) {
            console.error('响应错误拦截器出错', interceptorError);
          }
        }
      }

      throw error;
    }
  }

  /**
   * 构建完整URL
   */
  buildURL(url) {
    if (url.startsWith('http')) {
      return url;
    }

    const baseURL = config.baseURL || this.baseURL;
    return `${baseURL}${url}`;
  }

  /**
   * 发起实际请求
   */
  makeRequest(url, config) {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: config.method || 'GET',
        data: config.data,
        header: config.header,
        timeout: config.timeout || this.timeout,
        dataType: 'json',
        success: resolve,
        fail: reject
      });
    });
  }

  /**
   * GET请求
   */
  get(url, params = {}, config = {}) {
    return this.request({
      method: 'GET',
      url,
      data: params,
      ...config
    });
  }

  /**
   * POST请求
   */
  post(url, data = {}, config = {}) {
    return this.request({
      method: 'POST',
      url,
      data,
      ...config
    });
  }

  /**
   * PUT请求
   */
  put(url, data = {}, config = {}) {
    return this.request({
      method: 'PUT',
      url,
      data,
      ...config
    });
  }

  /**
   * DELETE请求
   */
  delete(url, data = {}, config = {}) {
    return this.request({
      method: 'DELETE',
      url,
      data,
      ...config
    });
  }

  /**
   * 文件上传
   */
  upload(url, filePath, formData = {}, config = {}) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: this.buildURL(url),
        filePath,
        name: config.name || 'file',
        formData,
        header: {
          Authorization: this.getToken() ? `Bearer ${this.getToken()}` : '',
          ...config.header
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (error) {
            reject(new Error('文件上传响应解析失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 文件下载
   */
  download(url, config = {}) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url: this.buildURL(url),
        header: {
          Authorization: this.getToken() ? `Bearer ${this.getToken()}` : '',
          ...config.header
        },
        success: resolve,
        fail: reject
      });
    });
  }
}

// 创建请求实例
const request = new Request();

/**
 * 带重试机制的请求
 */
async function requestWithRetry(config, retryCount = CONFIG.retryCount) {
  let lastError;

  for (let i = 0; i <= retryCount; i++) {
    try {
      return await request.request(config);
    } catch (error) {
      lastError = error;

      // 如果是认证错误，不重试
      if (error.type === ERROR_TYPES.AUTH_ERROR) {
        throw error;
      }

      // 如果是最后一次尝试，直接抛出错误
      if (i === retryCount) {
        throw error;
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * Math.pow(2, i)));
    }
  }

  throw lastError;
}

/**
 * 请求取消器
 */
class CancelToken {
  constructor() {
    this.reason = null;
    this.listeners = [];
  }

  cancel(reason) {
    if (this.reason) return;

    this.reason = reason || '请求已取消';
    this.listeners.forEach(listener => {
      listener(this.reason);
    });
  }

  onCancel(callback) {
    this.listeners.push(callback);
  }
}

/**
 * 创建取消token
 */
function createCancelToken() {
  return new CancelToken();
}

module.exports = {
  request,
  requestWithRetry,
  createCancelToken,
  ERROR_TYPES
};
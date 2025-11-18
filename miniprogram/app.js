// 应用入口文件
App({
  onLaunch(options) {
    console.log('应用启动', options);

    // 初始化全局数据
    this.initGlobalData();

    // 检查登录状态
    this.checkLoginStatus();

    // 获取系统信息
    this.getSystemInfo();

    // 初始化云开发
    this.initCloud();
  },

  onShow(options) {
    console.log('应用显示', options);
  },

  onHide() {
    console.log('应用隐藏');
  },

  onError(msg) {
    console.error('应用错误', msg);
    // 可以在这里添加错误上报逻辑
  },

  /**
   * 初始化全局数据
   */
  initGlobalData() {
    this.globalData = {
      userInfo: null,
      token: null,
      location: null,
      systemInfo: null,
      isNetworkConnected: true,
      config: {
        apiBaseUrl: 'https://api.example.com',
        version: '1.0.0'
      }
    };
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      // 验证token有效性
      this.validateToken(token);
    }
  },

  /**
   * 验证token有效性
   */
  async validateToken(token) {
    try {
      // 调用后端接口验证token
      const result = await this.request({
        url: '/auth/validate',
        method: 'GET',
        header: {
          Authorization: `Bearer ${token}`
        }
      });

      if (result.code === 200) {
        this.globalData.userInfo = result.data.userInfo;
      } else {
        // token失效，清除本地存储
        wx.removeStorageSync('token');
        this.globalData.token = null;
      }
    } catch (error) {
      console.error('验证token失败', error);
    }
  },

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
        console.log('系统信息', res);
      }
    });
  },

  /**
   * 初始化云开发
   */
  initCloud() {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-env-id', // 云开发环境ID
        traceUser: true
      });
    }
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    return this.globalData.userInfo;
  },

  /**
   * 设置用户信息
   */
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
    wx.setStorageSync('userInfo', userInfo);
  },

  /**
   * 获取token
   */
  getToken() {
    return this.globalData.token;
  },

  /**
   * 设置token
   */
  setToken(token) {
    this.globalData.token = token;
    wx.setStorageSync('token', token);
  },

  /**
   * 清除用户信息
   */
  clearUserInfo() {
    this.globalData.userInfo = null;
    this.globalData.token = null;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
  },

  /**
   * 获取位置信息
   */
  getLocation() {
    return new Promise((resolve, reject) => {
      if (this.globalData.location) {
        resolve(this.globalData.location);
        return;
      }

      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          this.globalData.location = {
            latitude: res.latitude,
            longitude: res.longitude
          };
          resolve(this.globalData.location);
        },
        fail: (error) => {
          console.error('获取位置失败', error);
          reject(error);
        }
      });
    });
  },

  /**
   * 网络请求封装
   */
  request(options) {
    return new Promise((resolve, reject) => {
      const { url, method = 'GET', data = {}, header = {} } = options;

      // 添加token
      if (this.globalData.token) {
        header.Authorization = `Bearer ${this.globalData.token}`;
      }

      wx.request({
        url: `${this.globalData.config.apiBaseUrl}${url}`,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...header
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            // 未授权，跳转登录
            this.clearUserInfo();
            wx.navigateTo({
              url: '/pages/user/login/index'
            });
            reject(new Error('未授权'));
          } else {
            reject(new Error(res.data.message || '请求失败'));
          }
        },
        fail: (error) => {
          console.error('请求失败', error);
          reject(error);
        }
      });
    });
  },

  /**
   * 显示Toast提示
   */
  showToast(title, icon = 'none', duration = 2000) {
    wx.showToast({
      title,
      icon,
      duration
    });
  },

  /**
   * 显示Loading
   */
  showLoading(title = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    });
  },

  /**
   * 隐藏Loading
   */
  hideLoading() {
    wx.hideLoading();
  },

  /**
   * 显示Modal弹窗
   */
  showModal(options) {
    return new Promise((resolve) => {
      wx.showModal({
        title: '提示',
        ...options,
        success: (res) => {
          resolve(res.confirm);
        }
      });
    });
  },

  /**
   * 全局数据
   */
  globalData: {}
});
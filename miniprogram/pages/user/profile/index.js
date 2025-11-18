// 用户个人中心页面
const app = getApp();

Page({
  data: {
    // 用户信息
    userInfo: null,
    userProfile: null,

    // 页面状态
    loading: true,
    refreshing: false,

    // 会员信息
    memberInfo: {
      level: 'normal', // normal, vip, svip
      expiryDate: '',
      benefits: []
    },

    // 统计数据
    userStats: {
      totalOrders: 0,
      completedOrders: 0,
      totalSpent: 0,
      savedAmount: 0,
      coupons: 0,
      points: 0
    },

    // 功能菜单
    menuGroups: [
      {
        title: '我的服务',
        items: [
          {
            id: 'orders',
            title: '我的订单',
            icon: '📋',
            badge: 0,
            path: '/pages/order/list/index'
          },
          {
            id: 'coupons',
            title: '我的优惠券',
            icon: '🎫',
            badge: 0,
            path: '/pages/coupon/list/index'
          },
          {
            id: 'addresses',
            title: '地址管理',
            icon: '📍',
            badge: 0,
            path: '/pages/user/address/index'
          },
          {
            id: 'favorites',
            title: '我的收藏',
            icon: '❤️',
            badge: 0,
            path: '/pages/user/favorites/index'
          }
        ]
      },
      {
        title: '账户设置',
        items: [
          {
            id: 'profile',
            title: '个人资料',
            icon: '👤',
            path: '/pages/user/edit-profile/index'
          },
          {
            id: 'security',
            title: '账户安全',
            icon: '🔒',
            path: '/pages/user/security/index'
          },
          {
            id: 'notification',
            title: '消息通知',
            icon: '🔔',
            badge: 0,
            path: '/pages/user/notification/index'
          },
          {
            id: 'privacy',
            title: '隐私设置',
            icon: '🛡️',
            path: '/pages/user/privacy/index'
          }
        ]
      },
      {
        title: '帮助与支持',
        items: [
          {
            id: 'help',
            title: '帮助中心',
            icon: '❓',
            path: '/pages/help/index'
          },
          {
            id: 'feedback',
            title: '意见反馈',
            icon: '💬',
            path: '/pages/feedback/index'
          },
          {
            id: 'complaint',
            title: '投诉建议',
            icon: '📝',
            path: '/pages/complaint/index'
          },
          {
            id: 'service',
            title: '联系客服',
            icon: '📞',
            path: '/pages/customer-service/index'
          }
        ]
      },
      {
        title: '关于',
        items: [
          {
            id: 'about',
            title: '关于我们',
            icon: 'ℹ️',
            path: '/pages/about/index'
          },
          {
            id: 'terms',
            title: '用户协议',
            icon: '📄',
            path: '/pages/terms/index'
          },
          {
            id: 'privacy',
            title: '隐私政策',
            icon: '🔐',
            path: '/pages/privacy/index'
          }
        ]
      }
    ],

    // 快捷操作
    quickActions: [
      {
        id: 'book-again',
        title: '再次预约',
        icon: '🔄',
        color: '#007aff'
      },
      {
        id: 'invite',
        title: '邀请好友',
        icon: '👥',
        color: '#34c759'
      },
      {
        id: 'recharge',
        title: '充值',
        icon: '💰',
        color: '#ff9500'
      },
      {
        id: 'gift',
        title: '礼品卡',
        icon: '🎁',
        color: '#af52de'
      }
    ],

    // 最新订单
    recentOrders: [],

    // 通知信息
    notifications: [],

    // 版本信息
    appVersion: '1.0.0',
    hasUpdate: false
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 刷新用户信息和统计数据
    this.refreshUserInfo();
  },

  onPullDownRefresh() {
    this.refreshAllData();
  },

  onShareAppMessage() {
    const userProfile = this.data.userProfile;
    return {
      title: '同城推拿 - 专业上门服务',
      path: '/pages/home/index',
      imageUrl: '/images/share-app.jpg'
    };
  },

  // 初始化页面
  async initPage() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 并行加载所有数据
      await Promise.all([
        this.loadUserInfo(),
        this.loadUserStats(),
        this.loadMemberInfo(),
        this.loadRecentOrders(),
        this.loadNotifications(),
        this.checkAppUpdate()
      ]);

    } catch (error) {
      console.error('页面初始化失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({ loading: false });
    }
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'profile'
        }
      });

      if (result.result.code === 0) {
        this.setData({
          userInfo: result.result.data.userInfo,
          userProfile: result.result.data.profile
        });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  // 加载用户统计数据
  async loadUserStats() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'stats'
        }
      });

      if (result.result.code === 0) {
        const stats = result.result.data;

        // 更新菜单徽章
        this.updateMenuBadges(stats);

        this.setData({
          userStats: stats
        });
      }
    } catch (error) {
      console.error('加载用户统计失败:', error);
    }
  },

  // 加载会员信息
  async loadMemberInfo() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'memberInfo'
        }
      });

      if (result.result.code === 0) {
        this.setData({
          memberInfo: result.result.data
        });
      }
    } catch (error) {
      console.error('加载会员信息失败:', error);
    }
  },

  // 加载最近订单
  async loadRecentOrders() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'order',
        data: {
          action: 'recent',
          limit: 3
        }
      });

      if (result.result.code === 0) {
        this.setData({
          recentOrders: result.result.data
        });
      }
    } catch (error) {
      console.error('加载最近订单失败:', error);
    }
  },

  // 加载通知
  async loadNotifications() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'notifications',
          unread: true,
          limit: 5
        }
      });

      if (result.result.code === 0) {
        this.setData({
          notifications: result.result.data
        });
      }
    } catch (error) {
      console.error('加载通知失败:', error);
    }
  },

  // 检查应用更新
  async checkAppUpdate() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'app',
        data: {
          action: 'checkUpdate'
        }
      });

      if (result.result.code === 0) {
        this.setData({
          hasUpdate: result.result.data.hasUpdate,
          appVersion: result.result.data.version
        });
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  },

  // 刷新所有数据
  async refreshAllData() {
    try {
      this.setData({ refreshing: true });

      await Promise.all([
        this.loadUserInfo(),
        this.loadUserStats(),
        this.loadMemberInfo(),
        this.loadRecentOrders(),
        this.loadNotifications()
      ]);

      wx.stopPullDownRefresh();

    } catch (error) {
      console.error('刷新数据失败:', error);
      wx.stopPullDownRefresh();
    } finally {
      this.setData({ refreshing: false });
    }
  },

  // 刷新用户信息
  async refreshUserInfo() {
    await Promise.all([
      this.loadUserInfo(),
      this.loadUserStats()
    ]);
  },

  // 更新菜单徽章
  updateMenuBadges(stats) {
    const menuGroups = [...this.data.menuGroups];

    // 更新订单徽章
    menuGroups[0].items[0].badge = stats.pendingOrders || 0;

    // 更新优惠券徽章
    menuGroups[0].items[1].badge = stats.availableCoupons || 0;

    // 更新消息通知徽章
    menuGroups[1].items[2].badge = stats.unreadNotifications || 0;

    this.setData({ menuGroups });
  },

  // 登录相关
  onLoginTap() {
    this.login();
  },

  async login() {
    try {
      wx.showLoading({ title: '登录中...' });

      // 获取微信登录凭证
      const loginResult = await wx.login();

      // 调用云函数进行登录
      const result = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'login',
          code: loginResult.code
        }
      });

      if (result.result.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 重新加载页面数据
        this.initPage();
      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('登录失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      });
    }
  },

  // 获取用户信息
  async getUserProfile() {
    try {
      wx.showLoading({ title: '获取信息...' });

      const result = await wx.getUserProfile({
        desc: '用于完善用户资料'
      });

      if (result.userInfo) {
        // 上传用户信息到服务器
        const updateResult = await wx.cloud.callFunction({
          name: 'user',
          data: {
            action: 'updateProfile',
            userInfo: result.userInfo
          }
        });

        if (updateResult.result.code === 0) {
          wx.hideLoading();
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });

          // 重新加载用户信息
          this.loadUserInfo();
        } else {
          throw new Error(updateResult.result.message);
        }
      }

    } catch (error) {
      console.error('获取用户信息失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '获取失败',
        icon: 'none'
      });
    }
  },

  // 菜单点击
  onMenuTap(e) {
    const item = e.currentTarget.dataset.item;

    if (item.path) {
      wx.navigateTo({
        url: item.path
      });
    } else {
      // 处理没有路径的菜单项
      this.handleSpecialMenu(item.id);
    }
  },

  // 处理特殊菜单
  handleSpecialMenu(menuId) {
    switch (menuId) {
      case 'logout':
        this.logout();
        break;
      case 'clear-cache':
        this.clearCache();
        break;
      default:
        console.log('未处理的菜单项:', menuId);
    }
  },

  // 快捷操作
  onQuickAction(e) {
    const action = e.currentTarget.dataset.action;

    switch (action) {
      case 'book-again':
        this.bookAgain();
        break;
      case 'invite':
        this.inviteFriend();
        break;
      case 'recharge':
        this.recharge();
        break;
      case 'gift':
        this.giftCard();
        break;
    }
  },

  // 再次预约
  bookAgain() {
    wx.navigateTo({
      url: '/pages/technician/list/index'
    });
  },

  // 邀请好友
  inviteFriend() {
    // 生成邀请链接
    const inviteCode = this.data.userProfile?.inviteCode || '';
    const inviteUrl = `/pages/invite/index?code=${inviteCode}`;

    wx.navigateTo({
      url: inviteUrl
    });
  },

  // 充值
  recharge() {
    wx.navigateTo({
      url: '/pages/user/recharge/index'
    });
  },

  // 礼品卡
  giftCard() {
    wx.navigateTo({
      url: '/pages/user/gift-card/index'
    });
  },

  // 订单点击
  onOrderTap(e) {
    const order = e.currentTarget.dataset.order;
    wx.navigateTo({
      url: `/pages/order/detail/index?id=${order.id}`
    });
  },

  // 通知点击
  onNotificationTap(e) {
    const notification = e.currentTarget.dataset.notification;

    // 标记为已读
    this.markNotificationRead(notification.id);

    // 根据通知类型跳转
    this.navigateByNotification(notification);
  },

  // 标记通知为已读
  async markNotificationRead(notificationId) {
    try {
      await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'markNotificationRead',
          notificationId
        }
      });

      // 更新本地通知列表
      const notifications = this.data.notifications.filter(n => n.id !== notificationId);
      this.setData({ notifications });

    } catch (error) {
      console.error('标记通知已读失败:', error);
    }
  },

  // 根据通知跳转
  navigateByNotification(notification) {
    const { type, data } = notification;

    switch (type) {
      case 'order':
        if (data.orderId) {
          wx.navigateTo({
            url: `/pages/order/detail/index?id=${data.orderId}`
          });
        }
        break;
      case 'coupon':
        wx.navigateTo({
          url: '/pages/coupon/list/index'
        });
        break;
      case 'system':
        wx.navigateTo({
          url: '/pages/help/index'
        });
        break;
      default:
        console.log('未知通知类型:', type);
    }
  },

  // 应用更新
  onUpdateApp() {
    wx.showModal({
      title: '应用更新',
      content: '发现新版本，是否立即更新？',
      success: (res) => {
        if (res.confirm) {
          // 这里应该实现更新逻辑
          wx.showToast({
            title: '正在更新...',
            icon: 'none'
          });
        }
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '退出中...' });

            await wx.cloud.callFunction({
              name: 'user',
              data: {
                action: 'logout'
              }
            });

            wx.hideLoading();

            // 清除本地数据
            wx.clearStorageSync();

            // 跳转到登录页面或首页
            wx.reLaunch({
              url: '/pages/home/index'
            });

          } catch (error) {
            console.error('退出登录失败:', error);
            wx.hideLoading();
            wx.showToast({
              title: '退出失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除应用缓存吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            // 清除本地缓存（保留重要数据）
            const keysToKeep = ['userInfo', 'token', 'loginInfo'];
            const allKeys = wx.getStorageInfoSync().keys;

            allKeys.forEach(key => {
              if (!keysToKeep.includes(key)) {
                wx.removeStorageSync(key);
              }
            });

            wx.showToast({
              title: '清除成功',
              icon: 'success'
            });

          } catch (error) {
            console.error('清除缓存失败:', error);
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 复制邀请码
  onCopyInviteCode() {
    const inviteCode = this.data.userProfile?.inviteCode;
    if (!inviteCode) {
      wx.showToast({
        title: '暂无邀请码',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: inviteCode,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      }
    });
  },

  // 联系客服
  onContactService() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567'
    });
  },

  // 工具方法
  formatNumber(num) {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + 'w';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  },

  getMemberLevelText(level) {
    const levelMap = {
      normal: '普通会员',
      vip: 'VIP会员',
      svip: 'SVIP会员'
    };
    return levelMap[level] || '普通会员';
  },

  getMemberLevelColor(level) {
    const colorMap = {
      normal: '#8e8e93',
      vip: '#ff9500',
      svip: '#af52de'
    };
    return colorMap[level] || '#8e8e93';
  },

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 24小时内
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${month}-${day}`;
    }
  }
});
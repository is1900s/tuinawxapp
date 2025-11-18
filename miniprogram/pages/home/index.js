// 首页逻辑
const app = getApp();

Page({
  data: {
    // 位置信息
    locationText: '获取位置中...',

    // 服务分类
    categories: [
      {
        id: 1,
        name: '全身推拿',
        icon: '/assets/images/icons/full-body.png',
        description: '全身放松推拿'
      },
      {
        id: 2,
        name: '局部推拿',
        icon: '/assets/images/icons/local.png',
        description: '肩颈腰腿推拿'
      },
      {
        id: 3,
        name: '足疗按摩',
        icon: '/assets/images/icons/foot.png',
        description: '足底反射区按摩'
      },
      {
        id: 4,
        name: '精油开背',
        icon: '/assets/images/icons/oil.png',
        description: '精油SPA开背'
      }
    ],

    // 推荐技师
    technicians: [],

    // 特惠活动
    offers: [],

    // 用户评价
    reviews: [],

    // 是否显示自定义导航栏
    showCustomNavbar: false,

    // 加载状态
    loading: false
  },

  onLoad(options) {
    console.log('首页加载', options);

    // 检查是否需要显示自定义导航栏
    this.checkCustomNavbar();

    // 初始化页面数据
    this.initPageData();
  },

  onShow() {
    console.log('首页显示');

    // 每次显示时刷新数据
    this.refreshData();
  },

  onReady() {
    console.log('首页渲染完成');
  },

  onHide() {
    console.log('首页隐藏');
  },

  onUnload() {
    console.log('首页卸载');
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    console.log('触底加载更多');
    // 可以在这里实现加载更多数据的逻辑
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '同城上门推拿，专业技师到家服务',
      path: '/pages/home/index',
      imageUrl: '/assets/images/share/home.jpg'
    };
  },

  /**
   * 检查是否需要显示自定义导航栏
   */
  checkCustomNavbar() {
    const systemInfo = app.globalData.systemInfo;
    if (systemInfo) {
      this.setData({
        showCustomNavbar: systemInfo.platform === 'ios' && systemInfo.system.indexOf('iOS 14') !== -1
      });
    }
  },

  /**
   * 初始化页面数据
   */
  async initPageData() {
    try {
      this.setData({ loading: true });

      // 并行获取各种数据
      const [locationData, techniciansData, offersData, reviewsData] = await Promise.all([
        this.getCurrentLocation(),
        this.getRecommendedTechnicians(),
        this.getSpecialOffers(),
        this.getUserReviews()
      ]);

      this.setData({
        locationText: locationData.text,
        technicians: techniciansData,
        offers: offersData,
        reviews: reviewsData,
        loading: false
      });

    } catch (error) {
      console.error('初始化页面数据失败', error);
      this.setData({ loading: false });
      app.showToast('数据加载失败，请重试');
    }
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    try {
      const [techniciansData, offersData, reviewsData] = await Promise.all([
        this.getRecommendedTechnicians(),
        this.getSpecialOffers(),
        this.getUserReviews()
      ]);

      this.setData({
        technicians: techniciansData,
        offers: offersData,
        reviews: reviewsData
      });

    } catch (error) {
      console.error('刷新数据失败', error);
    }
  },

  /**
   * 获取当前位置
   */
  async getCurrentLocation() {
    try {
      const location = await app.getLocation();

      // 逆地理编码获取地址描述
      const address = await this.reverseGeocode(location.latitude, location.longitude);

      return {
        text: address || '当前位置',
        ...location
      };
    } catch (error) {
      console.error('获取位置失败', error);
      return {
        text: '位置获取失败'
      };
    }
  },

  /**
   * 逆地理编码
   */
  reverseGeocode(lat, lng) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://apis.map.qq.com/ws/geocoder/v1/',
        data: {
          location: `${lat},${lng}`,
          key: 'your-map-key'
        },
        success: (res) => {
          if (res.data.status === 0) {
            resolve(res.data.result.address);
          } else {
            reject(new Error(res.data.message));
          }
        },
        fail: reject
      });
    });
  },

  /**
   * 获取推荐技师
   */
  async getRecommendedTechnicians() {
    try {
      const result = await app.request({
        url: '/technicians/recommended',
        method: 'GET',
        data: {
          limit: 10,
          latitude: app.globalData.location?.latitude,
          longitude: app.globalData.location?.longitude
        }
      });

      if (result.code === 200) {
        return result.data.map(technician => ({
          ...technician,
          distance: this.calculateDistance(
            app.globalData.location?.latitude,
            app.globalData.location?.longitude,
            technician.latitude,
            technician.longitude
          ).toFixed(1)
        }));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('获取推荐技师失败', error);
      // 返回模拟数据
      return this.getMockTechnicians();
    }
  },

  /**
   * 获取特惠活动
   */
  async getSpecialOffers() {
    try {
      const result = await app.request({
        url: '/offers/active',
        method: 'GET',
        data: { limit: 5 }
      });

      return result.code === 200 ? result.data : this.getMockOffers();
    } catch (error) {
      console.error('获取特惠活动失败', error);
      return this.getMockOffers();
    }
  },

  /**
   * 获取用户评价
   */
  async getUserReviews() {
    try {
      const result = await app.request({
        url: '/reviews/latest',
        method: 'GET',
        data: { limit: 5 }
      });

      return result.code === 200 ? result.data : this.getMockReviews();
    } catch (error) {
      console.error('获取用户评价失败', error);
      return this.getMockReviews();
    }
  },

  /**
   * 计算两点间距离（公里）
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 地球半径（公里）
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRad(deg) {
    return deg * (Math.PI / 180);
  },

  /**
   * 事件处理：搜索点击
   */
  onSearchTap() {
    wx.navigateTo({
      url: '/pages/search/index'
    });
  },

  /**
   * 事件处理：位置点击
   */
  onLocationTap() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          locationText: res.name || '已选择位置'
        });

        // 更新全局位置信息
        app.globalData.location = {
          latitude: res.latitude,
          longitude: res.longitude,
          address: res.address,
          name: res.name
        };

        // 刷新技师列表
        this.refreshData();
      },
      fail: (error) => {
        console.error('选择位置失败', error);
        app.showToast('位置选择失败');
      }
    });
  },

  /**
   * 事件处理：分类点击
   */
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    wx.navigateTo({
      url: `/pages/technician/list/index?categoryId=${category.id}&categoryName=${category.name}`
    });
  },

  /**
   * 事件处理：更多分类
   */
  onMoreCategories() {
    wx.navigateTo({
      url: '/pages/category/index'
    });
  },

  /**
   * 事件处理：技师点击
   */
  onTechnicianTap(e) {
    const technician = e.currentTarget.dataset.technician;
    wx.navigateTo({
      url: `/pages/technician/detail/index?id=${technician.id}`
    });
  },

  /**
   * 事件处理：更多技师
   */
  onMoreTechnicians() {
    wx.navigateTo({
      url: '/pages/technician/list/index'
    });
  },

  /**
   * 事件处理：活动点击
   */
  onOfferTap(e) {
    const offer = e.currentTarget.dataset.offer;
    wx.navigateTo({
      url: `/pages/offer/detail/index?id=${offer.id}`
    });
  },

  /**
   * 事件处理：更多活动
   */
  onMoreOffers() {
    wx.navigateTo({
      url: '/pages/offer/list/index'
    });
  },

  /**
   * 事件处理：更多评价
   */
  onMoreReviews() {
    wx.navigateTo({
      url: '/pages/review/list/index'
    });
  },

  /**
   * 模拟数据：推荐技师
   */
  getMockTechnicians() {
    return [
      {
        id: 1,
        name: '李师傅',
        avatar: '/assets/images/avatars/technician1.jpg',
        rating: 4.8,
        orderCount: 156,
        distance: 2.3,
        tags: ['推拿', '足疗', '10年经验'],
        latitude: 39.9042,
        longitude: 116.4074
      },
      {
        id: 2,
        name: '王师傅',
        avatar: '/assets/images/avatars/technician2.jpg',
        rating: 4.9,
        orderCount: 203,
        distance: 3.1,
        tags: ['精油开背', 'SPA', '8年经验'],
        latitude: 39.9142,
        longitude: 116.4174
      }
    ];
  },

  /**
   * 模拟数据：特惠活动
   */
  getMockOffers() {
    return [
      {
        id: 1,
        title: '新人专享优惠',
        description: '首次下单立减50元',
        currentPrice: 128,
        originalPrice: 178,
        image: '/assets/images/offers/new-user.jpg'
      },
      {
        id: 2,
        title: '全身推拿套餐',
        description: '90分钟全身放松推拿',
        currentPrice: 198,
        originalPrice: 268,
        image: '/assets/images/offers/full-package.jpg'
      }
    ];
  },

  /**
   * 模拟数据：用户评价
   */
  getMockReviews() {
    return [
      {
        id: 1,
        userName: '张小姐',
        userAvatar: '/assets/images/avatars/user1.jpg',
        rating: 5,
        date: '2024-01-15',
        content: '技师非常专业，手法很好，家里老人很满意，下次还会预约。',
        serviceName: '全身推拿'
      },
      {
        id: 2,
        userName: '刘先生',
        userAvatar: '/assets/images/avatars/user2.jpg',
        rating: 4,
        date: '2024-01-14',
        content: '服务态度很好，推拿技术也不错，就是等待时间有点长。',
        serviceName: '局部推拿'
      }
    ];
  }
});